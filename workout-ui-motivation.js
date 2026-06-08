// AI Motivation functions for Workout Tracker

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
