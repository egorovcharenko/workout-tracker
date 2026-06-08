// Database Persistence and Session Auto-save logic for Workout Tracker

let saveTimeout = null;
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
      autoSave();
    }
  }
}

function triggerSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(autoSave, 500);
}

async function loadSessionData(workoutName) {
  try {
    const todayRes = await fetch(`/api/today-session?workout=${encodeURIComponent(workoutName)}`);
    const todayData = await todayRes.json();

    if (todayData && todayData.id) {
      state.sessionId = todayData.id;
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
      startTimer();
      restoreRestState();
      loadGripState();
      fetchExerciseNotes().then(() => render());
      const savedNames = new Set(todayData.sets.map(s => s.exercise));
      savedNames.forEach(name => {
        const inTemplate = state.workout.exercises.some(e => e.name === name);
        if (!inTemplate) {
          const group = getSwapGroup(name);
          if (group) {
            const pairIdx = state.workout.exercises.findIndex(e => group.some(g => g.name === e.name));
            if (pairIdx >= 0) {
              const savedEx = group.find(g => g.name === name);
              state.workout.exercises[pairIdx] = { ...savedEx };
              console.log(`[RESUME] Auto-swapped → ${name}`);
            }
          }
        }
      });
      const maxSetNum = {};
      const supersetCounts = {};
      todayData.sets.forEach(s => {
        let exIdx = state.workout.exercises.findIndex(e => e.name === s.exercise);
        let setNum = s.set_number;
        if (exIdx < 0) {
          for (let ei = 0; ei < state.workout.exercises.length; ei++) {
            const ex = state.workout.exercises[ei];
            if (ex.supersetExercises) {
              const subIdx = ex.supersetExercises.findIndex(sub => sub.name === s.exercise);
              if (subIdx >= 0) {
                exIdx = ei;
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
        if (s.weight_lb) {
          const exHere = state.workout?.exercises?.[exIdx];
          if (exHere?.bandAddon && _bands) {
            const bandSum = _bands.reduce((a, b) => a + b, 0);
            state.weights[key] = Math.max(0, s.weight_lb - bandSum);
          } else {
            state.weights[key] = s.weight_lb;
          }
        }
        if (s.grip) {
          if (!state.grip) state.grip = {};
          state.grip[key] = s.grip;
        }
        if (s.set_type === "working") {
          maxSetNum[exIdx] = Math.max(maxSetNum[exIdx] || 0, setNum);
        }
      });
      state.extraSets = {};
      Object.entries(maxSetNum).forEach(([exIdx, maxNum]) => {
        const ex = state.workout.exercises[exIdx];
        const base = ex.supersetExercises ? ex.sets * ex.supersetExercises.length : ex.sets;
        if (maxNum > base) {
          state.extraSets[exIdx] = maxNum - base;
        }
      });
      console.log(`[RESUME] Restored session #${todayData.id} with ${todayData.sets.length} sets`);
    }

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

    if (!state.motivations) state.motivations = {};
    if (!state.motivationsLoading) state.motivationsLoading = {};
    if (state.sessionId && motivationsJson && Object.keys(motivationsJson).length) {
      state.workout.exercises.forEach((ex, exIdx) => {
        const msg = motivationsJson[ex.name];
        if (msg) {
          state.motivations[String(exIdx)] = msg;
        }
      });
      const finishMsg = motivationsJson['__workout_finish__'];
      if (finishMsg) state.finishMotivation = finishMsg;
      console.log(`[MOTIVATE] Hydrated ${Object.keys(motivationsJson).length} motivations for session ${state.sessionId}`);
    }

    const merged = { ...state.exerciseHints, ...state.lastSession };
    state.lastSession = merged;

    render();
  } catch (e) { console.error("[LOAD] Error:", e); }
}

async function loadHistory() {
  loadHomeData();
}

async function loadHomeData() {
  try {
    const [histRes, activeRes, measRes] = await Promise.all([
      fetch("/api/history?limit=100"),
      fetch("/api/active-sessions"),
      fetch("/api/measurements"),
    ]);
    state.history = await histRes.json();
    muscleStatus = computeMuscleStatus(state.history);
    state._activeSessions = await activeRes.json();
    try { state.measurements = await measRes.json(); }
    catch (e) { state.measurements = []; }
    render();
  } catch (e) { console.error("[HOME] Error:", e); }
}
