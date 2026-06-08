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
    // intentionally leave DB untouched
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

if (typeof window !== "undefined") {
  window.logReps = logReps;
  window.undoSet = undoSet;
  window.getBandSelection = getBandSelection;
  window.toggleBand = toggleBand;
  window.applyBandSelection = applyBandSelection;
}
