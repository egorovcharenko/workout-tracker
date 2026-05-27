// UI rendering logic for the Measurements tab of Workout Tracker

const MEASUREMENT_METRICS = [
  { id: 'chest_cm',    label: 'Chest',     group: 'core',     direction: 'up',    color: '#ef4444' },
  { id: 'shoulder_cm', label: 'Shoulder',  group: 'core',     direction: 'up',    color: '#f59e0b' },
  { id: 'waist_cm',    label: 'Waist',     group: 'core',     direction: 'down',  color: '#3b82f6' },
  { id: 'hip_cm',      label: 'Hip',       group: 'core',     direction: 'flat',  color: '#8b5cf6' },
  { id: 'neck_cm',     label: 'Neck',      group: 'core',     direction: 'up',    color: '#0891b2' },
  { id: 'l_arm_cm',    label: 'L Arm',     group: 'limbs',    direction: 'up',    color: '#dc2626' },
  { id: 'r_arm_cm',    label: 'R Arm',     group: 'limbs',    direction: 'up',    color: '#dc2626' },
  { id: 'l_thigh_cm',  label: 'L Thigh',   group: 'limbs',    direction: 'up',    color: '#7c3aed' },
  { id: 'r_thigh_cm',  label: 'R Thigh',   group: 'limbs',    direction: 'up',    color: '#7c3aed' },
  { id: 'l_calf_cm',   label: 'L Calf',    group: 'limbs',    direction: 'up',    color: '#15803d' },
  { id: 'r_calf_cm',   label: 'R Calf',    group: 'limbs',    direction: 'up',    color: '#15803d' },
  { id: 'head_cm',     label: 'Head',      group: 'misc',     direction: 'flat',  color: '#9ca3af' },
  { id: 'weight_kg',   label: 'Weight',    group: 'misc',     direction: 'flat',  color: '#1f2937', unit: 'kg' },
];

function _measurementPairedSparkline(leftVals, rightVals, color, direction) {
  const all = [...leftVals, ...rightVals].filter(v => v != null);
  if (all.length === 0) return '';
  const w = 130, h = 38, pad = 3;
  const max = Math.max(...all), min = Math.min(...all), range = max - min || 1;
  function poly(vals) {
    if (!vals.length) return '';
    return vals.map((v, i) =>
      `${pad + (i / Math.max(1, vals.length - 1)) * (w - pad * 2)},${pad + (1 - (v - min) / range) * (h - pad * 2)}`
    ).join(' ');
  }
  const lPts = poly(leftVals);
  const rPts = poly(rightVals);
  const lastIdx = (vals) => vals.length - 1;
  const cx = (vals) => pad + (lastIdx(vals) / Math.max(1, vals.length - 1)) * (w - pad * 2);
  const cy = (v) => pad + (1 - (v - min) / range) * (h - pad * 2);
  const lLast = leftVals.length ? leftVals[leftVals.length - 1] : null;
  const rLast = rightVals.length ? rightVals[rightVals.length - 1] : null;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">
    ${lPts ? `<polyline points="${lPts}" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3,2" opacity="0.55"/>` : ''}
    ${rPts ? `<polyline points="${rPts}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>` : ''}
    ${lLast != null ? `<circle cx="${cx(leftVals)}" cy="${cy(lLast)}" r="2.2" fill="white" stroke="${color}" stroke-width="1.4" stroke-dasharray="2,1" opacity="0.85"/>` : ''}
    ${rLast != null ? `<circle cx="${cx(rightVals)}" cy="${cy(rLast)}" r="2.5" fill="${color}"/>` : ''}
  </svg>`;
}

function _measurementSparkline(values, color, direction) {
  if (!values.length) return '';
  if (values.length < 2) {
    return `<div style="display:flex;align-items:center;justify-content:center;height:32px;font-size:10px;color:#9ca3af">single reading</div>`;
  }
  const w = 110, h = 36, pad = 3;
  const max = Math.max(...values), min = Math.min(...values), range = max - min || 1;
  const pts = values.map((v, i) =>
    `${pad + (i / (values.length - 1)) * (w - pad * 2)},${pad + (1 - (v - min) / range) * (h - pad * 2)}`
  ).join(' ');
  const first = values[0], last = values[values.length - 1];
  let trendColor = color;
  if (direction === 'up' && last < first) trendColor = '#dc2626';
  else if (direction === 'down' && last > first) trendColor = '#dc2626';
  else if (direction === 'flat') trendColor = '#6b7280';
  else if ((direction === 'up' && last > first) || (direction === 'down' && last < first)) trendColor = '#16a34a';
  const lastX = pad + ((values.length - 1) / (values.length - 1)) * (w - pad * 2);
  const lastY = pad + (1 - (last - min) / range) * (h - pad * 2);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">
    <polyline points="${pts}" fill="none" stroke="${trendColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
    <circle cx="${lastX}" cy="${lastY}" r="2.5" fill="${trendColor}"/>
  </svg>`;
}

