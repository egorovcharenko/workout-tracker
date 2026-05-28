// UI rendering logic for the Home tab of Workout Tracker

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
    map.primary.forEach(m => { muscles[m] = (muscles[m] || 0) + setVol; });
    map.secondary.forEach(m => { muscles[m] = (muscles[m] || 0) + setVol * 0.5; });
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
  const pills = muscleVolumeList.map(([muscle, vol]) => {
    const label = MUSCLE_GROUPS[muscle]?.label || muscle;
    const pct = Math.round((vol / totalMusVolume) * 100);
    return `<span style="font-size:10px;font-weight:700;color:#c084fc;background:#f3e8ff;padding:2px 7px;border-radius:6px;white-space:nowrap">${label} ${pct}%</span>`;
  }).join('');

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

  const chartBars = historyData.map(h => {
    const pct = maxSessionVol ? (h.volume / maxSessionVol) * 100 : 0;
    const dateLabel = (() => {
      const parts = h.date.split('-');
      return parts.length === 3 ? `${parts[1]}/${parts[2]}` : h.date;
    })();
    const isLatest = h.date === latest.date;
    const barBg = isLatest ? '#c084fc' : '#e9d5ff';
    const textWeight = isLatest ? 'bold' : 'normal';
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="height:45px;width:100%;display:flex;align-items:end;background:#f3f4f6;border-radius:3px;overflow:hidden">
        <div style="height:${pct}%;width:100%;background:${barBg};border-radius:2px"></div>
      </div>
      <span style="font-size:8px;font-family:ui-monospace,Menlo,monospace;color:#9ca3af;font-weight:${textWeight}">${dateLabel}</span>
    </div>`;
  }).join('');

  const rows = Object.entries(exerciseSummary).map(([exName, sum]) => {
    const historicList = [];
    const exercisePRs = {};
    history.forEach(s => {
      (s.sets || []).forEach(set => {
        if (set.exercise === exName && set.set_type === 'working' && set.reps) {
          const w = parseFloat(set.weight_lb) || 0;
          const r = parseInt(set.reps) || 0;
          const est = calcSet1RM(exName, w, r, set.bands_json);
          const isAssist = exName === "Bench Dips" || exName === "Assisted Pull-Ups";
          if (s.date !== latest.date) {
            historicList.push(est);
          }
          if (exercisePRs[exName] === undefined) {
            exercisePRs[exName] = isAssist ? -Infinity : 0;
          }
          if (est > exercisePRs[exName]) {
            exercisePRs[exName] = est;
          }
        }
      });
    });

    const isPR = sum.best1RM >= (exercisePRs[exName] || 0) && sum.best1RM > 0;
    const lastSessionIndex = history.findIndex(s => s.date !== latest.date && (s.sets || []).some(x => x.exercise === exName && x.set_type === 'working' && x.reps));
    let deltaText = '';
    let deltaColor = '#9CA3AF';
    if (lastSessionIndex >= 0) {
      let priorVol = 0;
      history[lastSessionIndex].sets.forEach(set => {
        if (set.exercise === exName && set.set_type === 'working' && set.reps) {
          priorVol += (parseInt(set.reps) || 0) * (parseFloat(set.weight_lb) || 0);
        }
      });
      if (priorVol > 0) {
        const diff = ((sum.totalVol - priorVol) / priorVol) * 100;
        deltaText = `${diff >= 0 ? '+' : ''}${Math.round(diff)}%`;
        deltaColor = diff >= 0 ? '#10B981' : '#EF4444';
      }
    }

    const sparkHTML = microSparkline(historicList.slice(-6).concat(sum.best1RM), '#c084fc');
    const best1RMText = Math.round(sum.best1RM);

    return `<div style="display:flex;justify-content:between;align-items:center;font-size:13px;padding:6px 0;border-bottom:1px solid #f9fafb;gap:10px">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:4px">
          <span style="font-weight:600;color:#1F2937;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${exName}</span>
          ${isPR ? `<span style="font-size:8px;font-weight:800;color:#d97706;background:#fef3c7;border:1px solid #fde68a;padding:0 3px;border-radius:4px;text-transform:uppercase;letter-spacing:0.05em">★ PR</span>` : ''}
        </div>
        <div style="font-size:10px;color:#9CA3AF;font-family:ui-monospace,Menlo,monospace;margin-top:1px">
          Best: ${sum.bestW}lb × ${sum.bestR} <span style="color:#d1d5db;font-weight:normal">(${best1RMText} est)</span> · ${sum.setsCount}s
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${sparkHTML}
        ${deltaText ? `<span style="font-size:11px;font-weight:700;color:${deltaColor};font-family:ui-monospace,Menlo,monospace;min-width:32px;text-align:right">${deltaText}</span>` : ''}
      </div>
    </div>`;
  }).join('');

  return `
    <div class="card" style="margin-bottom:16px;overflow:hidden">
      <div style="padding:16px 16px 12px;background:linear-gradient(180deg,#fafafa,#ffffff);border-bottom:1px solid #f3f4f6">
        <div style="display:flex;justify-content:between;align-items:start">
          <div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:10px;font-weight:800;color:#9333ea;background:#f3e8ff;padding:2px 6px;border-radius:5px;text-transform:uppercase;letter-spacing:0.05em">✓ DONE</span>
              ${elapsedLabel ? `<span style="font-size:11px;color:#9ca3af;font-weight:600">${elapsedLabel}</span>` : ''}
            </div>
            <h3 style="font-size:18px;font-weight:800;color:#111827;margin:4px 0 2px">${name}</h3>
            <span style="font-size:11px;color:#9ca3af;font-family:ui-monospace,Menlo,monospace">${dateStr}</span>
          </div>
          ${historyData.length > 1 ? `<div style="width:90px;display:flex;gap:4px">${chartBars}</div>` : ''}
        </div>
      </div>
      <div style="padding:10px 16px 12px">
        <div style="display:flex;flex-direction:column;gap:4px">
          ${rows || '<div style="color:#6B7280;font-size:12px;padding:8px 0">No working sets logged.</div>'}
        </div>
      </div>
      ${pills ? `<div style="margin:0 16px 12px;display:flex;gap:6px;flex-wrap:wrap">${pills}</div>` : ''}
    </div>
  `;
}

function renderLastFinishCard() {
  const history = state.history || [];
  const latest = history.find(s => s.finish_motivation);
  if (!latest) return '';
  const dateLabel = (() => {
    const d = new Date(latest.date + 'T00:00:00');
    if (isNaN(d.getTime())) return latest.date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - d) / (24 * 3600 * 1000));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  })();
  return `
    <div style="margin-bottom:14px;padding:16px 18px 14px;background:linear-gradient(135deg,#fef3c7,#fde68a 50%,#fbbf24);border:1px solid #f59e0b;border-radius:14px;box-shadow:0 4px 14px rgba(245,158,11,0.18)">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <span style="font-size:22px;flex-shrink:0;line-height:1">💪</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#92400e;margin-bottom:6px">${dateLabel} · ${latest.workout_name}</div>
          <div style="font-size:14px;line-height:1.55;color:#451a03;font-weight:500">${latest.finish_motivation}</div>
        </div>
      </div>
    </div>`;
}

function renderPercentilesCard() {
  const history = state.history || [];
  const offset = state.percentilesMonthOffset || 0;
  
  const baseDate = new Date();
  const targetMonthDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);
  const targetYear = targetMonthDate.getFullYear();
  const targetMonth = targetMonthDate.getMonth();
  
  const startMs = Date.parse(`${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01T00:00:00`);
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  
  const endMs = (offset === 0)
    ? Date.parse(localDate() + 'T23:59:59')
    : Date.parse(`${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59`);
    
  const monthName = targetMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  
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

  const width = 350;
  const height = 150;
  const paddingLeft = 30;
  const paddingRight = 10;
  const paddingTop = 10;
  const paddingBottom = 20;

  const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4", "#f43f5e", "#14b8a6"];
  const exColors = {};

  const getX = (ms) => {
    const range = endMs - startMs || 1;
    const ratio = (ms - startMs) / range;
    return paddingLeft + ratio * (width - paddingLeft - paddingRight);
  };

  const getY = (pct) => {
    const ratio = pct / 100;
    return (height - paddingBottom) - ratio * (height - paddingTop - paddingBottom);
  };

  const gridLines = [];
  const yTicks = [0, 25, 50, 75, 100];
  yTicks.forEach(tick => {
    const yVal = getY(tick);
    gridLines.push(`
      <line x1="${paddingLeft}" y1="${yVal}" x2="${width - paddingRight}" y2="${yVal}" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="3,3" />
      <text x="${paddingLeft - 6}" y="${yVal + 3}" text-anchor="end" font-size="8" fill="#9ca3af" font-family="${T.mono}">${tick}%</text>
    `);
  });

  const xTicks = [];
  const tickDays = [1, 10, 20, lastDay];
  tickDays.forEach(d => {
    const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const tickMs = Date.parse(dateStr + 'T00:00:00');
    const xVal = getX(tickMs);
    const label = targetMonthDate.toLocaleDateString("en-US", { month: "short" }) + ` ${d}`;
    xTicks.push(`
      <line x1="${xVal}" y1="130" x2="${xVal}" y2="134" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      <text x="${xVal}" y="${144}" text-anchor="middle" font-size="8" fill="#9ca3af" font-family="${T.mono}">${label}</text>
    `);
  });

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

  let cardBody = '';
  let rowsHTML = '';
  if (activeExercises.size === 0) {
    cardBody = `
      <div style="text-align:center;padding:24px 0;color:#9ca3af;font-size:12px;border:1px dashed rgba(255,255,255,0.1);border-radius:8px;margin-top:12px">
        No strength exercises logged in ${monthName}.
      </div>`;
  } else {
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

    const paths = [];
    exercisesList.forEach(ex => {
      const pts = ex.pts;
      if (pts.length < 1) return;
      const color = exColors[ex.name];
      
      if (pts.length >= 2) {
        const pathD = pts.map((p, idx) => {
          const x = getX(p.ms);
          const y = getY(p.percentile);
          return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
        
        paths.push(`
          <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" />
        `);
      }
      
      pts.forEach(p => {
        const x = getX(p.ms);
        const y = getY(p.percentile);
        paths.push(`
          <circle cx="${x}" cy="${y}" r="2.8" fill="${color}" stroke="#111827" stroke-width="0.8" />
        `);
      });
    });

    const groups = {};
    exercisesList.forEach(ex => {
      const muscleKey = EXERCISE_MUSCLES[ex.name]?.primary?.[0] || 'other';
      if (!groups[muscleKey]) groups[muscleKey] = [];
      groups[muscleKey].push(ex);
    });

    const sortedGroupEntries = Object.entries(groups).sort((a, b) => {
      const labelA = MUSCLE_GROUPS[a[0]]?.label || a[0];
      const labelB = MUSCLE_GROUPS[b[0]]?.label || b[0];
      return labelA.localeCompare(labelB);
    });

    rowsHTML = sortedGroupEntries.map(([muscleKey, list]) => {
      const muscleLabel = MUSCLE_GROUPS[muscleKey]?.label || (muscleKey.charAt(0).toUpperCase() + muscleKey.slice(1));
      
      const exerciseRows = list.map(ex => {
        const color = exColors[ex.name];
        const sign = ex.diffPct >= 0 ? '+' : '';
        const diffColor = ex.diffPct > 0 ? '#10b981' : ex.diffPct < 0 ? '#ef4444' : '#9ca3af';
        const diffText = ex.pts.length > 1 
          ? `<span style="font-size:10px;font-weight:700;color:${diffColor};width:42px;text-align:right;flex-shrink:0">${sign}${ex.diffPct}%</span>` 
          : `<span style="font-size:10px;font-weight:700;color:#9ca3af;width:42px;text-align:right;flex-shrink:0;opacity:0.25">-</span>`;
        const tierStyle = getTierStyle(ex.latestTier);
        
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);gap:12px">
            <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0">
              <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
              <span style="color:#111827;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ex.name}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
              <span style="font-size:10px;color:#9ca3af;width:60px;text-align:right;flex-shrink:0">${Math.round(ex.latestOrm)} lb est</span>
              <span style="font-weight:700;color:#111827;font-family:${T.mono};width:36px;text-align:right;flex-shrink:0">${ex.latestPct}%</span>
              <span style="font-size:9px;font-weight:700;padding:2px 0;border-radius:4px;width:76px;text-align:center;flex-shrink:0;display:inline-block;${tierStyle}">${ex.latestTier}</span>
              ${diffText}
            </div>
          </div>
        `;
      }).join("");

      return `
        <div style="margin-bottom:12px">
          <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;display:flex;align-items:center;gap:6px">
            <span>${muscleLabel}</span>
            <span style="flex:1;height:1px;background:rgba(255,255,255,0.08)"></span>
          </div>
          <div style="padding-left:4px">${exerciseRows}</div>
        </div>
      `;
    }).join("");

    cardBody = `
      <div style="margin:12px auto;display:block;width:100%;overflow-x:auto;scrollbar-width:none">
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block;margin:0 auto">
          ${gridLines.join('')}
          ${xTicks.join('')}
          ${paths.join('')}
        </svg>
      </div>
    `;
  }

  return `
    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px">
        <h3 style="font-size:14px;font-weight:600;color:#111827;margin:0">Strength Progress (${monthName})</h3>
        <div style="display:flex;gap:4px">
          <button onclick="changePercentileMonth(-1)" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#111827;cursor:pointer;padding:4px 8px;font-size:12px;font-weight:bold;border-radius:6px;display:flex;align-items:center;justify-content:center">&lt;</button>
          <button onclick="changePercentileMonth(1)" ${offset === 0 ? 'disabled style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.2);cursor:default;border-radius:6px;display:flex;align-items:center;justify-content:center"' : 'style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#111827;cursor:pointer;padding:4px 8px;font-size:12px;font-weight:bold;border-radius:6px;display:flex;align-items:center;justify-content:center"'} onclick="changePercentileMonth(1)">&gt;</button>
        </div>
      </div>
      ${cardBody}
      ${activeExercises.size > 0 ? `<div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:8px">${rowsHTML}</div>` : ''}
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

  const cardsHTML = WORKOUTS.filter(w => !w.hidden).map((w, idx) => {
    const rec = getWorkoutRecovery(w);
    const expected = getExpectedSets(w);
    const logged = getLoggedCount(w);
    const pct = expected ? Math.round((logged / expected) * 100) : 0;
    const subLabel = logged > 0 ? `${logged} of ${expected} sets logged (${pct}%)` : w.duration;
    const progressHTML = logged > 0 ? `
      <div style="margin-top:10px">
        <div style="height:4px;background:#f3f4f6;border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:#3b82f6;border-radius:2px;transition:width 0.2s"></div>
        </div>
      </div>
    ` : '';
    const workoutUrl = `/workout?w=${w.id}`;

    return `
      <a href="${workoutUrl}" style="text-decoration:none;display:block" class="card clickable">
        <div style="padding:16px">
          <div style="display:flex;justify-content:between;align-items:start;margin-bottom:4px">
            <div>
              <h3 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 2px">${w.name}</h3>
              <span style="font-size:11px;color:#9ca3af;font-weight:600">${subLabel}</span>
            </div>
            ${recoveryBadge(rec.avg)}
          </div>
          ${progressHTML}
        </div>
      </a>
    `;
  }).join("");

  const hiddenHTML = WORKOUTS.filter(w => w.hidden).map((w, idx) => {
    const rec = getWorkoutRecovery(w);
    const workoutUrl = `/workout?w=${w.id}`;
    return `
      <a href="${workoutUrl}" style="text-decoration:none;display:block" class="card clickable">
        <div style="padding:16px">
          <div style="display:flex;justify-content:between;align-items:start">
            <div>
              <h3 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 2px">${w.name}</h3>
              <span style="font-size:11px;color:#9ca3af;font-weight:600">${w.duration}</span>
            </div>
            ${recoveryBadge(rec.avg)}
          </div>
        </div>
      </a>
    `;
  }).join("");

  const menuHTML = `
    <div style="display:flex;justify-content:space-around;padding:12px 0;background:white;border-top:1px solid #e5e7eb;position:fixed;bottom:0;left:0;right:0;max-width:448px;margin:0 auto;z-index:1000">
      <button onclick="state.screen='home';render()" style="background:none;border:none;color:#3b82f6;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer">
        <span style="font-size:18px">🏠</span>
        <span style="font-size:10px;font-weight:700">Home</span>
      </button>
      <button onclick="showMeasurements()" style="background:none;border:none;color:#9ca3af;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer">
        <span style="font-size:18px">📏</span>
        <span style="font-size:10px;font-weight:700">Size</span>
      </button>
    </div>
  `;

  return `
    <div style="padding:16px 16px 80px;background:#f9fafb;min-height:100vh">
      <div style="display:flex;justify-content:between;align-items:center;margin-bottom:16px">
        <div>
          <span style="font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">${getSessionDateStr()}</span>
          <h2 style="font-size:22px;font-weight:800;color:#111827;margin:0">Workout Tracker</h2>
        </div>
        <button onclick="promptBodyweight()" style="font-size:12px;font-weight:600;color:#4b5563;background:white;border:1px solid #d1d5db;padding:6px 12px;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,0.05)">
          ⚖️ ${state.bodyweight} lb
        </button>
      </div>

      ${renderLastFinishCard()}
      ${renderWorkoutSummaryCard()}
      ${renderPercentilesCard()}

      ${cardsHTML}

      ${renderCalendar()}
      ${menuHTML}
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
