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

  const maxSets = Math.max(1, ...Object.values(muscles));
  const getColor = (id) => {
    const v = muscles[id] || 0;
    if (v === 0) return { bg: "rgba(255,255,255,0.02)", fg: "rgba(255,255,255,0.08)" };
    const pct = v / maxSets;
    if (pct < 0.35) return { bg: "rgba(96,165,250,0.22)", fg: "#60a5fa" };
    if (pct < 0.70) return { bg: "rgba(52,211,153,0.25)", fg: "#34d399" };
    return { bg: "rgba(248,113,113,0.25)", fg: "#f87171" };
  };

  const drawRect = (id, x, y, width, height, rx) => {
    const c = getColor(id);
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx || 3}" fill="${c.bg}" stroke="${c.fg}" stroke-width="0.8" />`;
  };

  const frontRects = [
    ["shoulders", 28, 28, 17, 14, 3], ["shoulders", 55, 28, 17, 14, 3],
    ["chest", 36, 38, 28, 16, 4],
    ["biceps", 22, 44, 13, 18, 3], ["biceps", 65, 44, 13, 18, 3],
    ["forearms", 20, 55, 11, 14, 3], ["forearms", 69, 55, 11, 14, 3],
    ["core", 38, 56, 24, 20, 4],
    ["quads", 32, 90, 15, 30, 4], ["quads", 53, 90, 15, 30, 4]
  ].map(r => drawRect(...r)).join("");

  const backRects = [
    ["rear_delts", 28, 28, 17, 12, 3], ["rear_delts", 55, 28, 17, 12, 3],
    ["upper_back", 36, 33, 28, 13, 4],
    ["triceps", 22, 44, 13, 18, 3], ["triceps", 65, 44, 13, 18, 3],
    ["lats", 34, 48, 32, 16, 4],
    ["lower_back", 38, 66, 24, 14, 4],
    ["glutes", 34, 82, 32, 16, 4],
    ["hamstrings", 32, 100, 15, 24, 4], ["hamstrings", 53, 100, 15, 24, 4],
    ["calves", 32, 130, 13, 22, 4], ["calves", 55, 130, 13, 22, 4]
  ].map(r => drawRect(...r)).join("");

  const bodyOutline = `
    <ellipse cx="50" cy="14" rx="12" ry="13" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <path d="M35,28 Q30,30 26,40 L20,65 Q18,70 22,70 L32,60 L32,75 L30,120 Q29,125 34,125 L42,125 L44,90 L50,80 L56,90 L58,125 L66,125 Q71,125 70,120 L68,75 L68,60 L78,70 Q82,70 80,65 L74,40 Q70,30 65,28 Z" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <path d="M30,125 L28,155 Q27,160 33,160 L40,160 L41,125" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <path d="M59,125 L60,160 L67,160 Q73,160 72,155 L70,125" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  `;

  return `
    <div data-noinvert style="display:flex;gap:4px;background:rgba(255,255,255,0.03);border-radius:8px;padding:4px;border:1px solid rgba(255,255,255,0.04)">
      <svg viewBox="0 0 100 170" width="44" height="75" style="display:block">${bodyOutline}${frontRects}</svg>
      <svg viewBox="0 0 100 170" width="44" height="75" style="display:block">${bodyOutline}${backRects}</svg>
    </div>
  `;
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
    const weightVal = s ? (s.weight_lb || '—') : '—';
    const repsVal = s ? (s.reps || '—') : '—';
    const valLabel = s ? `${weightVal}lb × ${repsVal}` : '—';
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;gap:6px">
        <span style="color:${isSuggested ? '#4b5563' : '#374151'};font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ex.name}</span>
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
