// Notes and Grip choice logic for Workout Tracker

async function fetchExerciseNotes() {
  try {
    const res = await fetch('/api/exercise-notes');
    if (!res.ok) return;
    state.exerciseNotes = await res.json() || {};
  } catch (e) {
    console.warn('[EX-NOTES] load failed:', e);
  }
}

async function saveExerciseNote(exerciseName, body) {
  try {
    await fetch('/api/exercise-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise: exerciseName, body: body || '' }),
    });
    if (!state.exerciseNotes) state.exerciseNotes = {};
    if (body && body.trim()) state.exerciseNotes[exerciseName] = body;
    else delete state.exerciseNotes[exerciseName];
  } catch (e) {
    console.warn('[EX-NOTES] save failed:', e);
  }
}

function startEditNote(exerciseName) {
  state.editingNote = exerciseName;
  render();
  // Focus the textarea after render places it in the DOM.
  requestAnimationFrame(() => {
    const ta = document.querySelector(`textarea[data-note-for="${CSS.escape(exerciseName)}"]`);
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  });
}

async function commitNoteEdit(exerciseName) {
  const ta = document.querySelector(`textarea[data-note-for="${CSS.escape(exerciseName)}"]`);
  const body = ta ? ta.value : '';
  await saveExerciseNote(exerciseName, body);
  state.editingNote = null;
  render();
}

function cancelNoteEdit() {
  state.editingNote = null;
  render();
}

