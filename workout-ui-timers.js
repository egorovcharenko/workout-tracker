// Timer and Rest countdown controls for Workout Tracker

let timerInterval = null;
let restInterval = null;

// Timer controls — total elapsed is always derived from a wall-clock
// anchor (state.timerStartedAt), persisted to the DB as `started_at`.
// That way reload mid-workout shows the true wall-clock time since the
// session began, not whatever happened to be saved at the last set.
function startTimer() {
  if (timerInterval) return;
  state.running = true;
  // Only set the anchor if it isn't already (preserve wall-clock origin
  // across pause/resume calls; the very-first start is set in startWorkout
  // or loadSessionData).
  if (!state.timerStartedAt) {
    state.timerStartedAt = Date.now() - (state.elapsed || 0) * 1000;
  }
  timerInterval = setInterval(tickTimer, 1000);
}

function tickTimer() {
  if (!state.running || !state.timerStartedAt) return;
  state.elapsed = Math.floor((Date.now() - state.timerStartedAt) / 1000);
  // Surgically update the elapsed-timer display in place. Avoids the full
  // render() that would destroy textarea focus on the notes editor (and any
  // other input the user is typing into) every single second.
  const el = document.getElementById('elapsed-timer');
  if (el) {
    el.textContent = formatTime(state.elapsed);
  } else {
    render();  // fallback if the header hasn't mounted yet
  }
}

function stopTimer() {
  state.running = false;
  clearInterval(timerInterval); timerInterval = null;
  state.timerStartedAt = 0;
}

function _restStorageKey() {
  // Scope by workout id so rest state from a different workout isn't picked up.
  const wid = state.workout?.id || '_';
  return `restState:${wid}`;
}

function _persistRestState() {
  try {
    if (state.resting && state.restEndAt) {
      localStorage.setItem(_restStorageKey(), JSON.stringify({
        endAt: state.restEndAt,
        dur: state.restDur,
      }));
    } else {
      localStorage.removeItem(_restStorageKey());
    }
  } catch (_) {}
}

function restoreRestState() {
  // Called from loadSessionData on workout-view entry. If localStorage has
  // an active rest that hasn't expired yet, resume the countdown so the
  // user picks back up where they were. If it's expired, just clear.
  try {
    const raw = localStorage.getItem(_restStorageKey());
    if (!raw) return;
    const saved = JSON.parse(raw);
    const left = saved && saved.endAt ? Math.ceil((saved.endAt - Date.now()) / 1000) : 0;
    if (left > 0) {
      state.resting = true;
      state.restEndAt = saved.endAt;
      state.restDur = saved.dur || left;
      state.restLeft = left;
      if (restInterval) clearInterval(restInterval);
      restInterval = setInterval(tickRest, 1000);
      console.log(`[REST] resumed with ${left}s left`);
    } else {
      localStorage.removeItem(_restStorageKey());
    }
  } catch (_) {}
}

function startRest(duration) {
  if (restInterval) { clearInterval(restInterval); restInterval = null; }
  if (!duration || duration <= 0) return;
  state.resting = true;
  state.restPaused = false;
  state.restDur = duration;
  state.restEndAt = Date.now() + duration * 1000;
  state.restLeft = duration;
  _persistRestState();
  restInterval = setInterval(tickRest, 1000);
}

function tickRest() {
  if (!state.resting || !state.restEndAt) return;
  if (state.restPaused) {
    // While paused: keep restLeft as a frozen value, don't drain. We still
    // patch the DOM so the "REST · PAUSED" label re-renders if needed.
    if (!_patchRestTimer()) render();
    return;
  }
  const left = Math.max(0, Math.ceil((state.restEndAt - Date.now()) / 1000));
  const wasResting = state.resting;
  state.restLeft = left;
  if (left <= 0) {
    clearInterval(restInterval); restInterval = null;
    state.resting = false; state.restEndAt = 0;
    _persistRestState();
    // Natural completion → flash the screen + brief "GO!" cue.
    if (wasResting) flashRestDone();
    render();  // full render only on transition (off → on or on → off)
    return;
  }
  // Per-second tick during active rest: patch the timer DOM in place. Skipping
  // the full render() preserves focus on textareas (e.g. exercise notes editor)
  // and inputs.
  if (!_patchRestTimer()) {
    render();  // fallback if the rest-timer node hasn't been mounted yet
  }
}

