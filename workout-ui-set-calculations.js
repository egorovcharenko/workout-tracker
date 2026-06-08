// Set Calculations logic for Workout Tracker

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
