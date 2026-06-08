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

if (typeof window !== "undefined") {
  window._exerciseAt = _exerciseAt;
  window._nextWeightStep = _nextWeightStep;
  window._prevWeightStep = _prevWeightStep;
  window._lighterAssist = _lighterAssist;
  window._heavierBandStack = _heavierBandStack;
  window.getProgressionSuggestion = getProgressionSuggestion;
  window.getLastReps = getLastReps;
}
