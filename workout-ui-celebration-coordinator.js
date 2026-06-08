// Celebration Coordinator logic for Workout Tracker

function ensureCelebrationLayer() {
  let layer = document.getElementById('celebration-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'celebration-layer';
    document.body.appendChild(layer);
  }
  return layer;
}

const CELEBRATION_VARIANTS = [
  'Confetti', 'Emoji rain', 'Screen shake', 'Big text', 'Speech bubble',
  'Fireworks', 'Dumbbell drop', 'Side cannons', 'Flame ring', 'Slot reel',
];
// Common ↔ rare/cool. Higher weight = more frequent.
// Tuned so screen-shake/emoji-rain/confetti are normal (~15% each) and
// slot-reel/flame-ring are the rarest "wow" payoffs (~4-5%).
const CELEBRATION_WEIGHTS = [15, 15, 16, 9, 9, 7, 13, 7, 5, 4]; // sum ~100

function weightedPick(weights, exclude) {
  let total = 0;
  for (let i = 0; i < weights.length; i++) if (i !== exclude) total += weights[i];
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    if (i === exclude) continue;
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function runCelebration(exIdx) {
  const sid = state.sessionId || 'tmp';
  const key = `${sid}-${exIdx}`;
  if (!state.celebrations) state.celebrations = {};
  if (state.celebrations[key]) return;
  state.celebrations[key] = true;
  playCelebration();
}

function playCelebration(idx) {
  const layer = ensureCelebrationLayer();
  const variants = [
    ceConfetti, ceEmojiRain, ceShake, ceBigText, ceSpeechBubble,
    ceFireworks, ceDumbbellDrop, ceCannons, ceFlameRing, ceSlotReel,
  ];
  let pick;
  if (idx == null) {
    pick = weightedPick(CELEBRATION_WEIGHTS, state._lastBigCe);
    state._lastBigCe = pick;
  } else {
    pick = idx % variants.length;
  }
  try { variants[pick](layer); } catch (e) { console.warn('[celebration]', e); }
}
// Expose for console testing
window.playCelebration = playCelebration;

// ----- Per-set subtle animations -----
const SET_VARIANTS = [
  'Pulse ring','Mini burst','+reps popup','Check pop','Ripple wave',
  'Sparkle trio','Pop & shrink','Up arrow','Star burst','Color flash',
];
const SET_WEIGHTS = [18, 17, 15, 13, 8, 7, 4, 5, 3, 10];

function runSetCelebration(rect, reps) {
  if (!rect) return;
  const layer = ensureCelebrationLayer();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const variants = [setPulseRing, setMiniBurst, setRepsPopup, setCheckPop, setRipple,
                    setSparkleTrio, setPopShrink, setUpArrow, setStarBurst, setFlash];
  const pick = weightedPick(SET_WEIGHTS, state._lastSetAnim);
  state._lastSetAnim = pick;
  try { variants[pick](layer, x, y, reps); } catch (e) { console.warn('[setCe]', e); }
}

function playSetCelebration(idx) {
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const layer = ensureCelebrationLayer();
  const variants = [setPulseRing, setMiniBurst, setRepsPopup, setCheckPop, setRipple,
                    setSparkleTrio, setPopShrink, setUpArrow, setStarBurst, setFlash];
  const pick = (idx == null) ? weightedPick(SET_WEIGHTS) : (idx % variants.length);
  try { variants[pick](layer, cx, cy, 10); } catch (e) { console.warn('[setCe]', e); }
}
window.playSetCelebration = playSetCelebration;

function setPulseRing(layer, x, y) {
  const c = '#22c55e';
  const e = ceMakeEl('div', layer, `
    position:absolute;left:${x}px;top:${y}px;width:42px;height:42px;border-radius:50%;
    border:3px solid ${c};
    animation: set-ring 1100ms ease-out forwards;
  `);
  ceCleanup(e, 1200);
}

function setMiniBurst(layer, x, y) {
  const colors = ['#22c55e','#3b82f6','#f59e0b','#ec4899'];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 + ceRand(-0.3, 0.3);
    const dist = ceRand(36, 64);
    const dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist;
    const e = ceMakeEl('div', layer, `
      position:absolute;left:${x}px;top:${y}px;width:7px;height:7px;background:${cePick(colors)};border-radius:50%;
      --dx:${dx}px;--dy:${dy}px;
      animation: set-mini-burst 950ms cubic-bezier(.2,.8,.3,1) forwards;
    `);
    ceCleanup(e, 1050);
  }
}

