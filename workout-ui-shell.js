// All trackable muscle groups with display info
const MUSCLE_GROUPS = {
  shoulders:  { label: "Shoulders",   side: "front" },
  chest:      { label: "Chest",       side: "front" },
  biceps:     { label: "Biceps",      side: "front" },
  triceps:    { label: "Triceps",     side: "back"  },
  forearms:   { label: "Forearms",    side: "front" },
  core:       { label: "Core",        side: "front" },
  quads:      { label: "Quads",       side: "front" },
  upper_back: { label: "Upper Back",  side: "back"  },
  lats:       { label: "Lats",        side: "back"  },
  rear_delts: { label: "Rear Delts",  side: "back"  },
  lower_back: { label: "Lower Back",  side: "back"  },
  glutes:     { label: "Glutes",      side: "back"  },
  hamstrings: { label: "Hamstrings",  side: "back"  },
  calves:     { label: "Calves",      side: "back"  },
};

const WEIGHTS_LB = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
const lbToKg = lb => (lb * 0.453592).toFixed(1);

const WEIGHT_COLORS = [
  ["#ecfdf5","#047857","#a7f3d0"], ["#d1fae5","#065f46","#6ee7b7"],
  ["#ecfccb","#3f6212","#bef264"], ["#fef9c3","#854d0e","#fde047"],
  ["#fef3c7","#92400e","#fcd34d"], ["#ffedd5","#9a3412","#fdba74"],
  ["#fed7aa","#7c2d12","#fb923c"], ["#fee2e2","#991b1b","#fca5a5"],
  ["#fecaca","#7f1d1d","#f87171"], ["#fca5a5","#450a0a","#ef4444"],
];

const ALL_WEIGHT_COLORS = {
  5:["#ecfdf5","#047857","#a7f3d0"], 10:["#d1fae5","#065f46","#6ee7b7"],
  15:["#ecfccb","#3f6212","#bef264"], 20:["#fef9c3","#854d0e","#fde047"],
  25:["#fef3c7","#92400e","#fcd34d"], 30:["#ffedd5","#9a3412","#fdba74"],
  35:["#fed7aa","#7c2d12","#fb923c"], 40:["#fee2e2","#991b1b","#fca5a5"],
  45:["#fecaca","#7f1d1d","#f87171"], 50:["#fca5a5","#450a0a","#ef4444"],
  55:["#e9d5ff","#6b21a8","#c084fc"], 60:["#d8b4fe","#581c87","#a855f7"],
};
function weightBtnStyle(lb, selected, hinted) {
  if (selected) return 'background:#3b82f6;color:white;box-shadow:0 1px 3px rgba(59,130,246,0.4);outline:2px solid #93c5fd;';
  if (hinted) return 'background:white;color:#93c5fd;border:2px dashed #93c5fd;';
  const c = ALL_WEIGHT_COLORS[lb] || ["#f3f4f6","#374151","#d1d5db"];
  return `background:${c[0]};color:${c[1]};border:1px solid ${c[2]};`;
}

// State
let state = {
  screen: "home", // home | workout | history
  workout: null,
  completed: {},
  weights: {},
  elapsed: 0,
  running: false,
  resting: false,
  restLeft: 0,
  // Rest-timer pause: when true, tickRest stops decrementing. The remaining
  // seconds are held in state.restLeft and restEndAt is rebased on resume.
  restPaused: false,
  showGif: {},
  lastSession: {},
  reps: {},
  // Per-set state for whether the weight picker is expanded to show the
  // full ladder. Empty default = each picker shows only working ±1 step.
  expandedPicker: {},
  history: [],
  saved: false,
  sessionId: null,
  lastSaved: null,
  // Persisted bodyweight (lb). Used for `assist: true` exercises (e.g. assisted
  // pull-ups) where effective load = bodyweight − sum(assist bands). Stored in
  // localStorage so it survives reloads and reopens.
  bodyweight: parseInt(localStorage.getItem('bodyweight')) || 175,
  // Per-set grip choice for assist exercises. Persisted to localStorage scoped
  // to (workout id × date). Hydrated in loadSessionData.
  grip: {},
  // Persistent per-exercise notes (markdown body keyed by exercise name).
  // Loaded once via fetchExerciseNotes(); upserted via saveExerciseNote().
  exerciseNotes: {},
  // Tracks which exercise's note is currently being edited so render() can
  // skip re-painting that textarea and lose focus.
  editingNote: null,
};

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

let timerInterval = null;
let restInterval = null;
let muscleStatus = {}; // { muscle: { hoursAgo, load, date } }

function computeMuscleStatus(history) {
  const now = Date.now();
  const status = {};
  // Go through history (newest first) and find when each muscle was last worked
  for (const session of history) {
    const sessionDate = new Date(session.date + "T12:00:00");
    const hoursAgo = (now - sessionDate.getTime()) / (1000 * 60 * 60);
    for (const set of session.sets) {
      const mapping = EXERCISE_MUSCLES[set.exercise];
      if (!mapping) continue;
      const load = set.weight_lb || 0;
      const reps = parseInt(set.reps) || 0;
      const volume = load * reps;
      for (const m of mapping.primary) {
        const vol = volume * getMuscleImpact(set.exercise, m, true);
        if (!status[m] || hoursAgo < status[m].hoursAgo) {
          status[m] = { hoursAgo, volume: vol, date: session.date, workout: session.workout_name };
        } else if (hoursAgo === status[m].hoursAgo) {
          status[m].volume += vol;
        }
      }
      for (const m of mapping.secondary) {
        const vol = volume * getMuscleImpact(set.exercise, m, false);
        if (!status[m] || hoursAgo < status[m].hoursAgo) {
          status[m] = { hoursAgo, volume: vol, date: session.date, workout: session.workout_name };
        } else if (hoursAgo === status[m].hoursAgo) {
          status[m].volume += vol;
        }
      }
    }
  }
  return status;
}

function getRecoveryColor(hoursAgo) {
  if (hoursAgo == null) return { bg: "#f3f4f6", fg: "#9ca3af", label: "No data", pct: 0 };
  if (hoursAgo < 24) return { bg: "#fecaca", fg: "#dc2626", label: "Worked today", pct: 15 };
  if (hoursAgo < 48) return { bg: "#fed7aa", fg: "#ea580c", label: "Recovering", pct: 50 };
  if (hoursAgo < 72) return { bg: "#fef08a", fg: "#ca8a04", label: "Almost ready", pct: 80 };
  return { bg: "#bbf7d0", fg: "#16a34a", label: "Ready", pct: 100 };
}

function getWorkoutRecovery(workout) {
  // Collect all muscles this workout targets
  const musclePcts = {};
  const allExercises = [];
  for (const ex of workout.exercises) {
    if (ex.supersetExercises) ex.supersetExercises.forEach(sub => allExercises.push(sub));
    else allExercises.push(ex);
  }
  for (const ex of allExercises) {
    const mapping = EXERCISE_MUSCLES[ex.name];
    if (!mapping) continue;
    for (const m of mapping.primary) {
      const s = muscleStatus[m];
      musclePcts[m] = getRecoveryColor(s?.hoursAgo).pct;
    }
    for (const m of mapping.secondary) {
      const s = muscleStatus[m];
      if (!musclePcts[m]) musclePcts[m] = getRecoveryColor(s?.hoursAgo).pct;
    }
  }
  const vals = Object.values(musclePcts);
  if (vals.length === 0) return { avg: 0, muscles: {} };
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  return { avg, muscles: musclePcts };
}

function recoveryBadge(pct) {
  let bg, fg, label;
  if (pct >= 80) { bg = "#dcfce7"; fg = "#16a34a"; label = "Ready"; }
  else if (pct >= 50) { bg = "#fef9c3"; fg = "#ca8a04"; label = "Recovering"; }
  else if (pct > 0) { bg = "#fee2e2"; fg = "#dc2626"; label = "Sore"; }
  else { bg = "#f3f4f6"; fg = "#9ca3af"; label = "No data"; }
  return `<span style="font-size:11px;font-weight:600;color:${fg};background:${bg};padding:3px 8px;border-radius:8px;white-space:nowrap">${label} ${pct}%</span>`;
}

async function loadMuscleStatus() {
  try {
    const res = await fetch("/api/history?limit=30");
    const history = await res.json();
    muscleStatus = computeMuscleStatus(history);
    render();
  } catch (e) { console.error("[MUSCLE] Error:", e); }
}

// Only returns explicitly set weight for this exact set
function getSetWeight(exIdx, setKey) {
  const k = `${exIdx}-${setKey}`;
  return state.weights[k] != null ? state.weights[k] : null;
}

// Returns the weight from a previous set as a suggestion (dashed hint)
// Only looks within the SAME exercise — previous sets, warmup, or last session
function getHintWeight(exIdx, setKey) {
  // For working sets: check previous working set in THIS session first
  // (but NOT warmup — warmup weight is too light to hint working sets).
  // For supersets we must skip back to the previous set of the SAME
  // sub-exercise — set N-1 belongs to a different sub-exercise and would
  // give a misleading hint (e.g. Pushdowns' 5lb bleeding into Curls).
  if (typeof setKey === "number" && setKey > 0) {
    const ex = state.workout?.exercises?.[exIdx];
    if (ex && ex.supersetExercises) {
      const subs = ex.supersetExercises;
      const subIdx = setKey % subs.length;
      // Walk back in same-sub steps (subs.length apart).
      for (let prior = setKey - subs.length; prior >= 0; prior -= subs.length) {
        if (prior % subs.length !== subIdx) continue; // safety
        const prev = getSetWeight(exIdx, prior);
        if (prev != null) return prev;
      }
      // Fall through to last-session lookup below if no in-session match.
    } else {
      const prev = getSetWeight(exIdx, setKey - 1);
      if (prev != null) return prev;
      return getHintWeight(exIdx, setKey - 1);
    }
  }
  // For working set 0 (and all other cases): go straight to last session data
  if (state.lastSession && state.workout) {
    const ex = state.workout.exercises[exIdx];
    // For superset sub-exercises, use the sub-exercise name for DB lookup
    const subEx = getSubExercise(exIdx, setKey);
    const lookupName = subEx ? subEx.name : ex.name;
    // DB stores set_number = interleaved index + 1 (matches autoSave loop).
    const setNum = setKey === "warmup" ? 0 : setKey + 1;
    const setType = setKey === "warmup" ? "warmup" : "working";
    // For supersets, fall back across other rounds of the same sub-exercise
    // (interleaved set_numbers for Pushdowns in a 2-sub superset are 1, 3, 5).
    let tryKeys;
    if (setKey === "warmup") {
      tryKeys = [`${lookupName}|warmup|0`, `${lookupName}|working|1`];
    } else if (subEx) {
      const subs = ex.supersetExercises;
      const subIdx = setKey % subs.length;
      tryKeys = [`${lookupName}|working|${setNum}`];
      for (let round = 0; round < 10; round++) {
        const n = round * subs.length + subIdx + 1;
        if (n !== setNum) tryKeys.push(`${lookupName}|working|${n}`);
      }
    } else {
      tryKeys = [`${lookupName}|${setType}|${setNum}`, `${lookupName}|working|1`, `${lookupName}|working|2`, `${lookupName}|working|3`];
    }
    for (const k of tryKeys) {
      const data = state.lastSession[k];
      if (data?.weight_lb) return data.weight_lb;
    }
  }
  return null;
}

