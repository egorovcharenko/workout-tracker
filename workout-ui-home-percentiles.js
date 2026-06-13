function renderPercentilesCard() {
  const history = state.history || [];
  const offset = state.percentilesMonthOffset || 0;
  const measurements = state.measurements || [];
  const sortedMeasAsc = [...measurements].sort((a, b) => (a.taken_at || '').localeCompare(b.taken_at || ''));

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + offset * 60);
  const endMs = endDate.setHours(23, 59, 59, 999);
  
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 60);
  const startMs = startDate.setHours(0, 0, 0, 0);
  
  let timeLabel = "Last 60 Days";
  if (offset === -1) timeLabel = "Previous 60 Days";
  else if (offset < -1) timeLabel = `${Math.abs(offset - 1) * 60} - ${Math.abs(offset) * 60} Days Ago`;
  
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
      pts: pts,
      latestMs: latest.ms
    };
  }).sort((a, b) => b.latestMs - a.latestMs || b.latestPct - a.latestPct);

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
  }).filter(g => g.exercises.length > 0 || g.metrics.some(m => sortedMeasAsc.some(e => e[m.id] != null && Date.parse((e.taken_at || e.date || '').replace(' ', 'T')) >= startMs && Date.parse((e.taken_at || e.date || '').replace(' ', 'T')) <= endMs)));

  let rowsHTML = '';
  if (groupData.length === 0) {
    rowsHTML = `
      <div style="text-align:center;padding:24px 0;color:#9ca3af;font-size:12px;border:1px dashed rgba(0,0,0,0.1);border-radius:8px;margin-top:12px">
        No progress data logged in this period.
      </div>`;
  } else {
    rowsHTML = groupData.map(g => {
      const renderedMetrics = g.metrics.map(m => {
        const pts = sortedMeasAsc.map(e => {
          const d = e.taken_at || e.date || '';
          return { date: d.slice(0, 10), ms: Date.parse(d.replace(' ', 'T') || 0), value: e[m.id] };
        }).filter(p => p.value != null && p.ms >= startMs && p.ms <= endMs);
        if (!pts.length) return '';
        const v = pts[pts.length - 1].value;
        const pv = pts.length > 1 ? pts[0].value : null;
        const delta = _measurementDelta(v, pv, m.direction);
        const vals = pts.map(p => p.value);
        const range = vals.length > 1 ? `${Math.min(...vals).toFixed(1)} → ${Math.max(...vals).toFixed(1)}` : `${vals[0].toFixed(1)}`;
        const unit = m.unit || 'cm';

        const diffColor = delta ? delta.color : '#9ca3af';
        const diffText = delta
          ? `<span style="font-size:10px;font-weight:700;color:${diffColor};width:42px;text-align:right;flex-shrink:0">${delta.sign}${Math.abs(delta.d).toFixed(1)}</span>`
          : `<span style="font-size:10px;font-weight:700;color:#9ca3af;width:42px;text-align:right;flex-shrink:0;opacity:0.25">-</span>`;

        const sparklineHTML = renderMeasurementSparkline(pts, m.color, startMs, endMs, unit);

        return `
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;padding:8px;border:1px solid #f3f4f6;background:#ffffff;border-radius:8px;gap:12px">
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
        const sparklineHTML = renderSparkline(ex.pts, color, startMs, endMs, ex.name);
        
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;padding:8px;border:1px solid #f3f4f6;background:#ffffff;border-radius:8px;gap:12px">
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

      let groupContent = '';
      if (renderedExercises && renderedMetrics) {
        groupContent = `
          <div style="display:flex; flex-wrap:wrap; gap:16px;">
            <div style="flex:1; min-width:280px;">
              <div style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Lifts</div>
              <div style="display:flex; flex-direction:column; gap:8px;">
                ${renderedExercises}
              </div>
            </div>
            <div style="flex:1; min-width:280px;">
              <div style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Measurements</div>
              <div style="display:flex; flex-direction:column; gap:8px;">
                ${renderedMetrics}
              </div>
            </div>
          </div>
        `;
      } else if (renderedExercises) {
        groupContent = `
          <div>
            <div style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Lifts</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:8px">
              ${renderedExercises}
            </div>
          </div>
        `;
      } else if (renderedMetrics) {
        groupContent = `
          <div>
            <div style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Measurements</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:8px">
              ${renderedMetrics}
            </div>
          </div>
        `;
      }

      return `
        <div style="margin-bottom:16px">
          <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;display:flex;align-items:center;gap:6px">
            <span>${g.label}</span>
            <span style="flex:1;height:1px;background:rgba(0,0,0,0.05)"></span>
          </div>
          <div style="padding-left:4px">
            ${groupContent}
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

if (typeof window !== "undefined") {
  window.renderPercentilesCard = renderPercentilesCard;
}
