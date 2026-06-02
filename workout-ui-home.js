// UI rendering logic for the Home tab of Workout Tracker

// Floating tooltip for sparkline points (and any element that wants one).
// Appended to <body> — outside #app's invert filter — so its dark styling
// renders as-authored, and position:fixed is viewport-relative (a filter on
// #app would otherwise become the containing block). Hover shows it; tap
// (sticky) shows it for ~2.2s so it works on touch where :hover doesn't.
function sparkTip(evt, text, sticky) {
  let el = document.getElementById('spark-tip');
  if (!text) { if (el) el.style.opacity = '0'; return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'spark-tip';
    el.style.cssText = 'position:fixed;z-index:99999;pointer-events:none;background:#1f2937;color:#f3f4f6;'
      + 'border:1px solid rgba(255,255,255,0.18);border-radius:8px;padding:6px 9px;font-size:12px;'
      + 'font-family:ui-monospace,Menlo,monospace;box-shadow:0 8px 24px rgba(0,0,0,0.5);white-space:nowrap;'
      + 'transform:translate(-50%,-138%);opacity:0;transition:opacity 90ms ease';
    document.body.appendChild(el);
  }
  el.textContent = text;
  const t = evt && evt.target;
  const r = t && t.getBoundingClientRect ? t.getBoundingClientRect() : null;
  el.style.left = (r ? r.left + r.width / 2 : (evt ? evt.clientX : 0)) + 'px';
  el.style.top = (r ? r.top : (evt ? evt.clientY : 0)) + 'px';
  el.style.opacity = '1';
  if (sticky) { clearTimeout(sparkTip._t); sparkTip._t = setTimeout(() => { el.style.opacity = '0'; }, 2200); }
}
if (typeof window !== 'undefined') window.sparkTip = sparkTip;

