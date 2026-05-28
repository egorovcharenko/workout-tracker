// UI rendering logic for the active logging view of Workout Tracker

function renderRestSeparator() {
  const dur = state.restDur || state.workout.rest || 60;
  const left = Math.max(0, state.restLeft || 0);
  const pct = Math.max(0, Math.min(100, ((dur - left) / dur) * 100));
  const isLow = left <= 10;
  const paused = !!state.restPaused;
  const accent = paused ? "#FBBF24" : isLow ? "#FBBF24" : "#60A5FA";
  const accentBg = paused ? "rgba(251,191,36,0.10)" : isLow ? "rgba(251,191,36,0.10)" : "rgba(96,165,250,0.10)";
  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, '0');
  const label = paused ? "REST · PAUSED" : "REST";
  const ghostBtn = `background:rgba(255,255,255,0.04);border:1px solid ${accent}40;color:${accent};font-family:ui-monospace,Menlo,monospace;font-size:11px;font-weight:700;padding:6px 10px;border-radius:7px;cursor:pointer;letter-spacing:0.3px`;
  
  return `
    <div style="margin:10px 0 14px;border-radius:12px;background:${accentBg};border:1px solid ${accent}45;padding:12px 14px 10px;position:relative;overflow:hidden" data-noinvert>
      <div style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:linear-gradient(90deg,${accent}28,${accent}10);transition:width 1s linear"></div>
      <div style="position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div style="display:flex;flex-direction:column;gap:1px;line-height:1">
          <span style="color:${accent};font-size:9px;font-weight:800;letter-spacing:0.8px;font-family:ui-monospace,Menlo,monospace">${label}</span>
          <span style="color:#111827;font-family:ui-monospace,Menlo,monospace;font-size:28px;font-weight:800;letter-spacing:-0.5px;margin-top:2px" id="rest-time-label">${m}:${s}</span>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <button onclick="addRest(15)" style="${ghostBtn}">+15s</button>
          <button onclick="toggleRestPause()" style="${ghostBtn};min-width:32px" id="rest-pause-btn">${paused ? '▶' : '❚❚'}</button>
          <button onclick="skipRest()" style="${ghostBtn};background:${accent};color:white;border-color:${accent}">skip</button>
        </div>
      </div>
    </div>`;
}

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

function applySuggestion(exIdx, setKey, weight, bands, _reps) {
  const k = `${exIdx}-${setKey}`;
  const ex = state.workout.exercises[exIdx];
  if (weight != null) state.weights[k] = weight;
  if (Array.isArray(bands)) {
    if (!state.bands) state.bands = {};
    state.bands[`${k}-bands`] = bands.slice();
    if (ex?.assist) {
      const sum = bands.reduce((a,b) => a+b, 0);
      state.weights[k] = sum > 0 ? Math.max(0, (state.bodyweight || 175) - sum) : null;
    } else if (ex?.equipment === 'band' && !ex?.bandAddon) {
      const sum = bands.reduce((a,b) => a+b, 0);
      state.weights[k] = sum || null;
    }
  }
  triggerSave();
  render();
}

