// UI rendering logic for the Stats tab of Workout Tracker

function _iterCurrentSessionSets(exerciseName, fn) {
  if (!state.workout) return;
  state.workout.exercises.forEach((ex, exIdx) => {
    const isSuperset = !!ex.supersetExercises;
    const isMatch = ex.name === exerciseName;
    const subIdxMatch = isSuperset
      ? ex.supersetExercises.findIndex(s => s.name === exerciseName)
      : -1;
    if (!isMatch && subIdxMatch < 0) return;
    for (let i = 0; i < getSetCount(exIdx); i++) {
      if (!state.completed[`${exIdx}-${i}`]) continue;
      if (isSuperset && subIdxMatch >= 0) {
        if (i % ex.supersetExercises.length !== subIdxMatch) continue;
      }
      const w = state.weights[`${exIdx}-${i}`] || 0;
      const r = parseInt(state.reps[`${exIdx}-${i}`]) || 0;
      if (r <= 0) continue;
      fn({ w, r });
    }
  });
}

function currentSessionOrm(exerciseName) {
  let best = 0;
  _iterCurrentSessionSets(exerciseName, ({ w, r }) => {
    if (!w) return;
    const orm = r > 1 ? w * (1 + r / 30) : w;
    if (orm > best) best = orm;
  });
  return Math.round(best * 10) / 10;
}

function currentSessionBestReps(exerciseName) {
  let best = 0;
  _iterCurrentSessionSets(exerciseName, ({ r }) => {
    if (r > best) best = r;
  });
  return best;
}

function currentSessionMaxWeight(exerciseName) {
  let best = 0;
  _iterCurrentSessionSets(exerciseName, ({ w, r }) => {
    if (w > 0 && r > 0 && w > best) best = w;
  });
  return best;
}

function currentSessionVolume(exerciseName) {
  if (!state.workout) return 0;
  let vol = 0;
  state.workout.exercises.forEach((ex, exIdx) => {
    if (ex.supersetExercises) {
      ex.supersetExercises.forEach((sub, s) => {
        if (sub.name !== exerciseName) return;
        for (let round = 0; round < ex.sets; round++) {
          const idx = round * ex.supersetExercises.length + s;
          if (!state.completed[`${exIdx}-${idx}`]) continue;
          const w = state.weights[`${exIdx}-${idx}`] || 0;
          const r = parseInt(state.reps[`${exIdx}-${idx}`]) || 0;
          if (w > 0 && r > 0) vol += w * r;
        }
      });
    } else if (ex.name === exerciseName) {
      for (let i = 0; i < getSetCount(exIdx); i++) {
        if (!state.completed[`${exIdx}-${i}`]) continue;
        const w = state.weights[`${exIdx}-${i}`] || 0;
        const r = parseInt(state.reps[`${exIdx}-${i}`]) || 0;
        if (w > 0 && r > 0) vol += w * r;
      }
    }
  });
  return Math.round(vol);
}

function currentSessionTotalReps(exerciseName) {
  if (!state.workout) return 0;
  let total = 0;
  state.workout.exercises.forEach((ex, exIdx) => {
    if (ex.supersetExercises) {
      ex.supersetExercises.forEach((sub, s) => {
        if (sub.name !== exerciseName) return;
        for (let round = 0; round < ex.sets; round++) {
          const idx = round * ex.supersetExercises.length + s;
          const r = state.reps[`${exIdx}-${idx}`];
          if (r) total += r;
        }
      });
    } else if (ex.name === exerciseName) {
      for (let i = 0; i < getSetCount(exIdx); i++) {
        const r = state.reps[`${exIdx}-${i}`];
        if (r) total += r;
      }
    }
  });
  return total;
}