// For DB-pickers in bandAddon mode: previous session stored a COMBINED
// weight in weight_lb, plus the bands list in bands_json. Subtract the
// suggested band sum to recover the dumbbell-only hint.
function getHintDBWeight(exIdx, setKey) {
  const ex = state.workout.exercises[exIdx];
  if (!ex?.bandAddon) return getHintWeight(exIdx, setKey);
  const combined = getHintWeight(exIdx, setKey);
  if (combined == null) return null;
  const bands = getBandSelection(exIdx, setKey);
  const bandSum = bands.reduce((a, b) => a + b, 0);
  return Math.max(0, combined - bandSum);
}

// For saving: use explicit weight, or fall back to hint
function getEffectiveWeight(exIdx, setKey) {
  const ex = state.workout.exercises[exIdx];
  if (ex?.bodyweight) return null;
  // Assist exercises (e.g. assisted pull-ups): effective load = BW − sum(bands).
  // Once a stored value is present in state.weights (set at toggle time), use
  // it so historical sets are anchored to the BW at that moment.
  if (ex?.assist) {
    const stored = getSetWeight(exIdx, setKey);
    if (stored != null) return stored;
    const bands = getBandSelection(exIdx, setKey);
    if (bands.length === 0) return null;
    const bw = state.bodyweight || 175;
    return Math.max(0, bw - bands.reduce((a, b) => a + b, 0));
  }
  // bandAddon (e.g. Goblet/Bulgarian Split Squat): combined load = DB + sum(bands).
  // state.weights stores DB-only; bands tracked separately in state.bands.
  // IMPORTANT: do NOT fall back to the hint at save time. Hints are
  // predictions, not facts — silently saving them caused historical
  // sessions to compound wrong values across weeks. If the user didn't
  // pick a DB, fall back to band-only load (or null if neither).
  if (ex?.bandAddon) {
    const dbExplicit = getSetWeight(exIdx, setKey);
    const bands = getBandSelection(exIdx, setKey);
    const bandSum = bands.reduce((a, b) => a + b, 0);
    if (dbExplicit == null) {
      return bandSum > 0 ? bandSum : null;
    }
    return dbExplicit + bandSum;
  }
  // Plain dumbbell: explicit pick only. No hint fallback (would silently
  // bake yesterday's prediction into today's record).
  return getSetWeight(exIdx, setKey);
}

function getSetCount(exIdx) {
  const ex = state.workout.exercises[exIdx];
  const base = ex.supersetExercises ? ex.sets * ex.supersetExercises.length : ex.sets;
  return base + (state.extraSets?.[exIdx] || 0);
}

// For superset exercises: get the sub-exercise for a given set index
function getSubExercise(exIdx, setKey) {
  const ex = state.workout.exercises[exIdx];
  if (!ex.supersetExercises || setKey === "warmup") return null;
  const subIdx = typeof setKey === "number" ? setKey % ex.supersetExercises.length : 0;
  return ex.supersetExercises[subIdx];
}

function getSupersetRound(exIdx, setKey) {
  const ex = state.workout.exercises[exIdx];
  if (!ex.supersetExercises || typeof setKey !== "number") return null;
  return Math.floor(setKey / ex.supersetExercises.length);
}
function totalSets() { return state.workout.exercises.reduce((s, e, i) => s + getSetCount(i) + (e.supersetExercises || state.warmupOff?.[i] ? 0 : 1), 0); }
function completedSets() { return Object.values(state.completed).filter(Boolean).length; }
function allDone() { return completedSets() === totalSets(); }

function addSet(exIdx) {
  if (!state.extraSets) state.extraSets = {};
  state.extraSets[exIdx] = (state.extraSets[exIdx] || 0) + 1;
  render();
}
function removeLastSet(exIdx) {
  const count = getSetCount(exIdx);
  if (count <= 1) return;
  const lastIdx = count - 1;
  // Remove last set — even if completed
  delete state.weights[`${exIdx}-${lastIdx}`];
  delete state.reps[`${exIdx}-${lastIdx}`];
  delete state.completed[`${exIdx}-${lastIdx}`];
  if (!state.extraSets) state.extraSets = {};
  const base = state.workout.exercises[exIdx].sets;
  const extra = state.extraSets[exIdx] || 0;
  if (extra > 0) {
    state.extraSets[exIdx] = extra - 1;
  } else {
    state.extraSets[exIdx] = (state.extraSets[exIdx] || 0) - 1;
  }
  triggerSave();
  render();
}
// Swappable exercise groups — any exercise can be swapped for others in its group
const SWAP_GROUPS = [
  [
    { name: "Dumbbell Bicep Curls", sets: 2, reps: "8-12", notes: "Finish strong", superset: false, video: "https://www.youtube.com/shorts/MKWBV29S6c0", grips: ['supinated', 'hammer', 'reverse'] },
    { name: "Band Bicep Curls", sets: 2, reps: "12-15", notes: "Stand on band, curl handles up", superset: false, video: "https://www.youtube.com/shorts/5ACsDBt_sMQ", equipment: "band", grips: ['supinated', 'hammer', 'reverse'] },
    { name: "Bench Dips", sets: 2, reps: "10-15", notes: "Hands on bench behind you, lower until 90°. Band ASSISTS — loop under hips to take weight off; leave empty for full bodyweight.", superset: false, video: "https://www.youtube.com/shorts/0326dy_-CzM", equipment: "band", assist: true },
    { name: "Overhead Tricep Extension", sets: 2, reps: "10-15", notes: "Single DB, both hands", superset: false, video: "https://www.youtube.com/shorts/b_r_LW4HEcM" },
  ],
  [
    { name: "Band Romanian Deadlift", sets: 3, reps: "8-12", notes: "Stand on band, hinge at hips, handles at sides", superset: false, video: "https://www.youtube.com/shorts/Op7zRCBjGvs", equipment: "band" },
    { name: "Dumbbell Romanian Deadlift", sets: 3, reps: "8-12", notes: "Hinge at hips, slight knee bend", superset: false, video: "https://www.youtube.com/shorts/cGMaBqaExBo", rest: 120 },
  ],
  [
    { name: "Goblet Squat", sets: 3, reps: "10-12", notes: "Hold DB at chest, sit deep. Optional: stand on bands for extra resistance.", superset: false, video: "https://www.youtube.com/shorts/MeIiIdhvXT4", bandAddon: true, extraWeights: [55, 60], rest: 120 },
    { name: "Bulgarian Split Squat", sets: 3, reps: "8-10", notes: "Rear foot on bench, DB in each hand. Optional: stand on bands for extra resistance.", superset: false, video: "https://www.youtube.com/shorts/2C-uNgKwPLE", bandAddon: true, rest: 120 },
  ],
];
function getSwapOptions(exerciseName) {
  for (const group of SWAP_GROUPS) {
    if (group.some(e => e.name === exerciseName)) {
      return group.filter(e => e.name !== exerciseName);
    }
  }
  return [];
}
function isSwappable(exerciseName) {
  return SWAP_GROUPS.some(g => g.some(e => e.name === exerciseName));
}
function getSwapGroup(exerciseName) {
  return SWAP_GROUPS.find(g => g.some(e => e.name === exerciseName));
}
function swapExercise(exIdx, newName) {
  const group = getSwapGroup(state.workout.exercises[exIdx].name);
  if (!group) return;
  const swap = group.find(e => e.name === newName);
  if (!swap) return;
  // Clear progress for this exercise
  delete state.completed[`${exIdx}-warmup`];
  delete state.weights[`${exIdx}-warmup`];
  delete state.reps[`${exIdx}-warmup`];
  for (let i = 0; i < getSetCount(exIdx); i++) {
    delete state.completed[`${exIdx}-${i}`];
    delete state.weights[`${exIdx}-${i}`];
    delete state.reps[`${exIdx}-${i}`];
  }
  if (state.extraSets) state.extraSets[exIdx] = 0;
  state.workout.exercises[exIdx] = { ...swap };
  state.swapOpen = null;
  triggerSave();
  render();
}
function toggleSwapMenu(exIdx) {
  state.swapOpen = state.swapOpen === exIdx ? null : exIdx;
  render();
}

function formatTime(s) { return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`; }
function localDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

// API — auto-save on every set toggle
let saveTimeout = null;
// Single-in-flight guard. Without this, if a second autoSave call lands
// before the first POST's response comes back, both fire with session_id=null
// and the server creates TWO session rows. Re-saves while a save is in-flight
// queue at most one follow-up that runs once the first finishes (and now
// has a sessionId, so it updates instead of inserting a duplicate).
let savingInFlight = false;
let savePending = false;

async function autoSave() {
  if (savingInFlight) {
    savePending = true;
    return;
  }
  savingInFlight = true;
  try {
    const w = state.workout;
    const sets = [];
    w.exercises.forEach((ex, exIdx) => {
      if (state.completed[`${exIdx}-warmup`]) {
        const bands = getBandSelection(exIdx, "warmup");
        sets.push({ exercise: ex.name, set_type: "warmup", set_number: 0, reps: String(state.reps[`${exIdx}-warmup`] || ex.reps), weight_lb: getEffectiveWeight(exIdx, "warmup"), bands_json: bands.length ? JSON.stringify(bands) : null, grip: (state.grip || {})[`${exIdx}-warmup`] || null });
      }
      for (let i = 0; i < getSetCount(exIdx); i++) {
        if (state.completed[`${exIdx}-${i}`]) {
          const subEx = getSubExercise(exIdx, i);
          const exName = subEx ? subEx.name : ex.name;
          const exReps = subEx ? subEx.reps : ex.reps;
          const bands = getBandSelection(exIdx, i);
          sets.push({ exercise: exName, set_type: "working", set_number: i + 1, reps: String(state.reps[`${exIdx}-${i}`] || exReps), weight_lb: getEffectiveWeight(exIdx, i), bands_json: bands.length ? JSON.stringify(bands) : null, grip: (state.grip || {})[`${exIdx}-${i}`] || null });
        }
      }
    });
    if (sets.length === 0) return;
    const body = {
      workout: w.name,
      date: localDate(),
      duration_sec: state.elapsed,
      session_id: state.sessionId || null,
      started_at: state.timerStartedAt ? new Date(state.timerStartedAt).toISOString() : null,
      sets
    };
    try {
      const res = await fetch("/api/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.ok) {
        state.sessionId = data.id;
        state.lastSaved = Date.now();
        console.log(`[AUTO-SAVE] Session #${data.id} — ${sets.length} sets`);
      }
    } catch (e) {
      console.error("[AUTO-SAVE] Error:", e);
    }
  } finally {
    savingInFlight = false;
    if (savePending) {
      savePending = false;
      // Run queued save with the freshly-set sessionId so it UPDATEs.
      autoSave();
    }
  }
}

// Debounced save — waits 500ms after last action to avoid spamming
function triggerSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(autoSave, 500);
}

