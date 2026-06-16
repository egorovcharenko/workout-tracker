const SWAP_LS_KEY = (workoutName, date) => `${LS_PREFIX}v2-swaps:${workoutName}:${date}`;
function loadSwaps(workoutName, date) {
  try {
    const raw = localStorage.getItem(SWAP_LS_KEY(workoutName, date));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveSwaps(workoutName, date, swapMap) {
  try {
    if (swapMap && Object.keys(swapMap).length) {
      localStorage.setItem(SWAP_LS_KEY(workoutName, date), JSON.stringify(swapMap));
    } else {
      localStorage.removeItem(SWAP_LS_KEY(workoutName, date));
    }
  } catch (e) {
    console.warn("[V2-SWAP] localStorage save failed:", e);
  }
}

const PM_STARTED_LS_KEY = (workoutName, date) => `${LS_PREFIX}v2-pm-started:${workoutName}:${date}`;
function loadPmStarted(workoutName, date) {
  try { return localStorage.getItem(PM_STARTED_LS_KEY(workoutName, date)) === "1"; }
  catch { return false; }
}
function savePmStarted(workoutName, date, started) {
  try {
    if (started) localStorage.setItem(PM_STARTED_LS_KEY(workoutName, date), "1");
    else localStorage.removeItem(PM_STARTED_LS_KEY(workoutName, date));
  } catch (e) {
    console.warn("[V2-PM] localStorage save failed:", e);
  }
}

const SKIPPED_LS_KEY = (workoutName, date) => `${LS_PREFIX}v2-skipped:${workoutName}:${date}`;
function loadSkippedExercises(workoutName, date) {
  try {
    const raw = localStorage.getItem(SKIPPED_LS_KEY(workoutName, date));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function saveSkippedExercises(workoutName, date, namesSet) {
  try {
    localStorage.setItem(SKIPPED_LS_KEY(workoutName, date), JSON.stringify([...namesSet]));
  } catch (e) {
    console.warn("[V2-SKIPPED] localStorage save failed:", e);
  }
}

const DEFERRED_LS_KEY = (workoutName, date) => `${LS_PREFIX}v2-deferred:${workoutName}:${date}`;
function loadDeferred(workoutName, date) {
  try {
    const raw = localStorage.getItem(DEFERRED_LS_KEY(workoutName, date));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveDeferred(workoutName, date, names) {
  try {
    if (names && names.length) localStorage.setItem(DEFERRED_LS_KEY(workoutName, date), JSON.stringify(names));
    else localStorage.removeItem(DEFERRED_LS_KEY(workoutName, date));
  } catch (e) {
    console.warn("[V2-DEFERRED] localStorage save failed:", e);
  }
}
function applyDeferredOrder(exercises, deferredNames) {
  if (!deferredNames || !deferredNames.length) return exercises;
  const deferredSet = new Set(deferredNames);
  const kept = exercises.filter(e => !deferredSet.has(e.name));
  const moved = deferredNames
    .map(name => exercises.find(e => e.name === name))
    .filter(Boolean)
    .map(e => ({ ...e, deferred: true }));
  return [...kept, ...moved];
}

const BODYWEIGHT_LS_KEY = LS_PREFIX + "v2-bodyweight";
function loadBodyweight() {
  try {
    const v = parseFloat(localStorage.getItem(BODYWEIGHT_LS_KEY));
    return isFinite(v) && v > 0 ? v : null;
  } catch { return null; }
}
function saveBodyweight(w) {
  try {
    if (isFinite(w) && w > 0) localStorage.setItem(BODYWEIGHT_LS_KEY, String(w));
  } catch (e) {
    console.warn("[V2-BODYWEIGHT] localStorage save failed:", e);
  }
}

const SETS_LS_KEY = (workoutName, date) => `${LS_PREFIX}v2-session-sets:${workoutName}:${date}`;
function loadSessionSets(workoutName, date) {
  try {
    const raw = localStorage.getItem(SETS_LS_KEY(workoutName, date));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveSessionSets(workoutName, date, exercises) {
  try {
    const map = {};
    exercises.forEach(ex => {
      map[ex.name] = ex.sets;
    });
    localStorage.setItem(SETS_LS_KEY(workoutName, date), JSON.stringify(map));
  } catch (e) {
    console.warn("[V2-SESSION-SETS] localStorage save failed:", e);
  }
}

function serializeForSave(exercises, workoutName, sessionId, startedAt, elapsed, activeDate) {
  const sets = [];
  exercises.forEach(ex => {
    ex.sets.forEach(s => {
      if (!s.completed) return;
      const isAssist = ex.assist;
      const bands = s.bands || [];
      const bandSum = bands.reduce((a, b) => a + b, 0);
      let weight_lb;
      if (isAssist) {
        weight_lb = Math.max(0, (s.bodyweight || 0) - bandSum);
      } else if (ex.isBandsOnly) {
        weight_lb = bandSum;
      } else if (ex.bandAddon) {
        weight_lb = (s.weight || 0) + bandSum;
      } else {
        weight_lb = s.weight || 0;
      }
      sets.push({
        exercise: s.saveExerciseName,
        set_type: s.kind === "warmup" ? "warmup" : "working",
        set_number: s.setNumber,
        reps: String(s.reps || ""),
        weight_lb,
        bands_json: bands.length ? JSON.stringify(bands) : null,
        grip: s.grip || null,
        logged_at: s.logged_at || null,
      });
    });
  });
  return {
    workout: workoutName,
    date: activeDate || localDate(),
    duration_sec: elapsed,
    session_id: sessionId || null,
    started_at: startedAt ? new Date(startedAt).toISOString() : null,
    sets,
  };
}

let _saveInFlight = false;
let _savePending = null;
async function autoSavePayload(payload, onResolved) {
  if (TEST_MODE) return;
  if (_saveInFlight) {
    _savePending = { payload, onResolved };
    return;
  }
  _saveInFlight = true;
  try {
    const res = await api.save(payload);
    if (res.ok) onResolved(res.id);
  } catch (e) {
    console.error("[V2-SAVE] error:", e);
  } finally {
    _saveInFlight = false;
    if (_savePending) {
      const next = _savePending; _savePending = null;
      autoSavePayload(next.payload, next.onResolved);
    }
  }
}

function hydrateToday(exercises, todaySets) {
  const map = new Map();
  exercises.forEach((ex, eIdx) => {
    ex.sets.forEach((s, sIdx) => {
      const key = `${s.saveExerciseName}|${s.kind === "warmup" ? "warmup" : "working"}|${s.setNumber}`;
      map.set(key, { eIdx, sIdx });
    });
  });
  const next = exercises.map(ex => ({
    ...ex,
    sets: ex.sets.map(s => ({ ...s, active: false }))
  }));
  if (todaySets && todaySets.length) {
    todaySets.forEach(row => {
      const key = `${row.exercise}|${row.set_type}|${row.set_number}`;
      const ref = map.get(key);
      if (!ref) return;
      const ex = next[ref.eIdx];
      const set = ex.sets[ref.sIdx];
      set.reps = parseInt(row.reps) || null;
      set.completed = true;
      const bands = row.bands_json ? safeJSON(row.bands_json) : [];
      set.bands = bands;
      const bandSum = bands.reduce((a, b) => a + b, 0);
      const savedLb = row.weight_lb || 0;
      if (ex.assist) {
        set.bodyweight = savedLb + bandSum;
      } else if (ex.bandAddon) {
        set.weight = Math.max(0, savedLb - bandSum);
      } else if (ex.isBandsOnly) {
        set.weight = 0;
      } else {
        set.weight = savedLb;
      }
      if (row.grip) set.grip = row.grip;
    });
  }
  return activateNextSet(next);
}

function activateNextSet(exercises) {
  for (const ex of exercises) {
    for (const s of ex.sets) if (s.active) s.active = false;
  }
  let activated = false;
  for (const ex of exercises) {
    if (activated) break;
    if (ex.skipped) continue;
    let highestCompleted = -1;
    for (let i = 0; i < ex.sets.length; i++) {
      if (ex.sets[i].completed) highestCompleted = i;
    }
    for (let i = highestCompleted + 1; i < ex.sets.length; i++) {
      if (!ex.sets[i].completed && !ex.sets[i].userSkipped) {
        ex.sets[i].active = true;
        activated = true;
        break;
      }
    }
  }
  return exercises;
}

if (typeof window !== "undefined") {
  window.loadSwaps = loadSwaps;
  window.saveSwaps = saveSwaps;
  window.loadPmStarted = loadPmStarted;
  window.savePmStarted = savePmStarted;
  window.loadSkippedExercises = loadSkippedExercises;
  window.saveSkippedExercises = saveSkippedExercises;
  window.loadDeferred = loadDeferred;
  window.saveDeferred = saveDeferred;
  window.applyDeferredOrder = applyDeferredOrder;
  window.loadBodyweight = loadBodyweight;
  window.saveBodyweight = saveBodyweight;
  window.loadSessionSets = loadSessionSets;
  window.saveSessionSets = saveSessionSets;
  window.serializeForSave = serializeForSave;
  window.autoSavePayload = autoSavePayload;
  window.hydrateToday = hydrateToday;
  window.activateNextSet = activateNextSet;
}