function mergeWithLive(serverData, liveVal, key) {
  const today = localDate();
  let data = serverData.map(d => ({ ...d }));
  if (liveVal > 0) {
    const todayIdx = data.findIndex(d => d.date === today);
    if (todayIdx >= 0) {
      data[todayIdx][key] = Math.max(data[todayIdx][key], liveVal);
    } else {
      data.push({ date: today, [key]: liveVal });
    }
  }
  return data;
}

function miniSparkline(vals, label, unit, color, compact) {
  if (vals.length < 2) return "";
  const latest = vals[vals.length - 1];
  const prev = vals[vals.length - 2];
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const range = max - min || 1;
  const w = compact ? 34 : 48;
  const h = compact ? 16 : 20;
  const pad = 2;
  const points = vals.map((v, i) =>
    `${pad + (i / (vals.length - 1)) * (w - pad * 2)},${pad + (1 - (v - min) / range) * (h - pad * 2)}`
  ).join(" ");
  const trend = latest > prev ? "#16a34a" : latest < prev ? "#ef4444" : "#9ca3af";
  const dispVal = latest >= 1000 ? (latest / 1000).toFixed(1) + "k" : Math.round(latest);
  const diff = Math.abs(latest - prev);
  const diffDisp = diff >= 1000 ? (diff / 1000).toFixed(1) + "k" : Math.round(diff);
  const diffStr = diff > 0 ? `${latest > prev ? '+' : '−'}${diffDisp}` : '';
  if (compact) {
    return `<div style="display:flex;align-items:center;gap:2px;flex-shrink:0">
      <div style="text-align:right;line-height:1">
        <div style="font-size:7px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.02em">${label}</div>
        <div style="font-size:9px;color:${trend};font-weight:600;margin-top:1px">${dispVal}${unit}</div>
      </div>
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">
        <polyline points="${points}" fill="none" stroke="${trend}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${w - pad}" cy="${pad + (1 - (latest - min) / range) * (h - pad * 2)}" r="1.8" fill="${trend}"/>
      </svg>
    </div>`;
  }
  return `<div style="display:flex;align-items:center;gap:2px">
    <div style="text-align:right">
      <div style="font-size:7px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.03em">${label}</div>
      <div style="font-size:9px;color:${trend};font-weight:600;line-height:1">${dispVal}${unit}</div>
    </div>
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <polyline points="${points}" fill="none" stroke="${trend}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${pad + ((vals.length - 1) / (vals.length - 1)) * (w - pad * 2)}" cy="${pad + (1 - (latest - min) / range) * (h - pad * 2)}" r="2" fill="${trend}"/>
    </svg>
    ${diffStr ? `<div style="font-size:8px;color:${trend};font-weight:600;white-space:nowrap">${diffStr}</div>` : ''}
  </div>`;
}