function renderWorkout() {
  const w = state.workout;
  const total = totalSets();
  const done = completedSets();
  const pct = total ? (done / total) * 100 : 0;
  const isDone = allDone();
  const nextSet = getNextSet();

  let exerciseCards = w.exercises.map((ex, exIdx) => {
    const isSuperset = !!ex.supersetExercises;
    const warmupDone = !!state.completed[`${exIdx}-warmup`];
    const warmupOff = !!state.warmupOff?.[exIdx];
    const setCount = getSetCount(exIdx);
    const exDone = (isSuperset || warmupDone || warmupOff) && Array.from({length:setCount}).every((_,i) => state.completed[`${exIdx}-${i}`]);
    const motivKey = String(exIdx);
    const motivMsg = state.motivations?.[motivKey];
    const motivLoading = state.motivationsLoading?.[motivKey];
    const motivHTML = exDone && (motivMsg || motivLoading) ? `
      <div style="margin-top:10px;padding:10px 12px;background:linear-gradient(135deg,#ede9fe,#dbeafe);border-radius:8px;display:flex;align-items:flex-start;gap:8px">
        <span style="font-size:14px;flex-shrink:0">✨</span>
        <span style="font-size:12px;color:#4c1d95;line-height:1.45;font-weight:500">${motivLoading && !motivMsg ? '<span style="opacity:0.6">thinking…</span>' : motivMsg}</span>
      </div>` : '';

    const warmupIsNext = !warmupOff && nextSet && nextSet.exIdx === exIdx && nextSet.setKey === "warmup";
    let setsHTML = '';
    if (!isSuperset) {
      if (!warmupOff) {
        if (warmupIsNext && state.resting) setsHTML += renderRestSeparator();
        setsHTML += renderSetRow(exIdx, "warmup", "W", warmupDone, ex.reps, true, warmupIsNext);
        if (warmupIsNext) {
          setsHTML += `<div style="text-align:right;margin-top:-6px;margin-bottom:4px">
            <button onclick="toggleWarmup(${exIdx})" style="font-size:12px;color:#d97706;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:4px 14px;cursor:pointer;font-weight:500">Skip warmup →</button>
          </div>`;
        } else if (!warmupDone) {
          setsHTML += `<div style="text-align:right;margin-top:-4px;margin-bottom:2px">
            <button onclick="toggleWarmup(${exIdx})" style="font-size:10px;color:#9ca3af;background:none;border:none;cursor:pointer;padding:2px 4px">✕ remove warmup</button>
          </div>`;
        }
      } else {
        setsHTML += `<button onclick="toggleWarmup(${exIdx})" style="font-size:11px;color:#d97706;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:3px 10px;cursor:pointer;margin-bottom:4px">+ warmup</button>`;
      }
    }
    if (isSuperset) {
      const subs = ex.supersetExercises;
      const rounds = Math.ceil(setCount / subs.length);
      for (let round = 0; round < rounds; round++) {
        if (round > 0) {
          setsHTML += `<div style="height:1px;background:linear-gradient(90deg,transparent,#e5e7eb,transparent);margin:6px 0"></div>`;
        }
        for (let s = 0; s < subs.length; s++) {
          const i = round * subs.length + s;
          if (i >= setCount) break;
          const setIsNext = nextSet && nextSet.exIdx === exIdx && nextSet.setKey === i;
          if (setIsNext && state.resting) setsHTML += renderRestSeparator();
          const subName = subs[s].name;
          const subColor = s === 0 ? '#7c3aed' : '#2563eb';
          const isDoneSet = !!state.completed[`${exIdx}-${i}`];
          if (!isDoneSet || setIsNext) {
            setsHTML += `<div style="font-size:10px;font-weight:600;color:${subColor};padding-left:26px;margin-top:4px;margin-bottom:-4px">${subName}</div>`;
          }
          setsHTML += renderSetRow(exIdx, i, `${round+1}`, isDoneSet, subs[s].reps, false, setIsNext);
        }
      }
    } else {
      for (let i = 0; i < setCount; i++) {
        const setIsNext = nextSet && nextSet.exIdx === exIdx && nextSet.setKey === i;
        if (setIsNext && state.resting) setsHTML += renderRestSeparator();
        setsHTML += renderSetRow(exIdx, i, `${i+1}`, !!state.completed[`${exIdx}-${i}`], ex.reps, false, setIsNext);
      }
    }
    const canRemove = setCount > 1;
    setsHTML += `<div style="display:flex;gap:8px;padding:6px 0 2px 26px">
      ${!isSuperset ? `<button onclick="addSet(${exIdx})" style="font-size:11px;color:#6b7280;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:3px 10px;cursor:pointer">+ set</button>` : ''}
      ${!isSuperset && canRemove ? `<button onclick="removeLastSet(${exIdx})" style="font-size:11px;color:#ef4444;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:3px 10px;cursor:pointer">− set</button>` : ''}
    </div>`;

    if (exDone) {
      if (isSuperset) {
        const subs = ex.supersetExercises;
        const rounds = Math.ceil(setCount / subs.length);
        const subSummaries = subs.map((sub, s) => {
          const reps = [];
          const weights = [];
          for (let r = 0; r < rounds; r++) {
            const idx = r * subs.length + s;
            if (idx < setCount) {
              reps.push(state.reps[`${exIdx}-${idx}`] || 0);
              weights.push(getEffectiveWeight(exIdx, idx) || 0);
            }
          }
          const maxW = Math.max(...weights);
          const repsStr = reps.filter(r => r > 0).join('·');
          const isBandSub = sub.equipment === 'band';
          const wStr = maxW > 0 ? (isBandSub ? `${maxW}lb` : `@ ${maxW}lb`) : '';
          return `<div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:11px;color:#6b7280">${sub.name}</span>
            <span style="font-size:11px;color:#9ca3af;font-family:monospace">${repsStr}</span>
            ${wStr ? `<span style="font-size:10px;background:${isBandSub ? '#ede9fe' : '#dbeafe'};color:${isBandSub ? '#7c3aed' : '#2563eb'};padding:1px 5px;border-radius:3px;font-weight:600">${wStr}</span>` : ''}
          </div>`;
        });
        return `
          <div class="card done" style="padding:14px 16px;cursor:pointer;border-left:3px solid #7c3aed" onclick="state._expanded = state._expanded === ${exIdx} ? null : ${exIdx}; render()">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:28px;height:28px;border-radius:50%;background:#f3e8ff;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <span style="color:#7c3aed;font-size:13px;font-weight:700">✓</span>
              </div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="font-weight:600;color:#15803d;font-size:14px">${ex.name}</span>
                  <span style="font-size:9px;background:#f3e8ff;color:#7c3aed;padding:1px 6px;border-radius:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px">superset</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:1px;margin-top:3px">
                  ${subSummaries.join('')}
                </div>
              </div>
              <span style="font-size:10px;color:#d1d5db;transform:rotate(${state._expanded === exIdx ? '180' : '0'}deg);transition:transform 0.2s">▼</span>
            </div>
            ${motivHTML}
            ${state._expanded === exIdx ? `<div style="padding-top:10px;border-top:1px solid #dcfce7;margin-top:10px">${setsHTML}</div>` : ''}
          </div>
        `;
      }
      const workingSets = [];
      for (let i = 0; i < setCount; i++) {
        const wt = getEffectiveWeight(exIdx, i);
        const rp = state.reps[`${exIdx}-${i}`] || 0;
        workingSets.push({ wt, rp });
      }
      const maxW = Math.max(...workingSets.map(s => s.wt || 0));
      const repsList = workingSets.map(s => s.rp).filter(r => r > 0);
      const isAssistEx = ex.assist === true;
      const isBandEx = ex.equipment === 'band' && !isAssistEx;
      const weightStr = maxW > 0 ? `${maxW}lb` : '';
      const badgeBg = isAssistEx ? '#cffafe' : (isBandEx ? '#ede9fe' : '#dbeafe');
      const badgeFg = isAssistEx ? '#0891b2' : (isBandEx ? '#7c3aed' : '#2563eb');
      const badgeSuffix = isAssistEx ? ` <span style="opacity:0.65;font-weight:500;font-size:9px;letter-spacing:0.04em">BW</span>` : '';
      let gripTag = '';
      if (isAssistEx) {
        const counts = {};
        for (let i = 0; i < setCount; i++) {
          const g = (state.grip || {})[`${exIdx}-${i}`];
          if (g) counts[g] = (counts[g] || 0) + 1;
        }
        const top = Object.entries(counts).sort((a,b) => b[1] - a[1])[0];
        if (top) gripTag = `<span style="font-size:10px;color:#0e7490;opacity:0.7;font-style:italic">${gripLabel(top[0]).toLowerCase()} grip</span>`;
      }
      const repsDisplay = repsList.length > 0 ? repsList.join(' · ') : '';
      return `
        <div class="card done" style="padding:14px 16px;cursor:pointer;border-left:3px solid #22c55e" onclick="state._expanded = state._expanded === ${exIdx} ? null : ${exIdx}; render()">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:28px;height:28px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span style="color:#16a34a;font-size:13px;font-weight:700">✓</span>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;color:#15803d;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ex.name}</div>
              <div style="display:flex;gap:8px;align-items:center;margin-top:2px;flex-wrap:wrap">
                <span style="font-size:12px;color:#6b7280;font-family:monospace;letter-spacing:-0.3px">${repsDisplay}</span>
                ${weightStr ? `<span style="font-size:10px;background:${badgeBg};color:${badgeFg};padding:1px 6px;border-radius:4px;font-weight:600">${weightStr}${badgeSuffix}</span>` : ''}
                ${gripTag}
              </div>
            </div>
            <span style="font-size:10px;color:#d1d5db;transform:rotate(${state._expanded === exIdx ? '180' : '0'}deg);transition:transform 0.2s">▼</span>
          </div>
          ${motivHTML}
          ${state._expanded === exIdx ? `<div style="padding-top:10px;border-top:1px solid #dcfce7;margin-top:10px">${setsHTML}</div>` : ''}
        </div>
      `;
    }

    if (isSuperset) {
      const subs = ex.supersetExercises;
      return `
        <div class="card" style="border-left:3px solid #7c3aed">
          <div style="padding:16px 16px 8px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <h3 style="font-weight:600;color:#111827;margin:0">${ex.name}</h3>
              <span style="font-size:11px;background:#f3e8ff;color:#7c3aed;padding:2px 8px;border-radius:9999px;font-weight:500">${ex.sets} rounds</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:4px">
              ${subs.map((sub, s) => `
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="font-size:11px;font-weight:700;color:#7c3aed;background:#f3e8ff;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center">${s+1}</span>
                  <span style="font-size:13px;color:#374151;font-weight:500">${sub.name}</span>
                  <span style="font-size:11px;color:#9ca3af">${sub.reps} reps</span>
                  ${sub.video ? `<a href="${sub.video}" target="_blank" rel="noopener" style="font-size:10px;color:#9ca3af;text-decoration:none">▶</a>` : ''}
                </div>
              `).join('')}
            </div>
            ${ex.notes ? `<p style="font-size:12px;color:#9ca3af;margin:0">${ex.notes}</p>` : ''}
            ${renderExerciseNote(ex.name)}
            ${typeof renderSupersetSparkline === 'function' && renderSupersetSparkline(ex) ? `<div style="margin-top:6px">${renderSupersetSparkline(ex)}</div>` : ''}
          </div>
          <div style="padding:0 16px 12px">${setsHTML}</div>
        </div>
      `;
    }

    return `
      <div class="card">
        <div style="padding:16px 16px 8px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px">
            <div style="flex:1">
              <h3 style="font-weight:600;color:#111827;margin:0">${ex.name}</h3>
              <p style="font-size:12px;color:#6b7280;margin:2px 0 0">${ex.sets} × ${ex.reps} reps</p>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              ${ex.video ? `<a href="${ex.video}" target="_blank" rel="noopener" style="font-size:11px;background:#f3f4f6;color:#6b7280;padding:2px 8px;border-radius:9999px;font-weight:500;text-decoration:none;display:inline-block">▶ How to</a>` : ''}
              ${isSwappable(ex.name) ? `<div style="position:relative;display:inline-block">
                <button onclick="toggleSwapMenu(${exIdx})" style="font-size:11px;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:9999px;font-weight:500;border:none;cursor:pointer">⇄</button>
                ${state.swapOpen === exIdx ? `<div style="position:absolute;right:0;top:24px;background:white;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:50;min-width:180px;overflow:hidden">
                  ${getSwapOptions(ex.name).map(opt => `<button onclick="swapExercise(${exIdx},'${opt.name.replace(/'/g,"\\'")}')" style="display:block;width:100%;text-align:left;padding:8px 12px;font-size:12px;color:#374151;background:white;border:none;border-bottom:1px solid #f3f4f6;cursor:pointer">${opt.name}</button>`).join("")}
                </div>` : ''}
              </div>` : ''}
            </div>
          </div>
          ${ex.notes ? `<p style="font-size:12px;color:#9ca3af;margin:0">${ex.notes}</p>` : ''}
          ${renderExerciseNote(ex.name)}
          ${typeof renderSparkline === 'function' && renderSparkline(ex.name) ? `<div style="margin-top:6px">${renderSparkline(ex.name)}</div>` : ''}
        </div>
        <div style="padding:0 16px 12px">${setsHTML}</div>
      </div>
    `;
  }).join("");

  const finishLoadingTop = state.finishMotivationLoading;
  const finishMsgTop = state.finishMotivation;
  const finishStandaloneHTML = (finishMsgTop || finishLoadingTop) ? `
    <div style="margin:4px 0 0;padding:11px 12px 11px 14px;background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;border-radius:10px;display:flex;align-items:flex-start;gap:8px">
      <span style="font-size:15px;flex-shrink:0;line-height:1.4">💪</span>
      <span ${finishMsgTop ? 'onclick="showFinishMotivation()"' : ''} style="flex:1;font-size:13px;color:#451a03;line-height:1.5;font-weight:500;${finishMsgTop ? 'cursor:pointer' : ''}">${finishLoadingTop && !finishMsgTop ? '<span style="opacity:0.6">cooking up the closer…</span>' : finishMsgTop}</span>
      <button onclick="regenerateFinishMotivation()" title="Regenerate" ${finishLoadingTop ? 'disabled' : ''} style="flex-shrink:0;background:transparent;border:none;color:#92400e;font-size:14px;cursor:${finishLoadingTop ? 'wait' : 'pointer'};opacity:${finishLoadingTop ? '0.4' : '0.55'};padding:2px 4px;line-height:1;align-self:flex-start;${finishLoadingTop ? 'animation:spin 0.9s linear infinite;' : ''}">↻</button>
    </div>
    <style>@keyframes spin { to { transform: rotate(360deg) } }</style>` : '';

  let completionHTML = "";
  if (isDone) {
    const summaryLines = w.exercises.map((ex, exIdx) => {
      let lines = "";
      const assistCtx = (setKey) => {
        if (!ex.assist) return '';
        const bands = (state.bands || {})[`${exIdx}-${setKey}-bands`] || [];
        const sum = bands.reduce((a, b) => a + b, 0);
        const grip = (state.grip || {})[`${exIdx}-${setKey}`];
        const parts = [];
        if (sum > 0) parts.push(`BW −${sum}`);
        if (grip) parts.push(gripLabel(grip).toLowerCase());
        return parts.length ? ` <span style="opacity:0.55">(${parts.join(' · ')})</span>` : '';
      };
      if (state.completed[`${exIdx}-warmup`]) {
        const wt = getEffectiveWeight(exIdx, "warmup");
        const rp = state.reps[`${exIdx}-warmup`] || ex.reps;
        lines += `<p style="font-size:12px;color:#d97706;font-family:monospace;margin:2px 0 2px 8px">W: ${rp} reps ${wt ? `@ ${wt}lb / ${lbToKg(wt)}kg${assistCtx('warmup')}` : ""}</p>`;
      }
      for (let i = 0; i < getSetCount(exIdx); i++) {
        if (state.completed[`${exIdx}-${i}`]) {
          const subEx = getSubExercise(exIdx, i);
          const wt = getEffectiveWeight(exIdx, i);
          const rp = state.reps[`${exIdx}-${i}`] || (subEx ? subEx.reps : ex.reps);
          const label = subEx ? subEx.name.split(' ').map(w => w[0]).join('') : `#${i+1}`;
          lines += `<p style="font-size:12px;color:#6b7280;font-family:monospace;margin:2px 0 2px 8px">${label}: ${rp} reps ${wt ? `@ ${wt}lb / ${lbToKg(wt)}kg${assistCtx(i)}` : ""}</p>`;
        }
      }
      const nameHTML = ex.supersetExercises
        ? `<span style="font-weight:500;color:#7c3aed">${ex.name}</span> <span style="font-size:10px;background:#f3e8ff;color:#7c3aed;padding:1px 6px;border-radius:9999px;font-weight:500">Superset</span>`
        : `<span style="font-weight:500;color:#374151">${ex.name}</span>`;
      return `<div style="margin-bottom:8px"><p style="margin:0">${nameHTML}</p>${lines}</div>`;
    }).join("");

    const highlights = [];
    w.exercises.forEach((ex, exIdx) => {
      const names = ex.supersetExercises ? ex.supersetExercises.map(s => s.name) : [ex.name];
      names.forEach(name => {
        const lastVol = ((state.volHistory || {})[name] || []).filter(d => d.date !== localDate());
        const lastVolVal = lastVol.length > 0 ? lastVol[lastVol.length - 1].vol : 0;
        const curVol = typeof currentSessionVolume === 'function' ? currentSessionVolume(name) : 0;

        const lastReps = ((state.repsHistory || {})[name] || []).filter(d => d.date !== localDate());
        const lastRepsVal = lastReps.length > 0 ? lastReps[lastReps.length - 1].reps : 0;
        const curReps = typeof currentSessionTotalReps === 'function' ? currentSessionTotalReps(name) : 0;

        const lastOrm = ((state.ormHistory || {})[name] || []).filter(d => d.date !== localDate());
        const lastOrmVal = lastOrm.length > 0 ? lastOrm[lastOrm.length - 1].orm : 0;
        const curOrm = typeof currentSessionOrm === 'function' ? currentSessionOrm(name) : 0;

        if (curOrm > lastOrmVal && lastOrmVal > 0) {
          highlights.push({ name, type: '1RM', icon: '🏆', text: `${name}: new 1RM ${Math.round(curOrm)}lb (was ${Math.round(lastOrmVal)}lb)`, color: '#ca8a04' });
        } else if (curVol > lastVolVal && lastVolVal > 0) {
          const pct = Math.round((curVol - lastVolVal) / lastVolVal * 100);
          highlights.push({ name, type: 'vol', icon: '📈', text: `${name}: +${pct}% volume`, color: '#16a34a' });
        } else if (curReps > lastRepsVal && lastRepsVal > 0) {
          highlights.push({ name, type: 'reps', icon: '🔥', text: `${name}: +${curReps - lastRepsVal} more reps`, color: '#2563eb' });
        }
      });
    });

    const highlightsHTML = highlights.length > 0 ? `
      <div style="background:linear-gradient(135deg,#fefce8,#f0fdf4);border:1px solid #d9f99d;border-radius:12px;padding:12px 14px;margin-bottom:12px">
        <p style="font-size:11px;font-weight:600;color:#65a30d;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px">Highlights</p>
        ${highlights.map(h => `<p style="font-size:13px;color:${h.color};margin:3px 0;font-weight:500">${h.icon} ${h.text}</p>`).join('')}
      </div>
    ` : '';

    completionHTML = `
      <div style="padding:24px 0">
        <div style="text-align:center;margin-bottom:16px">
          <p style="font-size:40px;margin:0 0 8px">💪</p>
          <h3 style="font-size:20px;font-weight:700;color:#15803d;margin:0">Workout Complete!</h3>
          <p style="font-size:14px;color:#6b7280;margin:4px 0 0">Time: ${formatTime(state.elapsed)}</p>
        </div>
        ${highlightsHTML}
        ${typeof renderSessionMuscleMap === 'function' ? renderSessionMuscleMap() : ''}
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px">
          <p style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px">Session Summary</p>
          ${summaryLines}
          <div style="border-top:1px solid #e5e7eb;padding-top:8px;margin-top:8px;display:flex;justify-content:space-between;font-size:12px;color:#9ca3af">
            <span>Total: ${formatTime(state.elapsed)}</span>
            <span>${new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
          </div>
        </div>
        <div style="text-align:center;margin-top:16px">
          <p style="font-size:12px;color:#9ca3af">✓ Auto-saved</p>
        </div>
      </div>
    `;
  }

  const innerHTML = `
    <div style="position:sticky;top:0;background:white;border-bottom:1px solid #f3f4f6;padding:12px 16px;z-index:10">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <button onclick="stopTimer();state.screen='home';history.replaceState(null,'','#');loadHomeData()" style="color:#2563eb;font-size:14px;font-weight:500;background:none;border:none;cursor:pointer">← Back</button>
        <span id="elapsed-timer" style="font-size:14px;font-family:monospace;color:#6b7280">${formatTime(state.elapsed)}</span>
      </div>
      <h2 style="font-size:18px;font-weight:700;margin:4px 0 0">${w.name}</h2>
      <div style="margin-top:8px;height:6px;background:#f3f4f6;border-radius:9999px;overflow:hidden">
        <div style="height:100%;background:#3b82f6;border-radius:9999px;transition:width 0.3s;width:${pct}%"></div>
      </div>
      <p style="font-size:12px;color:#9ca3af;margin:4px 0 0">${done}/${total} sets</p>
    </div>
    <div style="padding:16px;display:flex;flex-direction:column;gap:16px">
      ${w.warmup ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px"><p style="font-size:14px;color:#92400e;margin:0">🔥 <strong>Warm-up:</strong> ${w.warmup}</p></div>` : ''}
      ${exerciseCards}
      ${finishStandaloneHTML}
      ${completionHTML}
      ${done > 0 && state.sessionId ? `
        <div style="text-align:center;padding:8px 0">
          <p style="font-size:11px;color:#9ca3af">✓ Auto-saving</p>
        </div>
      ` : ''}
    </div>
    ${renderMotivationBanner()}
  `;

  return `
    <div style="max-width: 448px; margin: 0 auto; min-height: 100vh; background: #f9fafb; position: relative;">
      ${innerHTML}
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