function flashRestDone() {
  const layer = ensureCelebrationLayer();
  // 2-second pulsing green glow — bright enough to register peripherally
  // even if you're looking at the picker. The keyframe handles the
  // fade-in / triple-pulse / fade-out timing.
  const flash = document.createElement('div');
  flash.style.cssText = `
    position:fixed;inset:0;pointer-events:none;
    background:radial-gradient(circle, rgba(34,197,94,0.55) 0%, rgba(34,197,94,0.15) 55%, rgba(34,197,94,0) 80%);
    box-shadow:inset 0 0 120px 40px rgba(34,197,94,0.45);
    animation: rest-done-flash 2000ms ease-out forwards;
  `;
  layer.appendChild(flash);
  setTimeout(() => flash.remove(), 2050);
  // Brief "GO!" centered
  const go = document.createElement('div');
  go.style.cssText = `
    position:absolute;left:50%;top:50%;
    font-size:64px;font-weight:900;font-family:'Impact','Helvetica Neue',sans-serif;
    color:#16a34a;letter-spacing:0.02em;
    text-shadow:3px 3px 0 #000, 0 0 18px rgba(22,163,74,0.5);
    animation: rest-done-go 900ms cubic-bezier(.2,.8,.3,1) forwards;
  `;
  go.textContent = 'GO!';
  layer.appendChild(go);
  setTimeout(() => go.remove(), 1000);
  // Mobile haptic if available — buzz on first beat + a subtle echo at ~1s
  try {
    navigator.vibrate && navigator.vibrate([120, 250, 80]);
  } catch (_) {}
}

function skipRest() {
  clearInterval(restInterval); restInterval = null;
  state.resting = false; state.restLeft = 0; state.restEndAt = 0;
  state.restPaused = false;
  _persistRestState();
  render();
}

// Pause / resume the rest countdown. When pausing we freeze restLeft and clear
// restEndAt; when resuming we rebase endAt = now + restLeft * 1000 so tickRest
// keeps draining naturally.
function togglePauseRest() {
  if (!state.resting) return;
  if (state.restPaused) {
    state.restPaused = false;
    state.restEndAt = Date.now() + state.restLeft * 1000;
  } else {
    state.restPaused = true;
    state.restLeft = Math.max(0, Math.ceil((state.restEndAt - Date.now()) / 1000));
    state.restEndAt = 0;
  }
  _persistRestState();
  render();
}

// Bump the remaining rest time by `secs` seconds. Updates restEndAt while
// running, or restLeft directly while paused. restDur grows with the bump
// so the progress-bar denominator stays sensible (otherwise +15 to a 60s
// timer with 5s left would show 100% fill immediately on resume).
function addRestSeconds(secs) {
  if (!state.resting) return;
  if (state.restPaused) {
    state.restLeft = Math.max(0, state.restLeft + secs);
  } else {
    state.restEndAt = Math.max(Date.now(), state.restEndAt + secs * 1000);
    state.restLeft = Math.max(0, Math.ceil((state.restEndAt - Date.now()) / 1000));
  }
  state.restDur = Math.max(state.restDur || 0, state.restLeft);
  _persistRestState();
  if (!_patchRestTimer()) render();
}

// Re-sync immediately when tab regains focus (mobile bg throttling).
function _resyncTimers() {
  if (state.resting) tickRest();
  if (state.running) tickTimer();
}

document.addEventListener('visibilitychange', () => { if (!document.hidden) _resyncTimers(); });
window.addEventListener('focus', _resyncTimers);