function dualSparkline(series) {
  const valid = series.filter(s => s.vals.length >= 2);
  if (valid.length === 0) return "";
  const allVals = valid.flatMap(s => s.vals);
  const globalMin = Math.min(...allVals);
  const globalMax = Math.max(...allVals);
  const range = globalMax - globalMin || 1;
  const w = 64, h = 24, pad = 2;
  const maxLen = Math.max(...valid.map(s => s.vals.length));

  const lines = valid.map(s => {
    const latest = s.vals[s.vals.length - 1];
    const prev = s.vals[s.vals.length - 2];
    const trend = latest >= prev ? "#16a34a" : "#ef4444";
    const diff = Math.abs(latest - prev);
    const points = s.vals.map((v, i) =>
      `${pad + (i / (maxLen - 1)) * (w - pad * 2)},${pad + (1 - (v - globalMin) / range) * (h - pad * 2)}`
    ).join(" ");
    const cy = pad + (1 - (latest - globalMin) / range) * (h - pad * 2);
    const cx = pad + ((s.vals.length - 1) / (maxLen - 1)) * (w - pad * 2);
    return { points, cx, cy, color: s.color, trend, latest, diff, label: s.label, up: latest >= prev };
  });

  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${lines.map(l => `
      <polyline points="${l.points}" fill="none" stroke="${l.color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
      <circle cx="${l.cx}" cy="${l.cy}" r="2" fill="${l.color}"/>
    `).join('')}
  </svg>`;

  const labels = lines.map(l => {
    const dispVal = l.latest >= 1000 ? (l.latest / 1000).toFixed(1) + 'k' : Math.round(l.latest);
    const diffDisp = l.diff >= 1000 ? (l.diff / 1000).toFixed(1) + 'k' : Math.round(l.diff);
    const diffStr = l.diff > 0 ? `${l.up ? '+' : '−'}${diffDisp}` : '';
    return `<div style="display:flex;align-items:center;gap:2px">
      <span style="font-size:7px;color:${l.color};font-weight:600">${l.label}</span>
      <span style="font-size:8px;color:${l.trend};font-weight:600">${diffStr}</span>
    </div>`;
  }).join('');

  return `<div style="display:flex;align-items:center;gap:3px">
    ${svg}
    <div>${labels}</div>
  </div>`;
}

function renderBWSparkline(exerciseName) {
  const data = mergeWithLive((state.repsHistory || {})[exerciseName] || [], currentSessionBestReps(exerciseName), "reps");
  const vals = data.map(d => d.reps);
  return miniSparkline(vals, "Reps", "", "#8b5cf6");
}

function renderSupersetSparkline(ex) {
  if (!ex.supersetExercises) return "";
  const subs = ex.supersetExercises;
  const colors = ["#7c3aed", "#2563eb"];

  const volSeries = subs.map((sub, s) => {
    const volData = mergeWithLive((state.volHistory || {})[sub.name] || [], currentSessionVolume(sub.name), "vol");
    const shortName = sub.name.split(' ').pop();
    return { vals: volData.map(d => d.vol), label: shortName, color: colors[s % colors.length] };
  });

  const repsSeries = subs.map((sub, s) => {
    const repsData = mergeWithLive((state.repsHistory || {})[sub.name] || [], currentSessionTotalReps(sub.name), "reps");
    const shortName = sub.name.split(' ').pop();
    return { vals: repsData.map(d => d.reps), label: shortName, color: colors[s % colors.length] };
  });

  const volHTML = dualSparkline(volSeries);
  const repsHTML = dualSparkline(repsSeries);
  if (!volHTML && !repsHTML) return "";
  return `<div style="display:flex;gap:8px;align-items:center">${volHTML}${repsHTML}</div>`;
}

function renderSparkline(exerciseName) {
  const exInWorkout = state.workout?.exercises.find(e => e.name === exerciseName);
  const isBW = exInWorkout?.bodyweight;
  if (isBW) return renderBWSparkline(exerciseName);

  const ormData = mergeWithLive((state.ormHistory || {})[exerciseName] || [], currentSessionOrm(exerciseName), "orm");
  const ormVals = ormData.map(d => d.orm);
  const ormHTML = miniSparkline(ormVals, "1RM", "lb", "#3b82f6", true);

  const volData = mergeWithLive((state.volHistory || {})[exerciseName] || [], currentSessionVolume(exerciseName), "vol");
  const volVals = volData.map(d => d.vol);
  const volHTML = miniSparkline(volVals, "Vol", "lb", "#8b5cf6", true);

  const wtData = mergeWithLive((state.wtHistory || {})[exerciseName] || [], currentSessionMaxWeight(exerciseName), "wt");
  const wtVals = wtData.map(d => d.wt);
  const wtHTML = miniSparkline(wtVals, "Max Wt", "lb", "#0d9488", true);

  const repsData = mergeWithLive((state.repsHistory || {})[exerciseName] || [], currentSessionBestReps(exerciseName), "reps");
  const repsVals = repsData.map(d => d.reps);
  const repsHTML = miniSparkline(repsVals, "Max Reps", "", "#ea580c", true);

  if (!wtHTML && !repsHTML && !ormHTML && !volHTML) return "";
  return `<div style="display:flex;justify-content:space-between;align-items:center;width:100%;gap:4px">${ormHTML}${volHTML}${wtHTML}${repsHTML}</div>`;
}

function renderHistoryStats() {
  const history = state.history || [];
  if (history.length < 2) return '';

  const perSession = history.map(s => {
    let vol = 0, reps = 0, sets = 0;
    s.sets.forEach(st => {
      if (st.set_type === 'working') {
        sets++;
        const r = parseInt(st.reps) || 0;
        const w = st.weight_lb || 0;
        reps += r;
        vol += w * r;
      }
    });
    return { date: s.date, vol, reps, sets, dur: s.duration_sec || 0 };
  }).reverse();

  const totalSessions = history.length;
  const totalVol = perSession.reduce((a, s) => a + s.vol, 0);
  const totalReps = perSession.reduce((a, s) => a + s.reps, 0);
  const totalSets = perSession.reduce((a, s) => a + s.sets, 0);
  const totalTime = perSession.reduce((a, s) => a + s.dur, 0);

  const volStr = totalVol >= 1000 ? (totalVol / 1000).toFixed(1) + 'k' : totalVol;
  const timeStr = totalTime >= 3600 ? (totalTime / 3600).toFixed(1) + 'h' : Math.round(totalTime / 60) + 'min';

  const volVals = perSession.map(s => s.vol);
  const repsVals = perSession.map(s => s.reps);
  const setsVals = perSession.map(s => s.sets);

  function statSparkline(vals, color) {
    if (vals.length < 2) return '';
    const max = Math.max(...vals), min = Math.min(...vals), range = max - min || 1;
    const w = 60, h = 24, pad = 2;
    const points = vals.map((v, i) =>
      `${pad + (i / (vals.length - 1)) * (w - pad * 2)},${pad + (1 - (v - min) / range) * (h - pad * 2)}`
    ).join(' ');
    const latest = vals[vals.length - 1];
    const trend = latest >= vals[vals.length - 2] ? color : '#ef4444';
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">
      <polyline points="${points}" fill="none" stroke="${trend}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
      <circle cx="${pad + ((vals.length - 1) / (vals.length - 1)) * (w - pad * 2)}" cy="${pad + (1 - (latest - min) / range) * (h - pad * 2)}" r="2" fill="${trend}"/>
    </svg>`;
  }

  return `
    <div class="card" style="padding:16px;margin-bottom:16px">
      <h3 style="font-size:14px;font-weight:600;color:#111827;margin:0 0 12px">Training Overview</h3>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
        <div style="background:#f0f9ff;border-radius:8px;padding:10px 12px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.03em">Total Volume</div>
              <div style="font-size:18px;font-weight:700;color:#1d4ed8">${volStr}<span style="font-size:11px;font-weight:500;color:#6b7280">lb</span></div>
            </div>
            ${statSparkline(volVals, '#3b82f6')}
          </div>
        </div>
        <div style="background:#f0fdf4;border-radius:8px;padding:10px 12px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.03em">Total Reps</div>
              <div style="font-size:18px;font-weight:700;color:#15803d">${totalReps}</div>
            </div>
            ${statSparkline(repsVals, '#22c55e')}
          </div>
        </div>
        <div style="background:#fef3c7;border-radius:8px;padding:10px 12px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.03em">Sessions</div>
              <div style="font-size:18px;font-weight:700;color:#92400e">${totalSessions}</div>
            </div>
            ${statSparkline(setsVals, '#f59e0b')}
          </div>
        </div>
        <div style="background:#f5f3ff;border-radius:8px;padding:10px 12px">
          <div>
            <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.03em">Time</div>
            <div style="font-size:18px;font-weight:700;color:#7c3aed">${timeStr}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderStats() {
  const history = state.history || [];
  if (!history.length) {
    return `
      <div style="padding:32px 16px 16px">
        <button onclick="state.screen='home';history.replaceState(null,'','#');render()" style="color:#2563eb;font-size:14px;font-weight:500;background:none;border:none;cursor:pointer;padding:0;margin-bottom:12px">← Back</button>
        <h1 style="font-size:24px;font-weight:700;color:#111827">Progress</h1>
        <p style="color:#9ca3af;text-align:center;padding:32px 0">No sessions logged yet.</p>
      </div>`;
  }

  const byEx = {};
  const sessionsAsc = [...history].reverse();
  for (const sess of sessionsAsc) {
    const exSetsInSess = {};
    for (const st of (sess.sets || [])) {
      if (st.set_type !== 'working') continue;
      const reps = parseInt(st.reps) || 0;
      const w = st.weight_lb || 0;
      if (reps === 0 && w === 0) continue;
      (exSetsInSess[st.exercise] ||= []).push({ w, r: reps });
    }
    for (const [name, sets] of Object.entries(exSetsInSess)) {
      const vol = sets.reduce((a, s) => a + s.w * s.r, 0);
      const reps = sets.reduce((a, s) => a + s.r, 0);
      const maxWt = sets.reduce((a, s) => Math.max(a, s.w), 0);
      const bestOrm = sets.reduce((a, s) => Math.max(a, s.w * (1 + s.r / 30)), 0);
      const topSet = sets.reduce((a, s) => (!a || s.w > a.w || (s.w === a.w && s.r > a.r)) ? s : a, null);
      (byEx[name] ||= { perSession: [], totalSets: 0, lastDate: null, name }).perSession.push(
        { date: sess.date, vol, reps, maxWt, bestOrm, topSet, sets: sets.length }
      );
      byEx[name].totalSets += sets.length;
      byEx[name].lastDate = sess.date;
    }
  }

  const exList = Object.values(byEx).sort((a, b) => b.lastDate.localeCompare(a.lastDate));

  function spark(vals, color) {
    if (vals.length < 2) return '';
    const latest = vals[vals.length - 1];
    const target = latest * 1.10;
    const max = Math.max(...vals, target);
    const min = Math.min(...vals);
    const range = max - min || 1;
    
    const w = 90, h = 22, pad = 2;
    const w_hist = 62;
    const w_proj = w - pad;
    
    const points = vals.map((v, i) => {
      const x = pad + (i / (vals.length - 1)) * (w_hist - pad);
      const y = pad + (1 - (v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    }).join(' ');
    
    const yL = pad + (1 - (latest - min) / range) * (h - pad * 2);
    const yT = pad + (1 - (target - min) / range) * (h - pad * 2);
    
    const prev = vals[vals.length - 2];
    const trend = latest >= prev ? color : '#ef4444';
    
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;flex-shrink:0;overflow:visible">
      <polyline points="${points}" fill="none" stroke="${trend}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
      <circle cx="${w_hist}" cy="${yL}" r="2" fill="${trend}"/>
      <line x1="${w_hist}" y1="${yL}" x2="${w_proj}" y2="${yT}" stroke="#3b82f6" stroke-width="1.2" stroke-dasharray="2,2" stroke-linecap="round" opacity="0.8"/>
      <circle cx="${w_proj}" cy="${yT}" r="2" fill="#2563eb"/>
    </svg>`;
  }

  function pctChange(first, last) {
    if (!first) return null;
    return Math.round(((last - first) / first) * 100);
  }

  const rows = exList.map(ex => {
    const ps = ex.perSession;
    const last = ps[ps.length - 1];
    const first = ps[0];
    const ormVals = ps.map(p => p.bestOrm).filter(v => v > 0);
    const volVals = ps.map(p => p.vol).filter(v => v > 0);
    const latestOrm = ormVals.length ? ormVals[ormVals.length - 1] : 0;
    const peakOrm = ormVals.length ? Math.max(...ormVals) : 0;
    const isPR = latestOrm > 0 && Math.abs(latestOrm - peakOrm) < 0.01 && ps.length >= 2;
    const hasWeight = last.topSet && last.topSet.w > 0;
    const topSetStr = hasWeight
      ? `${last.topSet.w}lb × ${last.topSet.r}`
      : `${last.reps} reps`;
    const sparkVals = ormVals.length >= 2 ? ormVals : volVals;
    const sparkColor = ormVals.length >= 2 ? '#3b82f6' : '#22c55e';
    const dV = pctChange(first.vol, last.vol);
    const dStr = dV === null || ps.length < 2 ? ''
      : dV > 0 ? `<span style="color:#15803d;font-weight:600">+${dV}%</span>`
      : dV < 0 ? `<span style="color:#dc2626;font-weight:600">${dV}%</span>`
      : `<span style="color:#6b7280">±0%</span>`;
    const ormStr = latestOrm > 0 ? `1RM ${Math.round(latestOrm)}` : '';
    const prBadge = isPR ? `<span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;letter-spacing:0.04em;margin-left:6px;vertical-align:middle">PR</span>` : '';
    const daysAgo = (() => {
      const d = new Date(last.date + 'T00:00:00');
      const now = new Date();
      const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      if (diff <= 0) return 'today';
      if (diff === 1) return '1d';
      if (diff < 7) return `${diff}d`;
      if (diff < 30) return `${Math.floor(diff / 7)}w`;
      return `${Math.floor(diff / 30)}mo`;
    })();

    const mapping = EXERCISE_MUSCLES[ex.name] || { primary: [], secondary: [] };
    const primaryBadges = (mapping.primary || []).map(m => {
      const info = MUSCLE_GROUPS[m];
      return `<span style="display:inline-block;font-size:9px;background:#e0f2fe;color:#0369a1;padding:1px 5px;border-radius:4px;font-weight:500;white-space:nowrap">${info?.label || m}</span>`;
    }).join('');
    const secondaryBadges = (mapping.secondary || []).map(m => {
      const info = MUSCLE_GROUPS[m];
      const pct = Math.round(getMuscleImpact(ex.name, m, false) * 100);
      return `<span style="display:inline-block;font-size:9px;background:#f1f5f9;color:#64748b;border:1px dashed #cbd5e1;padding:1px 5px;border-radius:4px;font-weight:500;white-space:nowrap">${info?.label || m} (${pct}%)</span>`;
    }).join('');
    const muscleBadgesHTML = (primaryBadges || secondaryBadges) ? `<div style="display:inline-flex;align-items:center;gap:4px;margin-left:6px;flex-wrap:wrap">${primaryBadges}${secondaryBadges}</div>` : '';

    let targetStr = '';
    if (last.topSet) {
      if (hasWeight) {
        const targetVal = Math.round(last.topSet.w * 1.10);
        targetStr = `<span style="font-weight:600;color:#2563eb;background:#eff6ff;border:1px solid #bfdbfe;padding:1px 5px;border-radius:4px;font-size:9.5px">🎯 Target: ${targetVal}lb</span>`;
      } else {
        const targetVal = Math.round(last.topSet.r * 1.10);
        targetStr = `<span style="font-weight:600;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;padding:1px 5px;border-radius:4px;font-size:9.5px">🎯 Target: ${targetVal} reps</span>`;
      }
    }

    return `
      <div style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;margin-bottom:6px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <div style="font-size:13px;font-weight:600;color:#111827;flex:1;min-width:0;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span>${ex.name}</span>${prBadge}${muscleBadgesHTML}
          </div>
          ${spark(sparkVals, sparkColor)}
        </div>
        <div style="font-size:11px;color:#6b7280;margin-top:3px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <span style="color:#111827;font-weight:500">${topSetStr}</span>
          ${ormStr ? `<span>${ormStr}</span>` : ''}
          <span>${ps.length} session${ps.length === 1 ? '' : 's'}</span>
          ${dStr ? `<span>${dStr} vol</span>` : ''}
          ${targetStr}
          <span style="margin-left:auto;color:#9ca3af">${daysAgo}</span>
        </div>
      </div>`;
  }).join('');

  const totalSessions = history.length;
  const totalVol = sessionsAsc.reduce((a, s) => {
    return a + (s.sets || []).reduce((b, st) => st.set_type === 'working' ? b + (st.weight_lb || 0) * (parseInt(st.reps) || 0) : b, 0);
  }, 0);
  const volStr = totalVol >= 1000 ? (totalVol / 1000).toFixed(1) + 'k' : totalVol;
  const uniqueExercises = exList.length;

  return `
    <div style="padding:24px 16px 16px">
      <button onclick="state.screen='home';history.replaceState(null,'','#');render()" style="color:#2563eb;font-size:14px;font-weight:500;background:none;border:none;cursor:pointer;padding:0;margin-bottom:8px">← Back</button>
      <h1 style="font-size:24px;font-weight:700;color:#111827;margin:0">Progress</h1>
      <p style="font-size:13px;color:#6b7280;margin:4px 0 0">${uniqueExercises} exercises · ${totalSessions} sessions · ${volStr}lb total volume</p>
    </div>
    <div style="padding:0 16px 16px">
      <details style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:8px 12px;margin-bottom:8px">
        <summary style="font-size:12px;font-weight:600;color:#92400e;cursor:pointer;list-style:none">🎊 Preview exercise-finish animations <span style="font-weight:400;color:#a16207">(big · tap to expand)</span></summary>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">
          ${CELEBRATION_VARIANTS.map((label, i) => {
            const w = CELEBRATION_WEIGHTS[i];
            const tier = w >= 13 ? '#a16207' : w >= 8 ? '#7c2d12' : '#a21caf';
            const tierBg = w >= 13 ? '#fef3c7' : w >= 8 ? '#fed7aa' : '#fae8ff';
            return `<button onclick="playCelebration(${i})" style="background:white;border:1px solid #fde68a;color:#92400e;font-size:11px;font-weight:500;padding:6px 10px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:6px">${i + 1}. ${label}<span style="background:${tierBg};color:${tier};font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px">${w}%</span></button>`;
          }).join('')}
          <button onclick="playCelebration()" style="background:#f97316;border:1px solid #ea580c;color:white;font-size:11px;font-weight:600;padding:6px 12px;border-radius:6px;cursor:pointer">🎲 Weighted random</button>
        </div>
      </details>
      <details style="background:#dcfce7;border:1px solid #86efac;border-radius:10px;padding:8px 12px;margin-bottom:12px">
        <summary style="font-size:12px;font-weight:600;color:#166534;cursor:pointer;list-style:none">✨ Preview per-set animations <span style="font-weight:400;color:#15803d">(subtle · tap to expand)</span></summary>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">
          ${SET_VARIANTS.map((label, i) => {
            const w = SET_WEIGHTS[i];
            const tier = w >= 13 ? '#15803d' : w >= 7 ? '#854d0e' : '#a21caf';
            const tierBg = w >= 13 ? '#dcfce7' : w >= 7 ? '#fef9c3' : '#fae8ff';
            return `<button onclick="playSetCelebration(${i})" style="background:white;border:1px solid #86efac;color:#166534;font-size:11px;font-weight:500;padding:6px 10px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:6px">${i + 1}. ${label}<span style="background:${tierBg};color:${tier};font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px">${w}%</span></button>`;
          }).join('')}
          <button onclick="playSetCelebration()" style="background:#22c55e;border:1px solid #16a34a;color:white;font-size:11px;font-weight:600;padding:6px 12px;border-radius:6px;cursor:pointer">🎲 Weighted random</button>
        </div>
      </details>
    </div>
    <div style="padding:0 16px 32px">
      ${rows || '<p style="color:#9ca3af;text-align:center;padding:32px 0">No working sets logged yet.</p>'}
    </div>`;
}
