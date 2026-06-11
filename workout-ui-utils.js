// UI Utilities and Stats logic for Workout Tracker

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
  const isAssist = exName === "Bench Dips" || exName === "Assisted Pull-Ups" || exName === "Dips";
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