function _formatMeasurementDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function _measurementDelta(latest, prev, direction) {
  if (latest == null || prev == null) return null;
  const d = +(latest - prev).toFixed(1);
  if (Math.abs(d) < 0.05) return { d: 0, color: '#9ca3af', sign: '·' };
  let color = '#9ca3af';
  if (direction === 'up')   color = d > 0 ? '#16a34a' : '#dc2626';
  if (direction === 'down') color = d > 0 ? '#dc2626' : '#16a34a';
  if (direction === 'flat') color = '#6b7280';
  return { d, color, sign: d > 0 ? '+' : '' };
}

function renderMeasurements() {
  const list = state.measurements;
  const loading = list === undefined;
  const entries = list || [];
  const sortedAsc = [...entries].sort((a, b) => (a.taken_at || '').localeCompare(b.taken_at || ''));
  const latest = entries[0];
  const prev = entries[1];

  const back = `
    <div style="position:sticky;top:0;background:white;border-bottom:1px solid #f3f4f6;padding:12px 16px;z-index:10;display:flex;align-items:center;gap:12px">
      <button onclick="state.screen='home';history.replaceState(null,'','#');render()" style="color:#2563eb;font-size:14px;font-weight:500;background:none;border:none;cursor:pointer">← Back</button>
      <h2 style="font-size:18px;font-weight:700;margin:0">Measurements</h2>
    </div>`;

  if (loading) return `${back}<div style="padding:32px;text-align:center;color:#9ca3af">Loading…</div>`;
  if (entries.length === 0) {
    return `${back}<div style="padding:24px 16px">
      <p style="color:#6b7280;text-align:center;margin:24px 0">No measurements logged yet.</p>
      ${_renderMeasurementForm()}
    </div>`;
  }

  const snapshotRows = MEASUREMENT_METRICS.map(m => {
    const v = latest?.[m.id];
    const pv = prev?.[m.id];
    if (v == null) return '';
    const delta = _measurementDelta(v, pv, m.direction);
    const unit = m.unit || 'cm';
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f3f4f6">
      <span style="font-size:13px;color:#374151">${m.label}</span>
      <div style="display:flex;align-items:baseline;gap:8px">
        <span style="font-size:14px;font-family:monospace;font-weight:600;color:#111827">${v.toFixed(1)}<span style="font-size:10px;color:#9ca3af;margin-left:2px">${unit}</span></span>
        ${delta ? `<span style="font-size:11px;font-family:monospace;color:${delta.color};min-width:40px;text-align:right">${delta.sign}${Math.abs(delta.d).toFixed(1)}</span>` : '<span style="min-width:40px"></span>'}
      </div>
    </div>`;
  }).join('');

  const snapshotCard = `
    <div class="card" style="padding:14px 16px;margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <h3 style="font-size:13px;font-weight:600;color:#111827;margin:0">Latest snapshot</h3>
        <span style="font-size:11px;color:#9ca3af;font-family:monospace">${_formatMeasurementDate(latest.taken_at)}</span>
      </div>
      ${snapshotRows}
    </div>`;

  function metricBlock(m) {
    const vals = sortedAsc.map(e => e[m.id]).filter(v => v != null);
    if (!vals.length) return '';
    const v = latest?.[m.id], pv = prev?.[m.id];
    const delta = _measurementDelta(v, pv, m.direction);
    const range = vals.length > 1 ? `${Math.min(...vals).toFixed(1)} → ${Math.max(...vals).toFixed(1)}` : `${vals[0].toFixed(1)}`;
    const unit = m.unit || 'cm';
    return `<div style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px;color:#374151;font-weight:600">${m.label}</span>
        ${delta ? `<span style="font-size:10px;font-family:monospace;color:${delta.color}">${delta.sign}${Math.abs(delta.d).toFixed(1)}</span>` : ''}
      </div>
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:8px">
        ${_measurementSparkline(vals, m.color, m.direction)}
        <div style="text-align:right">
          <div style="font-size:14px;font-family:monospace;font-weight:700;color:${m.color}">${(v != null ? v.toFixed(1) : '—')}<span style="font-size:9px;color:#9ca3af;margin-left:1px">${unit}</span></div>
          <div style="font-size:9px;color:#9ca3af;font-family:monospace">${range}</div>
        </div>
      </div>
    </div>`;
  }

  const groupBlock = (title, group) => {
    const blocks = MEASUREMENT_METRICS.filter(m => m.group === group).map(metricBlock).filter(Boolean).join('');
    if (!blocks) return '';
    return `<div style="margin-bottom:14px">
      <h4 style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px">${title}</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${blocks}</div>
    </div>`;
  };

  const LIMB_PAIRS = [
    { label: 'Arm',   leftId: 'l_arm_cm',   rightId: 'r_arm_cm',   color: '#dc2626', direction: 'up' },
    { label: 'Thigh', leftId: 'l_thigh_cm', rightId: 'r_thigh_cm', color: '#7c3aed', direction: 'up' },
    { label: 'Calf',  leftId: 'l_calf_cm',  rightId: 'r_calf_cm',  color: '#15803d', direction: 'up' },
  ];
  function pairBlock(p) {
    const lVals = sortedAsc.map(e => e[p.leftId]).filter(v => v != null);
    const rVals = sortedAsc.map(e => e[p.rightId]).filter(v => v != null);
    if (!lVals.length && !rVals.length) return '';
    const lLatest = latest?.[p.leftId];
    const rLatest = latest?.[p.rightId];
    const gap = (lLatest != null && rLatest != null) ? (lLatest - rLatest) : null;
    const gapColor = gap == null ? '#9ca3af'
      : Math.abs(gap) >= 1.0 ? '#dc2626'
      : Math.abs(gap) >= 0.5 ? '#f59e0b'
      : '#16a34a';
    const allVals = [...lVals, ...rVals];
    const range = allVals.length > 1 ? `${Math.min(...allVals).toFixed(1)} → ${Math.max(...allVals).toFixed(1)}` : (allVals[0]?.toFixed(1) || '');
    return `<div style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px;color:#374151;font-weight:600">${p.label}</span>
        <span style="font-size:9px;color:#9ca3af;display:inline-flex;align-items:center;gap:6px">
          <span style="display:inline-flex;align-items:center;gap:3px"><span style="display:inline-block;width:10px;border-top:1.4px dashed ${p.color};opacity:0.7"></span>L</span>
          <span style="display:inline-flex;align-items:center;gap:3px"><span style="display:inline-block;width:10px;border-top:1.6px solid ${p.color}"></span>R</span>
        </span>
      </div>
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:8px">
        ${_measurementPairedSparkline(lVals, rVals, p.color, p.direction)}
        <div style="text-align:right;font-family:monospace;line-height:1.25">
          <div style="font-size:11px;color:${p.color};opacity:0.7">L ${lLatest != null ? lLatest.toFixed(1) : '—'}</div>
          <div style="font-size:13px;font-weight:700;color:${p.color}">R ${rLatest != null ? rLatest.toFixed(1) : '—'}</div>
          <div style="font-size:9px;color:${gapColor};font-weight:600">${gap != null ? `Δ ${gap >= 0 ? '+' : ''}${gap.toFixed(1)}` : ''}</div>
        </div>
      </div>
      <div style="font-size:9px;color:#9ca3af;font-family:monospace;margin-top:4px">range ${range}</div>
    </div>`;
  }

  const limbsPairedHTML = LIMB_PAIRS.map(pairBlock).filter(Boolean).join('');
  const limbsGroupHTML = limbsPairedHTML ? `<div style="margin-bottom:14px">
    <h4 style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px">Limbs <span style="opacity:0.6;font-weight:400;text-transform:none;letter-spacing:0">· left vs right</span></h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${limbsPairedHTML}</div>
  </div>` : '';

  const graphsHTML = `
    ${groupBlock('Core', 'core')}
    ${limbsGroupHTML}
    ${groupBlock('Other', 'misc')}
  `;

  const historyRows = entries.map(e => `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;border-bottom:1px solid #f3f4f6">
      <span style="font-size:11px;color:#6b7280;font-family:monospace;min-width:60px">${_formatMeasurementDate(e.taken_at)}</span>
      <span style="font-size:11px;font-family:monospace;color:#374151;flex:1;text-align:center">
        ${e.chest_cm != null ? `<span style="color:#ef4444">${e.chest_cm.toFixed(1)}c</span>` : '—'} ·
        ${e.waist_cm != null ? `<span style="color:#3b82f6">${e.waist_cm.toFixed(1)}w</span>` : '—'} ·
        ${e.l_arm_cm != null ? `<span style="color:#dc2626">${e.l_arm_cm.toFixed(1)}a</span>` : '—'}
      </span>
      <button onclick="deleteMeasurement(${e.id})" style="font-size:9px;color:#9ca3af;background:none;border:1px solid #e5e7eb;border-radius:4px;padding:2px 6px;cursor:pointer">×</button>
    </div>`).join('');

  const historyCard = `
    <div class="card" style="padding:12px 14px;margin-bottom:12px">
      <h3 style="font-size:13px;font-weight:600;color:#111827;margin:0 0 8px">History · ${entries.length} entries</h3>
      ${historyRows}
    </div>`;

  return `
    ${back}
    <div style="padding:16px">
      ${snapshotCard}
      ${graphsHTML}
      ${historyCard}
      ${_renderMeasurementForm()}
    </div>`;
}

function _renderMeasurementForm() {
  const inputs = MEASUREMENT_METRICS.map(m => `
    <label style="display:flex;flex-direction:column;gap:2px">
      <span style="font-size:10px;color:#6b7280;font-weight:600">${m.label} (${m.unit || 'cm'})</span>
      <input type="number" step="0.1" id="meas-${m.id}" placeholder="—" style="font-size:13px;padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px;font-family:monospace;width:100%">
    </label>`).join('');
  const today = new Date().toISOString().slice(0, 10);
  return `
    <div class="card" style="padding:14px 16px">
      <h3 style="font-size:13px;font-weight:600;color:#111827;margin:0 0 8px">Add measurement</h3>
      <label style="display:flex;flex-direction:column;gap:2px;margin-bottom:8px">
        <span style="font-size:10px;color:#6b7280;font-weight:600">Date</span>
        <input type="date" id="meas-date" value="${today}" style="font-size:13px;padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px;font-family:monospace">
      </label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">${inputs}</div>
      <button onclick="submitMeasurement()" style="width:100%;background:#2563eb;color:white;border:none;padding:10px 12px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Save measurement</button>
    </div>`;
}

async function submitMeasurement() {
  const dateEl = document.getElementById('meas-date');
  const date = dateEl?.value || new Date().toISOString().slice(0, 10);
  const taken_at = `${date}T${new Date().toTimeString().slice(0, 8)}Z`;
  const payload = { taken_at, date };
  let any = false;
  for (const m of MEASUREMENT_METRICS) {
    const el = document.getElementById(`meas-${m.id}`);
    const v = parseFloat(el?.value);
    if (!isNaN(v) && v > 0) {
      payload[m.id] = v;
      any = true;
    }
  }
  if (!any) {
    alert('Enter at least one measurement.');
    return;
  }
  try {
    const res = await fetch('/api/measurements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    state.measurements = undefined;
    await showMeasurements();
  } catch (e) {
    alert('Save failed: ' + e.message);
  }
}

async function deleteMeasurement(id) {
  if (!confirm('Delete this measurement?')) return;
  try {
    const res = await fetch(`/api/measurements/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`status ${res.status}`);
    state.measurements = undefined;
    await showMeasurements();
  } catch (e) {
    alert('Delete failed: ' + e.message);
  }
}
