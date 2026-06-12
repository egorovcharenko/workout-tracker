// UI rendering logic for the Home tab of Workout Tracker

function renderWorkoutCard(w, i) {
  const rec = getWorkoutRecovery(w);
  const exerciseEntries = [];
  w.exercises.forEach(ex => {
    if (ex.supersetExercises) {
      ex.supersetExercises.forEach(sub => exerciseEntries.push(sub));
    } else {
      exerciseEntries.push(ex);
    }
  });

  const rowsHTML = exerciseEntries.map(ex => {
    const s = state.lastSession[`${ex.name}|working|1`] || state.lastSession[`${ex.name}|working|2`] || state.lastSession[`${ex.name}|working|3`];
    const weightVal = s ? (s.weight_lb || '—') : '—';
    const repsVal = s ? (s.reps || '—') : '—';
    const valLabel = s ? `${weightVal}lb × ${repsVal}` : 'No history';
    return `
      <div style="display:flex;justify-content:between;align-items:center;font-size:12px;margin-bottom:4px;gap:8px">
        <span style="color:#374151;font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ex.name}</span>
        <span style="color:#6b7280;font-family:ui-monospace,Menlo,monospace">${valLabel}</span>
      </div>
    `;
  }).join("");

  return `
    <div class="card clickable" onclick="startWorkout(${i})" style="padding:16px;margin-bottom:12px;position:relative">
      <div style="display:flex;justify-content:between;align-items:start;margin-bottom:10px">
        <div>
          <h3 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 2px">${w.name}</h3>
          <span style="font-size:11px;color:#9ca3af;font-weight:600">${w.duration}</span>
        </div>
        ${recoveryBadge(rec.avg)}
      </div>
      <div style="border-top:1px solid #f3f4f6;padding-top:8px;margin-bottom:4px">${rowsHTML}</div>
    </div>
  `;
}