function renderExerciseNote(exerciseName) {
  // Compact note block under the exercise card. Three states:
  //   editing → textarea + Save / Cancel
  //   has note → rendered markdown + small "edit" button
  //   no note → muted "+ add note" link
  const isEditing = state.editingNote === exerciseName;
  const body = (state.exerciseNotes || {})[exerciseName] || '';
  const safeName = exerciseName.replace(/"/g, '&quot;');
  if (isEditing) {
    return `<div data-noinvert style="margin-top:8px;padding:8px 10px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px">
      <textarea data-note-for="${safeName}" placeholder="Add a note (markdown)…" style="width:100%;min-height:60px;font-size:12px;padding:6px 8px;border:1px solid #fde68a;border-radius:6px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;resize:vertical;box-sizing:border-box">${body.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</textarea>
      <div style="display:flex;gap:6px;margin-top:6px;justify-content:flex-end">
        <button onclick="cancelNoteEdit()" style="font-size:11px;color:#92400e;background:transparent;border:1px solid #fde68a;padding:4px 10px;border-radius:6px;cursor:pointer">Cancel</button>
        <button onclick="commitNoteEdit('${safeName}')" style="font-size:11px;color:white;background:#d97706;border:1px solid #d97706;padding:4px 12px;border-radius:6px;cursor:pointer;font-weight:600">Save</button>
      </div>
    </div>`;
  }
  if (body && body.trim()) {
    // Render markdown via marked. If the lib isn't loaded yet, fall back to
    // line-break-preserving plain text.
    let rendered;
    try {
      rendered = (typeof marked !== 'undefined') ? marked.parse(body, { breaks: true, gfm: true }) : body.replace(/\n/g, '<br>');
    } catch (e) {
      rendered = body.replace(/\n/g, '<br>');
    }
    return `<div onclick="startEditNote('${safeName}')" data-noinvert style="margin-top:8px;padding:8px 10px 8px 12px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;cursor:pointer;font-size:12px;color:#451a03;line-height:1.5" class="ex-note">
      ${rendered}
    </div>`;
  }
  return `<div style="margin-top:6px"><button onclick="startEditNote('${safeName}')" style="font-size:10px;color:#9ca3af;background:transparent;border:1px dashed #e5e7eb;padding:3px 8px;border-radius:6px;cursor:pointer">+ note</button></div>`;
}

function setBodyweight(v) {
  const n = parseInt(v);
  if (!isFinite(n) || n <= 0 || n > 600) return;
  state.bodyweight = n;
  localStorage.setItem('bodyweight', String(n));
  // Re-derive effective weight for any not-yet-completed assist sets so the
  // displayed/saved value stays in sync with the new bodyweight.
  if (state.workout) {
    state.workout.exercises.forEach((ex, exIdx) => {
      if (!ex.assist) return;
      const total = getSetCount(exIdx) + (ex.supersetExercises ? 0 : 1);
      for (let i = -1; i < total; i++) {
        const setKey = i === -1 ? 'warmup' : i;
        const key = `${exIdx}-${setKey}`;
        if (state.completed[key]) continue; // lock historical sets at their original BW
        const bands = getBandSelection(exIdx, setKey);
        if (bands.length === 0) continue;
        state.weights[key] = Math.max(0, n - bands.reduce((a,b) => a+b, 0));
      }
    });
  }
  triggerSave();
  render();
}

function promptBodyweight() {
  const v = prompt('Bodyweight (lb)?', String(state.bodyweight));
  if (v != null && v !== '') setBodyweight(v);
}

// Grip choice for assist exercises (pull-ups). Stored per-set, persisted to
// localStorage so it survives reloads. Not in the DB yet — add later if we
// want grip-aware history/PRs.
function _gripStorageKey() {
  const today = new Date().toISOString().slice(0, 10);
  return `gripState:${state.workout?.id || '_'}:${today}`;
}
function saveGripState() {
  try { localStorage.setItem(_gripStorageKey(), JSON.stringify(state.grip || {})); } catch (e) {}
}
function loadGripState() {
  try {
    state.grip = JSON.parse(localStorage.getItem(_gripStorageKey()) || '{}');
  } catch (e) { state.grip = {}; }
}
function selectGrip(exIdx, setKey, grip) {
  if (!state.grip) state.grip = {};
  state.grip[`${exIdx}-${setKey}`] = grip;
  saveGripState();
  render();
}
function getGrip(exIdx, setKey) {
  const grips = state.grip || {};
  const k = `${exIdx}-${setKey}`;
  if (grips[k]) return grips[k];
  // Inherit from most-recent prior set in this session.
  if (typeof setKey === 'number') {
    for (let i = setKey - 1; i >= 0; i--) {
      if (grips[`${exIdx}-${i}`]) return grips[`${exIdx}-${i}`];
    }
  }
  if (grips[`${exIdx}-warmup`]) return grips[`${exIdx}-warmup`];
  // Fall back to the first declared grip on the exercise (or 'neutral' if none).
  const ex = state.workout?.exercises?.[exIdx];
  const subEx = (typeof getSubExercise === 'function') ? getSubExercise(exIdx, setKey) : null;
  const eff = subEx ? { ...ex, ...subEx } : ex;
  return (eff?.grips && eff.grips[0]) || 'neutral';
}
// Global grip dictionary. Exercises declare which grips apply via a
// `grips: ['id', 'id', ...]` array; the renderer looks each id up here.
// `desc` shows up as a tooltip on the toggle button (HTML title attribute)
// so you can quickly remember what each grip is best for.
const GRIP_DEFS = {
  // Pull-up grips (assist exercises)
  neutral:   { label: 'Neutral',   icon: '∥', desc: 'Palms facing each other. Shoulder-friendliest. Balanced lats + biceps. Best starting grip while building strength.' },
  chinup:    { label: 'Chin-Up',   icon: '◡', desc: 'Palms toward you (supinated). Easiest variation — biceps help more. Great for working up reps.' },
  pullup:    { label: 'Pull-Up',   icon: '◠', desc: 'Palms away (pronated). Hardest variation. Most lat-dominant. Save for when you can do 8 clean chin-ups.' },
  // Curl grips
  hammer:    { label: 'Hammer',    icon: '∥', desc: 'Palms facing each other. Hits brachialis + forearms. Easiest on wrists. Builds thicker-looking arms from the side.' },
  supinated: { label: 'Supinated', icon: '◡', desc: 'Palms up. Classic curl — peak biceps contraction. The "show muscle" variant.' },
  reverse:   { label: 'Reverse',   icon: '◠', desc: 'Palms down. Targets brachialis + forearm extensors. Best for grip strength and forearm size. Use lighter weight.' },
};
function gripLabel(g) {
  return GRIP_DEFS[g]?.label || 'Neutral';
}
function getGripOptions(ex) {
  // Resolve declared grip ids on this exercise to renderable {id,label,icon,desc}.
  const ids = (ex && ex.grips) || [];
  return ids.map(id => ({
    id,
    label: GRIP_DEFS[id]?.label || id,
    icon:  GRIP_DEFS[id]?.icon  || '·',
    desc:  GRIP_DEFS[id]?.desc  || '',
  })).filter(o => o.label);
}
