// UI rendering logic for the Home tab of Workout Tracker

function renderWorkoutMuscleMap(w) {
  const muscles = {};
  const add = (mapping, sets) => {
    if (!mapping) return;
    (mapping.primary || []).forEach(m => { muscles[m] = (muscles[m] || 0) + sets; });
    (mapping.secondary || []).forEach(m => { muscles[m] = (muscles[m] || 0) + sets * 0.5; });
  };
  w.exercises.forEach(ex => {
    const sets = ex.sets || 3;
    if (ex.supersetExercises) {
      ex.supersetExercises.forEach(sub => add(EXERCISE_MUSCLES[sub.name], sets));
    } else {
      add(EXERCISE_MUSCLES[ex.name], sets);
    }
  });

  const sorted = Object.entries(muscles)
    .filter(([_, sets]) => sets > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const badgeHTML = sorted.map(([id, sets]) => {
    const label = (window.MUSCLE_GROUPS && window.MUSCLE_GROUPS[id]) ? window.MUSCLE_GROUPS[id].label : id;
    let color = "#60a5fa", bg = "rgba(96,165,250,0.06)", border = "rgba(96,165,250,0.15)";
    if (["chest", "triceps"].includes(id)) {
      color = "#60a5fa"; bg = "rgba(96,165,250,0.06)"; border = "rgba(96,165,250,0.15)";
    } else if (["quads", "calves"].includes(id)) {
      color = "#34d399"; bg = "rgba(52,211,153,0.06)"; border = "rgba(52,211,153,0.15)";
    } else if (["shoulders", "rear_delts"].includes(id)) {
      color = "#f472b6"; bg = "rgba(244,114,182,0.06)"; border = "rgba(244,114,182,0.15)";
    } else if (["biceps", "forearms"].includes(id)) {
      color = "#a78bfa"; bg = "rgba(167,139,250,0.06)"; border = "rgba(167,139,250,0.15)";
    } else if (["upper_back", "lats", "lower_back", "glutes", "hamstrings"].includes(id)) {
      color = "#fbbf24"; bg = "rgba(251,191,36,0.06)"; border = "rgba(251,191,36,0.15)";
    } else if (id === "core") {
      color = "#22d3ee"; bg = "rgba(34,211,238,0.06)"; border = "rgba(34,211,238,0.15)";
    }
    return `<div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:${color};background:${bg};border:1px solid ${border};padding:2.5px 6px;border-radius:5px;text-align:center;white-space:nowrap;font-family:ui-monospace,Menlo,monospace">${label}</div>`;
  }).join("");

  return `<div data-noinvert style="display:flex;flex-direction:column;gap:3px;flex-shrink:0;width:72px">${badgeHTML}</div>`;
}

function renderWorkoutCard(w, isSuggested, isOngoing, logged, expected, pct) {
  const kindLabel = w => w.kind === 'micro' ? 'Micro' : w.kind === 'optional' ? 'Optional' : `Main ${w.abSplit || ''}`.trim();
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
    const weightVal = s ? (s.weight_lb || '—') : '—', repsVal = s ? (s.reps || '—') : '—';
    const valLabel = s ? `${weightVal}lb × ${repsVal}` : '—';
    const name = ex.name === "Barbell Bench Press" ? `Barbell Bench Press (A${(window.getSuggestedBenchStep ? window.getSuggestedBenchStep(state.history) : 0) + 1})` : ex.name;
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;gap:6px">
        <span style="color:${isSuggested ? '#4b5563' : '#374151'};font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</span>
        <span style="color:${isSuggested ? '#4b5563' : '#6b7280'};font-family:ui-monospace,Menlo,monospace;flex-shrink:0">${valLabel}</span>
      </div>
    `;
  }).join("");

  const bgStyle = isSuggested
    ? `background:linear-gradient(135deg, #eff6ff, #dbeafe); border:1px solid #bfdbfe; box-shadow:0 4px 12px rgba(59,130,246,0.08)`
    : `background:white; border:1px solid #e5e7eb`;

  const infoLabel = isSuggested && isOngoing
    ? `${logged} of ${expected} sets logged (${pct}%)`
    : `${kindLabel(w)} · ${w.duration}${isSuggested ? ' · up next' : ''}`;

  return `
    <a href="/workout?w=${w.id}" style="text-decoration:none;display:block;">
      <div class="card clickable" style="padding:14px;display:flex;gap:12px;align-items:center;justify-content:space-between;${bgStyle}">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px;gap:6px">
            <span style="font-size:14px;font-weight:800;color:${isSuggested ? '#1d4ed8' : '#111827'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${isSuggested && isOngoing ? '⚡ ' : ''}${w.name}
            </span>
            <span style="font-size:10px;color:${isSuggested ? '#1d4ed8' : '#9ca3af'};font-weight:700;flex-shrink:0;opacity:0.85">
              ${infoLabel}
            </span>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">${rowsHTML}</div>
        </div>
        <div style="flex-shrink:0;display:flex;align-items:center;gap:10px">
          ${renderWorkoutMuscleMap(w)}
          ${!isSuggested ? `<span style="font-size:11px;color:#2563eb;font-weight:800;white-space:nowrap;margin-left:4px">Start →</span>` : ''}
        </div>
      </div>
    </a>
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

  let nextMain = byId('main-b');
  for (const s of (state.history || [])) {
    if (s.workout_name === 'Main A') { nextMain = byId('main-b'); break; }
    if (s.workout_name === 'Main B') { nextMain = byId('main-a'); break; }
  }
  const dow = new Date().getDay();
  const lastDone = name => { const s = (state.history || []).find(x => x.workout_name === name); return s ? s.date : ''; };
  const lastArms = lastDone('Micro: Arms & Core'), lastDelts = lastDone('Micro: Delts & Traps');
  const microNext = lastArms === lastDelts
    ? byId(dow === 4 ? 'micro-delts' : 'micro-arms')
    : (lastArms < lastDelts ? byId('micro-arms') : byId('micro-delts'));
  let nextW = (dow === 2 || dow === 4) ? microNext : nextMain;

  const programWorkouts = WORKOUTS.filter(w => w.program);
  let lastProgramWorkout = null;
  for (const s of (state.history || [])) {
    const found = programWorkouts.find(w => w.name === s.workout_name);
    if (found) { lastProgramWorkout = found; break; }
  }
  if (lastProgramWorkout) {
    nextW = lastProgramWorkout.kind === 'main' ? microNext : nextMain;
  }

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

  const activeIdx = program.findIndex(w => w.id === activeWorkout.id);
  const orderedProgram = [];
  if (activeIdx !== -1) {
    for (let i = 0; i < program.length; i++) {
      orderedProgram.push(program[(activeIdx + i) % program.length]);
    }
  } else {
    orderedProgram.push(...program);
  }

  const workoutsHTML = orderedProgram.map(w => {
    const isSuggested = w.id === activeWorkout.id;
    return renderWorkoutCard(w, isSuggested, isOngoing, logged, expected, pct);
  }).join('<div style="height:10px"></div>');

  const workoutListHTML = `
    <div style="display:flex;flex-direction:column;margin-bottom:8px;">
      ${workoutsHTML}
    </div>
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

      ${workoutListHTML}

      ${renderWorkoutSummaryCard()}

      <div style="display:flex; flex-direction:column; gap:16px; width:100%;">
        ${renderPercentilesCard()}
        ${renderCalendar()}
      </div>
    </div>
  `;
}

function renderMotivationBanner() {
  const m = state.activeFinishMotivation;
  if (!m) return '';
  const shown = !!document.getElementById('finish-motiv-banner');
  return `
    <div id="finish-motiv-banner" data-noinvert onclick="dismissFinishMotivation()" style="position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:9100;display:flex;align-items:center;justify-content:center;${shown?'':'animation:motiv-fade-in 220ms ease-out;'}">
      <div data-noinvert onclick="event.stopPropagation()" style="width:100%;max-width:560px;margin:0 12px;background:linear-gradient(135deg,#fef3c7,#fde68a 50%,#fbbf24);border:1px solid #f59e0b;border-radius:18px;padding:22px 20px 16px;box-shadow:0 22px 60px rgba(15,23,42,0.45);${shown?'':'animation:motiv-pop-in 320ms cubic-bezier(.2,.9,.3,1.18);'}">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:14px">
          <span style="font-size:26px;flex-shrink:0;line-height:1">💪</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#92400e;margin-bottom:4px">Workout complete</div>
            <div style="font-size:17px;line-height:1.5;color:#451a03;font-weight:500">${m}</div>
          </div>
        </div>
        <button onclick="dismissFinishMotivation()" style="width:100%;background:#92400e;color:white;border:none;padding:11px 14px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">Onwards</button>
      </div>
    </div>
    <style>
      @keyframes motiv-fade-in { from { opacity: 0 } to { opacity: 1 } }
      @keyframes motiv-pop-in { 0% { transform: scale(0.8); opacity: 0 } 60% { transform: scale(1.04); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
    </style>
  `;
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
