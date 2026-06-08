// Celebration Animations logic for Workout Tracker

function ceMakeEl(tag, parent, style, text) {
  const el = document.createElement(tag);
  if (style) el.style.cssText = style;
  if (text != null) el.textContent = text;
  parent.appendChild(el);
  return el;
}

function ceCleanup(el, ms) { setTimeout(() => el.remove(), ms); }
function ceRand(min, max) { return Math.random() * (max - min) + min; }
function cePick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// 1. Confetti burst from center
function ceConfetti(layer) {
  const colors = ['#ef4444','#f59e0b','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899','#06b6d4'];
  for (let i = 0; i < 50; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = ceRand(120, 320);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist + 60; // bias downward (gravity)
    const size = ceRand(6, 12);
    const p = ceMakeEl('div', layer, `
      left:50%;top:50%;width:${size}px;height:${size * 0.5}px;background:${cePick(colors)};
      border-radius:2px;--dx:${dx}px;--dy:${dy}px;--rot:${ceRand(180, 720)}deg;
      animation: ce-confetti ${ceRand(900, 1500)}ms cubic-bezier(.2,.6,.3,1) forwards;
    `);
    ceCleanup(p, 1600);
  }
}

// 2. Emoji rain from top
function ceEmojiRain(layer) {
  const emojis = ['💪','🔥','👏','🎉','⭐','🚀','💥','🏋️','✨','🥇'];
  for (let i = 0; i < 28; i++) {
    const e = ceMakeEl('div', layer, `
      left:${ceRand(0, 100)}%;top:0;font-size:${ceRand(20, 36)}px;
      animation: ce-fall ${ceRand(1400, 2400)}ms linear forwards;
      animation-delay:${ceRand(0, 600)}ms;
    `, cePick(emojis));
    ceCleanup(e, 3200);
  }
}

// 3. Screen shake
function ceShake(_layer) {
  document.body.classList.add('ce-shaking');
  setTimeout(() => document.body.classList.remove('ce-shaking'), 600);
}

// 4. Big bold "BOOM!" text
function ceBigText(layer) {
  const words = ['BOOM!','NICE!','BEAST!','LEGEND','CRUSHED IT','💯','LFG!','LET\'S GO','HUGE!','DONE!'];
  const colors = ['#fbbf24','#f97316','#ef4444','#22c55e','#3b82f6','#a855f7','#ec4899'];
  const el = ceMakeEl('div', layer, `
    position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    font-size:14vw;font-weight:900;font-family:'Impact','Helvetica Neue',sans-serif;
    color:${cePick(colors)};text-shadow:4px 4px 0 #000,8px 8px 0 rgba(0,0,0,0.2);
    letter-spacing:-0.02em;white-space:nowrap;
    animation: ce-bigtext 1.4s cubic-bezier(.2,.8,.3,1) forwards;
  `, cePick(words));
  ceCleanup(el, 1500);
}

// 5. Comic speech bubble
function ceSpeechBubble(layer) {
  const lines = ['POW!','ZAP!','BAM!','WHAM!','KABOOM!','OOMPH!','SLAM!','SMASH!','BLAST!','POW POW!'];
  const el = ceMakeEl('div', layer, `
    position:absolute;left:50%;top:50%;
    background:#fde047;color:#7c2d12;padding:18px 32px;
    border:4px solid #000;border-radius:50% / 38%;
    font-size:42px;font-weight:900;font-family:'Impact','Comic Sans MS',sans-serif;
    box-shadow:6px 6px 0 #000;letter-spacing:0.04em;
    animation: ce-bubble 1.5s cubic-bezier(.2,.8,.3,1) forwards;
  `, cePick(lines));
  ceCleanup(el, 1600);
}

// 6. Fireworks (3 bursts)
function ceFireworks(layer) {
  const starColors = ['#fbbf24','#ef4444','#22c55e','#3b82f6','#ec4899','#06b6d4'];
  for (let burst = 0; burst < 3; burst++) {
    const cx = ceRand(20, 80), cy = ceRand(20, 60); // viewport %
    setTimeout(() => {
      const color = cePick(starColors);
      for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2;
        const dist = ceRand(80, 140);
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        const p = ceMakeEl('div', layer, `
          left:${cx}%;top:${cy}%;width:8px;height:8px;background:${color};border-radius:50%;
          box-shadow:0 0 12px ${color};
          --dx:${dx}px;--dy:${dy}px;
          animation: ce-firework 900ms ease-out forwards;
        `);
        ceCleanup(p, 1000);
      }
    }, burst * 250);
  }
}