function renderHome() {
  const getExpectedSets = (w) => {
    let count = 0;
    w.exercises.forEach(ex => {
      const exName = ex.name;
      const cachedSkips = loadSkippedExercises(w.name, localDate());
      if (cachedSkips.has(exName)) return;

      if (ex.supersetExercises) {
        ex.supersetExercises.forEach(sub => {
          if (cachedSkips.has(sub.name)) return;
          count += ex.sets;
        });
      } else {
        const warmups = ex.noWarmup || state.warmupOff?.[exName] ? 0 : 1;
        count += ex.sets + warmups;
      }
    });
    return count;
  };

  const getLoggedCount = (w) => {
    const today = localDate();
    let count = 0;
    (state.todaySets || []).forEach(row => {
      if (row.workout === w.name && row.date === today && row.reps) count++;
    });
    return count;
  };

  const getSessionDateStr = () => {
    const today = new Date();
    return today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const activeSess = state._activeSessions && state._activeSessions[0];
  const program = WORKOUTS.filter(w => w.program);
  const byId = id => WORKOUTS.find(w => w.id === id);

  // Mains alternate (A/B/A this week, B/A/B next) — only new program names
  // count for the rotation; seeded to Main B for the first session.
  let nextMain = byId('main-b');
  for (const s of (state.history || [])) {
    if (s.workout_name === 'Main A') { nextMain = byId('main-b'); break; }
    if (s.workout_name === 'Main B') { nextMain = byId('main-a'); break; }
  }
  // Micro due = the one done longer ago ('' sorts first, so never-done wins);
  // on a tie fall back to the schedule (Tue arms, Thu delts).
  const dow = new Date().getDay();
  const lastDone = name => { const s = (state.history || []).find(x => x.workout_name === name); return s ? s.date : ''; };
  const lastArms = lastDone('Micro: Arms & Core'), lastDelts = lastDone('Micro: Delts & Traps');
  const microNext = lastArms === lastDelts
    ? byId(dow === 4 ? 'micro-delts' : 'micro-arms')
    : (lastArms < lastDelts ? byId('micro-arms') : byId('micro-delts'));
  // Tue/Thu are micro days; everything else points at the next main.
  const nextW = (dow === 2 || dow === 4) ? microNext : nextMain;

  let activeWorkout = nextW;
  let isOngoing = false;
  let logged = 0;
  let expected = 0;
  let pct = 0;

  if (activeSess) {
    const w = WORKOUTS.find(x => x.name === activeSess.workout_name);
    if (w) {
      expected = getExpectedSets(w);
      logged = getLoggedCount(w);
      if (logged > 0 && logged < expected) {
        activeWorkout = w;
        isOngoing = true;
        pct = Math.round((logged / expected) * 100);
      }
    }
  }

  const kindLabel = w => w.kind === 'micro' ? 'Micro' : w.kind === 'optional' ? 'Optional' : `Main ${w.abSplit || ''}`.trim();
  const workoutUrl = `/workout?w=${activeWorkout.id}`;
  const otherRows = program.filter(w => w.id !== activeWorkout.id).map(w => `
    <a href="/workout?w=${w.id}" style="text-decoration:none;display:block;">
      <div class="card clickable" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;margin:0;">
        <div>
          <div style="font-size:13px;font-weight:700;color:#111827;">${w.name}</div>
          <div style="font-size:11px;color:#9ca3af;font-weight:600;">${kindLabel(w)} · ${w.duration}</div>
        </div>
        <span style="font-size:12px;color:#2563eb;font-weight:700;white-space:nowrap;">Start →</span>
      </div>
    </a>
  `).join('');
  const workoutButtonHTML = `
    <a href="${workoutUrl}" style="text-decoration:none;display:block;margin-bottom:8px;">
      <div style="background:linear-gradient(135deg, #eff6ff, #dbeafe); border:1px solid #bfdbfe; border-radius:14px; padding:18px; text-align:center; box-shadow:0 4px 12px rgba(59,130,246,0.08); transition:all 0.2s;" class="clickable">
        <div style="font-size:16px; font-weight:800; color:#1d4ed8; margin-bottom:4px; display:flex; align-items:center; justify-content:center; gap:8px;">
          <span>${isOngoing ? '⚡️ Continue' : '🏋️‍♂️ Start'} · ${activeWorkout.name}</span>
        </div>
        <div style="font-size:12px; color:#60a5fa; font-weight:600;">
          ${isOngoing ? `${logged} of ${expected} sets logged (${pct}%)` : `${kindLabel(activeWorkout)} · ${activeWorkout.duration} · up next`}
        </div>
      </div>
    </a>
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px;">${otherRows}</div>
    <div style="text-align:right;margin-bottom:16px;">
      <span style="font-size:11px; color:#9ca3af;">🧪 Test (nothing saved):
        ${program.filter(w => w.kind !== 'optional').map(w => `<a href="/workout?w=${w.id}&test=1" style="color:#6b7280; text-decoration:underline;">${w.name.replace('Micro: ', '')}</a>`).join(' · ')}
      </span>
    </div>
  `;

  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 16px 16px 40px; background:#f9fafb; min-height:100vh">
      <div style="display:flex;align-items:center;margin-bottom:16px">
        <div>
          <span style="font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">${getSessionDateStr()}</span>
          <h2 style="font-size:22px;font-weight:800;color:#111827;margin:0">Workout Tracker</h2>
        </div>
      </div>

      ${workoutButtonHTML}

      ${renderWorkoutSummaryCard()}

      <div style="display:flex; flex-direction:column; gap:16px; width:100%;">
        ${renderPercentilesCard()}
        ${renderCalendar()}
      </div>
    </div>
  `;
}

function renderMotivationBanner() {
  const finishMsg = state.activeFinishMotivation;
  if (finishMsg) {
    const alreadyShown = !!document.getElementById('finish-motiv-banner');
    const animOuter = alreadyShown ? '' : 'animation:motiv-fade-in 220ms ease-out;';
    const animInner = alreadyShown ? '' : 'animation:motiv-pop-in 320ms cubic-bezier(.2,.9,.3,1.18);';
    return `
      <div id="finish-motiv-banner" data-noinvert onclick="dismissFinishMotivation()" style="
        position:fixed;left:0;right:0;bottom:0;top:0;
        background:rgba(15,23,42,0.55);
        z-index:9100;
        display:flex;align-items:center;justify-content:center;
        ${animOuter}
      ">
        <div data-noinvert onclick="event.stopPropagation()" style="
          width:100%;max-width:560px;margin:0 12px;
          background:linear-gradient(135deg,#fef3c7,#fde68a 50%,#fbbf24);
          border:1px solid #f59e0b;
          border-radius:18px;
          padding:22px 20px 16px;
          box-shadow:0 22px 60px rgba(15,23,42,0.45);
          ${animInner}
        ">
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:14px">
            <span style="font-size:26px;flex-shrink:0;line-height:1">💪</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#92400e;margin-bottom:4px">Workout complete</div>
              <div style="font-size:17px;line-height:1.5;color:#451a03;font-weight:500">${finishMsg}</div>
            </div>
          </div>
          <button onclick="dismissFinishMotivation()" style="
            width:100%;background:#92400e;color:white;border:none;
            padding:11px 14px;border-radius:10px;font-size:14px;font-weight:600;
            cursor:pointer;
          ">Onwards</button>
        </div>
      </div>
      <style>
        @keyframes motiv-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes motiv-pop-in {
          0% { transform: scale(0.8); opacity: 0 }
          60% { transform: scale(1.04); opacity: 1 }
          100% { transform: scale(1); opacity: 1 }
        }
      </style>
    `;
  }
  return '';
}

window.changePercentileMonth = function(delta) {
  state.percentilesMonthOffset = (state.percentilesMonthOffset || 0) + delta;
  render();
};

if (typeof window !== "undefined") {
  window.renderWorkoutCard = renderWorkoutCard;
  window.renderHome = renderHome;
  window.renderMotivationBanner = renderMotivationBanner;
}
