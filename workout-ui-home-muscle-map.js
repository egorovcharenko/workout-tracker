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
