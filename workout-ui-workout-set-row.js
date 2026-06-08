// Set row rendering logic for the active logging view of Workout Tracker

function renderSetRow(exIdx, setKey, label, isDone, targetReps, isWarmup, isNext) {
  const ex = state.workout.exercises[exIdx];
  const subEx = getSubExercise(exIdx, setKey);
  const effectiveEx = subEx ? { ...ex, ...subEx } : ex;
  const isAssist = effectiveEx.assist === true;
  const isBand = effectiveEx.equipment === "band" && !isAssist;
  const isBandAddon = effectiveEx.bandAddon === true;
  const isBW = effectiveEx.bodyweight;
  const w = getSetWeight(exIdx, setKey);
  const wHint = w == null ? (isBandAddon ? getHintDBWeight(exIdx, setKey) : getHintWeight(exIdx, setKey)) : null;
  const loggedReps = state.reps[`${exIdx}-${setKey}`];
  const labelColor = isWarmup ? '#d97706' : '#6b7280';
  const doneColor = isWarmup ? '#f59e0b' : '#22c55e';
  const selectedBands = getBandSelection(exIdx, setKey);
  const assistSum = isAssist ? selectedBands.reduce((a,b) => a+b, 0) : 0;
  const addonBandSum = isBandAddon ? selectedBands.reduce((a,b) => a+b, 0) : 0;

  if (isDone && loggedReps) {
    let bandSummary;
    if (isBW) {
      bandSummary = '';
    } else if (isAssist) {
      const eff = w != null ? w : Math.max(0, (state.bodyweight || 175) - assistSum);
      const grip = (state.grip || {})[`${exIdx}-${setKey}`];
      const gripTag = grip ? ` <span style="opacity:0.6;font-weight:500">· ${gripLabel(grip).toLowerCase()}</span>` : '';
      bandSummary = `<span style="font-size:12px;font-family:monospace;color:#0891b2">@ ${eff}lb${assistSum > 0 ? ` <span style="opacity:0.7">(BW −${assistSum})</span>` : ''}${gripTag}</span>`;
    } else if (isBand && selectedBands.length > 0) {
      bandSummary = `<span style="font-size:12px;font-family:monospace;color:#7c3aed">@ ${selectedBands.reduce((a,b)=>a+b,0)}lb bands</span>`;
    } else if (isBandAddon) {
      const db = w || 0;
      const total = db + addonBandSum;
      if (total === 0) {
        bandSummary = '';
      } else if (addonBandSum > 0 && db > 0) {
        bandSummary = `<span style="font-size:12px;font-family:monospace;color:#7c3aed">@ ${total}lb <span style="opacity:0.7">(35 DB + ${addonBandSum} band)</span></span>`;
      } else if (addonBandSum > 0) {
        bandSummary = `<span style="font-size:12px;font-family:monospace;color:#7c3aed">@ ${addonBandSum}lb <span style="opacity:0.7">(band)</span></span>`;
      } else {
        bandSummary = `<span style="font-size:12px;font-family:monospace;color:#2563eb">@ ${db}lb</span>`;
      }
    } else {
      bandSummary = w ? `<span style="font-size:12px;font-family:monospace;color:#2563eb">@ ${w}lb</span>` : '';
    }
    const subNameTag = subEx ? `<span style="font-size:10px;color:#7c3aed;font-weight:500">${subEx.name.split(' ').pop()}</span>` : '';
    return `
      <div style="border-bottom:1px solid #f9fafb;padding:10px 0;display:flex;align-items:center;gap:8px;opacity:0.85">
        <span style="font-size:11px;font-weight:700;color:${doneColor};width:20px;text-align:center">✓</span>
        <span style="font-size:12px;color:#374151;font-weight:500">${label}</span>
        ${subNameTag}
        <span style="font-size:12px;color:#6b7280">${loggedReps} reps</span>
        ${bandSummary}
        <button onclick="undoSet(${exIdx},'${setKey}')" style="margin-left:auto;font-size:10px;color:#9ca3af;background:none;border:1px solid #e5e7eb;border-radius:4px;padding:2px 6px;cursor:pointer">undo</button>
      </div>
    `;
  }

  if (!isNext) {
    const lastR = getLastReps(exIdx, setKey);
    const hintStyle = 'font-size:11px;font-family:monospace;color:#9ca3af;border-bottom:1px dashed #d1d5db';
    let hintText = '';
    if (wHint) {
      hintText = `<span style="${hintStyle}">last: ${wHint}lb${lastR ? ` × ${lastR}` : ''}</span>`;
    } else if (lastR) {
      hintText = `<span style="${hintStyle}">last: ${lastR} reps</span>`;
    }
    const subNameTag = subEx ? `<span style="font-size:10px;color:#9ca3af;font-weight:500">${subEx.name.split(' ').pop()}</span>` : '';
    return `
      <div style="border-bottom:1px solid #f9fafb;padding:10px 0;display:flex;align-items:center;gap:8px;opacity:0.45">
        <span style="font-size:12px;font-weight:700;color:${labelColor};width:20px;text-align:center">${label}</span>
        <span style="font-size:12px;color:#374151;font-weight:500">${subEx ? 'Pending' : `Set ${label}`}</span>
        ${subNameTag}
        ${hintText ? `<span style="margin-left:auto">${hintText}</span>` : ''}
      </div>
    `;
  }

  const lastW = isBandAddon ? getLastDBWeight(exIdx, setKey) : getLastWeight(exIdx, setKey);
  const lastR = getLastReps(exIdx, setKey);
  const isBandsOnly = effectiveEx.equipment === 'band' && !isBandAddon && !isAssist;

  let pickerHTML = '';
  if (isBW) {
    pickerHTML = `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
      <span style="font-size:11px;color:#6b7280;font-weight:600">Weight:</span>
      <button onclick="promptBodyweight()" style="font-size:12px;font-weight:700;color:#2563eb;background:#eff6ff;border:1px solid #bfdbfe;padding:6px 12px;border-radius:8px;cursor:pointer">⚖️ ${state.bodyweight}lb</button>
    </div>`;
  } else if (!isBandsOnly) {
    const range = workingWeightRange(wHint || lastW || 20);
    const options = (state.expandedPicker || {})[`${exIdx}-${setKey}`]
      ? WEIGHTS_LB
      : range;
    const isExpanded = !!(state.expandedPicker || {})[`${exIdx}-${setKey}`];

    const pickers = options.map(lb => {
      const selected = w === lb;
      const hinted = w == null && (wHint === lb || (wHint == null && lastW === lb));
      return `
        <button class="weight-btn" style="${weightBtnStyle(lb, selected, hinted)}"
          onclick="selectWeight(${exIdx},'${setKey}',${lb})">
          ${lb}
        </button>`;
    }).join("");

    pickerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:11px;color:#6b7280;font-weight:600">Weight (lb):</span>
          <button onclick="togglePickerExpanded('${exIdx}-${setKey}')" style="font-size:10px;color:#3b82f6;background:none;border:none;cursor:pointer;padding:2px 4px">${isExpanded ? 'Show less' : 'Show all'}</button>
        </div>
        <div class="scroll-row" style="display:flex;gap:4px;overflow-x:auto;padding-bottom:4px;WebkitOverflowScrolling:touch">
          ${pickers}
        </div>
      </div>`;
  }

  let bandsHTML = '';
  if (isAssist || isBand || isBandAddon) {
    const totalSelected = selectedBands.reduce((a,b) => a+b, 0);
    const lastBands = getLastBands(exIdx, setKey);
    const isSelectedMatch = lastBands.length === selectedBands.length && lastBands.every(b => selectedBands.includes(b));
    const labelText = isAssist ? "Assistance" : isBandAddon ? "Resistance Band" : "Resistance";

    const bandPickers = BANDS.map(b => {
      const isSel = selectedBands.includes(b.lb);
      const isWasLast = lastBands.includes(b.lb);
      const style = isSel
        ? `background:#f3e8ff;color:#7c3aed;border:2.5px solid #c084fc;`
        : `background:#fafafa;color:#737373;border:1.5px solid #e5e7eb;`;
      return `
        <button onclick="toggleBand(${exIdx},'${setKey}',${b.lb})" style="font-size:11px;font-weight:700;padding:6px 0;width:38px;border-radius:6px;cursor:pointer;flex-shrink:0;position:relative;${style}">
          ${isWasLast ? `<span style="position:absolute;top:2px;left:2px;width:4px;height:4px;border-radius:50%;background:#c084fc"></span>` : ''}
          ${b.lb}
        </button>`;
    }).join("");

    bandsHTML = `
      <div style="margin-top:8px">
        <div style="display:flex;justify-content:between;align-items:center;margin-bottom:4px">
          <span style="font-size:11px;color:#6b7280;font-weight:600">${labelText}:</span>
          <div style="display:flex;gap:8px;align-items:center">
            ${lastBands.length > 0 && !isSelectedMatch ? `<button onclick="applyBandSelection(${exIdx},'${setKey}','${lastBands.join(",")}')" style="font-size:9.5px;color:#9333ea;background:#f3e8ff;border:none;border-radius:4px;padding:2px 6px;cursor:pointer;font-weight:600">use last (${lastBands.join("+")})</button>` : ''}
            ${selectedBands.length > 0 ? `<button onclick="applyBandSelection(${exIdx},'${setKey}','')" style="font-size:9.5px;color:#6b7280;background:none;border:none;cursor:pointer;padding:2px 4px">clear</button>` : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <div style="display:flex;gap:4px;overflow-x:auto;padding-bottom:2px">${bandPickers}</div>
          ${totalSelected > 0 ? `<span style="font-size:12px;font-family:monospace;font-weight:700;color:#7c3aed;margin-left:auto">${isAssist ? '−' : '+'}${totalSelected}lb</span>` : ''}
        </div>
      </div>`;
  }

  let gripHTML = '';
  if (isAssist) {
    const activeGrip = getGrip(exIdx, setKey);
    const lastGrip = getLastGrip(exIdx, setKey);
    const declaredGrips = getGripOptions(effectiveEx);

    const gripPickers = declaredGrips.map(o => {
      const isSel = activeGrip === o.id;
      const isWasLast = lastGrip === o.id;
      const style = isSel
        ? `background:#e0f2fe;color:#0369a1;border:2.5px solid #7dd3fc;`
        : `background:#fafafa;color:#737373;border:1.5px solid #e5e7eb;`;
      return `
        <button onclick="selectGrip(${exIdx},'${setKey}','${o.id}')" title="${o.desc}" style="font-size:11px;font-weight:700;padding:6px 0;width:38px;border-radius:6px;cursor:pointer;flex-shrink:0;position:relative;${style}">
          ${isWasLast ? `<span style="position:absolute;top:2px;left:2px;width:4px;height:4px;border-radius:50%;background:#0284c7"></span>` : ''}
          ${o.icon}
        </button>`;
    }).join("");

    gripHTML = `
      <div style="margin-top:8px">
        <div style="display:flex;justify-content:between;align-items:center;margin-bottom:4px">
          <span style="font-size:11px;color:#6b7280;font-weight:600">Grip: <span style="color:#0891b2;font-weight:700">${gripLabel(activeGrip).toLowerCase()}</span></span>
          ${lastGrip && lastGrip !== activeGrip ? `<button onclick="selectGrip(${exIdx},'${setKey}','${lastGrip}')" style="font-size:9.5px;color:#0891b2;background:#e0f2fe;border:none;border-radius:4px;padding:2px 6px;cursor:pointer;font-weight:600">use last (${gripLabel(lastGrip).toLowerCase()})</button>` : ''}
        </div>
        <div style="display:flex;gap:4px;overflow-x:auto;padding-bottom:2px">${gripPickers}</div>
      </div>`;
  }

  return `
    <div style="border:1.5px solid ${isWarmup ? '#fcd34d' : '#93c5fd'};background:linear-gradient(180deg,${isWarmup ? 'rgba(251,191,36,0.05)' : 'rgba(59,130,246,0.04)'},white);border-radius:10px;padding:12px;margin:8px 0" data-noinvert>
      <div style="display:flex;justify-content:between;align-items:center;margin-bottom:8px">
        <span style="font-size:13px;font-weight:800;color:${isWarmup ? '#d97706' : '#2563eb'}">${isWarmup ? 'WARM-UP' : `SET ${label}`}</span>
        ${lastR ? `<span style="font-size:11px;color:#6b7280;font-weight:500">last: ${lastW ? `${lastW}lb × ` : ''}${lastR} reps</span>` : ''}
      </div>

      ${pickerHTML}
      ${bandsHTML}
      ${gripHTML}

      <div style="margin-top:10px">
        <span style="font-size:11px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px">Reps:</span>
        <div class="scroll-row" style="display:flex;gap:4px;overflow-x:auto;padding:2px 0;WebkitOverflowScrolling:touch" data-scroll-row>
          ${(() => {
            const [lo, hi] = parseRepRange(targetReps);
            const candidates = repsOptions(Math.max(1, lo - 4), Math.max(20, hi + 4));
            return candidates.map(r => {
              const selected = loggedReps === r;
              const isH = lastR === r;
              if (isH) {
                return `
                  <div style="position:relative;flex-shrink:0" data-scroll-target>
                    <button class="reps-btn" style="${repsBtnStyle(r, selected, true, r >= lo && r <= hi)};font-weight:800"
                      onclick="logReps(${exIdx},'${setKey}',${r},${isWarmup},event)">
                      ${r}
                    </button>
                  </div>`;
              }
              return `
                <button class="reps-btn" style="${repsBtnStyle(r, selected, false, r >= lo && r <= hi)};flex-shrink:0"
                  onclick="logReps(${exIdx},'${setKey}',${r},${isWarmup},event)">
                  ${r}
                </button>`;
            }).join("");
          })()}
        </div>
      </div>
    </div>
  `;
}

function togglePickerExpanded(key) {
  if (!state.expandedPicker) state.expandedPicker = {};
  state.expandedPicker[key] = !state.expandedPicker[key];
  render();
}