function microSparkline(vals, color) {
  if (!vals || vals.length < 2) return '';
  const max = Math.max(...vals), min = Math.min(...vals), range = max - min || 1;
  const w = 36, h = 12, pad = 1;
  const points = vals.map((v, i) =>
    `${pad + (i / (vals.length - 1)) * (w - pad * 2)},${pad + (1 - (v - min) / range) * (h - pad * 2)}`
  ).join(' ');
  const latest = vals[vals.length - 1];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;flex-shrink:0;opacity:0.9">
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${w - pad}" cy="${pad + (1 - (latest - min) / range) * (h - pad * 2)}" r="1.6" fill="${color}"/>
  </svg>`;
}



function computeSessionVolumePerMuscle() {
  if (!state.workout) return {};
  const vol = {};
  const add = (mapping, setVol) => {
    if (!mapping) return;
    (mapping.primary || []).forEach(m => { vol[m] = (vol[m] || 0) + setVol; });
    (mapping.secondary || []).forEach(m => { vol[m] = (vol[m] || 0) + setVol * 0.5; });
  };
  state.workout.exercises.forEach((ex, exIdx) => {
    const subs = ex.supersetExercises;
    for (let i = 0; i < getSetCount(exIdx); i++) {
      if (!state.completed[`${exIdx}-${i}`]) continue;
      const w = state.weights[`${exIdx}-${i}`] || 0;
      const r = parseInt(state.reps[`${exIdx}-${i}`]) || 0;
      if (w <= 0 || r <= 0) continue;
      const exName = subs ? subs[i % subs.length].name : ex.name;
      add(EXERCISE_MUSCLES[exName], w * r);
    }
    if (state.completed[`${exIdx}-warmup`]) {
      const w = state.weights[`${exIdx}-warmup`] || 0;
      const r = parseInt(state.reps[`${exIdx}-warmup`]) || 0;
      if (w > 0 && r > 0) add(EXERCISE_MUSCLES[ex.name], w * r * 0.5);
    }
  });
  return vol;
}

function _volColor(pct) {
  if (pct === 0)  return { bg: "#f3f4f6", fg: "#9ca3af" };
  if (pct < 0.20) return { bg: "#dbeafe", fg: "#1d4ed8" };
  if (pct < 0.50) return { bg: "#bbf7d0", fg: "#15803d" };
  if (pct < 0.80) return { bg: "#fed7aa", fg: "#c2410c" };
  return                 { bg: "#fca5a5", fg: "#991b1b" };
}

function renderSessionMuscleMap() {
  const vol = computeSessionVolumePerMuscle();
  const maxVol = Math.max(0, ...Object.values(vol));
  if (maxVol === 0) return '';

  function muscleRect(id, x, y, w, h, rx) {
    const v = vol[id] || 0;
    const pct = v / maxVol;
    const c = _volColor(pct);
    const info = MUSCLE_GROUPS[id];
    const tip = v > 0 ? `${Math.round(v)}` : '—';
    return `
      <g>
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx || 4}" fill="${c.bg}" stroke="${c.fg}" stroke-width="1.2" opacity="0.85"/>
        <text x="${x + w/2}" y="${y + h/2 + 1}" text-anchor="middle" dominant-baseline="middle" font-size="7" font-weight="600" fill="${c.fg}">${info.label}</text>
        <text x="${x + w/2}" y="${y + h - 2}" text-anchor="middle" font-size="5" fill="${c.fg}" opacity="0.7">${tip}</text>
      </g>
    `;
  }

  return `
    <div class="card" style="padding:16px;margin-bottom:16px">
      <h3 style="font-size:14px;font-weight:600;color:#111827;margin:0 0 2px">Active Session Load</h3>
      <p style="font-size:11px;color:#6b7280;margin:0 0 10px">Total load volume (reps × weight) moved in this workout.</p>
      <div style="display:flex;justify-content:center;gap:8px;margin-bottom:8px">
        <div style="text-align:center">
          <p style="font-size:10px;color:#9ca3af;margin:0 0 4px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Front</p>
          <svg viewBox="0 0 100 170" width="130" height="220" style="display:block">
            <ellipse cx="50" cy="14" rx="12" ry="13" fill="#f9fafb" stroke="#d1d5db" stroke-width="1"/>
            <path d="M35,28 Q30,30 26,40 L20,65 Q18,70 22,70 L32,60 L32,75 L30,120 Q29,125 34,125 L42,125 L44,90 L50,80 L56,90 L58,125 L66,125 Q71,125 70,120 L68,75 L68,60 L78,70 Q82,70 80,65 L74,40 Q70,30 65,28 Z" fill="#f9fafb" stroke="#d1d5db" stroke-width="1"/>
            <path d="M30,125 L28,155 Q27,160 33,160 L40,160 L41,125" fill="#f9fafb" stroke="#d1d5db" stroke-width="1"/>
            <path d="M59,125 L60,160 L67,160 Q73,160 72,155 L70,125" fill="#f9fafb" stroke="#d1d5db" stroke-width="1"/>
            ${muscleRect("shoulders", 28, 28, 17, 14, 3)}
            ${muscleRect("shoulders", 55, 28, 17, 14, 3)}
            ${muscleRect("chest", 36, 38, 28, 16, 4)}
            ${muscleRect("biceps", 22, 44, 13, 18, 3)}
            ${muscleRect("biceps", 65, 44, 13, 18, 3)}
            ${muscleRect("forearms", 20, 55, 11, 14, 3)}
            ${muscleRect("forearms", 69, 55, 11, 14, 3)}
            ${muscleRect("core", 38, 56, 24, 20, 4)}
            ${muscleRect("quads", 32, 90, 15, 30, 4)}
            ${muscleRect("quads", 53, 90, 15, 30, 4)}
          </svg>
        </div>
        <div style="text-align:center">
          <p style="font-size:10px;color:#9ca3af;margin:0 0 4px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Back</p>
          <svg viewBox="0 0 100 170" width="130" height="220" style="display:block">
            <ellipse cx="50" cy="14" rx="12" ry="13" fill="#f9fafb" stroke="#d1d5db" stroke-width="1"/>
            <path d="M35,28 Q30,30 26,40 L20,65 Q18,70 22,70 L32,60 L32,75 L30,120 Q29,125 34,125 L42,125 L44,90 L50,80 L56,90 L58,125 L66,125 Q71,125 70,120 L68,75 L68,60 L78,70 Q82,70 80,65 L74,40 Q70,30 65,28 Z" fill="#f9fafb" stroke="#d1d5db" stroke-width="1"/>
            <path d="M30,125 L28,155 Q27,160 33,160 L40,160 L41,125" fill="#f9fafb" stroke="#d1d5db" stroke-width="1"/>
            <path d="M59,125 L60,160 L67,160 Q73,160 72,155 L70,125" fill="#f9fafb" stroke="#d1d5db" stroke-width="1"/>
            ${muscleRect("rear_delts", 28, 28, 17, 12, 3)}
            ${muscleRect("rear_delts", 55, 28, 17, 12, 3)}
            ${muscleRect("upper_back", 36, 33, 28, 13, 4)}
            ${muscleRect("triceps", 22, 44, 13, 18, 3)}
            ${muscleRect("triceps", 65, 44, 13, 18, 3)}
            ${muscleRect("lats", 34, 48, 32, 16, 4)}
            ${muscleRect("lower_back", 38, 66, 24, 14, 4)}
            ${muscleRect("glutes", 34, 82, 32, 16, 4)}
            ${muscleRect("hamstrings", 32, 100, 15, 24, 4)}
            ${muscleRect("hamstrings", 53, 100, 15, 24, 4)}
            ${muscleRect("calves", 32, 130, 13, 22, 4)}
            ${muscleRect("calves", 55, 130, 13, 22, 4)}
          </svg>
        </div>
      </div>
    </div>
  `;
}

function renderWorkoutCard(w, i) {
  const rec = getWorkoutRecovery(w);
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
    const valLabel = s ? `${weightVal}lb × ${repsVal}` : 'No history';
    return `
      <div style="display:flex;justify-content:between;align-items:center;font-size:12px;margin-bottom:4px;gap:8px">
        <span style="color:#374151;font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ex.name}</span>
        <span style="color:#6b7280;font-family:ui-monospace,Menlo,monospace">${valLabel}</span>
      </div>
    `;
  }).join("");

  return `
    <div class="card clickable" onclick="startWorkout(${i})" style="padding:16px;margin-bottom:12px;position:relative">
      <div style="display:flex;justify-content:between;align-items:start;margin-bottom:10px">
        <div>
          <h3 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 2px">${w.name}</h3>
          <span style="font-size:11px;color:#9ca3af;font-weight:600">${w.duration}</span>
        </div>
        ${recoveryBadge(rec.avg)}
      </div>
      <div style="border-top:1px solid #f3f4f6;padding-top:8px;margin-bottom:4px">${rowsHTML}</div>
    </div>
  `;
}

function renderWorkoutSummaryCard() {
  const history = state.history || [];
  if (!history.length) return '';

  const latest = history.find(s => (s.sets || []).some(x => x.set_type === 'working' && x.reps));
  if (!latest) return '';

  const _esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const name = _esc(latest.workout_name);
  const dateStr = _esc(latest.date);
  const durSec = latest.duration_sec || 0;
  const m = Math.floor(durSec / 60);
  const elapsedLabel = m > 0 ? `${m} min` : '';

  const muscles = {};
  const addMus = (exName, setVol) => {
    const map = EXERCISE_MUSCLES[exName];
    if (!map) return;
    map.primary.forEach(m => {
      muscles[m] = (muscles[m] || 0) + setVol * getMuscleImpact(exName, m, true);
    });
    map.secondary.forEach(m => {
      muscles[m] = (muscles[m] || 0) + setVol * getMuscleImpact(exName, m, false);
    });
  };

  const exerciseSummary = {};
  (latest.sets || []).forEach(set => {
    if (set.set_type !== 'working' || !set.reps) return;
    const ex = set.exercise;
    const r = parseInt(set.reps) || 0;
    const w = parseFloat(set.weight_lb) || 0;
    const vol = r * w;
    addMus(ex, vol);

    if (!exerciseSummary[ex]) {
      exerciseSummary[ex] = { bestW: 0, bestR: 0, best1RM: 0, totalVol: 0, setsCount: 0, historyWeights: [] };
    }
    const sum = exerciseSummary[ex];
    sum.totalVol += vol;
    sum.setsCount++;
    const est = calcSet1RM(ex, w, r, set.bands_json);
    const isAssist = ex === "Bench Dips" || ex === "Assisted Pull-Ups";
    if (sum.best1RM === 0 && isAssist) sum.best1RM = -Infinity;
    if (est > sum.best1RM) {
      sum.bestW = w;
      sum.bestR = r;
      sum.best1RM = est;
    }
  });

  const muscleVolumeList = Object.entries(muscles).sort((a,b) => b[1] - a[1]);
  const totalMusVolume = muscleVolumeList.reduce((sum, item) => sum + item[1], 0) || 1;

  const sameWorkoutHistory = history
    .filter(s => s.workout_name === latest.workout_name && (s.sets || []).some(x => x.set_type === 'working' && x.reps))
    .slice(0, 5)
    .reverse();

  let maxSessionVol = 0;
  const historyData = sameWorkoutHistory.map(s => {
    let vol = 0;
    (s.sets || []).forEach(set => {
      if (set.set_type === 'working' && set.reps) {
        vol += (parseInt(set.reps) || 0) * (parseFloat(set.weight_lb) || 0);
      }
    });
    if (vol > maxSessionVol) maxSessionVol = vol;
    return { date: s.date, volume: vol };
  });

  // ---- enriched per-exercise data ----
  // Both the sparkline and the % trend track the SAME metric: estimated 1RM,
  // one point per session. So the line and the number always agree in
  // direction (line up ⇒ green +%, line down ⇒ red −%). The 1RM est is the
  // best working set of each session (Epley: w·(1+reps/30)).
  const _assist = (n) => n === "Bench Dips" || n === "Assisted Pull-Ups";
  const exList = Object.entries(exerciseSummary).map(([exName, sum]) => {
    // Best working set (by est 1RM) per session, oldest → newest. Each entry
    // keeps the set's weight/reps so the PR card can show before → after.
    const perSession = [];
    history.forEach(s => {
      let best = _assist(exName) ? -Infinity : 0, bw = 0, br = 0, has = false;
      (s.sets || []).forEach(set => {
        if (set.exercise === exName && set.set_type === 'working' && set.reps) {
          has = true;
          const w = parseFloat(set.weight_lb) || 0, r = parseInt(set.reps) || 0;
          const est = calcSet1RM(exName, w, r, set.bands_json);
          if (est > best) { best = est; bw = w; br = r; }
        }
      });
      if (has) perSession.push({ date: s.date, value: best, w: bw, r: br });
    });
    perSession.reverse(); // oldest → newest; last entry is today (latest)
    const today1RM = perSession.length ? perSession[perSession.length - 1].value : sum.best1RM;
    const prior1RM = perSession.length > 1 ? perSession[perSession.length - 2].value : null;
    const priors = perSession.slice(0, -1);
    const priorMax = priors.length ? Math.max(...priors.map(p => p.value)) : (_assist(exName) ? -Infinity : 0);
    // Previous best-ever set (across all prior sessions) — the record this
    // session is measured against.
    const prevBest = priors.length ? priors.reduce((m, p) => p.value > m.value ? p : m, priors[0]) : null;
    // Strictly beat the previous best (or a debut, where priorMax is 0/−∞) —
    // merely tying isn't a new PR, and tie rows would show "68 → 68".
    const isPR = today1RM > priorMax && today1RM > 0;
    const deltaPct = (prior1RM != null && prior1RM > 0)
      ? Math.round(((today1RM - prior1RM) / prior1RM) * 100)
      : null;
    return { exName, sum, isPR, deltaPct, prevBest, sparkPts: perSession.slice(-6) };
  });

  const totalSets = exList.reduce((n, e) => n + e.sum.setsCount, 0);
  const numLifts = exList.length;
  const prsList = exList.filter(e => e.isPR);
  const upCount = exList.filter(e => e.deltaPct != null && e.deltaPct > 0).length;
  const downCount = exList.filter(e => e.deltaPct != null && e.deltaPct < 0).length;
  const latestVol = historyData.length ? historyData[historyData.length - 1].volume : 0;
  const prevVol = historyData.length > 1 ? historyData[historyData.length - 2].volume : 0;
  const netTrend = prevVol > 0 ? Math.round(((latestVol - prevVol) / prevVol) * 100) : null;

  const musRows = muscleVolumeList.slice(0, 6).map(([mn, vol]) => ({
    label: (MUSCLE_GROUPS[mn] && MUSCLE_GROUPS[mn].label) || mn,
    pct: Math.round((vol / totalMusVolume) * 100),
  }));
  const maxMusPct = Math.max(1, ...musRows.map(r => r.pct));

  // ---- HARD SETS · LAST 7 DAYS, allocated per muscle ----
  // "Hard sets" = working sets (warmups excluded), over the 7-day window
  // ending with this session. Each set is distributed across the exercise's
  // muscles by the same allocation weights MUSCLE FOCUS uses (getMuscleImpact:
  // primary 1.0 / secondary 0.5, or explicit ratios), so one bench set counts
  // as 1.0 chest + 0.5 triceps + 0.5 shoulders. 10–20 sets/muscle/week is the
  // commonly-cited hypertrophy range.
  const weekAnchorMs = Date.parse(latest.date + 'T00:00:00');
  const weekStartMs = weekAnchorMs - 6 * 86400000;
  const weeklySets = {};
  history.forEach(s => {
    const sMs = Date.parse(s.date + 'T00:00:00');
    if (isNaN(sMs) || sMs < weekStartMs || sMs > weekAnchorMs) return;
    (s.sets || []).forEach(set => {
      if (set.set_type !== 'working' || !set.reps) return;
      const map = EXERCISE_MUSCLES[set.exercise];
      if (!map) return;
      map.primary.forEach(mm => { weeklySets[mm] = (weeklySets[mm] || 0) + getMuscleImpact(set.exercise, mm, true); });
      map.secondary.forEach(mm => { weeklySets[mm] = (weeklySets[mm] || 0) + getMuscleImpact(set.exercise, mm, false); });
    });
  });
  const weeklySetsList = Object.entries(weeklySets).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxWeeklySets = Math.max(1, ...weeklySetsList.map(r => r[1]));

  const MONO = 'ui-monospace,Menlo,monospace';
  const fmtW = (w) => (Math.round(w * 10) / 10);
  const mmdd = (d) => { const p = String(d || '').split('-'); return p.length === 3 ? `${p[1]}/${p[2]}` : (d || ''); };
  // Sparkline of per-session estimated 1RM. Each point has a wide transparent
  // hit-circle wired to the custom sparkTip() tooltip (date · 1RM) — hover on
  // desktop, tap on touch. The final point is emphasized.
  const spark = (pts) => {
    const data = (pts || []).filter(p => p && isFinite(p.value));
    if (data.length < 2) return '<div style="width:52px;flex-shrink:0"></div>';
    const vals = data.map(p => p.value);
    const mx = Math.max(...vals), mn = Math.min(...vals), rng = mx - mn || 1;
    const w = 52, h = 22, pad = 2;
    const xy = data.map((p, i) => ({
      x: pad + (i / (data.length - 1)) * (w - pad * 2),
      y: pad + (1 - (p.value - mn) / rng) * (h - pad * 2),
    }));
    const poly = xy.map(c => `${c.x},${c.y}`).join(' ');
    const dots = xy.map((c, i) => {
      const tip = `${mmdd(data[i].date)} · ${Math.round(data[i].value)} lb est 1RM`.replace(/'/g, "\\'");
      const isLast = i === xy.length - 1;
      return `<circle cx="${c.x}" cy="${c.y}" r="${isLast ? 2 : 1.5}" fill="#a78bfa"/>`
        + `<circle cx="${c.x}" cy="${c.y}" r="7" fill="transparent" style="cursor:pointer"`
        + ` onmouseenter="sparkTip(event,'${tip}')" onmouseleave="sparkTip()" onclick="sparkTip(event,'${tip}',true)"></circle>`;
    }).join('');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="flex-shrink:0;overflow:visible"><polyline points="${poly}" fill="none" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`;
  };

  const bars = historyData.map(h => {
    const pct = maxSessionVol ? (h.volume / maxSessionVol) * 100 : 0;
    const isLatest = h.date === latest.date;
    const dl = mmdd(h.date);
    const tip = `${dl} · ${Math.round(h.volume).toLocaleString()} lb volume`;
    return `<div title="${tip}" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer">
      <div style="height:54px;width:100%;display:flex;align-items:end">
        <div style="width:100%;height:${Math.max(8, pct)}%;background:${isLatest ? '#a78bfa' : 'rgba(255,255,255,0.09)'};border-radius:4px"></div>
      </div>
      <span style="font-size:9px;font-family:${MONO};color:${isLatest ? '#a78bfa' : '#6B7280'};font-weight:${isLatest ? '800' : '500'}">${dl}</span>
    </div>`;
  }).join('');

  const netColor = netTrend == null ? '#6B7280' : netTrend > 0 ? '#34D399' : netTrend < 0 ? '#F87171' : '#6B7280';

  const musHTML = musRows.map(r => `
    <div title="${_esc(r.label)}: ${r.pct}% of this session's muscle-weighted volume" style="display:flex;align-items:center;gap:12px;padding:3px 0;cursor:default">
      <span style="width:84px;flex-shrink:0;color:#D1D5DB;font-size:13px">${_esc(r.label)}</span>
      <div style="flex:1;height:6px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden"><div style="height:100%;width:${(r.pct / maxMusPct) * 100}%;background:rgba(255,255,255,0.22);border-radius:99px"></div></div>
      <span style="width:34px;text-align:right;color:#9CA3AF;font-size:12px;font-family:${MONO}">${r.pct}%</span>
    </div>`).join('');

  const fmtSets = (x) => { const r = Math.round(x * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1); };
  const weeklySetsHTML = weeklySetsList.length ? weeklySetsList.map(([mn, sets]) => {
    const label = (MUSCLE_GROUPS[mn] && MUSCLE_GROUPS[mn].label) || mn;
    const n = fmtSets(sets);
    // Color the count green once it's in the 10–20 hypertrophy range, amber
    // above, faint below — a quick read on weekly volume per muscle.
    const cnt = sets;
    const numColor = cnt >= 10 && cnt <= 20 ? '#34D399' : cnt > 20 ? '#FBBF24' : '#C4B5FD';
    return `<div title="${_esc(label)}: ${n} allocated working sets over the last 7 days (10–20 is the hypertrophy sweet spot)" style="display:flex;align-items:center;gap:12px;padding:3px 0;cursor:default">
      <span style="width:84px;flex-shrink:0;color:#D1D5DB;font-size:13px">${_esc(label)}</span>
      <div style="flex:1;height:6px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden"><div style="height:100%;width:${(sets / maxWeeklySets) * 100}%;background:rgba(167,139,250,0.55);border-radius:99px"></div></div>
      <span style="width:38px;text-align:right;color:${numColor};font-size:12px;font-weight:700;font-family:${MONO}">${n}</span>
    </div>`;
  }).join('') : `<div style="color:#6B7280;font-size:12px;padding:6px 0">No working sets in the last 7 days.</div>`;

  const exHTML = exList.map(e => {
    const pr = e.isPR;
    const dc = e.deltaPct == null ? '#6B7280' : e.deltaPct > 0 ? '#34D399' : e.deltaPct < 0 ? '#F87171' : '#6B7280';
    const dt = e.deltaPct == null ? '' : `${e.deltaPct > 0 ? '+' : ''}${e.deltaPct}%`;
    return `<div style="background:${pr ? 'rgba(251,191,36,0.05)' : 'rgba(255,255,255,0.02)'};border:1px solid ${pr ? 'rgba(251,191,36,0.22)' : 'rgba(255,255,255,0.05)'};${pr ? 'border-left:3px solid #FBBF24;' : ''}border-radius:10px;padding:11px 13px">
      <div style="display:flex;align-items:center;gap:8px">
        ${pr ? `<span style="color:#FBBF24;font-size:11px;flex-shrink:0">★</span>` : ''}
        <span style="flex:1;min-width:0;color:#F3F4F6;font-size:13.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(e.exName)}</span>
        ${spark(e.sparkPts)}
        ${dt ? `<span style="flex-shrink:0;min-width:42px;text-align:right;color:${dc};font-family:${MONO};font-size:13px;font-weight:800">${dt}</span>` : ''}
      </div>
      <div style="margin-top:6px;color:#6B7280;font-size:11px;font-family:${MONO}">Top <span style="color:#D1D5DB;font-weight:700">${fmtW(e.sum.bestW)}×${e.sum.bestR}</span> · 1RM ${Math.round(e.sum.best1RM)} · ${e.sum.setsCount} sets</div>
    </div>`;
  }).join('');

  return `
    <div data-noinvert style="margin-bottom:16px;overflow:hidden;background:#0B0F14;border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:18px 18px 20px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;margin-bottom:18px">
        <div style="min-width:140px;flex:1">
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:800;letter-spacing:0.08em;color:#C4B5FD;background:rgba(139,92,246,0.16);border:1px solid rgba(139,92,246,0.35);padding:4px 10px;border-radius:99px;font-family:${MONO}">✓ DONE</span>
          <h3 style="font-size:30px;font-weight:800;color:#F3F4F6;margin:10px 0 3px;letter-spacing:-0.02em;line-height:1.05">${name}</h3>
          <span style="font-size:12px;color:#6B7280;font-family:${MONO}">${dateStr}</span>
        </div>

        <div style="display:flex;gap:10px;align-items:center;flex-shrink:0">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:10px 14px;min-width:80px;text-align:center">
            <div style="font-size:20px;font-weight:800;color:#F3F4F6;font-family:${MONO};line-height:1">${m}<span style="font-size:10px;color:#6B7280;margin-left:2px">min</span></div>
            <div style="font-size:8px;font-weight:800;letter-spacing:0.08em;color:#6B7280;font-family:${MONO};margin-top:6px">DURATION</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:10px 14px;min-width:80px;text-align:center">
            <div style="font-size:20px;font-weight:800;color:#F3F4F6;font-family:${MONO};line-height:1">${totalSets}</div>
            <div style="font-size:8px;font-weight:800;letter-spacing:0.08em;color:#6B7280;font-family:${MONO};margin-top:6px">SETS</div>
            <div style="font-size:8px;color:#6B7280;margin-top:2px;line-height:1">${numLifts} lifts</div>
          </div>
        </div>

        ${historyData.length > 1 ? `
          <div style="width:180px;flex-shrink:0;display:flex;flex-direction:column;gap:6px">
            <div style="font-size:8px;font-weight:800;letter-spacing:0.08em;color:#6B7280;font-family:${MONO};text-align:right">
              VOL TREND: <span style="color:${netColor};font-weight:800">${netTrend == null ? '—' : `${netTrend > 0 ? '+' : ''}${netTrend}%`}</span>
            </div>
            <div style="display:flex;gap:6px;align-items:end">${bars}</div>
          </div>
        ` : ''}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-bottom:18px">
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:15px 16px">
          <div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:#6B7280;font-family:${MONO};margin-bottom:10px">MUSCLE FOCUS <span style="color:#4B5563;font-weight:600;letter-spacing:0.04em">· THIS SESSION</span></div>
          ${musHTML}
        </div>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:15px 16px">
          <div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:#A78BFA;font-family:${MONO};margin-bottom:10px">HARD SETS <span style="color:#6D5B9E;font-weight:600;letter-spacing:0.04em">· LAST 7 DAYS</span></div>
          ${weeklySetsHTML}
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:baseline;margin:0 2px 10px">
        <span style="font-size:10px;font-weight:800;letter-spacing:0.1em;color:#6B7280;font-family:${MONO}">ALL EXERCISES</span>
        <span style="font-size:11px;color:#6B7280">${numLifts} lifts · est. 1RM trend${upCount || downCount ? ` (${upCount} up · ${downCount} down)` : ''}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px">
        ${exHTML || '<div style="color:#6B7280;font-size:12px;padding:8px 0">No working sets logged.</div>'}
      </div>
    </div>
  `;
}