async function loadSessionData(workoutName) {
  try {
    // First check if there's a session from today to resume
    const todayRes = await fetch(`/api/today-session?workout=${encodeURIComponent(workoutName)}`);
    const todayData = await todayRes.json();

    if (todayData && todayData.id) {
      // Resume today's session
      state.sessionId = todayData.id;
      // Use the persisted wall-clock anchor as the source of truth — total
      // elapsed is now (now - started_at), so it ticks regardless of when
      // the last save happened. Fall back to duration_sec if the row is
      // pre-migration and started_at is missing.
      if (todayData.started_at) {
        const startedMs = Date.parse(todayData.started_at);
        if (!isNaN(startedMs)) {
          state.timerStartedAt = startedMs;
          state.elapsed = Math.floor((Date.now() - startedMs) / 1000);
        } else {
          state.elapsed = todayData.duration_sec || 0;
        }
      } else {
        state.elapsed = todayData.duration_sec || 0;
      }
      // Auto-resume the running timer so the wall-clock continues to tick.
      startTimer();
      // Restore an in-flight rest period from localStorage (if any).
      restoreRestState();
      // Restore per-set grip choices for assist exercises.
      loadGripState();
      // Hydrate persistent per-exercise notes (no await — render() will
      // re-fire whenever a fetch resolves and we update state).
      fetchExerciseNotes().then(() => render());
      // Auto-detect swapped exercises: if saved exercise isn't in template but is in a swap group, replace the template entry
      const savedNames = new Set(todayData.sets.map(s => s.exercise));
      savedNames.forEach(name => {
        const inTemplate = state.workout.exercises.some(e => e.name === name);
        if (!inTemplate) {
          const group = getSwapGroup(name);
          if (group) {
            // Find which template exercise is in the same group and replace it
            const pairIdx = state.workout.exercises.findIndex(e => group.some(g => g.name === e.name));
            if (pairIdx >= 0) {
              const savedEx = group.find(g => g.name === name);
              state.workout.exercises[pairIdx] = { ...savedEx };
              console.log(`[RESUME] Auto-swapped → ${name}`);
            }
          }
        }
      });
      // Track max set_number per exercise to compute extraSets
      const maxSetNum = {};
      // Track per-sub-exercise occurrence counts for superset remapping
      const supersetCounts = {};
      todayData.sets.forEach(s => {
        let exIdx = state.workout.exercises.findIndex(e => e.name === s.exercise);
        let setNum = s.set_number;
        // Check inside superset exercises if not found at top level
        if (exIdx < 0) {
          for (let ei = 0; ei < state.workout.exercises.length; ei++) {
            const ex = state.workout.exercises[ei];
            if (ex.supersetExercises) {
              const subIdx = ex.supersetExercises.findIndex(sub => sub.name === s.exercise);
              if (subIdx >= 0) {
                exIdx = ei;
                // Track how many times we've seen this sub-exercise to determine the round
                const countKey = `${ei}-${subIdx}`;
                supersetCounts[countKey] = (supersetCounts[countKey] || 0);
                const round = supersetCounts[countKey];
                supersetCounts[countKey]++;
                setNum = round * ex.supersetExercises.length + subIdx + 1;
                break;
              }
            }
          }
        }
        if (exIdx < 0) return;
        const sk = s.set_type === "warmup" ? "warmup" : setNum - 1;
        const key = `${exIdx}-${sk}`;
        state.completed[key] = true;
        if (s.reps) state.reps[key] = parseInt(s.reps) || 0;
        // Parse bands first so weight reconciliation below can use them.
        let _bands = null;
        if (s.bands_json) {
          try {
            const parsed = JSON.parse(s.bands_json);
            if (Array.isArray(parsed) && parsed.length > 0) {
              _bands = parsed;
              if (!state.bands) state.bands = {};
              state.bands[`${key}-bands`] = parsed;
            }
          } catch(e) {}
        }
        // Storage convention recap (matches getEffectiveWeight at save time):
        //   • plain DB:  weight_lb = DB, state.weights stores DB
        //   • assist:    weight_lb = BW − bandSum, state.weights stores effective
        //   • band-only: weight_lb = bandSum, state.weights stores bandSum
        //   • bandAddon: weight_lb = DB + bandSum, state.weights MUST store
        //                DB-ONLY (otherwise bandSum gets added a second time
        //                at render → "75 + 15 = 90" corruption on reload)
        if (s.weight_lb) {
          const exHere = state.workout?.exercises?.[exIdx];
          if (exHere?.bandAddon && _bands) {
            const bandSum = _bands.reduce((a, b) => a + b, 0);
            state.weights[key] = Math.max(0, s.weight_lb - bandSum);
          } else {
            state.weights[key] = s.weight_lb;
          }
        }
        // Per-set grip (e.g. neutral/chinup/pullup for pull-ups). Restoring
        // here so reloads preserve what was tapped, plus the picker can show
        // "last grip" hints from previous sessions.
        if (s.grip) {
          if (!state.grip) state.grip = {};
          state.grip[key] = s.grip;
        }
        if (s.set_type === "working") {
          maxSetNum[exIdx] = Math.max(maxSetNum[exIdx] || 0, setNum);
        }
      });
      // Restore extra/fewer sets from DB
      state.extraSets = {};
      Object.entries(maxSetNum).forEach(([exIdx, maxNum]) => {
        const ex = state.workout.exercises[exIdx];
        const base = ex.supersetExercises ? ex.sets * ex.supersetExercises.length : ex.sets;
        // Only record EXTRA sets (added via + button). Never shrink the
        // template based on how many sets you've finished so far — that
        // would hide unfinished sets on resume.
        if (maxNum > base) {
          state.extraSets[exIdx] = maxNum - base;
        }
      });
      console.log(`[RESUME] Restored session #${todayData.id} with ${todayData.sets.length} sets`);
    }

    // Load hints + 1RM history — resilient: one failing endpoint must not
    // block the others or the final render() call.
    async function safeFetchJSON(url, fallback) {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${url} → ${r.status}`);
        return await r.json();
      } catch (e) {
        console.warn(`[LOAD] ${url} failed:`, e);
        return fallback;
      }
    }
    const motivationsUrl = state.sessionId
      ? `/api/motivations?session_id=${state.sessionId}`
      : null;
    const [lastJson, hintsJson, ormData, motivationsJson] = await Promise.all([
      safeFetchJSON(`/api/last-session?workout=${encodeURIComponent(workoutName)}`, {}),
      safeFetchJSON("/api/exercise-hints", {}),
      safeFetchJSON("/api/1rm-history", { orm: {}, reps: {}, vol: {} }),
      motivationsUrl ? safeFetchJSON(motivationsUrl, {}) : Promise.resolve({}),
    ]);
    state.lastSession = lastJson || {};
    state.exerciseHints = hintsJson || {};
    state.ormHistory = ormData.orm || {};
    state.repsHistory = ormData.reps || {};
    state.volHistory = ormData.vol || {};
    state.wtHistory = ormData.wt || {};

    // Hydrate persisted motivations: backend returns { exerciseName: message, ... }
    // We need to convert that into the state.motivations cache key format
    // `${sessionId}-${exIdx}` keyed by exercise position in the current workout.
    if (!state.motivations) state.motivations = {};
    if (!state.motivationsLoading) state.motivationsLoading = {};
    if (state.sessionId && motivationsJson && Object.keys(motivationsJson).length) {
      state.workout.exercises.forEach((ex, exIdx) => {
        const msg = motivationsJson[ex.name];
        if (msg) {
          state.motivations[String(exIdx)] = msg;
        }
      });
      // Workout-finish closer is stored under sentinel "__workout_finish__"
      const finishMsg = motivationsJson['__workout_finish__'];
      if (finishMsg) state.finishMotivation = finishMsg;
      console.log(`[MOTIVATE] Hydrated ${Object.keys(motivationsJson).length} motivations for session ${state.sessionId}`);
    }

    // Merge: same-workout session takes priority, cross-workout fills gaps
    const merged = { ...state.exerciseHints, ...state.lastSession };
    state.lastSession = merged;

    // Weight hints are handled by getHintWeight() — no pre-fill into state.weights
    // so they show as dotted suggestions, not pre-selected

    render();
  } catch (e) { console.error("[LOAD] Error:", e); }
}

async function loadHistory() {
  // kept for compat but home now loads history directly
  loadHomeData();
}

// Timer controls — total elapsed is always derived from a wall-clock
// anchor (state.timerStartedAt), persisted to the DB as `started_at`.
// That way reload mid-workout shows the true wall-clock time since the
// session began, not whatever happened to be saved at the last set.
function startTimer() {
  if (timerInterval) return;
  state.running = true;
  // Only set the anchor if it isn't already (preserve wall-clock origin
  // across pause/resume calls; the very-first start is set in startWorkout
  // or loadSessionData).
  if (!state.timerStartedAt) {
    state.timerStartedAt = Date.now() - (state.elapsed || 0) * 1000;
  }
  timerInterval = setInterval(tickTimer, 1000);
}
function tickTimer() {
  if (!state.running || !state.timerStartedAt) return;
  state.elapsed = Math.floor((Date.now() - state.timerStartedAt) / 1000);
  // Surgically update the elapsed-timer display in place. Avoids the full
  // render() that would destroy textarea focus on the notes editor (and any
  // other input the user is typing into) every single second.
  const el = document.getElementById('elapsed-timer');
  if (el) {
    el.textContent = formatTime(state.elapsed);
  } else {
    render();  // fallback if the header hasn't mounted yet
  }
}
function stopTimer() {
  state.running = false;
  clearInterval(timerInterval); timerInterval = null;
  state.timerStartedAt = 0;
}
function _restStorageKey() {
  // Scope by workout id so rest state from a different workout isn't picked up.
  const wid = state.workout?.id || '_';
  return `restState:${wid}`;
}
function _persistRestState() {
  try {
    if (state.resting && state.restEndAt) {
      localStorage.setItem(_restStorageKey(), JSON.stringify({
        endAt: state.restEndAt,
        dur: state.restDur,
      }));
    } else {
      localStorage.removeItem(_restStorageKey());
    }
  } catch (_) {}
}
function restoreRestState() {
  // Called from loadSessionData on workout-view entry. If localStorage has
  // an active rest that hasn't expired yet, resume the countdown so the
  // user picks back up where they were. If it's expired, just clear.
  try {
    const raw = localStorage.getItem(_restStorageKey());
    if (!raw) return;
    const saved = JSON.parse(raw);
    const left = saved && saved.endAt ? Math.ceil((saved.endAt - Date.now()) / 1000) : 0;
    if (left > 0) {
      state.resting = true;
      state.restEndAt = saved.endAt;
      state.restDur = saved.dur || left;
      state.restLeft = left;
      if (restInterval) clearInterval(restInterval);
      restInterval = setInterval(tickRest, 1000);
      console.log(`[REST] resumed with ${left}s left`);
    } else {
      localStorage.removeItem(_restStorageKey());
    }
  } catch (_) {}
}
function startRest(duration) {
  if (restInterval) { clearInterval(restInterval); restInterval = null; }
  if (!duration || duration <= 0) return;
  state.resting = true;
  state.restPaused = false;
  state.restDur = duration;
  state.restEndAt = Date.now() + duration * 1000;
  state.restLeft = duration;
  _persistRestState();
  restInterval = setInterval(tickRest, 1000);
}
function tickRest() {
  if (!state.resting || !state.restEndAt) return;
  if (state.restPaused) {
    // While paused: keep restLeft as a frozen value, don't drain. We still
    // patch the DOM so the "REST · PAUSED" label re-renders if needed.
    if (!_patchRestTimer()) render();
    return;
  }
  const left = Math.max(0, Math.ceil((state.restEndAt - Date.now()) / 1000));
  const wasResting = state.resting;
  state.restLeft = left;
  if (left <= 0) {
    clearInterval(restInterval); restInterval = null;
    state.resting = false; state.restEndAt = 0;
    _persistRestState();
    // Natural completion → flash the screen + brief "GO!" cue.
    if (wasResting) flashRestDone();
    render();  // full render only on transition (off → on or on → off)
    return;
  }
  // Per-second tick during active rest: patch the timer DOM in place. Skipping
  // the full render() preserves focus on textareas (e.g. exercise notes editor)
  // and inputs.
  if (!_patchRestTimer()) {
    render();  // fallback if the rest-timer node hasn't been mounted yet
  }
}
function flashRestDone() {
  const layer = ensureCelebrationLayer();
  // 2-second pulsing green glow — bright enough to register peripherally
  // even if you're looking at the picker. The keyframe handles the
  // fade-in / triple-pulse / fade-out timing.
  const flash = document.createElement('div');
  flash.style.cssText = `
    position:fixed;inset:0;pointer-events:none;
    background:radial-gradient(circle, rgba(34,197,94,0.55) 0%, rgba(34,197,94,0.15) 55%, rgba(34,197,94,0) 80%);
    box-shadow:inset 0 0 120px 40px rgba(34,197,94,0.45);
    animation: rest-done-flash 2000ms ease-out forwards;
  `;
  layer.appendChild(flash);
  setTimeout(() => flash.remove(), 2050);
  // Brief "GO!" centered
  const go = document.createElement('div');
  go.style.cssText = `
    position:absolute;left:50%;top:50%;
    font-size:64px;font-weight:900;font-family:'Impact','Helvetica Neue',sans-serif;
    color:#16a34a;letter-spacing:0.02em;
    text-shadow:3px 3px 0 #000, 0 0 18px rgba(22,163,74,0.5);
    animation: rest-done-go 900ms cubic-bezier(.2,.8,.3,1) forwards;
  `;
  go.textContent = 'GO!';
  layer.appendChild(go);
  setTimeout(() => go.remove(), 1000);
  // Mobile haptic if available — buzz on first beat + a subtle echo at ~1s
  try {
    navigator.vibrate && navigator.vibrate([120, 250, 80]);
  } catch (_) {}
}
function skipRest() {
  clearInterval(restInterval); restInterval = null;
  state.resting = false; state.restLeft = 0; state.restEndAt = 0;
  state.restPaused = false;
  _persistRestState();
  render();
}
// Pause / resume the rest countdown. When pausing we freeze restLeft and clear
// restEndAt; when resuming we rebase endAt = now + restLeft * 1000 so tickRest
// keeps draining naturally.
function togglePauseRest() {
  if (!state.resting) return;
  if (state.restPaused) {
    state.restPaused = false;
    state.restEndAt = Date.now() + state.restLeft * 1000;
  } else {
    state.restPaused = true;
    state.restLeft = Math.max(0, Math.ceil((state.restEndAt - Date.now()) / 1000));
    state.restEndAt = 0;
  }
  _persistRestState();
  render();
}
// Bump the remaining rest time by `secs` seconds. Updates restEndAt while
// running, or restLeft directly while paused. restDur grows with the bump
// so the progress-bar denominator stays sensible (otherwise +15 to a 60s
// timer with 5s left would show 100% fill immediately on resume).
function addRestSeconds(secs) {
  if (!state.resting) return;
  if (state.restPaused) {
    state.restLeft = Math.max(0, state.restLeft + secs);
  } else {
    state.restEndAt = Math.max(Date.now(), state.restEndAt + secs * 1000);
    state.restLeft = Math.max(0, Math.ceil((state.restEndAt - Date.now()) / 1000));
  }
  state.restDur = Math.max(state.restDur || 0, state.restLeft);
  _persistRestState();
  if (!_patchRestTimer()) render();
}
// Re-sync immediately when tab regains focus (mobile bg throttling).
function _resyncTimers() {
  if (state.resting) tickRest();
  if (state.running) tickTimer();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) _resyncTimers(); });
window.addEventListener('focus', _resyncTimers);

// Sets are now logged via logReps() in renderSetRow

// ----- Celebration animations -----
// Random funny visual when an exercise is finished. Once per (sessionId, exIdx).
function ensureCelebrationLayer() {
  let layer = document.getElementById('celebration-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'celebration-layer';
    document.body.appendChild(layer);
  }
  return layer;
}

const CELEBRATION_VARIANTS = [
  'Confetti', 'Emoji rain', 'Screen shake', 'Big text', 'Speech bubble',
  'Fireworks', 'Dumbbell drop', 'Side cannons', 'Flame ring', 'Slot reel',
];
// Common ↔ rare/cool. Higher weight = more frequent.
// Tuned so screen-shake/emoji-rain/confetti are normal (~15% each) and
// slot-reel/flame-ring are the rarest "wow" payoffs (~4-5%).
const CELEBRATION_WEIGHTS = [15, 15, 16, 9, 9, 7, 13, 7, 5, 4]; // sum ~100

function weightedPick(weights, exclude) {
  let total = 0;
  for (let i = 0; i < weights.length; i++) if (i !== exclude) total += weights[i];
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    if (i === exclude) continue;
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function runCelebration(exIdx) {
  const sid = state.sessionId || 'tmp';
  const key = `${sid}-${exIdx}`;
  if (!state.celebrations) state.celebrations = {};
  if (state.celebrations[key]) return;
  state.celebrations[key] = true;
  playCelebration();
}

function playCelebration(idx) {
  const layer = ensureCelebrationLayer();
  const variants = [
    ceConfetti, ceEmojiRain, ceShake, ceBigText, ceSpeechBubble,
    ceFireworks, ceDumbbellDrop, ceCannons, ceFlameRing, ceSlotReel,
  ];
  let pick;
  if (idx == null) {
    pick = weightedPick(CELEBRATION_WEIGHTS, state._lastBigCe);
    state._lastBigCe = pick;
  } else {
    pick = idx % variants.length;
  }
  try { variants[pick](layer); } catch (e) { console.warn('[celebration]', e); }
}
// Expose for console testing
window.playCelebration = playCelebration;

function ceMakeEl(tag, parent, style, text) {
  const el = document.createElement(tag);
  if (style) el.style.cssText = style;
  if (text != null) el.textContent = text;
  parent.appendChild(el);
  return el;
}
function ceCleanup(el, ms) { setTimeout(() => el.remove(), ms); }
function ceRand(min, max) { return Math.random() * (max - min) + min; }
function cePick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// 1. Confetti burst from center
// 1. Confetti burst from center
function ceConfetti(layer) {
  const colors = ['#ef4444','#f59e0b','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899','#06b6d4'];
  for (let i = 0; i < 50; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = ceRand(120, 320);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist + 60; // bias downward (gravity)
    const size = ceRand(6, 12);
    const p = ceMakeEl('div', layer, `
      left:50%;top:50%;width:${size}px;height:${size * 0.5}px;background:${cePick(colors)};
      border-radius:2px;--dx:${dx}px;--dy:${dy}px;--rot:${ceRand(180, 720)}deg;
      animation: ce-confetti ${ceRand(900, 1500)}ms cubic-bezier(.2,.6,.3,1) forwards;
    `);
    ceCleanup(p, 1600);
  }
}

// 2. Emoji rain from top
function ceEmojiRain(layer) {
  const emojis = ['💪','🔥','👏','🎉','⭐','🚀','💥','🏋️','✨','🥇'];
  for (let i = 0; i < 28; i++) {
    const e = ceMakeEl('div', layer, `
      left:${ceRand(0, 100)}%;top:0;font-size:${ceRand(20, 36)}px;
      animation: ce-fall ${ceRand(1400, 2400)}ms linear forwards;
      animation-delay:${ceRand(0, 600)}ms;
    `, cePick(emojis));
    ceCleanup(e, 3200);
  }
}

// 3. Screen shake
function ceShake(_layer) {
  document.body.classList.add('ce-shaking');
  setTimeout(() => document.body.classList.remove('ce-shaking'), 600);
}

// 4. Big bold "BOOM!" text
function ceBigText(layer) {
  const words = ['BOOM!','NICE!','BEAST!','LEGEND','CRUSHED IT','💯','LFG!','LET\'S GO','HUGE!','DONE!'];
  const colors = ['#fbbf24','#f97316','#ef4444','#22c55e','#3b82f6','#a855f7','#ec4899'];
  const el = ceMakeEl('div', layer, `
    position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    font-size:14vw;font-weight:900;font-family:'Impact','Helvetica Neue',sans-serif;
    color:${cePick(colors)};text-shadow:4px 4px 0 #000,8px 8px 0 rgba(0,0,0,0.2);
    letter-spacing:-0.02em;white-space:nowrap;
    animation: ce-bigtext 1.4s cubic-bezier(.2,.8,.3,1) forwards;
  `, cePick(words));
  ceCleanup(el, 1500);
}

// 5. Comic speech bubble
function ceSpeechBubble(layer) {
  const lines = ['POW!','ZAP!','BAM!','WHAM!','KABOOM!','OOMPH!','SLAM!','SMASH!','BLAST!','POW POW!'];
  const el = ceMakeEl('div', layer, `
    position:absolute;left:50%;top:50%;
    background:#fde047;color:#7c2d12;padding:18px 32px;
    border:4px solid #000;border-radius:50% / 38%;
    font-size:42px;font-weight:900;font-family:'Impact','Comic Sans MS',sans-serif;
    box-shadow:6px 6px 0 #000;letter-spacing:0.04em;
    animation: ce-bubble 1.5s cubic-bezier(.2,.8,.3,1) forwards;
  `, cePick(lines));
  ceCleanup(el, 1600);
}

// 6. Fireworks (3 bursts)
function ceFireworks(layer) {
  const starColors = ['#fbbf24','#ef4444','#22c55e','#3b82f6','#ec4899','#06b6d4'];
  for (let burst = 0; burst < 3; burst++) {
    const cx = ceRand(20, 80), cy = ceRand(20, 60); // viewport %
    setTimeout(() => {
      const color = cePick(starColors);
      for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2;
        const dist = ceRand(80, 140);
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        const p = ceMakeEl('div', layer, `
          left:${cx}%;top:${cy}%;width:8px;height:8px;background:${color};border-radius:50%;
          box-shadow:0 0 12px ${color};
          --dx:${dx}px;--dy:${dy}px;
          animation: ce-firework 900ms ease-out forwards;
        `);
        ceCleanup(p, 1000);
      }
    }, burst * 250);
  }
}

// 7. Dumbbell drops & bounces
function ceDumbbellDrop(layer) {
  const e = ceMakeEl('div', layer, `
    position:absolute;left:50%;top:50%;font-size:96px;
    animation: ce-bounce 1.6s cubic-bezier(.5,0,.5,1) forwards;
  `, cePick(['🏋️','💪','🥇','🏆']));
  ceCleanup(e, 1700);
}

// 8. Side cannons
function ceCannons(layer) {
  const colors = ['#ef4444','#f59e0b','#22c55e','#3b82f6','#a855f7','#ec4899'];
  for (let i = 0; i < 30; i++) {
    const fromLeft = i % 2 === 0;
    const dx = fromLeft ? ceRand(40, 220) : ceRand(-220, -40);
    const dy = ceRand(-160, 160);
    const size = ceRand(7, 13);
    const p = ceMakeEl('div', layer, `
      left:50%;top:50%;width:${size}px;height:${size}px;background:${cePick(colors)};border-radius:50%;
      --dx:${dx}px;--dy:${dy}px;--rot:${ceRand(180, 720)}deg;
      animation: ce-${fromLeft ? 'cannonL' : 'cannonR'} ${ceRand(900, 1400)}ms cubic-bezier(.2,.7,.3,1) forwards;
      animation-delay:${ceRand(0, 200)}ms;
    `);
    ceCleanup(p, 1700);
  }
}

// 9. (RARE 5%) Flame ring rising up + screen shake at peak + emoji rain finale
function ceFlameRing(layer) {
  for (let i = 0; i < 22; i++) {
    const dx = ceRand(-200, 200);
    const e = ceMakeEl('div', layer, `
      position:absolute;left:50%;bottom:0;font-size:${ceRand(30, 54)}px;
      --dx:${dx}px;
      animation: ce-flameUp ${ceRand(1600, 2400)}ms ease-out forwards;
      animation-delay:${ceRand(0, 500)}ms;
    `, cePick(['🔥','🔥','🔥','💥','⚡','✨']));
    ceCleanup(e, 3100);
  }
  setTimeout(() => {
    document.body.classList.add('ce-shaking');
    setTimeout(() => document.body.classList.remove('ce-shaking'), 600);
  }, 700);
  setTimeout(() => {
    for (let i = 0; i < 14; i++) {
      const e = ceMakeEl('div', layer, `
        left:${ceRand(0, 100)}%;top:0;font-size:${ceRand(22, 36)}px;
        animation: ce-fall ${ceRand(1400, 2200)}ms linear forwards;
        animation-delay:${ceRand(0, 300)}ms;
      `, cePick(['🔥','💥','⚡']));
      ceCleanup(e, 3000);
    }
  }, 1400);
}

// 10. (RAREST 4%) Slot reel — cycle, land on trophy, then confetti burst from trophy
function ceSlotReel(layer) {
  const cycle = ['🎰','💪','🔥','🏋️','💯','🏆','🥇','⚡','🚀','🎯','🏅'];
  const el = ceMakeEl('div', layer, `
    position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(0);
    font-size:120px;animation: ce-slotPop 220ms ease-out forwards;
    filter: drop-shadow(0 4px 20px rgba(245,158,11,0.5));
  `, '🎰');
  let i = 0;
  const tick = setInterval(() => {
    el.textContent = cycle[i % cycle.length];
    i++;
  }, 80);
  setTimeout(() => {
    clearInterval(tick);
    el.textContent = '🏆';
    el.style.transition = 'transform 380ms cubic-bezier(.2,1.4,.4,1)';
    el.style.transform = 'translate(-50%,-50%) scale(1.6)';
  }, 1100);
  setTimeout(() => {
    const colors = ['#fbbf24','#ef4444','#22c55e','#3b82f6','#a855f7','#ec4899','#f59e0b'];
    for (let k = 0; k < 60; k++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = ceRand(140, 360);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist + 50;
      const size = ceRand(7, 13);
      const p = ceMakeEl('div', layer, `
        left:50%;top:50%;width:${size}px;height:${size * 0.5}px;background:${cePick(colors)};
        border-radius:2px;--dx:${dx}px;--dy:${dy}px;--rot:${ceRand(180, 720)}deg;
        animation: ce-confetti ${ceRand(1000, 1700)}ms cubic-bezier(.2,.6,.3,1) forwards;
      `);
      ceCleanup(p, 1800);
    }
  }, 1550);
  setTimeout(() => {
    el.style.transition = 'transform 500ms ease-in, opacity 500ms ease-in';
    el.style.transform = 'translate(-50%,-65%) scale(1.3)';
    el.style.opacity = '0';
  }, 2400);
  ceCleanup(el, 3200);
}

// ----- Per-set subtle animations -----
const SET_VARIANTS = [
  'Pulse ring','Mini burst','+reps popup','Check pop','Ripple wave',
  'Sparkle trio','Pop & shrink','Up arrow','Star burst','Color flash',
];
const SET_WEIGHTS = [18, 17, 15, 13, 8, 7, 4, 5, 3, 10];

function runSetCelebration(rect, reps) {
  if (!rect) return;
  const layer = ensureCelebrationLayer();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const variants = [setPulseRing, setMiniBurst, setRepsPopup, setCheckPop, setRipple,
                    setSparkleTrio, setPopShrink, setUpArrow, setStarBurst, setFlash];
  const pick = weightedPick(SET_WEIGHTS, state._lastSetAnim);
  state._lastSetAnim = pick;
  try { variants[pick](layer, x, y, reps); } catch (e) { console.warn('[setCe]', e); }
}

function playSetCelebration(idx) {
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const layer = ensureCelebrationLayer();
  const variants = [setPulseRing, setMiniBurst, setRepsPopup, setCheckPop, setRipple,
                    setSparkleTrio, setPopShrink, setUpArrow, setStarBurst, setFlash];
  const pick = (idx == null) ? weightedPick(SET_WEIGHTS) : (idx % variants.length);
  try { variants[pick](layer, cx, cy, 10); } catch (e) { console.warn('[setCe]', e); }
}
window.playSetCelebration = playSetCelebration;

function setPulseRing(layer, x, y) {
  const c = '#22c55e';
  const e = ceMakeEl('div', layer, `
    position:absolute;left:${x}px;top:${y}px;width:42px;height:42px;border-radius:50%;
    border:3px solid ${c};
    animation: set-ring 1100ms ease-out forwards;
  `);
  ceCleanup(e, 1200);
}

function setMiniBurst(layer, x, y) {
  const colors = ['#22c55e','#3b82f6','#f59e0b','#ec4899'];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 + ceRand(-0.3, 0.3);
    const dist = ceRand(36, 64);
    const dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist;
    const e = ceMakeEl('div', layer, `
      position:absolute;left:${x}px;top:${y}px;width:7px;height:7px;background:${cePick(colors)};border-radius:50%;
      --dx:${dx}px;--dy:${dy}px;
      animation: set-mini-burst 950ms cubic-bezier(.2,.8,.3,1) forwards;
    `);
    ceCleanup(e, 1050);
  }
}

function setRepsPopup(layer, x, y, reps) {
  const e = ceMakeEl('div', layer, `
    position:absolute;left:${x}px;top:${y - 18}px;
    font-size:16px;font-weight:800;color:#15803d;
    text-shadow:0 1px 2px rgba(255,255,255,0.95), 0 0 10px rgba(34,197,94,0.5);
    animation: set-popup-up 1100ms cubic-bezier(.2,.8,.3,1) forwards;
  `, `+${reps}`);
  ceCleanup(e, 1200);
}

function setCheckPop(layer, x, y) {
  const e = ceMakeEl('div', layer, `
    position:absolute;left:${x}px;top:${y}px;
    font-size:34px;color:#22c55e;font-weight:900;
    text-shadow:0 1px 3px rgba(255,255,255,0.95), 0 0 12px rgba(34,197,94,0.4);
    animation: set-check 900ms cubic-bezier(.2,.8,.3,1) forwards;
  `, '✓');
  ceCleanup(e, 1000);
}

function setRipple(layer, x, y) {
  for (let i = 0; i < 2; i++) {
    const e = ceMakeEl('div', layer, `
      position:absolute;left:${x}px;top:${y}px;width:32px;height:32px;border-radius:50%;
      background:radial-gradient(circle, rgba(34,197,94,0.45) 0%, rgba(34,197,94,0) 70%);
      animation: set-ripple 1100ms ease-out forwards;
      animation-delay:${i * 220}ms;
    `);
    ceCleanup(e, 1400);
  }
}

function setSparkleTrio(layer, x, y) {
  const offsets = [[-26, -20], [26, -20], [0, 28]];
  for (const [dx, dy] of offsets) {
    const e = ceMakeEl('div', layer, `
      position:absolute;left:${x}px;top:${y}px;
      font-size:18px;
      --dx:${dx}px;--dy:${dy}px;
      animation: set-sparkle 1100ms cubic-bezier(.2,.8,.3,1) forwards;
      animation-delay:${ceRand(0, 120)}ms;
    `, '✨');
    ceCleanup(e, 1300);
  }
}

function setPopShrink(layer, x, y) {
  const e = ceMakeEl('div', layer, `
    position:absolute;left:${x}px;top:${y}px;width:48px;height:48px;border-radius:50%;
    background:radial-gradient(circle, #4ade80 0%, #22c55e 70%);
    box-shadow:0 0 18px rgba(34,197,94,0.6);
    animation: set-pop-shrink 900ms cubic-bezier(.4,0,.2,1) forwards;
  `);
  ceCleanup(e, 1000);
  setTimeout(() => setSparkleTrio(layer, x, y), 480);
}

function setUpArrow(layer, x, y) {
  const e = ceMakeEl('div', layer, `
    position:absolute;left:${x}px;top:${y - 10}px;
    font-size:22px;font-weight:800;color:#3b82f6;
    text-shadow:0 1px 3px rgba(255,255,255,0.95), 0 0 10px rgba(59,130,246,0.4);
    animation: set-arrow-up 1100ms cubic-bezier(.3,.9,.4,1) forwards;
  `, '↑');
  ceCleanup(e, 1200);
}

function setStarBurst(layer, x, y) {
  const ring = ceMakeEl('div', layer, `
    position:absolute;left:${x}px;top:${y}px;width:38px;height:38px;border-radius:50%;
    border:2px solid #f59e0b;box-shadow:0 0 14px rgba(245,158,11,0.7);
    animation: set-ring 900ms ease-out forwards;
  `);
  ceCleanup(ring, 1000);
  const star = ceMakeEl('div', layer, `
    position:absolute;left:${x}px;top:${y}px;
    font-size:34px;color:#f59e0b;
    text-shadow:0 0 14px rgba(245,158,11,0.85);
    animation: set-star 1000ms cubic-bezier(.2,.8,.3,1) forwards;
    animation-delay:120ms;opacity:0;
  `, '★');
  ceCleanup(star, 1300);
  setTimeout(() => {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = ceRand(40, 70);
      const dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist;
      const sp = ceMakeEl('div', layer, `
        position:absolute;left:${x}px;top:${y}px;font-size:12px;
        --dx:${dx}px;--dy:${dy}px;
        animation: set-sparkle 900ms cubic-bezier(.2,.8,.3,1) forwards;
      `, cePick(['✨','⭐','✦']));
      ceCleanup(sp, 1000);
    }
  }, 350);
}

function setFlash(layer, x, y) {
  const c = cePick(['#22c55e','#3b82f6','#f59e0b','#a855f7']);
  for (let i = 0; i < 2; i++) {
    const e = ceMakeEl('div', layer, `
      position:absolute;left:${x}px;top:${y}px;width:38px;height:38px;border-radius:50%;
      background:${c};opacity:0;
      animation: set-flash 900ms ease-out forwards;
      animation-delay:${i * 200}ms;
    `);
    ceCleanup(e, 1200);
  }
}

// ----- AI motivation -----
async function requestMotivation(exIdx) {
  const ex = state.workout.exercises[exIdx];
  const cacheKey = String(exIdx);
  if (!state.motivations) state.motivations = {};
  if (!state.motivationsLoading) state.motivationsLoading = {};
  if (state.motivations[cacheKey]) return;
  if (state.motivationsLoading[cacheKey]) return;
  state.motivationsLoading[cacheKey] = true;
  console.log('[MOTIVATE] requesting for exIdx=' + exIdx + ' (' + ex.name + ')');

  const subs = ex.supersetExercises || [{ name: ex.name, ...ex }];
  const subNames = subs.map(s => s.name);
  const current = [];
  if (state.completed[`${exIdx}-warmup`]) {
    current.push({
      sub: ex.name,
      type: 'warmup',
      reps: state.reps[`${exIdx}-warmup`],
      weight_lb: state.weights[`${exIdx}-warmup`],
    });
  }
  for (let i = 0; i < getSetCount(exIdx); i++) {
    if (!state.completed[`${exIdx}-${i}`]) continue;
    const subEx = getSubExercise(exIdx, i);
    current.push({
      sub: subEx ? subEx.name : ex.name,
      type: 'working',
      set_number: i + 1,
      reps: state.reps[`${exIdx}-${i}`],
      weight_lb: state.weights[`${exIdx}-${i}`],
    });
  }

  const previous = [];
  for (const sess of (state.history || []).slice(0, 4)) {
    const sets = sess.sets.filter(s => subNames.includes(s.exercise));
    if (sets.length) previous.push({
      date: sess.date,
      sets: sets.map(s => ({ sub: s.exercise, type: s.set_type, reps: s.reps, weight_lb: s.weight_lb })),
    });
    if (previous.length >= 2) break;
  }

  const muscles = [];
  for (const name of subNames) {
    const m = (typeof MUSCLE_MAPPING === 'object' && MUSCLE_MAPPING[name]) || null;
    if (m) muscles.push(...(m.primary || []), ...(m.secondary || []));
  }

  const today = (typeof localDate === 'function') ? localDate() : new Date().toISOString().slice(0, 10);
  const todayMs = Date.parse(today + 'T00:00:00Z');
  const prs = subNames.map(subName => {
    const ormHist = ((state.ormHistory || {})[subName] || []).filter(d => d.date !== today);
    const wtHist = ((state.wtHistory || {})[subName] || []).filter(d => d.date !== today);
    const repsHist = ((state.repsHistory || {})[subName] || []).filter(d => d.date !== today);
    const volHist = ((state.volHistory || {})[subName] || []).filter(d => d.date !== today);
    const prevMaxOrm = ormHist.length ? Math.max(...ormHist.map(d => +d.orm || 0)) : 0;
    const prevMaxWt = wtHist.length ? Math.max(...wtHist.map(d => +d.wt || 0)) : 0;
    const prevMaxReps = repsHist.length ? Math.max(...repsHist.map(d => +d.reps || 0)) : 0;
    const curOrm = currentSessionOrm(subName) || 0;
    const curWt = currentSessionMaxWeight(subName) || 0;
    const curReps = currentSessionBestReps(subName) || 0;
    const curVol = currentSessionVolume(subName) || 0;

    const byDate = {};
    ormHist.forEach(d => { (byDate[d.date] = byDate[d.date] || { date: d.date }).orm = +d.orm || 0; });
    wtHist.forEach(d  => { (byDate[d.date] = byDate[d.date] || { date: d.date }).wt  = +d.wt  || 0; });
    repsHist.forEach(d=> { (byDate[d.date] = byDate[d.date] || { date: d.date }).reps= +d.reps|| 0; });
    volHist.forEach(d => { (byDate[d.date] = byDate[d.date] || { date: d.date }).vol = +d.vol || 0; });
    const history = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    const trimmed = history.slice(-12);

    const lastSessionDate = history.length ? history[history.length - 1].date : null;
    const daysSinceLast = lastSessionDate
      ? Math.round((todayMs - Date.parse(lastSessionDate + 'T00:00:00Z')) / 86400000)
      : null;
    const recent = history.filter(h => todayMs - Date.parse(h.date + 'T00:00:00Z') <= 28 * 86400000);
    const prior  = history.filter(h => {
      const ago = todayMs - Date.parse(h.date + 'T00:00:00Z');
      return ago > 28 * 86400000 && ago <= 56 * 86400000;
    });
    const avg = arr => arr.length ? arr.reduce((s, x) => s + (+x.vol || 0), 0) / arr.length : 0;
    const recentAvg = avg(recent), priorAvg = avg(prior);
    const volTrendPct = priorAvg > 0 ? Math.round((recentAvg - priorAvg) / priorAvg * 100) : null;

    const sameWtReps = curWt > 0 ? history.filter(h => h.wt === curWt).map(h => h.reps).filter(r => r > 0) : [];
    const repsAtCurWtImproved = sameWtReps.length >= 2 && curReps > Math.max(...sameWtReps);

    return {
      sub: subName,
      current_orm: curOrm, previous_best_orm: prevMaxOrm, is_orm_pr: !!(curOrm && curOrm > prevMaxOrm),
      current_max_weight: curWt, previous_best_weight: prevMaxWt, is_weight_pr: !!(curWt && curWt > prevMaxWt),
      current_max_reps: curReps, previous_best_reps: prevMaxReps, is_reps_pr: !!(curReps && curReps > prevMaxReps),
      current_volume: curVol,
      sessions_in_history: history.length,
      days_since_last_session: daysSinceLast,
      returning_after_layoff: daysSinceLast != null && daysSinceLast >= 14,
      vol_trend_pct_4wk_vs_prior: volTrendPct,
      reps_at_current_weight_improved: repsAtCurWtImproved,
      tied_previous_best_orm: !!(curOrm && prevMaxOrm && curOrm === prevMaxOrm),
      history_timeseries: trimmed,
    };
  });

  try {
    const res = await fetch('/api/motivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: state.sessionId, exercise: ex.name, muscles: [...new Set(muscles)], current, previous, prs }),
    });
    const data = await res.json();
    state.motivations[cacheKey] = data.message || null;
  } catch (e) {
    console.warn('[MOTIVATE]', e);
    state.motivations[cacheKey] = null;
  } finally {
    state.motivationsLoading[cacheKey] = false;
    render();
  }
}

function dismissMotivation() {
  state.activeMotivation = null;
  render();
}

async function requestFinishMotivation(opts) {
  opts = opts || {};
  if (!opts.force && (state.finishMotivation || state.finishMotivationLoading)) return;
  if (opts.force) state.finishMotivation = null;
  state.finishMotivationLoading = true;
  console.log(`[FINISH] requesting closer message${opts.force ? ' (regenerate)' : ''}`);
  if (opts.force) render();

  const allSubs = [];
  state.workout.exercises.forEach(ex => {
    if (ex.supersetExercises) ex.supersetExercises.forEach(s => allSubs.push(s.name));
    else allSubs.push(ex.name);
  });
  const today = (typeof localDate === 'function') ? localDate() : new Date().toISOString().slice(0, 10);
  const prs = [];
  let totalVolume = 0;
  let totalSets = 0;
  for (const subName of [...new Set(allSubs)]) {
    const ormHist = ((state.ormHistory || {})[subName] || []).filter(d => d.date !== today);
    const wtHist = ((state.wtHistory || {})[subName] || []).filter(d => d.date !== today);
    const repsHist = ((state.repsHistory || {})[subName] || []).filter(d => d.date !== today);
    const prevMaxOrm = ormHist.length ? Math.max(...ormHist.map(d => +d.orm || 0)) : 0;
    const prevMaxWt = wtHist.length ? Math.max(...wtHist.map(d => +d.wt || 0)) : 0;
    const prevMaxReps = repsHist.length ? Math.max(...repsHist.map(d => +d.reps || 0)) : 0;
    const curOrm = currentSessionOrm(subName) || 0;
    const curWt = currentSessionMaxWeight(subName) || 0;
    const curReps = currentSessionBestReps(subName) || 0;
    if (curOrm > 0 || curReps > 0) {
      prs.push({
        sub: subName,
        current_orm: curOrm, previous_best_orm: prevMaxOrm, is_orm_pr: !!(curOrm && curOrm > prevMaxOrm),
        current_max_weight: curWt, previous_best_weight: prevMaxWt, is_weight_pr: !!(curWt && curWt > prevMaxWt),
        current_max_reps: curReps, previous_best_reps: prevMaxReps, is_reps_pr: !!(curReps && curReps > prevMaxReps),
      });
    }
  }
  state.workout.exercises.forEach((ex, exIdx) => {
    for (let i = 0; i < getSetCount(exIdx); i++) {
      if (!state.completed[`${exIdx}-${i}`]) continue;
      totalSets++;
      const w = state.weights[`${exIdx}-${i}`] || 0;
      const r = parseInt(state.reps[`${exIdx}-${i}`]) || 0;
      totalVolume += w * r;
    }
  });

  try {
    const res = await fetch('/api/motivate-finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: state.sessionId,
        workout: state.workout.name,
        duration_sec: state.elapsed,
        total_sets: totalSets,
        total_volume_lb: Math.round(totalVolume),
        exercises: state.workout.exercises.map(e => e.name),
        prs,
      }),
    });
    const data = await res.json();
    state.finishMotivation = data.message || null;
    if (data.message && !opts.force) state.activeFinishMotivation = data.message;
  } catch (e) {
    console.warn('[FINISH]', e);
    state.finishMotivation = null;
  } finally {
    state.finishMotivationLoading = false;
    render();
  }
}

function dismissFinishMotivation() {
  state.activeFinishMotivation = null;
  render();
}

// Shell routing & UI controls
function showFinishMotivation() {
  if (state.finishMotivation) {
    state.activeFinishMotivation = state.finishMotivation;
    render();
  }
}

function regenerateFinishMotivation() {
  if (state.finishMotivationLoading) return;
  requestFinishMotivation({ force: true });
}

function showMotivation(exIdx) {
  const msg = state.motivations?.[String(exIdx)];
  if (msg) {
    state.activeMotivation = { exIdx, msg };
    render();
  }
}

function startWorkout(w) {
  window.location.assign('/workout?w=' + encodeURIComponent(w.id));
}

// Render
function render() {
  const app = document.getElementById("app");
  if (state.screen === "home") app.innerHTML = renderHome();
  else if (state.screen === "workout") app.innerHTML = renderWorkout();
  else if (state.screen === "measurements") app.innerHTML = renderMeasurements();
  requestAnimationFrame(scrollToSelected);
}



async function showMeasurements() {
  state.screen = "measurements";
  history.replaceState(null, '', '#measurements');
  render();
  if (!state.measurements) {
    try {
      const res = await fetch('/api/measurements');
      state.measurements = await res.json();
    } catch (e) {
      console.warn('[MEASUREMENTS] load failed:', e);
      state.measurements = [];
    }
    render();
  }
}

function scrollToSelected() {
  document.querySelectorAll('.scroll-row').forEach(row => {
    const target = row.querySelector('[data-scroll-target]');
    if (!target || row.scrollWidth <= row.clientWidth) return;
    const rowRect = row.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetCenterInRow = (targetRect.left - rowRect.left) + row.scrollLeft + targetRect.width / 2;
    row.scrollLeft = Math.max(0, targetCenterInRow - rowRect.width / 2);
  });
}

function getExerciseStatsFromHistory(exName) {
  const history = state.history || [];
  const perSession = [];
  const isAssist = exName === "Bench Dips" || exName === "Assisted Pull-Ups";
  for (const s of history) {
    let bestOrm = isAssist ? -Infinity : 0, maxReps = 0, didLog = false;
    for (const st of (s.sets || [])) {
      if (st.exercise !== exName || st.set_type !== 'working') continue;
      const r = parseInt(st.reps) || 0;
      const w = st.weight_lb || 0;
      if (r <= 0) continue;
      didLog = true;
        const orm = calcSet1RM(exName, w, r, st.bands_json);
        if (orm > bestOrm) bestOrm = orm;
      if (r > maxReps) maxReps = r;
    }
    if (didLog) perSession.push({ date: s.date, orm: bestOrm === -Infinity ? 0 : bestOrm, reps: maxReps });
  }
  perSession.reverse();
  if (!perSession.length) return null;
  const ormVals = perSession.map(p => p.orm).filter(v => isAssist ? v > -1000 : v > 0);
  const repsVals = perSession.map(p => p.reps);
  const series = ormVals.length >= 2 ? ormVals : repsVals;
  if (series.length < 1) return null;
  const latest = series[series.length - 1];
  const peak = Math.max(...series);
  const prev = series.length >= 2 ? series[series.length - 2] : null;
  const isPR = latest >= peak && series.length >= 2;
  const isImproved = prev != null && latest > prev;
  const isStreak = series.length >= 3
    && series[series.length - 1] > series[series.length - 2]
    && series[series.length - 2] > series[series.length - 3];
  return { series, isPR, isImproved, isStreak, sessionCount: perSession.length, latest };
}

function getExpectedSets(workoutName) {
  const w = WORKOUTS.find(w => w.name === workoutName);
  if (!w) return 999;
  return w.exercises.reduce((s, e) => s + e.sets + 1, 0);
}

function isExerciseFullyDone(exIdx) {
  if (!state.workout) return false;
  const ex = state.workout.exercises[exIdx];
  if (!ex) return false;
  const isSuperset = !!ex.supersetExercises;
  const warmupDone = !!state.completed[`${exIdx}-warmup`];
  const warmupOff = !!state.warmupOff?.[exIdx];
  const setCount = getSetCount(exIdx);
  if (!(isSuperset || warmupDone || warmupOff)) return false;
  for (let i = 0; i < setCount; i++) {
    if (!state.completed[`${exIdx}-${i}`]) return false;
  }
  return true;
}

function toggleWarmup(exIdx) {
  if (!state.warmupOff) state.warmupOff = {};
  const workoutWasDoneBefore = allDone();
  const wasDoneBefore = isExerciseFullyDone(exIdx);
  state.warmupOff[exIdx] = !state.warmupOff[exIdx];
  if (state.warmupOff[exIdx]) {
    state.completed[`${exIdx}-warmup`] = true;
  } else {
    delete state.completed[`${exIdx}-warmup`];
  }
  if (!wasDoneBefore && isExerciseFullyDone(exIdx)) {
    runCelebration(exIdx);
  }
  triggerSave();
  render();
}

function getNextSet() {
  if (!state.workout) return null;
  const w = state.workout;
  for (let exIdx = 0; exIdx < w.exercises.length; exIdx++) {
    const ex = w.exercises[exIdx];
    const warmupOff = state.warmupOff?.[exIdx];
    if (!ex.supersetExercises && !warmupOff && !state.completed[`${exIdx}-warmup`]) return { exIdx, setKey: "warmup" };
    for (let i = 0; i < getSetCount(exIdx); i++) {
      if (!state.completed[`${exIdx}-${i}`]) return { exIdx, setKey: i };
    }
  }
  return null;
}

function _patchRestTimer() {
  const text = document.getElementById('rest-timer-text');
  const bar = document.getElementById('rest-timer-bar');
  const label = document.getElementById('rest-timer-label');
  const root = document.getElementById('rest-timer');
  if (!text || !bar || !root) return false;
  const dur = state.restDur || state.workout.rest || 60;
  const left = Math.max(0, state.restLeft || 0);
  const pct = Math.max(0, Math.min(100, ((dur - left) / dur) * 100));
  const isLow = left <= 10;
  const paused = !!state.restPaused;
  const accent = paused ? "#FBBF24" : isLow ? "#FBBF24" : "#60A5FA";
  const accentBg = paused ? "rgba(251,191,36,0.10)" : isLow ? "rgba(251,191,36,0.10)" : "rgba(96,165,250,0.10)";
  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, '0');
  text.textContent = `${m}:${s}`;
  bar.style.width = `${pct}%`;
  bar.style.background = `linear-gradient(90deg,${accent}30,${accent}14)`;
  root.style.borderColor = `${accent}55`;
  root.style.background = accentBg;
  if (label) {
    label.textContent = paused ? 'REST · PAUSED' : 'REST';
    label.style.color = accent;
  }
  return true;
}

function getRepsOptions(targetReps) {
  const [lo, hi] = parseRepRange(targetReps);
  const pad = hi - lo <= 3 ? 3 : 2;
  const start = 1;
  const end = hi + pad;
  const opts = [];
  for (let i = start; i <= end; i++) opts.push(i);
  return opts;
}

function repsBtnStyle(r, selected, hinted, inRange) {
  if (selected) return 'background:#22c55e;color:white;box-shadow:0 1px 3px rgba(34,197,94,0.4);outline:2px solid #86efac;';
  if (hinted) return 'background:white;color:#86efac;border:2px dashed #86efac;';
  if (inRange) return 'background:#f0fdf4;color:#16a34a;border:1.5px solid #86efac;';
  return 'background:#fafafa;color:#a3a3a3;border:1px solid #e5e7eb;';
}

function parseRepRange(repsStr) {
  const parts = String(repsStr).split("-").map(s => parseInt(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts;
  if (parts.length === 1 && !isNaN(parts[0])) return [parts[0], parts[0]];
  return [8, 12];
}

function _exerciseAt(exIdx, setKey) {
  const ex = state.workout?.exercises?.[exIdx];
  if (!ex) return null;
  const subEx = (typeof setKey === 'number') ? getSubExercise(exIdx, setKey) : null;
  const effective = subEx ? { ...ex, ...subEx } : ex;
  return { ex, subEx, effective, name: subEx ? subEx.name : ex.name };
}

function _nextWeightStep(currentLb, effectiveEx) {
  const ladder = [...new Set([...WEIGHTS_LB, ...(effectiveEx.extraWeights || [])])].sort((a,b) => a-b);
  const next = ladder.find(w => w > currentLb);
  return next ?? null;
}

function _prevWeightStep(currentLb, effectiveEx) {
  const ladder = [...new Set([...WEIGHTS_LB, ...(effectiveEx.extraWeights || [])])].sort((a,b) => a-b);
  let prev = null;
  for (const w of ladder) { if (w < currentLb) prev = w; else break; }
  return prev;
}

function _lighterAssist(currentBands) {
  if (!currentBands || currentBands.length === 0) return null;
  const sorted = currentBands.slice().sort((a,b) => a-b);
  return sorted.slice(1);
}

function _heavierBandStack(currentBands) {
  const used = new Set(currentBands || []);
  const lightestUnused = BANDS.find(b => !used.has(b.lb));
  if (lightestUnused) return [...(currentBands || []), lightestUnused.lb];
  return null;
}

function getProgressionSuggestion(exIdx, setKey) {
  if (!state.workout) return null;
  const refs = _exerciseAt(exIdx, setKey);
  if (!refs) return null;
  const { effective, name } = refs;
  const isBW = !!effective.bodyweight;
  const isAssist = effective.assist === true;
  const isBand = effective.equipment === 'band' && !isAssist;
  const isBandAddon = effective.bandAddon === true;

  const inSessionSets = [];
  if (typeof setKey === 'number') {
    for (let i = 0; i < setKey; i++) {
      if (!state.completed[`${exIdx}-${i}`]) continue;
      const subAt = getSubExercise(exIdx, i);
      const slotName = subAt ? subAt.name : state.workout.exercises[exIdx].name;
      if (slotName !== name) continue;
      const reps = parseInt(state.reps[`${exIdx}-${i}`]);
      if (isNaN(reps) || reps <= 0) continue;
      const w = getEffectiveWeight(exIdx, i);
      const bands = getBandSelection(exIdx, i);
      inSessionSets.push({ weight: w, reps, bands: bands.length ? bands : null });
    }
  }

  let lastSets = inSessionSets;
  let source = 'in-session';
  if (lastSets.length === 0) {
    if (!state.lastSession) return null;
    for (let n = 1; n <= 6; n++) {
      const data = state.lastSession[`${name}|working|${n}`];
      if (!data) continue;
      const reps = parseInt(data.reps);
      if (isNaN(reps) || reps <= 0) continue;
      lastSets.push({
        weight: data.weight_lb ?? null,
        reps,
        bands: data.bands_json ? (() => { try { return JSON.parse(data.bands_json); } catch { return null; } })() : null,
      });
    }
    source = 'last-session';
  }
  if (lastSets.length === 0) return null;

  const [lo, hi] = parseRepRange(effective.reps);
  const lastWeight = lastSets[0].weight;
  const lastBands  = lastSets[0].bands;
  const isInSession = source === 'in-session';

  let thisSetLastReps = null;
  if (typeof setKey === 'number' && state.lastSession) {
    const data = state.lastSession[`${name}|working|${setKey + 1}`];
    if (data) {
      const r = parseInt(data.reps);
      if (!isNaN(r) && r > 0) thisSetLastReps = r;
    }
  }
  let lastWeekWorst = null;
  if (state.lastSession) {
    for (let n = 1; n <= 6; n++) {
      const d = state.lastSession[`${name}|working|${n}`];
      if (!d) continue;
      const r = parseInt(d.reps);
      if (isNaN(r) || r <= 0) continue;
      if (lastWeekWorst === null || r < lastWeekWorst) lastWeekWorst = r;
    }
  }

  const _repTarget = () => {
    if (thisSetLastReps != null) return Math.min(hi, thisSetLastReps + 1);
    return lo;
  };
  const _repReason = (suffix = '') => {
    if (thisSetLastReps == null) return `Aim for ${lo} clean reps${suffix}`;
    if (thisSetLastReps >= hi) return `🔥 Locked in — match your ${thisSetLastReps}${suffix}`;
    return `💪 Last time set ${setKey + 1} was ${thisSetLastReps} — push to ${thisSetLastReps + 1}${suffix}`;
  };
  const _mode = () => {
    if (thisSetLastReps != null && thisSetLastReps >= hi) return 'match';
    return 'add-rep';
  };

  const canGraduate = !isInSession && lastWeekWorst != null && lastWeekWorst >= hi;

  if (isBW) {
    if (canGraduate) return { weight: null, bands: null, reps: hi + 1, reason: `🔥 Crushed ${hi} clean across all sets — push to ${hi + 1}`, mode: 'graduate', source };
    return { weight: null, bands: null, reps: _repTarget(), reason: _repReason(), mode: _mode(), source };
  }

  if (isAssist) {
    if (canGraduate && lastBands && lastBands.length > 0) {
      const lighter = _lighterAssist(lastBands);
      const droppedSum = lastBands.reduce((a,b)=>a+b,0) - (lighter ? lighter.reduce((a,b)=>a+b,0) : 0);
      return { weight: null, bands: lighter || [], reps: lo, reason: `🔥 Hit ${hi} across all sets — drop ${droppedSum}lb assist`, mode: 'graduate', source };
    }
    return { weight: null, bands: lastBands, reps: _repTarget(), reason: _repReason(' at same assist'), mode: _mode(), source };
  }

  if (isBand) {
    if (canGraduate) {
      const heavier = _heavierBandStack(lastBands || []);
      if (heavier) {
        const addedSum = heavier.reduce((a,b)=>a+b,0) - (lastBands || []).reduce((a,b)=>a+b,0);
        return { weight: null, bands: heavier, reps: lo, reason: `🔥 Crushed ${hi} across all sets — stack +${addedSum}lb band`, mode: 'graduate', source };
      }
    }
    return { weight: null, bands: lastBands, reps: _repTarget(), reason: _repReason(' at same bands'), mode: _mode(), source };
  }

  if (isBandAddon) {
    const bandSum = (lastBands || []).reduce((a,b)=>a+b,0);
    const lastDB = (lastWeight || 0) - bandSum;
    if (canGraduate) {
      const nextDB = _nextWeightStep(lastDB, effective);
      if (nextDB) {
        return { weight: nextDB, bands: lastBands || [], reps: lo, reason: `🔥 Crushed ${hi} at ${lastWeight}lb — bump DB to ${nextDB}`, mode: 'graduate', source };
      }
      const heavier = _heavierBandStack(lastBands || []);
      if (heavier) {
        const addedSum = heavier.reduce((a,b)=>a+b,0) - bandSum;
        return { weight: lastDB || null, bands: heavier, reps: lo, reason: `🔥 DB maxed — add +${addedSum}lb band`, mode: 'graduate', source };
      }
    }
    return { weight: lastDB || null, bands: lastBands, reps: _repTarget(), reason: _repReason(' at same load'), mode: _mode(), source };
  }

  if (lastWeight == null) return null;
  if (canGraduate) {
    const next = _nextWeightStep(lastWeight, effective);
    if (next) return { weight: next, bands: null, reps: lo, reason: `🔥 Crushed ${hi} at ${lastWeight}lb — bump to ${next}`, mode: 'graduate', source };
    return { weight: lastWeight, bands: null, reps: hi + 1, reason: `🔥 Top of ladder — push past ${hi}`, mode: 'add-rep', source };
  }
  return { weight: lastWeight, bands: null, reps: _repTarget(), reason: _repReason(` at ${lastWeight}lb`), mode: _mode(), source };
}

function getLastReps(exIdx, setKey) {
  if (!state.lastSession) return null;
  const ex = state.workout.exercises[exIdx];
  const subEx = getSubExercise(exIdx, setKey);
  const lookupName = subEx ? subEx.name : ex.name;
  const setType = setKey === "warmup" ? "warmup" : "working";
  const setNum = setKey === "warmup" ? 0 : setKey + 1;
  const primary = `${lookupName}|${setType}|${setNum}`;
  let data = state.lastSession[primary];
  if (!data && subEx && typeof setKey === "number") {
    const subs = ex.supersetExercises;
    const subIdx = setKey % subs.length;
    for (let round = 0; round < 10; round++) {
      const candNum = round * subs.length + subIdx + 1;
      const cand = state.lastSession[`${lookupName}|working|${candNum}`];
      if (cand && cand.reps) { data = cand; break; }
    }
  }
  if (data && data.reps) {
    const n = parseInt(data.reps);
    return isNaN(n) ? null : n;
  }
  return null;
}

function logReps(exIdx, setKey, reps, isWarmup, ev) {
  const sk = (setKey === "warmup") ? "warmup" : parseInt(setKey);
  const k = `${exIdx}-${sk}`;
  const ex = state.workout.exercises[exIdx];
  if (ex && !ex.bodyweight && state.weights[k] == null) {
    if (ex.bandAddon) {
      const hintDB = getHintDBWeight(exIdx, sk);
      if (hintDB != null) state.weights[k] = hintDB;
    } else if (!ex.assist && !(ex.equipment === 'band')) {
      const hint = getHintWeight(exIdx, sk);
      if (hint != null) state.weights[k] = hint;
    }
  }
  let _setRect = null;
  try {
    const tgt = ev && (ev.currentTarget || ev.target);
    if (tgt && tgt.getBoundingClientRect) _setRect = tgt.getBoundingClientRect();
  } catch (_) {}
  const workoutWasDoneBefore = allDone();
  const wasDoneBefore = isExerciseFullyDone(exIdx);
  state.reps[`${exIdx}-${sk}`] = reps;
  state.completed[`${exIdx}-${sk}`] = true;
  if (_setRect) runSetCelebration(_setRect, reps);
  if (!wasDoneBefore && isExerciseFullyDone(exIdx)) {
    runCelebration(exIdx);
  }
  if (!state.running) startTimer();
  {
    const ex = state.workout.exercises[exIdx];
    const baseRest = ex.rest || state.workout.rest || 0;
    let restDur = 0;
    if (isWarmup) {
      restDur = baseRest;
    } else {
      let skipRestBetween = false;
      if (ex.supersetExercises && typeof sk === "number") {
        const subIdx = sk % ex.supersetExercises.length;
        if (subIdx < ex.supersetExercises.length - 1) skipRestBetween = true;
      }
      const setCount = getSetCount(exIdx);
      const isLastWorkingOfExercise = (typeof sk === 'number' && sk === setCount - 1);
      if (isLastWorkingOfExercise) {
        const nextEx = state.workout.exercises[exIdx + 1];
        const nextHasWarmup = nextEx
          && !nextEx.supersetExercises
          && !state.warmupOff?.[exIdx + 1]
          && !state.completed[`${exIdx + 1}-warmup`];
        if (nextHasWarmup) skipRestBetween = true;
      }
      if (!skipRestBetween) restDur = baseRest;
    }
    if (restDur > 0) startRest(restDur);
  }
  if (allDone()) { stopTimer(); skipRest(); }
  triggerSave();
  render();
}

function undoSet(exIdx, setKey) {
  delete state.reps[`${exIdx}-${setKey}`];
  state.completed[`${exIdx}-${setKey}`] = false;
  triggerSave();
  render();
}

function getBandSelection(exIdx, setKey) {
  const k = `${exIdx}-${setKey}-bands`;
  if (state.bands?.[k]?.length) return state.bands[k];
  const ex = state.workout.exercises[exIdx];
  const subEx = getSubExercise(exIdx, setKey);
  const effectiveEx = subEx ? { ...ex, ...subEx } : ex;
  if (effectiveEx.equipment !== 'band' && !effectiveEx.bandAddon) return [];
  if (!state.lastSession) return [];
  const exName = subEx ? subEx.name : ex.name;
  const setType = setKey === "warmup" ? "warmup" : "working";
  const setNum = setKey === "warmup" ? 0 : setKey + 1;
  const tryKeys = setKey === "warmup"
    ? [`${exName}|warmup|0`, `${exName}|working|1`]
    : [`${exName}|${setType}|${setNum}`, `${exName}|working|1`, `${exName}|working|2`, `${exName}|working|3`];
  for (const key of tryKeys) {
    const data = state.lastSession[key];
    if (data?.bands_json) {
      try {
        const bands = JSON.parse(data.bands_json);
        if (Array.isArray(bands) && bands.length > 0) return bands;
      } catch(e) {}
    }
  }
  return [];
}

function toggleBand(exIdx, setKey, bandLb) {
  const k = `${exIdx}-${setKey}-bands`;
  if (!state.bands) state.bands = {};
  const current = state.bands[k] || [];
  const idx = current.indexOf(bandLb);
  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(bandLb);
  }
  state.bands[k] = current;
  const ex = state.workout.exercises[exIdx];
  const sum = current.reduce((a, b) => a + b, 0);
  if (ex?.assist) {
    state.weights[`${exIdx}-${setKey}`] = sum > 0 ? Math.max(0, (state.bodyweight || 175) - sum) : null;
  } else if (ex?.bandAddon) {
    // intentionally leave state.weights[k] (DB) untouched
  } else {
    state.weights[`${exIdx}-${setKey}`] = sum || null;
  }
  triggerSave();
  render();
}

function applyBandSelection(exIdx, setKey, bandsCSV) {
  const bands = bandsCSV.split(',').map(n => parseInt(n)).filter(n => !isNaN(n));
  const k = `${exIdx}-${setKey}-bands`;
  if (!state.bands) state.bands = {};
  state.bands[k] = bands.slice();
  const ex = state.workout.exercises[exIdx];
  const sum = bands.reduce((a, b) => a + b, 0);
  if (ex?.assist) {
    state.weights[`${exIdx}-${setKey}`] = sum > 0 ? Math.max(0, (state.bodyweight || 175) - sum) : null;
  } else if (ex?.bandAddon) {
    // bandAddon: DB and bands are independent — don't touch state.weights
  } else {
    state.weights[`${exIdx}-${setKey}`] = sum || null;
  }
  triggerSave();
  render();
}

// Load home screen data
async function loadHomeData() {
  try {
    const [histRes, activeRes] = await Promise.all([
      fetch("/api/history?limit=100"),
      fetch("/api/active-sessions"),
    ]);
    state.history = await histRes.json();
    muscleStatus = computeMuscleStatus(state.history);
    state._activeSessions = await activeRes.json();
    render();
  } catch (e) { console.error("[HOME] Error:", e); }
}

// Initial render — check URL hash for deep link
const initHash = location.hash.replace('#', '');
const initWorkout = initHash ? WORKOUTS.find(w => w.id === initHash) : null;
if (initWorkout) {
  startWorkout(initWorkout);
} else {
  render();
  loadHomeData();
}