function setRepsPopup(layer, x, y, reps) {
  const e = ceMakeEl('div', layer, `
    position:absolute;left:${x}px;top:${y - 18}px;
    font-size:16px;font-weight:800;color:#15803d;
    text-shadow:0 1px 2px rgba(255,255,255,0.95), 0 0 10px rgba(34,197,94,0.5);
    animation: set-popup-up 1100ms cubic-bezier(.2,.8,.3,1) forwards;
  `, `+${reps}`);
  ceCleanup(e, 1200);
}

function setCheckPop(layer, x, y) {
  const e = ceMakeEl('div', layer, `
    position:absolute;left:${x}px;top:${y}px;
    font-size:34px;color:#22c55e;font-weight:900;
    text-shadow:0 1px 3px rgba(255,255,255,0.95), 0 0 12px rgba(34,197,94,0.4);
    animation: set-check 900ms cubic-bezier(.2,.8,.3,1) forwards;
  `, '✓');
  ceCleanup(e, 1000);
}

function setRipple(layer, x, y) {
  for (let i = 0; i < 2; i++) {
    const e = ceMakeEl('div', layer, `
      position:absolute;left:${x}px;top:${y}px;width:32px;height:32px;border-radius:50%;
      background:radial-gradient(circle, rgba(34,197,94,0.45) 0%, rgba(34,197,94,0) 70%);
      animation: set-ripple 1100ms ease-out forwards;
      animation-delay:${i * 220}ms;
    `);
    ceCleanup(e, 1400);
  }
}

function setSparkleTrio(layer, x, y) {
  const offsets = [[-26, -20], [26, -20], [0, 28]];
  for (const [dx, dy] of offsets) {
    const e = ceMakeEl('div', layer, `
      position:absolute;left:${x}px;top:${y}px;
      font-size:18px;
      --dx:${dx}px;--dy:${dy}px;
      animation: set-sparkle 1100ms cubic-bezier(.2,.8,.3,1) forwards;
      animation-delay:${ceRand(0, 120)}ms;
    `, '✨');
    ceCleanup(e, 1300);
  }
}

function setPopShrink(layer, x, y) {
  const e = ceMakeEl('div', layer, `
    position:absolute;left:${x}px;top:${y}px;width:48px;height:48px;border-radius:50%;
    background:radial-gradient(circle, #4ade80 0%, #22c55e 70%);
    box-shadow:0 0 18px rgba(34,197,94,0.6);
    animation: set-pop-shrink 900ms cubic-bezier(.4,0,.2,1) forwards;
  `);
  ceCleanup(e, 1000);
  setTimeout(() => setSparkleTrio(layer, x, y), 480);
}

function setUpArrow(layer, x, y) {
  const e = ceMakeEl('div', layer, `
    position:absolute;left:${x}px;top:${y - 10}px;
    font-size:22px;font-weight:800;color:#3b82f6;
    text-shadow:0 1px 3px rgba(255,255,255,0.95), 0 0 10px rgba(59,130,246,0.4);
    animation: set-arrow-up 1100ms cubic-bezier(.3,.9,.4,1) forwards;
  `, '↑');
  ceCleanup(e, 1200);
}

function setStarBurst(layer, x, y) {
  const ring = ceMakeEl('div', layer, `
    position:absolute;left:${x}px;top:${y}px;width:38px;height:38px;border-radius:50%;
    border:2px solid #f59e0b;box-shadow:0 0 14px rgba(245,158,11,0.7);
    animation: set-ring 900ms ease-out forwards;
  `);
  ceCleanup(ring, 1000);
  const star = ceMakeEl('div', layer, `
    position:absolute;left:${x}px;top:${y}px;
    font-size:34px;color:#f59e0b;
    text-shadow:0 0 14px rgba(245,158,11,0.85);
    animation: set-star 1000ms cubic-bezier(.2,.8,.3,1) forwards;
    animation-delay:120ms;opacity:0;
  `, '★');
  ceCleanup(star, 1300);
  setTimeout(() => {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = ceRand(40, 70);
      const dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist;
      const sp = ceMakeEl('div', layer, `
        position:absolute;left:${x}px;top:${y}px;font-size:12px;
        --dx:${dx}px;--dy:${dy}px;
        animation: set-sparkle 900ms cubic-bezier(.2,.8,.3,1) forwards;
      `, cePick(['✨','⭐','✦']));
      ceCleanup(sp, 1000);
    }
  }, 350);
}

function setFlash(layer, x, y) {
  const c = cePick(['#22c55e','#3b82f6','#f59e0b','#a855f7']);
  for (let i = 0; i < 2; i++) {
    const e = ceMakeEl('div', layer, `
      position:absolute;left:${x}px;top:${y}px;width:38px;height:38px;border-radius:50%;
      background:${c};opacity:0;
      animation: set-flash 900ms ease-out forwards;
      animation-delay:${i * 200}ms;
    `);
    ceCleanup(e, 1200);
  }
}
