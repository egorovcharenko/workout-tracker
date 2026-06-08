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

function renderWorkoutCompletion(w) {
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

  return `
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

function renderWorkout() {
  const w = state.workout;
  const total = totalSets();
  const done = completedSets();
  const pct = total ? (done / total) * 100 : 0;
  const isDone = allDone();
  const nextSet = getNextSet();

  let exerciseCards = w.exercises.map((ex, exIdx) => {
    return renderExerciseCardInWorkout(ex, exIdx, nextSet);
  }).join("");

  const finishLoadingTop = state.finishMotivationLoading;
  const finishMsgTop = state.finishMotivation;
  const finishStandaloneHTML = (finishMsgTop || finishLoadingTop) ? `
    <div style="margin:4px 0 0;padding:11px 12px 11px 14px;background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;border-radius:10px;display:flex;align-items:flex-start;gap:8px">
      <span style="font-size:15px;flex-shrink:0;line-height:1.4">💪</span>
      <span ${finishMsgTop ? 'onclick="showFinishMotivation()"' : ''} style="flex:1;font-size:13px;color:#451a03;line-height:1.5;font-weight:500;${finishMsgTop ? 'cursor:pointer' : ''}">${finishLoadingTop && !finishMsgTop ? '<span style="opacity:0.6">cooking up the closer…</span>' : finishMsgTop}</span>
      <button onclick="regenerateFinishMotivation()" title="Regenerate" ${finishLoadingTop ? 'disabled' : ''} style="flex-shrink:0;background:transparent;border:none;color:#92400e;font-size:14px;cursor:${finishLoadingTop ? 'wait' : 'pointer'};opacity:${finishLoadingTop ? '0.4' : '0.55'};padding:2px 4px;line-height:1;align-self:flex-start;${finishLoadingTop ? 'animation:spin 0.9s linear infinite;' : ''}">↻</button>
    </div>` : '';

  let completionHTML = "";
  if (isDone) {
    completionHTML = renderWorkoutCompletion(w);
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

if (typeof window !== "undefined") {
  window.renderRestSeparator = renderRestSeparator;
  window.applySuggestion = applySuggestion;
  window.renderWorkoutCompletion = renderWorkoutCompletion;
  window.renderWorkout = renderWorkout;
  window.renderMotivationBanner = renderMotivationBanner;
}
