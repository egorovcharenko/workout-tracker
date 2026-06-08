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

const mmdd = (d) => { const p = String(d || '').split('-'); return p.length === 3 ? `${p[1]}/${p[2]}` : (d || ''); };

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

function renderSparkline(pts, color, startMs, endMs) {
  if (pts.length === 0) return '';

  const w = 150, h = 50, padLeft = 28, padRight = 6, padTop = 6, padBottom = 12;

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
  const weekMarks = Array.from({length: 8}, (_, i) => ({ label: `W${i + 1}`, ms: startMs + (i * 7 + 6) * dayMs }));

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
    const tip = `${mmdd(pts[0].date)} · ${Math.round(pts[0].orm)} lb · ${Math.round(pts[0].percentile)}% (${pts[0].tier})`.replace(/'/g, "\\'");
    dotsHTML = `<circle cx="${x}" cy="${y}" r="2.5" fill="${color}" />`
      + `<circle cx="${x}" cy="${y}" r="7" fill="transparent" style="cursor:pointer"
         onmouseenter="sparkTip(event,'${tip}')" onmouseleave="sparkTip()" onclick="sparkTip(event,'${tip}',true)"></circle>`;
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
      const tip = `${mmdd(p.date)} · ${Math.round(p.orm)} lb · ${Math.round(p.percentile)}% (${p.tier})`.replace(/'/g, "\\'");
      return `<circle cx="${x}" cy="${y}" r="2" fill="${color}" />`
        + `<circle cx="${x}" cy="${y}" r="7" fill="transparent" style="cursor:pointer"
           onmouseenter="sparkTip(event,'${tip}')" onmouseleave="sparkTip()" onclick="sparkTip(event,'${tip}',true)"></circle>`;
    }).join('');
  }

  return `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;flex-shrink:0;overflow:visible">
      ${gridLines}
      ${weekLines}
      ${pathHTML}
      ${dotsHTML}
    </svg>
  `;
}

function renderMeasurementSparkline(pts, color, startMs, endMs, unit) {
  if (pts.length === 0) return '';
  const w = 150, h = 50, padLeft = 28, padRight = 6, padTop = 6, padBottom = 12;

  const vals = pts.map(p => p.value);
  const max = Math.max(...vals), min = Math.min(...vals), range = max - min || 1;
  const getX = (ms) => {
    const r = endMs - startMs || 1;
    return padLeft + ((ms - startMs) / r) * (w - padLeft - padRight);
  };
  const getY = (v) => (h - padBottom) - ((v - min) / range) * (h - padBottom - padTop);

  const gridLines = `
    <line x1="${padLeft}" y1="${padTop}" x2="${w - padRight}" y2="${padTop}" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="2,2" />
    <text x="${padLeft - 4}" y="${padTop + 3.5}" font-size="8px" fill="#6b7280" text-anchor="end">${max.toFixed(1)}</text>
    <line x1="${padLeft}" y1="${h - padBottom}" x2="${w - padRight}" y2="${h - padBottom}" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="2,2" />
    <text x="${padLeft - 4}" y="${h - padBottom + 3.5}" font-size="8px" fill="#6b7280" text-anchor="end">${min.toFixed(1)}</text>
  `;

  const dayMs = 24 * 3600 * 1000;
  const weekMarks = Array.from({length: 8}, (_, i) => ({ label: `W${i + 1}`, ms: startMs + (i * 7 + 6) * dayMs }));

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
    const y = getY(pts[0].value);
    const tip = `${mmdd(pts[0].date)} · ${pts[0].value.toFixed(1)} ${unit}`.replace(/'/g, "\\'");
    dotsHTML = `<circle cx="${x}" cy="${y}" r="2.5" fill="${color}" />`
      + `<circle cx="${x}" cy="${y}" r="7" fill="transparent" style="cursor:pointer"
         onmouseenter="sparkTip(event,'${tip}')" onmouseleave="sparkTip()" onclick="sparkTip(event,'${tip}',true)"></circle>`;
  } else {
    const pathD = pts.map(p => `L ${getX(p.ms)} ${getY(p.value)}`).join(' ').replace(/^L/, 'M');
    pathHTML = `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" />`;
    dotsHTML = pts.map(p => {
      const x = getX(p.ms);
      const y = getY(p.value);
      const tip = `${mmdd(p.date)} · ${p.value.toFixed(1)} ${unit}`.replace(/'/g, "\\'");
      return `<circle cx="${x}" cy="${y}" r="2" fill="${color}" />`
        + `<circle cx="${x}" cy="${y}" r="7" fill="transparent" style="cursor:pointer"
           onmouseenter="sparkTip(event,'${tip}')" onmouseleave="sparkTip()" onclick="sparkTip(event,'${tip}',true)"></circle>`;
    }).join('');
  }

  return `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;flex-shrink:0;overflow:visible">
      ${gridLines}
      ${weekLines}
      ${pathHTML}
      ${dotsHTML}
    </svg>
  `;
}

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

if (typeof window !== "undefined") {
  window.microSparkline = microSparkline;
  window.renderSparkline = renderSparkline;
  window.renderMeasurementSparkline = renderMeasurementSparkline;
  window.getTierStyle = getTierStyle;
  window.MUSCLE_TO_UNIFIED_GROUP = MUSCLE_TO_UNIFIED_GROUP;
  window.METRIC_TO_UNIFIED_GROUP = METRIC_TO_UNIFIED_GROUP;
  window.UNIFIED_GROUPS = UNIFIED_GROUPS;
}