function renderPercentilesCard() {
  const history = state.history || [];
  const offset = state.percentilesMonthOffset || 0;
  const measurements = state.measurements || [];
  const sortedMeasAsc = [...measurements].sort((a, b) => (a.taken_at || '').localeCompare(b.taken_at || ''));
  const latestMeas = measurements[0];
  const prevMeas = measurements[1];

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + offset * 30);
  const endMs = endDate.setHours(23, 59, 59, 999);
  
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);
  const startMs = startDate.setHours(0, 0, 0, 0);
  
  let timeLabel = "Last 30 Days";
  if (offset === -1) timeLabel = "Previous 30 Days";
  else if (offset < -1) timeLabel = `${Math.abs(offset - 1) * 30} - ${Math.abs(offset) * 30} Days Ago`;
  
  const exerciseDates = {};

  if (history.length > 0) {
    history.forEach(sess => {
      if (!sess.date) return;
      const sessMs = Date.parse(sess.date + 'T00:00:00');
      if (sessMs < startMs || sessMs > endMs) return;

      (sess.sets || []).forEach(st => {
        if (st.set_type !== 'working' || !st.reps) return;
        const w = parseFloat(st.weight_lb) || 0;
        const r = parseInt(st.reps) || 0;
        if (w <= 0 || r <= 0) return;
        
        const orm = calcSet1RM(st.exercise, w, r, st.bands_json);

        if (!exerciseDates[st.exercise]) {
          exerciseDates[st.exercise] = {};
        }
        if (!exerciseDates[st.exercise][sess.date] || orm > exerciseDates[st.exercise][sess.date]) {
          exerciseDates[st.exercise][sess.date] = orm;
        }
      });
    });
  }

  const exerciseHistory = {};
  const activeExercises = new Set();

  Object.entries(exerciseDates).forEach(([exName, datesObj]) => {
    const sortedDates = Object.keys(datesObj).sort();
    const pts = [];

    sortedDates.forEach(date => {
      const orm = datesObj[date];
      const pctInfo = getStrengthPercentile(exName, orm);
      if (!pctInfo) return;

      pts.push({
        date: date,
        ms: Date.parse(date + 'T00:00:00'),
        orm: orm,
        percentile: pctInfo.percentile,
        tier: pctInfo.tier
      });
    });

    if (pts.length > 0) {
      activeExercises.add(exName);
      exerciseHistory[exName] = pts;
    }
  });

  const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4", "#f43f5e", "#14b8a6"];
  const exColors = {};

  const renderSparkline = (pts, color) => {
    if (pts.length === 0) return '';

    const w = 150;
    const h = 50;
    const padLeft = 28;
    const padRight = 6;
    const padTop = 6;
    const padBottom = 12;

    const percentiles = pts.map(p => p.percentile);
    const minP = Math.min(...percentiles);
    const maxP = Math.max(...percentiles);
    
    const span = Math.max(10, maxP - minP);
    const mid = (minP + maxP) / 2;
    let yMin = Math.max(0, mid - span / 2);
    let yMax = Math.min(100, mid + span / 2);
    
    if (yMin < 0) {
      yMax = Math.min(100, yMax + (0 - yMin));
      yMin = 0;
    }
    if (yMax > 100) {
      yMin = Math.max(0, yMin - (yMax - 100));
      yMax = 100;
    }

    const getX = (ms) => {
      const range = endMs - startMs || 1;
      const ratio = (ms - startMs) / range;
      return padLeft + ratio * (w - padLeft - padRight);
    };

    const getY = (pct) => {
      const range = yMax - yMin || 1;
      const ratio = (pct - yMin) / range;
      return (h - padBottom) - ratio * (h - padBottom - padTop);
    };

    const yVals = [yMin, (yMin + yMax) / 2, yMax];
    const gridLines = yVals.map(val => {
      const y = getY(val);
      const label = `${Math.round(val)}%`;
      return `
        <line x1="${padLeft}" y1="${y}" x2="${w - padRight}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="2,2" />
        <text x="${padLeft - 4}" y="${y + 3.5}" font-size="8px" fill="#6b7280" text-anchor="end">${label}</text>
      `;
    }).join('');

    const dayMs = 24 * 3600 * 1000;
    const weekMarks = [
      { day: 7, label: 'W1', ms: startMs + 6 * dayMs },
      { day: 14, label: 'W2', ms: startMs + 13 * dayMs },
      { day: 21, label: 'W3', ms: startMs + 20 * dayMs },
      { day: 28, label: 'W4', ms: startMs + 27 * dayMs }
    ];

    const weekLines = weekMarks
      .filter(mark => mark.ms <= endMs)
      .map(mark => {
        const x = getX(mark.ms);
        return `
          <line x1="${x}" y1="${padTop}" x2="${x}" y2="${h - padBottom}" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="2,2" />
          <text x="${x}" y="${h - 2}" font-size="7px" fill="#9ca3af" text-anchor="middle">${mark.label}</text>
        `;
      }).join('');

    let pathHTML = '';
    let dotsHTML = '';

    if (pts.length === 1) {
      const x = getX(pts[0].ms);
      const y = getY(pts[0].percentile);
      dotsHTML = `<circle cx="${x}" cy="${y}" r="2.5" fill="${color}" />`;
    } else {
      const pathD = pts.map((p, idx) => {
        const x = getX(p.ms);
        const y = getY(p.percentile);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');

      pathHTML = `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" />`;
      dotsHTML = pts.map(p => {
        const x = getX(p.ms);
        const y = getY(p.percentile);
        return `<circle cx="${x}" cy="${y}" r="2" fill="${color}" />`;
      }).join('');
    }

    return `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;flex-shrink:0;">
        ${gridLines}
        ${weekLines}
        ${pathHTML}
        ${dotsHTML}
      </svg>
    `;
  };

  const renderMeasurementSparkline = (vals, color, direction) => {
    if (vals.length === 0) return '';
    const w = 150;
    const h = 50;
    const padLeft = 28;
    const padRight = 6;
    const padTop = 6;
    const padBottom = 12;

    const max = Math.max(...vals), min = Math.min(...vals), range = max - min || 1;
    const getX = (idx) => padLeft + (idx / Math.max(1, vals.length - 1)) * (w - padLeft - padRight);
    const getY = (v) => (h - padBottom) - ((v - min) / range) * (h - padBottom - padTop);

    const gridLines = `
      <line x1="${padLeft}" y1="${padTop}" x2="${w - padRight}" y2="${padTop}" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="2,2" />
      <text x="${padLeft - 4}" y="${padTop + 3.5}" font-size="8px" fill="#6b7280" text-anchor="end">${max.toFixed(0)}</text>
      <line x1="${padLeft}" y1="${h - padBottom}" x2="${w - padRight}" y2="${h - padBottom}" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="2,2" />
      <text x="${padLeft - 4}" y="${h - padBottom + 3.5}" font-size="8px" fill="#6b7280" text-anchor="end">${min.toFixed(0)}</text>
    `;

    let pathHTML = '';
    let dotsHTML = '';

    if (vals.length === 1) {
      const x = getX(0);
      const y = getY(vals[0]);
      dotsHTML = `<circle cx="${x}" cy="${y}" r="2.5" fill="${color}" />`;
    } else {
      const pathD = vals.map((v, idx) => {
        const x = getX(idx);
        const y = getY(v);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');

      pathHTML = `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" />`;
      dotsHTML = vals.map((v, idx) => {
        const x = getX(idx);
        const y = getY(v);
        return `<circle cx="${x}" cy="${y}" r="2" fill="${color}" />`;
      }).join('');
    }

    return `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;flex-shrink:0;">
        ${gridLines}
        ${pathHTML}
        ${dotsHTML}
      </svg>
    `;
  };

  function getTierStyle(tier) {
    switch (tier) {
      case 'Elite':
        return 'background:#fee2e2;color:#b91c1c;';
      case 'Advanced':
        return 'background:#ffedd5;color:#c2410c;';
      case 'Intermediate':
        return 'background:#dcfce7;color:#15803d;';
      case 'Novice':
        return 'background:#e0f2fe;color:#0369a1;';
      case 'Beginner':
        return 'background:#f3f4f6;color:#4b5563;';
      default:
        return 'background:#f9fafb;color:#9ca3af;';
    }
  }

  const MUSCLE_TO_UNIFIED_GROUP = {
    chest: 'chest',
    shoulders: 'shoulders',
    rear_delts: 'shoulders',
    biceps: 'arms',
    triceps: 'arms',
    forearms: 'arms',
    upper_back: 'back',
    lats: 'back',
    lower_back: 'back',
    core: 'core',
    quads: 'legs',
    hamstrings: 'legs',
    glutes: 'legs',
    calves: 'calves'
  };

  const METRIC_TO_UNIFIED_GROUP = {
    chest_cm: 'chest',
    shoulder_cm: 'shoulders',
    l_arm_cm: 'arms',
    r_arm_cm: 'arms',
    neck_cm: 'back',
    waist_cm: 'core',
    hip_cm: 'legs',
    l_thigh_cm: 'legs',
    r_thigh_cm: 'legs',
    l_calf_cm: 'calves',
    r_calf_cm: 'calves',
    head_cm: 'other',
    weight_kg: 'other'
  };

  const UNIFIED_GROUPS = [
    { id: 'chest', label: 'Chest' },
    { id: 'shoulders', label: 'Shoulders' },
    { id: 'arms', label: 'Arms' },
    { id: 'back', label: 'Back' },
    { id: 'core', label: 'Core' },
    { id: 'legs', label: 'Legs & Glutes' },
    { id: 'calves', label: 'Calves' },
    { id: 'other', label: 'Other / Weight' }
  ];

  const exercisesList = Array.from(activeExercises).map(exName => {
    const pts = exerciseHistory[exName];
    const latest = pts[pts.length - 1];
    const first = pts[0];
    const diffPct = latest.percentile - first.percentile;
    
    return {
      name: exName,
      latestPct: latest.percentile,
      latestTier: latest.tier,
      latestOrm: latest.orm,
      diffPct: diffPct,
      pts: pts
    };
  }).sort((a, b) => b.latestPct - a.latestPct);

  exercisesList.forEach((ex, idx) => {
    exColors[ex.name] = COLORS[idx % COLORS.length];
  });

  const groupData = UNIFIED_GROUPS.map(g => {
    const groupExercises = exercisesList.filter(ex => {
      const prim = EXERCISE_MUSCLES[ex.name]?.primary?.[0] || 'other';
      const groupId = MUSCLE_TO_UNIFIED_GROUP[prim] || 'other';
      return groupId === g.id;
    });

    const groupMetrics = (typeof MEASUREMENT_METRICS !== 'undefined' ? MEASUREMENT_METRICS : []).filter(m => {
      const groupId = METRIC_TO_UNIFIED_GROUP[m.id] || 'other';
      return groupId === g.id;
    });

    return {
      ...g,
      exercises: groupExercises,
      metrics: groupMetrics
    };
  }).filter(g => g.exercises.length > 0 || g.metrics.some(m => sortedMeasAsc.map(e => e[m.id]).filter(v => v != null).length > 0));

  let rowsHTML = '';
  if (groupData.length === 0) {
    rowsHTML = `
      <div style="text-align:center;padding:24px 0;color:#9ca3af;font-size:12px;border:1px dashed rgba(0,0,0,0.1);border-radius:8px;margin-top:12px">
        No progress data logged in this period.
      </div>`;
  } else {
    rowsHTML = groupData.map(g => {
      const renderedMetrics = g.metrics.map(m => {
        const vals = sortedMeasAsc.map(e => e[m.id]).filter(v => v != null);
        if (!vals.length) return '';
        const v = latestMeas?.[m.id];
        const pv = prevMeas?.[m.id];
        const delta = _measurementDelta(v, pv, m.direction);
        const range = vals.length > 1 ? `${Math.min(...vals).toFixed(1)} → ${Math.max(...vals).toFixed(1)}` : `${vals[0].toFixed(1)}`;
        const unit = m.unit || 'cm';

        const diffColor = delta ? delta.color : '#9ca3af';
        const diffText = delta
          ? `<span style="font-size:10px;font-weight:700;color:${diffColor};width:42px;text-align:right;flex-shrink:0">${delta.sign}${Math.abs(delta.d).toFixed(1)}</span>`
          : `<span style="font-size:10px;font-weight:700;color:#9ca3af;width:42px;text-align:right;flex-shrink:0;opacity:0.25">-</span>`;

        const sparklineHTML = renderMeasurementSparkline(vals, m.color, m.direction);

        return `
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;padding:8px;border:1px solid #f3f4f6;background:#ffffff;border-radius:8px;margin-bottom:6px;gap:12px">
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="width:7px;height:7px;border-radius:50%;background:${m.color};display:inline-block;flex-shrink:0"></span>
                <span style="color:#111827;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.label}</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span style="font-size:10px;color:#6b7280">${v != null ? v.toFixed(1) : '—'} ${unit}</span>
                <span style="font-size:8px;color:#9ca3af;font-family:monospace">${range} range</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
              ${sparklineHTML}
              ${diffText}
            </div>
          </div>
        `;
      }).join('');

      const renderedExercises = g.exercises.map(ex => {
        const color = exColors[ex.name];
        const sign = ex.diffPct >= 0 ? '+' : '';
        const diffColor = ex.diffPct > 0 ? '#10b981' : ex.diffPct < 0 ? '#ef4444' : '#9ca3af';
        const diffText = ex.pts.length > 1 
          ? `<span style="font-size:10px;font-weight:700;color:${diffColor};width:42px;text-align:right;flex-shrink:0">${sign}${ex.diffPct}%</span>` 
          : `<span style="font-size:10px;font-weight:700;color:#9ca3af;width:42px;text-align:right;flex-shrink:0;opacity:0.25">-</span>`;
        const tierStyle = getTierStyle(ex.latestTier);
        const sparklineHTML = renderSparkline(ex.pts, color);
        
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;padding:8px;border:1px solid #f3f4f6;background:#ffffff;border-radius:8px;margin-bottom:6px;gap:12px">
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="width:7px;height:7px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
                <span style="color:#111827;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ex.name}</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span style="font-size:10px;color:#6b7280">${Math.round(ex.latestOrm)} lb est · ${ex.latestPct}%</span>
                <span style="font-size:8px;font-weight:700;padding:1px 4px;border-radius:3px;display:inline-block;${tierStyle}">${ex.latestTier}</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
              ${sparklineHTML}
              ${diffText}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div style="margin-bottom:12px">
          <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;display:flex;align-items:center;gap:6px">
            <span>${g.label}</span>
            <span style="flex:1;height:1px;background:rgba(0,0,0,0.05)"></span>
          </div>
          <div style="padding-left:4px">
            ${renderedMetrics}
            ${renderedExercises}
          </div>
        </div>
      `;
    }).join('');
  }

  const formOpen = !!state.showMeasForm;
  const histOpen = !!state.showMeasHistory;

  const historyRows = measurements.map(e => `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;border-bottom:1px solid #f3f4f6">
      <span style="font-size:11px;color:#6b7280;font-family:monospace;min-width:60px">${_formatMeasurementDate(e.taken_at)}</span>
      <span style="font-size:11px;font-family:monospace;color:#374151;flex:1;text-align:center">
        ${e.chest_cm != null ? `<span style="color:#ef4444">${e.chest_cm.toFixed(1)}c</span>` : '—'} ·
        ${e.waist_cm != null ? `<span style="color:#3b82f6">${e.waist_cm.toFixed(1)}w</span>` : '—'} ·
        ${e.l_arm_cm != null ? `<span style="color:#dc2626">${e.l_arm_cm.toFixed(1)}a</span>` : '—'}
      </span>
      <button onclick="deleteMeasurement(${e.id})" style="font-size:9px;color:#9ca3af;background:none;border:1px solid #e5e7eb;border-radius:4px;padding:2px 6px;cursor:pointer">×</button>
    </div>`).join('');

  const actionSectionHTML = `
    <div style="border-top:1px solid rgba(0,0,0,0.05);padding-top:12px;margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <button onclick="state.showMeasHistory=!state.showMeasHistory;render()" style="font-size:11px;font-weight:700;color:#6b7280;background:none;border:1px solid #e5e7eb;border-radius:7px;padding:4px 10px;cursor:pointer">
        ${histOpen ? '✕ Close History' : `History · ${measurements.length} entries`}
      </button>
      <button onclick="state.showMeasForm=!state.showMeasForm;render()" style="font-size:11px;font-weight:700;color:${formOpen ? '#6b7280' : '#2563eb'};background:none;border:1px solid ${formOpen ? '#e5e7eb' : '#bfdbfe'};border-radius:7px;padding:4px 10px;cursor:pointer">
        ${formOpen ? '✕ Close Form' : '＋ Add Measurement'}
      </button>
    </div>
    ${histOpen ? `<div style="margin-top:10px;max-height:200px;overflow-y:auto;border:1px solid #f3f4f6;border-radius:8px;background:white">${historyRows}</div>` : ''}
    ${formOpen ? `<div style="margin-top:12px">${_renderMeasurementForm()}</div>` : ''}
  `;

  return `
    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px">
        <h3 style="font-size:14px;font-weight:600;color:#111827;margin:0">Strength & Body Progress (${timeLabel})</h3>
        <div style="display:flex;gap:4px">
          <button onclick="changePercentileMonth(-1)" style="background:rgba(0,0,0,0.03);border:1px solid rgba(0,0,0,0.08);color:#111827;cursor:pointer;padding:4px 8px;font-size:12px;font-weight:bold;border-radius:6px;display:flex;align-items:center;justify-content:center">&lt;</button>
          <button onclick="changePercentileMonth(1)" ${offset === 0 ? 'disabled style="background:rgba(0,0,0,0.01);border:1px solid rgba(0,0,0,0.03);color:rgba(0,0,0,0.2);cursor:default;border-radius:6px;display:flex;align-items:center;justify-content:center"' : 'style="background:rgba(0,0,0,0.03);border:1px solid rgba(0,0,0,0.08);color:#111827;cursor:pointer;padding:4px 8px;font-size:12px;font-weight:bold;border-radius:6px;display:flex;align-items:center;justify-content:center"'} onclick="changePercentileMonth(1)">&gt;</button>
        </div>
      </div>
      
      <div style="font-size:10px;color:#6b7280;margin-bottom:12px;padding:8px;background:rgba(0,0,0,0.02);border-radius:6px;border:1px solid rgba(0,0,0,0.04);line-height:1.4">
        💡 <strong>Hint:</strong> Percentiles show your estimated 1RM relative to standards. Measurements show body changes. The trend (e.g. <strong>+3%</strong> or <strong>+1.2</strong>) tracks changes since the start of the period.
      </div>
      <div style="border-top:1px solid rgba(0,0,0,0.05);padding-top:8px">
        ${rowsHTML}
      </div>
      ${actionSectionHTML}
    </div>
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
  const A = WORKOUTS.find(w => w.id === 'squat-day') || WORKOUTS[0];
  const B = WORKOUTS.find(w => w.id === 'deadlift-day') || WORKOUTS[0];
  // Auto-pick the next A/B workout by alternating from the most recent A/B
  // session in history (state.history is newest-first). Defaults to A.
  let nextW = A;
  for (const s of (state.history || [])) {
    if (s.workout_name === A.name) { nextW = B; break; }
    if (s.workout_name === B.name) { nextW = A; break; }
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

  const otherW = activeWorkout.id === A.id ? B : A;
  const abLabel = activeWorkout.abSplit ? `${activeWorkout.abSplit} · ` : '';
  const workoutUrl = `/workout?w=${activeWorkout.id}`;
  const workoutButtonHTML = `
    <a href="${workoutUrl}" style="text-decoration:none;display:block;margin-bottom:8px;">
      <div style="background:linear-gradient(135deg, #eff6ff, #dbeafe); border:1px solid #bfdbfe; border-radius:14px; padding:18px; text-align:center; box-shadow:0 4px 12px rgba(59,130,246,0.08); transition:all 0.2s;" class="clickable">
        <div style="font-size:16px; font-weight:800; color:#1d4ed8; margin-bottom:4px; display:flex; align-items:center; justify-content:center; gap:8px;">
          <span>${isOngoing ? '⚡️ Continue' : '🏋️‍♂️ Start'} · ${activeWorkout.name}</span>
        </div>
        <div style="font-size:12px; color:#60a5fa; font-weight:600;">
          ${isOngoing ? `${logged} of ${expected} sets logged (${pct}%)` : `${abLabel}${activeWorkout.duration} · auto-selected`}
        </div>
      </div>
    </a>
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:16px; flex-wrap:wrap;">
      ${isOngoing ? '<span></span>' : `<a href="/workout?w=${otherW.id}" style="font-size:12px; color:#2563eb; font-weight:700; text-decoration:none;">↔︎ Switch to ${otherW.name}</a>`}
      <span style="font-size:11px; color:#9ca3af;">🧪 Test (nothing saved):
        <a href="/workout?w=${A.id}&test=1" style="color:#6b7280; text-decoration:underline;">${A.name}</a> ·
        <a href="/workout?w=${B.id}&test=1" style="color:#6b7280; text-decoration:underline;">${B.name}</a>
      </span>
    </div>
  `;

  return `
    <div style="max-width: 1200px; margin: 0 auto; padding: 16px 16px 40px; background:#f9fafb; min-height:100vh">
      <div style="display:flex;align-items:center;margin-bottom:16px">
        <div>
          <span style="font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">${getSessionDateStr()}</span>
          <h2 style="font-size:22px;font-weight:800;color:#111827;margin:0">Workout Tracker</h2>
        </div>
      </div>

      ${workoutButtonHTML}

      ${renderWorkoutSummaryCard()}

      <div class="dashboard-grid">
        <div style="display:flex; flex-direction:column; gap:16px; min-width:0;">
          ${renderPercentilesCard()}
        </div>
        <div style="display:flex; flex-direction:column; gap:16px; min-width:0;">
          ${renderCalendar()}
        </div>
      </div>
    </div>
  `;
}

function renderMotivationBanner() {
  const finishMsg = state.activeFinishMotivation;
  if (finishMsg) {
    const alreadyShown = !!document.getElementById('finish-motiv-banner');
    const animOuter = alreadyShown ? '' : 'animation:motiv-fade-in 220ms ease-out;';
    const animInner = alreadyShown ? '' : 'animation:motiv-pop-in 320ms cubic-bezier(.2,.9,.3,1.18);';
    return `
      <div id="finish-motiv-banner" data-noinvert onclick="dismissFinishMotivation()" style="
        position:fixed;left:0;right:0;bottom:0;top:0;
        background:rgba(15,23,42,0.55);
        z-index:9100;
        display:flex;align-items:center;justify-content:center;
        ${animOuter}
      ">
        <div data-noinvert onclick="event.stopPropagation()" style="
          width:100%;max-width:560px;margin:0 12px;
          background:linear-gradient(135deg,#fef3c7,#fde68a 50%,#fbbf24);
          border:1px solid #f59e0b;
          border-radius:18px;
          padding:22px 20px 16px;
          box-shadow:0 22px 60px rgba(15,23,42,0.45);
          ${animInner}
        ">
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:14px">
            <span style="font-size:26px;flex-shrink:0;line-height:1">💪</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#92400e;margin-bottom:4px">Workout complete</div>
              <div style="font-size:17px;line-height:1.5;color:#451a03;font-weight:500">${finishMsg}</div>
            </div>
          </div>
          <button onclick="dismissFinishMotivation()" style="
            width:100%;background:#92400e;color:white;border:none;
            padding:11px 14px;border-radius:10px;font-size:14px;font-weight:600;
            cursor:pointer;
          ">Onwards</button>
        </div>
      </div>
      <style>
        @keyframes motiv-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes motiv-pop-in {
          0% { transform: scale(0.8); opacity: 0 }
          60% { transform: scale(1.04); opacity: 1 }
          100% { transform: scale(1); opacity: 1 }
        }
      </style>
    `;
  }
  return '';
}

function renderCalendar() {
  const offset = state.calendarMonthOffset || 0;
  const today = new Date();
  const targetDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = targetDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const WORKOUT_COLORS = {
    "Arms & Shoulders": "#8b5cf6",
    "Back": "#f59e0b",
    "Full Body A": "#3b82f6",
    "Full Body": "#3b82f6",
    "Full Body B": "#10b981",
  };
  const dateMap = {};
  (state.history || []).forEach(s => {
    if (!dateMap[s.date]) dateMap[s.date] = [];
    dateMap[s.date].push(s.workout_name);
  });

  const dayHeaders = ["Su","Mo","Tu","We","Th","Fr","Sa"].map(d =>
    `<div style="font-size:10px;color:#9ca3af;text-align:center;font-weight:600">${d}</div>`
  ).join("");

  let cells = "";
  for (let i = 0; i < firstDay; i++) {
    cells += `<div></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const workouts = dateMap[dateStr] || [];
    const dots = workouts.map(w =>
      `<span style="width:5px;height:5px;border-radius:50%;background:${WORKOUT_COLORS[w] || '#6b7280'};display:inline-block"></span>`
    ).join("");
    const bg = isToday ? "background:#eff6ff;border-radius:8px;" : "";
    const fw = isToday ? "font-weight:700;color:#2563eb;" : "color:#374151;";
    cells += `<div style="text-align:center;padding:4px 0;${bg}">
      <div style="font-size:12px;${fw}">${d}</div>
      <div style="display:flex;justify-content:center;gap:2px;min-height:7px">${dots}</div>
    </div>`;
  }

  const colorLegend = Object.entries(WORKOUT_COLORS).map(([name, color]) =>
    `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;color:#6b7280">
      <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block"></span>${name}
    </span>`
  ).join("");

  return `
    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px">
        <h3 style="font-size:14px;font-weight:600;color:#111827;margin:0">${monthName}</h3>
        <div style="display:flex;gap:4px">
          <button onclick="changeCalendarMonth(-1)" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#111827;cursor:pointer;padding:4px 8px;font-size:12px;font-weight:bold;border-radius:6px;display:flex;align-items:center;justify-content:center">&lt;</button>
          <button onclick="changeCalendarMonth(1)" ${offset === 0 ? 'disabled style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.2);cursor:default;border-radius:6px;display:flex;align-items:center;justify-content:center"' : 'style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#111827;cursor:pointer;padding:4px 8px;font-size:12px;font-weight:bold;border-radius:6px;display:flex;align-items:center;justify-content:center"'} onclick="changeCalendarMonth(1)">&gt;</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:8px">
        ${dayHeaders}
        ${cells}
      </div>
      <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap">${colorLegend}</div>
    </div>
  `;
}

window.changePercentileMonth = function(delta) {
  state.percentilesMonthOffset = (state.percentilesMonthOffset || 0) + delta;
  render();
};

window.changeCalendarMonth = function(delta) {
  state.calendarMonthOffset = (state.calendarMonthOffset || 0) + delta;
  render();
};
