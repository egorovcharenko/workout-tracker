function renderExerciseCardInWorkout(ex, exIdx, nextSet) {
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
              ${state.swapOpen === exIdx ? `
                <div style="position:absolute;right:0;top:24px;background:white;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:50;min-width:240px;max-height:300px;overflow-y:auto;padding:8px 0">
                  ${SWAP_GROUPS.map(grp => `
                    <div style="padding:4px 12px;font-size:10px;font-weight:700;color:#9ca3af;background:#f9fafb;text-transform:uppercase;letter-spacing:0.05em;border-top:1px solid #f3f4f6;margin-top:4px;border-bottom:1px dashed #e5e7eb">
                      ${grp.family}
                    </div>
                    ${grp.exercises.map(opt => {
                      const isCurrent = opt.name === ex.name;
                      return `
                        <button onclick="${isCurrent ? '' : `swapExercise(${exIdx},'${opt.name.replace(/'/g,"\\'")}')`}" 
                          style="display:block;width:100%;text-align:left;padding:8px 16px;font-size:12px;color:${isCurrent ? '#3b82f6' : '#374151'};background:white;border:none;cursor:${isCurrent ? 'default' : 'pointer'};font-weight:${isCurrent ? '700' : '500'}" 
                          ${isCurrent ? 'disabled' : ''}>
                          ${isCurrent ? '● ' : ''}${opt.name}
                        </button>`;
                    }).join("")}
                  `).join("")}
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
}

if (typeof window !== "undefined") {
  window.renderExerciseCardInWorkout = renderExerciseCardInWorkout;
}