// 7. Dumbbell drops & bounces
function ceDumbbellDrop(layer) {
  const e = ceMakeEl('div', layer, `
    position:absolute;left:50%;top:50%;font-size:96px;
    animation: ce-bounce 1.6s cubic-bezier(.5,0,.5,1) forwards;
  `, cePick(['🏋️','💪','🥇','🏆']));
  ceCleanup(e, 1700);
}

// 8. Side cannons
function ceCannons(layer) {
  const colors = ['#ef4444','#f59e0b','#22c55e','#3b82f6','#a855f7','#ec4899'];
  for (let i = 0; i < 30; i++) {
    const fromLeft = i % 2 === 0;
    const dx = fromLeft ? ceRand(40, 220) : ceRand(-220, -40);
    const dy = ceRand(-160, 160);
    const size = ceRand(7, 13);
    const p = ceMakeEl('div', layer, `
      left:50%;top:50%;width:${size}px;height:${size}px;background:${cePick(colors)};border-radius:50%;
      --dx:${dx}px;--dy:${dy}px;--rot:${ceRand(180, 720)}deg;
      animation: ce-${fromLeft ? 'cannonL' : 'cannonR'} ${ceRand(900, 1400)}ms cubic-bezier(.2,.7,.3,1) forwards;
      animation-delay:${ceRand(0, 200)}ms;
    `);
    ceCleanup(p, 1700);
  }
}

// 9. (RARE 5%) Flame ring rising up + screen shake at peak + emoji rain finale
function ceFlameRing(layer) {
  for (let i = 0; i < 22; i++) {
    const dx = ceRand(-200, 200);
    const e = ceMakeEl('div', layer, `
      position:absolute;left:50%;bottom:0;font-size:${ceRand(30, 54)}px;
      --dx:${dx}px;
      animation: ce-flameUp ${ceRand(1600, 2400)}ms ease-out forwards;
      animation-delay:${ceRand(0, 500)}ms;
    `, cePick(['🔥','🔥','🔥','💥','⚡','✨']));
    ceCleanup(e, 3100);
  }
  setTimeout(() => {
    document.body.classList.add('ce-shaking');
    setTimeout(() => document.body.classList.remove('ce-shaking'), 600);
  }, 700);
  setTimeout(() => {
    for (let i = 0; i < 14; i++) {
      const e = ceMakeEl('div', layer, `
        left:${ceRand(0, 100)}%;top:0;font-size:${ceRand(22, 36)}px;
        animation: ce-fall ${ceRand(1400, 2200)}ms linear forwards;
        animation-delay:${ceRand(0, 300)}ms;
      `, cePick(['🔥','💥','⚡']));
      ceCleanup(e, 3000);
    }
  }, 1400);
}

// 10. (RAREST 4%) Slot reel — cycle, land on trophy, then confetti burst from trophy
function ceSlotReel(layer) {
  const cycle = ['🎰','💪','🔥','🏋️','💯','🏆','🥇','⚡','🚀','🎯','🏅'];
  const el = ceMakeEl('div', layer, `
    position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(0);
    font-size:120px;animation: ce-slotPop 220ms ease-out forwards;
    filter: drop-shadow(0 4px 20px rgba(245,158,11,0.5));
  `, '🎰');
  let i = 0;
  const tick = setInterval(() => {
    el.textContent = cycle[i % cycle.length];
    i++;
  }, 80);
  setTimeout(() => {
    clearInterval(tick);
    el.textContent = '🏆';
    el.style.transition = 'transform 380ms cubic-bezier(.2,1.4,.4,1)';
    el.style.transform = 'translate(-50%,-50%) scale(1.6)';
  }, 1100);
  setTimeout(() => {
    const colors = ['#fbbf24','#ef4444','#22c55e','#3b82f6','#a855f7','#ec4899','#f59e0b'];
    for (let k = 0; k < 60; k++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = ceRand(140, 360);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist + 50;
      const size = ceRand(7, 13);
      const p = ceMakeEl('div', layer, `
        left:50%;top:50%;width:${size}px;height:${size * 0.5}px;background:${cePick(colors)};
        border-radius:2px;--dx:${dx}px;--dy:${dy}px;--rot:${ceRand(180, 720)}deg;
        animation: ce-confetti ${ceRand(1000, 1700)}ms cubic-bezier(.2,.6,.3,1) forwards;
      `);
      ceCleanup(p, 1800);
    }
  }, 1550);
  setTimeout(() => {
    el.style.transition = 'transform 500ms ease-in, opacity 500ms ease-in';
    el.style.transform = 'translate(-50%,-65%) scale(1.3)';
    el.style.opacity = '0';
  }, 2400);
  ceCleanup(el, 3200);
}
