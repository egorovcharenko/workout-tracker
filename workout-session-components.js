var { useState, useEffect, useRef } = React;

// ─────────────────────────────────────────────────────────────────────────────
// UI primitives & Presentation Components
// ─────────────────────────────────────────────────────────────────────────────

function Header({ workout, workouts, onPickWorkout, done, total, elapsedSec }) {
  const pct = total ? (done / total) * 100 : 0;
  const m = Math.floor(elapsedSec / 60);
  const s = String(elapsedSec % 60).padStart(2, "0");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!e.target.closest || !e.target.closest("[data-workout-menu]")) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  return (
    <div style={{ background: T.page, padding: "14px 18px 14px", position: "sticky", top: 0, zIndex: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <a href="/" style={{ color: T.accent, fontSize: 16, fontWeight: 600, textDecoration: "none", flexShrink: 0 }} title="Home">← Back</a>
          <div data-workout-menu style={{ position: "relative", minWidth: 0 }}>
            <button onClick={() => setOpen(o => !o)} style={{
              background: "transparent", border: 0, color: T.strong,
              fontSize: 17, fontWeight: 700, letterSpacing: -0.3,
              padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              maxWidth: "100%",
            }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{workout.name}</span>
              <span style={{ color: T.faint, fontSize: 12, transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 160ms ease" }}>▾</span>
            </button>
            {open && (
              <div style={{
                position: "absolute", top: "100%", left: 0, marginTop: 6,
                background: "#0f1722", border: `1px solid ${T.cardBorder}`,
                borderRadius: 10, padding: 4, minWidth: 200, zIndex: 10,
                boxShadow: "0 10px 30px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
              }}>
                {workouts.map(w => {
                  const sel = w.id === workout.id;
                  return (
                    <button key={w.id} onClick={() => { setOpen(false); onPickWorkout(w.id); }} style={{
                      display: "block", width: "100%", textAlign: "left",
                      background: sel ? "rgba(59,130,246,0.12)" : "transparent",
                      border: 0,
                      color: sel ? T.accentLight : T.text,
                      fontSize: 14, fontWeight: sel ? 700 : 500,
                      padding: "9px 12px", borderRadius: 7, cursor: "pointer",
                    }}>
                      {w.name}
                      <span style={{ marginLeft: 8, color: T.faint, fontSize: 11, fontWeight: 500 }}>{w.duration}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ color: T.faint, fontFamily: T.mono, fontSize: 12, fontWeight: 600 }}>{done}/{total}</span>
          <span style={{ color: elapsedSec > 0 ? T.green : T.faint, fontFamily: T.mono, fontWeight: 700, fontSize: 15 }}>{m}:{s}</span>
        </div>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: T.accent, borderRadius: 99, transition: "width 240ms ease" }} />
      </div>
    </div>
  );
}

function WarmupCallout({ text }) {
  return (
    <div style={{
      margin: "10px 16px 12px",
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid rgba(217,119,6,0.3)",
      background: "rgba(217,119,6,0.04)",
      display: "flex", gap: 9, alignItems: "center",
    }}>
      <span style={{ fontSize: 13 }}>🔥</span>
      <div style={{ fontSize: 13, lineHeight: 1.35, color: T.amberMuted }}>
        <strong style={{ color: T.amber, fontWeight: 700 }}>Warm-up · </strong>
        {text}
      </div>
    </div>
  );
}

function StepperBtn({ children, onClick, big, dim }) {
  const press = (e, val) => { e.currentTarget.style.transform = val; };
  return (
    <button
      onClick={onClick}
      onMouseDown={e => press(e, "scale(0.92)")}
      onMouseUp={e => press(e, "scale(1)")}
      onMouseLeave={e => press(e, "scale(1)")}
      onTouchStart={e => press(e, "scale(0.92)")}
      onTouchEnd={e => press(e, "scale(1)")}
      style={{
        width: big ? 52 : 40, height: big ? 52 : 40, borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: dim ? T.faint : "#D1D5DB",
        fontFamily: T.mono, fontWeight: 600, fontSize: big ? 22 : 14,
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, lineHeight: 1,
        transition: "transform 80ms ease, background 120ms ease",
      }}
    >{children}</button>
  );
}

function WeightStepper({ value, last, pr, onPick, label }) {
  const v = value ?? last ?? 0;
  const step = (delta) => onPick(Math.max(0, Math.round((v + delta) * 10) / 10));
  const atLast = last != null && v === last;
  const diff = last != null ? v - last : 0;
  return (
    <div style={{ marginTop: 14 }}>
      {label && (
        <div style={{ marginBottom: 6, color: T.muted, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.6 }}>
          {label}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <StepperBtn onClick={() => step(-5)} big>−</StepperBtn>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ color: T.strong, fontFamily: T.mono, fontSize: 36, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>{v}</span>
            <span style={{ color: T.faint, fontFamily: T.mono, fontSize: 14, fontWeight: 600 }}>lb</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: T.mono, fontSize: 11, color: T.faint }}>
            {last != null && (
              <button onClick={() => onPick(last)} style={{
                background: atLast ? "rgba(96,165,250,0.10)" : "transparent",
                border: atLast ? `1px solid rgba(96,165,250,0.3)` : "1px dashed rgba(255,255,255,0.1)",
                color: atLast ? T.accentLight : T.faint,
                fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                padding: "3px 7px", borderRadius: 5, cursor: "pointer",
              }}>LAST {last}</button>
            )}
            {!atLast && diff !== 0 && (
              <span style={{ color: diff > 0 ? T.green : T.red, fontWeight: 700 }}>
                {diff > 0 ? "+" : ""}{diff}
              </span>
            )}
            {pr != null && <span>· PR {pr}</span>}
          </div>
        </div>
        <StepperBtn onClick={() => step(5)} big>+</StepperBtn>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 8 }}>
        <StepperBtn onClick={() => step(-2.5)} dim>−2.5</StepperBtn>
        <StepperBtn onClick={() => step(2.5)} dim>+2.5</StepperBtn>
      </div>
    </div>
  );
}

function GripSelector({ grips, selected, last, onPick }) {
  if (!grips || grips.length === 0) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: T.muted, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.6 }}>GRIP</span>
        {last && last !== selected && (
          <button onClick={() => onPick(last)} style={{ background: "transparent", border: 0, color: T.accentLight, fontFamily: T.mono, fontSize: 11, fontWeight: 700, padding: 0, cursor: "pointer" }}>
            use last: {last}
          </button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${grips.length}, 1fr)`, gap: 6 }}>
        {grips.map(g => {
          const sel = g.id === selected;
          const wasLast = g.id === last;
          return (
            <button key={g.id} onClick={() => onPick(g.id)} style={{
              position: "relative",
              background: sel ? "rgba(96,165,250,0.18)" : "rgba(255,255,255,0.03)",
              border: sel ? `1px solid ${T.accentLight}` : "1px solid rgba(255,255,255,0.08)",
              color: sel ? "#DBEAFE" : T.muted,
              padding: "9px 4px 8px", borderRadius: 8, cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              transition: "all 120ms ease",
            }}>
              {wasLast && (
                <span style={{ position: "absolute", top: 4, left: 5, width: 5, height: 5, borderRadius: "50%", background: T.accentLight }} />
              )}
              <span style={{ fontSize: 13, fontWeight: 700 }}>{g.label}</span>
              <span style={{ fontSize: 9, color: sel ? T.muted : T.faint, fontFamily: T.mono, letterSpacing: 0.4, textTransform: "uppercase" }}>{g.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BandsGrid({ bands, lastBands, onToggle, onClear, isAssist }) {
  const total = bands.reduce((a, b) => a + b, 0);
  const showUseLast = lastBands.length > 0 && !(lastBands.length === bands.length && lastBands.every(b => bands.includes(b)));
  const bandValues = [5, 15, 20, 30, 35]; // yellow, green, red, blue, black

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: T.muted, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.6 }}>
          {isAssist ? "ASSISTANCE" : "BANDS"} <span style={{ color: T.faint, fontWeight: 500 }}>· tap to add</span>
        </span>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {showUseLast && (
            <button onClick={() => onToggle("__use_last__")} style={{ background: "transparent", border: 0, color: T.bands, fontFamily: T.mono, fontSize: 11, fontWeight: 700, padding: 0, cursor: "pointer" }}>
              use last: {lastBands.join("+")}
            </button>
          )}
          {bands.length > 0 && (
            <button onClick={onClear} style={{ background: "transparent", border: 0, color: T.faint, fontSize: 11, padding: 0, cursor: "pointer" }}>clear</button>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
        {bandValues.map(v => {
          const sel = bands.includes(v);
          const wasLast = lastBands.includes(v);
          return (
            <button key={v} onClick={() => onToggle(v)} style={{
              position: "relative",
              background: sel ? "rgba(192,132,252,0.18)" : "rgba(255,255,255,0.03)",
              border: sel ? `1px solid ${T.bands}` : "1px solid rgba(255,255,255,0.08)",
              color: sel ? T.bandsText : T.muted,
              fontFamily: T.mono, fontWeight: 700, fontSize: 13,
              padding: "9px 0", borderRadius: 8, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 120ms ease",
            }}>
              {wasLast && (
                <span style={{ position: "absolute", top: 4, left: 5, width: 5, height: 5, borderRadius: "50%", background: T.bands }} />
              )}
              {v}
            </button>
          );
        })}
      </div>
      {bands.length > 0 && (
        <div style={{ marginTop: 8, color: T.bands, fontFamily: T.mono, fontSize: 11, opacity: 0.85 }}>
          {bands.join(" + ")} = {isAssist ? "−" : "+"}{total}lb
        </div>
      )}
    </div>
  );
}

function RepCell({ n, inRange, isLast, isLogged, onClick }) {
  let bg = "transparent";
  let color = inRange ? "#D1D5DB" : T.faint;
  let border = "1px solid transparent";
  if (inRange) {
    bg = "rgba(34,197,94,0.05)";
    border = "1px solid rgba(34,197,94,0.18)";
  }
  if (isLast) {
    border = "1.5px solid rgba(34,197,94,0.55)";
    color = "#86EFAC";
  }
  if (isLogged) {
    bg = "#22C55E";
    border = "1px solid #22C55E";
    color = T.inv;
  }
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative", width: 38, height: 44, borderRadius: 9,
        background: bg, border, color,
        fontFamily: T.mono, fontWeight: isLogged || isLast ? 800 : 600, fontSize: 14,
        cursor: "pointer", flexShrink: 0,
        transition: "transform 80ms ease, background 120ms ease",
        animation: isLogged ? "set-pulse 320ms ease-out" : "none",
      }}
      onMouseDown={e => (e.currentTarget.style.transform = "scale(0.92)")}
      onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
    >
      {isLast && !isLogged && (
        <span style={{ position: "absolute", top: 4, left: 5, width: 5, height: 5, borderRadius: "50%", background: "#22C55E" }} />
      )}
      {n}
    </button>
  );
}

function RepStrip({ min = 1, max = 20, range, last, logged, onLog }) {
  const [lo, hi] = range || [];
  const ref = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: true });
  const updateEdges = () => {
    const el = ref.current; if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdges(p => (p.left === left && p.right === right ? p : { left, right }));
  };
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const target = el.querySelector(`[data-n="${logged ?? last ?? lo ?? min}"]`);
    if (target) {
      const left = target.offsetLeft - el.clientWidth / 2 + target.clientWidth / 2;
      el.scrollTo({ left, behavior: "instant" });
    }
    updateEdges();
  }, []);
  const fadePx = 28;
  const maskParts = [
    edges.left ? `transparent 0, black ${fadePx}px` : `black 0`,
    edges.right ? `black calc(100% - ${fadePx}px), transparent 100%` : `black 100%`,
  ];
  const maskImage = `linear-gradient(to right, ${maskParts.join(", ")})`;
  return (
    <div style={{ position: "relative", marginTop: 6 }}>
      <div
        ref={ref}
        onScroll={updateEdges}
        className="scroll-row"
        style={{
          display: "flex", gap: 5, overflowX: "auto",
          padding: "8px 4px 6px",
          WebkitOverflowScrolling: "touch",
          WebkitMaskImage: maskImage, maskImage,
        }}
      >
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(n => {
          const inRange = lo != null && n >= lo && n <= hi;
          return (
            <div key={n} data-n={n}>
              <RepCell n={n} inRange={inRange} isLast={last === n && logged !== n} isLogged={logged === n} onClick={() => onLog(n)} />
            </div>
          );
        })}
      </div>
      <div aria-hidden style={{
        position: "absolute", left: 2, top: "50%", transform: "translateY(-50%)",
        width: 22, height: 22, borderRadius: 11,
        background: "rgba(17,24,39,0.92)", border: "1px solid #374151",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#D1D5DB", fontSize: 14, fontWeight: 800, fontFamily: T.mono, lineHeight: 1,
        opacity: edges.left ? 1 : 0, transition: "opacity 160ms ease",
        pointerEvents: "none", animation: edges.left ? "repNudgeL 2.4s ease-in-out infinite" : "none",
      }}>‹</div>
      <div aria-hidden style={{
        position: "absolute", right: 2, top: "50%", transform: "translateY(-50%)",
        width: 22, height: 22, borderRadius: 11,
        background: "rgba(17,24,39,0.92)", border: "1px solid #374151",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#D1D5DB", fontSize: 14, fontWeight: 800, fontFamily: T.mono, lineHeight: 1,
        opacity: edges.right ? 1 : 0, transition: "opacity 160ms ease",
        pointerEvents: "none", animation: edges.right ? "repNudgeR 2.4s ease-in-out infinite" : "none",
      }}>›</div>
    </div>
  );
}

function ActiveSetBlock({ exercise, set, totalWork, totalWarmup, warmupPos, onPickWeight, onPickBodyweight, onPickGrip, onToggleBand, onClearBands, onLogReps, onSkipWarmup, onApplyLast }) {
  const isBW = exercise.mode === "bodyweight";
  const bands = set.bands || [];
  const lastBands = set.lastBands || [];
  const baseW = isBW ? (set.bodyweight || 0) : set.weight;
  const lastBaseW = isBW ? (set.lastBodyweight || 0) : (set.lastWeight || 0);
  const bandTotal = bands.reduce((a, b) => a + b, 0);
  const lastBandTotal = lastBands.reduce((a, b) => a + b, 0);
  const lastTotal = isBW ? Math.max(0, lastBaseW - lastBandTotal) : (lastBaseW + lastBandTotal);

  const matchesLast =
    (set.lastReps != null) &&
    baseW === lastBaseW &&
    (!exercise.grips || set.grip === set.lastGrip) &&
    bands.length === lastBands.length &&
    bands.every(b => lastBands.includes(b));

  const hasLast = set.lastWeight != null || set.lastBodyweight != null || set.lastReps != null;
  const range = (() => {
    const m = String(exercise.repRange || "").match(/(\d+)\D+(\d+)/);
    return m ? [parseInt(m[1]), parseInt(m[2])] : null;
  })();

  return (
    <div style={{
      borderRadius: 12,
      background: "linear-gradient(180deg, rgba(59,130,246,0.08), rgba(17,24,39,0.55))",
      boxShadow: "0 0 0 1px rgba(96,165,250,0.35), 0 8px 24px -8px rgba(59,130,246,0.4)",
      padding: "14px 14px 16px",
      marginTop: 14, marginBottom: 6,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, gap: 10 }}>
        {set.kind === "warmup" ? (
          <span style={{ color: T.amber, fontWeight: 700, fontSize: 17, letterSpacing: -0.2 }}>
            Warm-up
            {totalWarmup > 1 && (
              <>
                <span style={{ fontFamily: T.mono }}> {warmupPos}</span>
                <span style={{ color: T.faint, fontWeight: 500 }}> of {totalWarmup}</span>
              </>
            )}
          </span>
        ) : (
          <span style={{ color: T.strong, fontWeight: 700, fontSize: 17, letterSpacing: -0.2 }}>
            Set <span style={{ fontFamily: T.mono }}>{set.idx}</span>
            {totalWork > 0 && <span style={{ color: T.faint, fontWeight: 500 }}> of {totalWork}</span>}
          </span>
        )}
      </div>

      {hasLast && (
        <button
          onClick={onApplyLast}
          disabled={matchesLast}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 10, padding: "9px 12px",
            background: matchesLast ? "rgba(96,165,250,0.08)" : "rgba(59,130,246,0.06)",
            border: matchesLast ? "1px solid rgba(96,165,250,0.35)" : "1px dashed rgba(96,165,250,0.45)",
            borderRadius: 10,
            cursor: matchesLast ? "default" : "pointer",
            color: T.accentLight, marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, fontFamily: T.mono, opacity: 0.75 }}>LAST</span>
            <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: "#DBEAFE" }}>
              {lastBaseW || "—"}
              {lastBands.length > 0 && (
                <span style={{ color: T.bands }}> {isBW ? "−" : "+"} {lastBands.join("+")}</span>
              )}
              <span style={{ color: T.faint, fontWeight: 500 }}> × </span>
              {set.lastReps || "—"}
              {isBW && set.lastGrip && <span style={{ color: T.muted, fontWeight: 500 }}> · {GRIP_LABELS[set.lastGrip]?.label || set.lastGrip}</span>}
            </span>
            {lastBandTotal > 0 && (
              <span style={{ color: T.faint, fontFamily: T.mono, fontSize: 11 }}>({lastTotal}lb)</span>
            )}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, opacity: matchesLast ? 0.7 : 1 }}>
            {matchesLast ? "✓ matched" : "use last"}
          </span>
        </button>
      )}

      {exercise.grips && (
        <GripSelector
          grips={exercise.grips}
          selected={set.grip}
          last={set.lastGrip}
          onPick={onPickGrip}
        />
      )}

      {!exercise.isBandsOnly && (
        <WeightStepper
          value={baseW}
          last={lastBaseW || null}
          onPick={isBW ? onPickBodyweight : onPickWeight}
          label={isBW ? "BODYWEIGHT" : null}
        />
      )}

      {(exercise.isBandsOnly || exercise.bandAddon || exercise.assist) && (
        <BandsGrid
          bands={bands}
          lastBands={lastBands}
          onToggle={onToggleBand}
          onClear={onClearBands}
          isAssist={exercise.assist}
        />
      )}

      <div style={{ marginTop: 14 }}>
        <RepStrip
          min={1} max={20}
          range={range}
          last={set.lastReps}
          logged={set.reps}
          onLog={onLogReps}
        />
      </div>

      {set.kind === "warmup" && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={onSkipWarmup} style={{
            background: "transparent", border: 0, color: "#A1A1AA",
            fontFamily: "inherit", fontWeight: 500, fontSize: 13, padding: "4px 0", cursor: "pointer",
          }}>Skip warmup →</button>
        </div>
      )}
    </div>
  );
}

function RestTimer({ rest, onAdd, onSkip, onToggle }) {
  const { left, total, paused, kind } = rest;
  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, "0");
  const pct = total > 0 ? (1 - left / total) * 100 : 100;
  const done = left === 0;
  const accent = done ? T.green : kind === "warmup" ? T.amber : T.accentLight;
  const accentBg = done ? "rgba(52,211,153,0.10)" : kind === "warmup" ? "rgba(251,191,36,0.10)" : "rgba(96,165,250,0.10)";
  const ghostBtn = {
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${accent}40`,
    color: accent,
    fontFamily: T.mono, fontSize: 11, fontWeight: 700,
    padding: "6px 10px", borderRadius: 7, cursor: "pointer", letterSpacing: 0.3,
  };
  return (
    <div style={{
      marginTop: 12, borderRadius: 12,
      background: accentBg, border: `1px solid ${accent}55`,
      padding: "12px 14px 10px", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`,
        background: `linear-gradient(90deg, ${accent}30, ${accent}14)`,
        transition: "width 1s linear",
      }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          <span style={{ color: accent, fontSize: 9, fontWeight: 800, letterSpacing: 0.8, fontFamily: T.mono }}>
            {done ? "REST DONE" : paused ? "REST · PAUSED" : "REST"}
          </span>
          <span style={{ color: T.strong, fontFamily: T.mono, fontSize: 28, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.05 }}>
            {m}:{s}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button onClick={() => onAdd(15)} style={ghostBtn}>+15s</button>
          <button onClick={onToggle} style={{ ...ghostBtn, minWidth: 32 }}>{paused ? "▶" : "❚❚"}</button>
          <button onClick={onSkip} style={{ ...ghostBtn, background: accent, color: T.inv, borderColor: accent }}>
            {done ? "✓ next" : "skip"}
          </button>
        </div>
      </div>
    </div>
  );
}

function setStripLabel(s, allSets) {
  if (s.kind === "warmup") {
    const warmups = allSets.filter(x => x.kind === "warmup");
    if (warmups.length > 1) {
      const n = warmups.indexOf(s) + 1;
      return `W${n}`;
    }
    return "WARM";
  }
  return `SET ${s.idx}`;
}

function ExerciseCard({ exercise, supersetTag, rest, onRestAdd, onRestSkip, onRestToggle, onPickWeight, onPickBodyweight, onPickGrip, onToggleBand, onClearBands, onLogReps, onSkipWarmup, onSkipExercise, onSwapExercise, onReopenSet, onAddSet, onRemoveSet, onRemoveWarmup, motivation }) {
  const [swapOpen, setSwapOpen] = useState(false);
  const swapOptions = getSwapOptions(exercise.name);

  if (exercise.skipped) {
    return (
      <div style={{
        margin: "0 16px 12px", padding: "10px 14px",
        background: "rgba(255,255,255,0.015)",
        border: `1px dashed ${T.cardBorder}`,
        borderRadius: 14,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            color: T.muted, fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 1.0,
            padding: "2px 6px", borderRadius: 4,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}>× SKIPPED</span>
          {supersetTag && (
            <span style={{
              color: T.bands, fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: 1,
              padding: "1px 5px", borderRadius: 4,
              background: "rgba(192,132,252,0.10)", opacity: 0.6, flexShrink: 0,
            }}>{supersetTag}</span>
          )}
          <span style={{
            color: T.muted, fontSize: 15, fontWeight: 600,
            textDecoration: "line-through", textDecorationColor: "rgba(156,163,175,0.4)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{exercise.name}</span>
        </div>
        <button onClick={onSkipExercise} style={{
          background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
          color: T.muted, padding: "5px 10px", borderRadius: 7,
          fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
          flexShrink: 0,
        }}>↻ restore</button>
      </div>
    );
  }

  const activeIdx = exercise.sets.findIndex(s => s.active);
  const activeSet = activeIdx >= 0 ? exercise.sets[activeIdx] : null;
  const totalWork = exercise.sets.filter(s => s.kind === "work").length;
  const warmups = exercise.sets.filter(s => s.kind === "warmup");
  const totalWarmup = warmups.length;
  const hasWarmup = totalWarmup > 0;
  const warmupActive = warmups.some(s => s.active);
  const activeWarmupPos = activeSet && activeSet.kind === "warmup" ? warmups.indexOf(activeSet) + 1 : null;
  const lastWork = [...exercise.sets].reverse().find(s => s.kind === "work");
  const canRemove = totalWork > 1 && lastWork && !lastWork.active && !lastWork.completed;
  const allDone = !activeSet && exercise.sets.every(s => s.completed);

  const renderSetCard = (s, i) => {
    const isBW = exercise.mode === "bodyweight";
    const isAssist = exercise.assist;
    const isBandsOnly = exercise.isBandsOnly;
    const baseW = isBW ? (s.bodyweight || 0) : (s.weight || 0);
    const lastBaseW = isBW ? (s.lastBodyweight || 0) : (s.lastWeight || 0);
    const bandSum = (s.bands || []).reduce((a, b) => a + b, 0);
    const lastBandSum = (s.lastBands || []).reduce((a, b) => a + b, 0);
    const totalLb = isAssist ? Math.max(0, baseW - bandSum) : (isBandsOnly ? bandSum : baseW + bandSum);
    const prev = isAssist ? Math.max(0, lastBaseW - lastBandSum) : (isBandsOnly ? lastBandSum : lastBaseW + lastBandSum);
    const wDelta = totalLb - prev;
    const rDelta = s.lastReps != null && s.reps != null ? s.reps - s.lastReps : 0;
    const isFlat = wDelta === 0 && rDelta === 0;
    const isDown = wDelta < 0 || (wDelta === 0 && rDelta < 0);
    const deltaColor = isFlat ? T.faint : isDown ? T.red : T.green;
    const deltaText = !s.completed ? "" : isFlat ? "=" : wDelta !== 0 ? `${wDelta > 0 ? "+" : ""}${wDelta}` : `${rDelta > 0 ? "+" : ""}${rDelta}r`;
    const isWarm = s.kind === "warmup";
    const isCurrent = s.active;
    const tappable = !isCurrent;
    return (
      <button key={i} onClick={tappable ? () => onReopenSet(i) : undefined} disabled={!tappable} style={{
        padding: "8px 4px 7px", borderRadius: 9,
        cursor: tappable ? "pointer" : "default",
        background: isCurrent
          ? (isWarm ? "rgba(217,119,6,0.12)" : "rgba(59,130,246,0.14)")
          : s.completed ? "rgba(255,255,255,0.03)" : "transparent",
        boxShadow: isCurrent
          ? (isWarm ? "0 0 0 1.5px rgba(251,191,36,0.55), 0 4px 14px -4px rgba(217,119,6,0.45)"
                    : "0 0 0 1.5px rgba(96,165,250,0.6), 0 4px 14px -4px rgba(59,130,246,0.5)")
          : "none",
        border: isCurrent ? "0" : `1px ${s.completed ? "solid" : "dashed"} rgba(255,255,255,0.05)`,
        opacity: isCurrent ? 1 : s.completed ? 1 : 0.45,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        minWidth: 0, transition: "all 200ms ease",
      }}>
        <span style={{ color: isWarm ? T.amber : isCurrent ? T.accentLight : T.faint, fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 0.7 }}>
          {setStripLabel(s, exercise.sets)}
        </span>
        {(() => {
          const isPreview = s.reps == null && s.lastReps != null;
          const repText = s.reps ?? s.lastReps ?? "—";
          const repColor = isPreview ? T.muted : (s.completed || isCurrent) ? T.strong : T.faint;
          return (
            <div style={{ display: "flex", alignItems: "baseline", gap: 2, fontFamily: T.mono }}>
              <span style={{ color: (s.completed || isCurrent) ? T.strong : T.faint, fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>{totalLb}</span>
              <span style={{ color: T.disabled, fontSize: 11 }}>×</span>
              <span style={{ color: repColor, fontSize: 16, fontWeight: 700, letterSpacing: -0.3, fontStyle: isPreview ? "italic" : "normal" }}>{repText}</span>
            </div>
          );
        })()}
        {s.completed ? (
          <span style={{ color: deltaColor, fontFamily: T.mono, fontSize: 10, fontWeight: 700 }}>{deltaText}</span>
        ) : isCurrent ? (
          <span style={{ color: isWarm ? T.amber : T.accentLight, fontFamily: T.mono, fontSize: 10, fontWeight: 700 }}>● now</span>
        ) : (
          <span style={{ color: T.disabled, fontFamily: T.mono, fontSize: 10 }}>up next</span>
        )}
      </button>
    );
  };

  const footerBtn = (label, onClick, disabled) => (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{
      background: "transparent",
      border: "1px solid rgba(255,255,255,0.06)",
      color: disabled ? T.disabled : T.muted,
      padding: "5px 10px", borderRadius: 7,
      cursor: disabled ? "default" : "pointer",
      fontSize: 12, fontWeight: 500,
      opacity: disabled ? 0.5 : 1,
    }}>{label}</button>
  );

  return (
    <div style={{
      margin: "0 16px 12px", padding: "14px 14px 14px",
      background: T.cardBg,
      border: `1px solid ${T.cardBorder}`,
      borderRadius: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <h2 style={{ margin: 0, color: T.strong, fontSize: 20, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.4 }}>
          {supersetTag && (
            <span style={{
              color: T.bands, fontFamily: T.mono, fontSize: 11, fontWeight: 800, letterSpacing: 1,
              marginRight: 8, padding: "2px 6px", borderRadius: 5,
              background: "rgba(192,132,252,0.12)", verticalAlign: "middle",
            }}>{supersetTag}</span>
          )}
          {exercise.name}
        </h2>
      </div>
      {exercise.note && (
        <p style={{ margin: "6px 0 0", color: T.muted, fontSize: 12, lineHeight: 1.4 }}>{exercise.note}</p>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${exercise.sets.length}, minmax(0, 1fr))`,
        gap: 6, marginTop: 12,
      }}>
        {exercise.sets.map(renderSetCard)}
      </div>

      {rest && <RestTimer rest={rest} onAdd={onRestAdd} onSkip={onRestSkip} onToggle={onRestToggle} />}

      {activeSet && (
        <ActiveSetBlock
          exercise={exercise}
          set={activeSet}
          totalWork={totalWork}
          totalWarmup={totalWarmup}
          warmupPos={activeWarmupPos}
          onPickWeight={(w) => onPickWeight(activeIdx, w)}
          onPickBodyweight={(w) => onPickBodyweight(activeIdx, w)}
          onPickGrip={(g) => onPickGrip(activeIdx, g)}
          onToggleBand={(b) => onToggleBand(activeIdx, b)}
          onClearBands={() => onClearBands(activeIdx)}
          onLogReps={(r) => onLogReps(activeIdx, r)}
          onSkipWarmup={onSkipWarmup}
          onApplyLast={() => {
            if (exercise.mode === "bodyweight") {
              onPickBodyweight(activeIdx, activeSet.lastBodyweight || 175);
              if (activeSet.lastGrip) onPickGrip(activeIdx, activeSet.lastGrip);
            } else if (!exercise.isBandsOnly) {
              onPickWeight(activeIdx, activeSet.lastWeight || 0);
            }
            onClearBands(activeIdx);
            (activeSet.lastBands || []).forEach(b => onToggleBand(activeIdx, b));
          }}
        />
      )}

      {allDone && motivation && (
        <div className="inline-motivation" style={{
          marginTop: 10, padding: "10px 12px",
          background: "linear-gradient(135deg, rgba(192,132,252,0.10), rgba(96,165,250,0.10))",
          border: "1px solid rgba(192,132,252,0.2)",
          borderRadius: 10,
          alignItems: "flex-start", gap: 9,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>✨</span>
          <span style={{ fontSize: 13, color: "#E9D5FF", lineHeight: 1.45, fontWeight: 500 }}>
            {motivation === "__loading__" ? <span style={{ opacity: 0.6 }}>thinking…</span> : motivation}
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.cardBorder}`, flexWrap: "wrap" }}>
        {footerBtn("+ set", onAddSet)}
        {footerBtn("− set", onRemoveSet, !canRemove)}
        {footerBtn("× skip exercise", onSkipExercise)}
        {swapOptions.length > 0 && (
          <div style={{ position: "relative" }}>
            {footerBtn(swapOpen ? "⇄ swap ▾" : "⇄ swap", () => setSwapOpen(o => !o))}
            {swapOpen && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 6px)", right: 0, zIndex: 50,
                background: "#111827", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 9, boxShadow: "0 10px 28px rgba(0,0,0,0.55)",
                overflow: "hidden", minWidth: 210, maxWidth: "78vw",
              }}>
                <div style={{ padding: "7px 12px 5px", color: T.faint, fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 0.8, borderBottom: `1px solid ${T.cardBorder}` }}>
                  SWAP FOR
                </div>
                {swapOptions.map(opt => (
                  <button key={opt.name} onClick={() => { setSwapOpen(false); onSwapExercise(opt.name); }} style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "9px 12px", background: "transparent", border: 0,
                    borderBottom: `1px solid ${T.cardBorder}`,
                    color: T.text, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit",
                  }}>{opt.name}</button>
                ))}
              </div>
            )}
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {hasWarmup && warmupActive && footerBtn("Skip warmup →", onSkipWarmup)}
          {hasWarmup && !warmupActive && footerBtn("× warmup", onRemoveWarmup)}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats and Standards Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const Section = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ color: T.muted, fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 0.9, marginBottom: 8 }}>
      {label}
    </div>
    {children}
  </div>
);

const KV = ({ k, v }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 11, borderBottom: `1px solid ${T.cardBorder}` }}>
    <span style={{ color: T.faint, fontFamily: T.mono }}>{k}</span>
    <span style={{ color: T.strong, fontFamily: T.mono, fontWeight: 700 }}>{v}</span>
  </div>
);

const VolumeBar = ({ exerciseName, muscle, events, isPrimary, showTip, hideTip }) => {
  const TARGET_MIN = 10, TARGET_MAX = 20;
  const sets = events.reduce((a, ev) => a + (ev.weightage ?? 1.0), 0);
  const DAY_MS = 86400000;
  
  const today = localDate();
  const todayMs = Date.parse(today + 'T00:00:00Z');

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const ms = todayMs - i * DAY_MS;
    const d = new Date(ms);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ date: dateStr, label: String(d.getUTCDate()), events: [], isToday: i === 0 });
  }
  events.forEach(ev => {
    const day = days.find(d => d.date === ev.date);
    if (day) day.events.push(ev);
  });

  const PALETTE = [
    { hue: 152 }, // green
    { hue: 200 }, // blue
    { hue: 30 },  // orange
    { hue: 280 }, // violet
    { hue: 340 }, // pink
    { hue: 50 },  // amber
  ];

  const exerciseOrder = [];
  events.forEach(ev => { if (!exerciseOrder.includes(ev.exercise)) exerciseOrder.push(ev.exercise); });
  const exerciseHue = {};
  exerciseOrder.forEach((name, i) => { exerciseHue[name] = PALETTE[i % PALETTE.length].hue; });

  const topScorePerEx = {};
  events.forEach(ev => {
    const sc = ev.weight * ev.reps;
    if (sc > (topScorePerEx[ev.exercise] || 0)) topScorePerEx[ev.exercise] = sc;
  });

  const maxPerDay = Math.max(4, ...days.map(d => d.events.length));
  const CHART_H = 64;
  const GAP = 1.5;
  const SLICE_H = Math.max(3, Math.floor((CHART_H - (maxPerDay - 1) * GAP) / maxPerDay));
  const countColor = sets === 0 ? T.faint
                    : sets < TARGET_MIN ? T.red
                    : sets <= TARGET_MAX ? T.green
                    : T.amber;

  const sliceStyle = (ev, isToday) => {
    const hue = exerciseHue[ev.exercise] ?? 152;
    const top = topScorePerEx[ev.exercise] || 1;
    const score = (ev.weight * ev.reps) / top;
    const hardness = Math.max(0.35, Math.min(1, score || 0.35));
    const sat = Math.round(55 + hardness * 35);
    const light = Math.round(isToday ? (44 + hardness * 12) : (38 + hardness * 14));
    const alpha = (isToday ? 1 : 0.85) * (ev.weightage < 1.0 ? 0.55 : 1.0);
    return {
      background: `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`,
      boxShadow: isToday && ev.weightage === 1.0 ? `0 0 6px hsla(${hue}, ${sat}%, 60%, 0.5)` : "none",
      border: ev.weightage < 1.0 ? "1px dashed rgba(255,255,255,0.4)" : "none",
    };
  };

  const formatSets = (s) => {
    if (Number.isInteger(s)) return String(s);
    return s.toFixed(1);
  };

  const getSliceHeight = (ev) => {
    const baseH = SLICE_H;
    if (ev.weightage < 1.0) {
      return Math.max(2, Math.floor(baseH * ev.weightage));
    }
    return baseH;
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: T.muted, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>
          {muscle.replace("_", " ")}{!isPrimary && ` (${Math.round(getMuscleImpact(exerciseName, muscle, false) * 100)}%)`}
        </span>
        <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 800 }}>
          <span style={{ color: countColor }}>{formatSets(sets)}</span>
          <span style={{ color: T.disabled, fontWeight: 500 }}> / 10-20</span>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", height: CHART_H, gap: 3 }}>
        {days.map((d, i) => (
          <div key={i} style={{
            flex: 1, minWidth: 0,
            display: "flex", flexDirection: "column-reverse",
            gap: `${GAP}px`, height: "100%", justifyContent: "flex-start",
          }}>
            {d.events.length === 0 ? (
              <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 1 }} />
            ) : (
              d.events.map((ev, j) => (
                <div key={j}
                  onMouseEnter={(e) => showTip(e, `${ev.exercise} · ${ev.weight}lb × ${ev.reps} · ${ev.date}${ev.weightage < 1.0 ? ` (secondary: ${Math.round(ev.weightage * 100)}%)` : ""}`)}
                  onMouseLeave={hideTip}
                  style={{
                    height: getSliceHeight(ev),
                    borderRadius: 2,
                    cursor: "default",
                    ...sliceStyle(ev, d.isToday),
                  }} />
              ))
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 3, marginTop: 5 }}>
        {days.map((d, i) => (
          <span key={i} style={{
            flex: 1, textAlign: "center",
            color: d.isToday ? T.accentLight : (d.events.length ? T.muted : T.disabled),
            fontFamily: T.mono, fontSize: 9,
            fontWeight: d.isToday ? 800 : (d.events.length ? 600 : 500),
          }}>{d.label}</span>
        ))}
      </div>

    </div>
  );
};

const Sparkline = ({ exerciseName, data, valueKey, color, label, fmt, showTip, hideTip }) => {
  const DAY_MS = 86400000;
  
  const today = localDate();
  const todayMs = Date.parse(today + 'T00:00:00Z');

  const days = [];
  for (let i = 29; i >= 0; i--) {
    const ms = todayMs - i * DAY_MS;
    const d = new Date(ms);
    days.push({
      date: d.toISOString().slice(0, 10),
      label: String(d.getUTCDate()),
      isToday: i === 0,
      isFuture: false,
      value: null,
    });
  }
  (data || []).forEach(d => {
    const day = days.find(x => x.date === d.date);
    if (day) day.value = +d[valueKey] || 0;
  });

  const historicalVals = days.filter(d => d.value != null && d.value > 0).map(d => d.value);
  if (historicalVals.length === 0) {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ color: T.muted, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>{label}</span>
          <span style={{ color: T.disabled, fontFamily: T.mono, fontSize: 10 }}>—</span>
        </div>
        <div style={{ height: 38, display: "flex", alignItems: "center", justifyContent: "center", color: T.disabled, fontFamily: T.mono, fontSize: 10, border: `1px dashed ${T.cardBorder}`, borderRadius: 4 }}>no data in last 30 days</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
          <span style={{ color: T.disabled, fontFamily: T.mono, fontSize: 9 }}>{days[0].date.slice(5)}</span>
          <span style={{ color: T.accentLight, fontFamily: T.mono, fontSize: 9, fontWeight: 800 }}>Today</span>
        </div>
      </div>
    );
  }

  const first = historicalVals[0], last = historicalVals[historicalVals.length - 1];

  const presentVals = days.filter(d => d.value != null && d.value > 0).map(d => d.value);
  const min = Math.min(...presentVals);
  const max = Math.max(...presentVals);
  const range = max - min || max || 1;
  const w = 280, h = 38, padX = 8, padY = 4;
  const totalSlots = days.length - 1;
  const dayX = (i) => padX + (i * (w - 2 * padX)) / totalSlots;
  const yFor = (v) => h - padY - ((v - min) / range) * (h - 2 * padY);

  const pts = days.map((d, i) => d.value != null && d.value > 0 ? {
    x: dayX(i), y: yFor(d.value), value: d.value, isToday: d.isToday, isFuture: d.isFuture, date: d.date,
  } : null);
  const presentPts = pts.filter(Boolean);

  const linePath = presentPts.length > 1
    ? presentPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
    : "";
  const areaPath = presentPts.length > 1
    ? `${linePath} L ${presentPts[presentPts.length-1].x.toFixed(1)} ${h} L ${presentPts[0].x.toFixed(1)} ${h} Z`
    : "";

  const delta = first ? Math.round(((last - first) / first) * 100) : 0;
  const deltaColor = delta > 0 ? T.green : delta < 0 ? T.red : T.faint;
  const gradId = `spark-${label}-${color.replace(/[^a-z0-9]/gi, "")}`;
  const pctInfo = valueKey === "orm" ? getStrengthPercentile(exerciseName, last) : null;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ color: T.muted, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>{label}</span>
        <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 800, color: T.strong }}>
          {fmt(last)}
          {pctInfo && (
            <span style={{ color: T.muted, fontSize: 9.5, fontWeight: 600, marginLeft: 6 }}>
              ({pctInfo.tier} · {pctInfo.percentile}%)
            </span>
          )}
          {historicalVals.length > 1 && (
            <span style={{ color: deltaColor, fontWeight: 700, marginLeft: 6, fontSize: 10 }}>
              {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {Math.abs(delta)}%
            </span>
          )}
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block", height: h }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
        {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
        {[0, 7, 14, 21, 28].map(d => {
          const slotIdx = 29 - d;
          if (slotIdx < 0) return null;
          return (
            <line key={`g${d}`} x1={dayX(slotIdx)} y1={padY} x2={dayX(slotIdx)} y2={h - padY}
              stroke={d === 0 ? "rgba(96,165,250,0.18)" : "rgba(255,255,255,0.04)"}
              strokeWidth={d === 0 ? 1 : 0.5}
              strokeDasharray={d === 0 ? "" : "2 3"} />
          );
        })}
        {presentPts.map((p, i) => {
          const pctInfo = valueKey === "orm" ? getStrengthPercentile(exerciseName, p.value) : null;
          const pctStr = pctInfo ? ` (${pctInfo.percentile}%)` : "";
          return (
            <g key={`p${i}`}>
              <circle cx={p.x} cy={p.y} r={p.isToday ? 3.2 : 2.4} fill={color}
                stroke={p.isToday ? "rgba(11,15,20,0.9)" : "none"} strokeWidth={p.isToday ? 1 : 0} />
              <circle cx={p.x} cy={p.y} r="8" fill="transparent"
                style={{ cursor: "default" }}
                onMouseEnter={(e) => showTip(e, `${p.date} · ${fmt(p.value)}${pctStr}${p.isToday ? " (today)" : ""}`)}
                onMouseLeave={hideTip} />
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{ color: T.disabled, fontFamily: T.mono, fontSize: 9 }}>{days[0].date.slice(5)}</span>
        <span style={{ color: T.accentLight, fontFamily: T.mono, fontSize: 9, fontWeight: 800 }}>Today</span>
      </div>
    </div>
  );
};

const PercentileProjectionSparkline = ({ exerciseName, ormHistory, color, label, showTip, hideTip }) => {
  const sortedHistory = [...(ormHistory || [])]
    .filter(h => h.date && h.orm > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sortedHistory.length === 0) {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ color: T.muted, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>{label}</span>
          <span style={{ color: T.disabled, fontFamily: T.mono, fontSize: 10 }}>—</span>
        </div>
        <div style={{ height: 38, display: "flex", alignItems: "center", justifyContent: "center", color: T.disabled, fontFamily: T.mono, fontSize: 10, border: `1px dashed ${T.cardBorder}`, borderRadius: 4 }}>no history for projection</div>
      </div>
    );
  }

  const N = sortedHistory.length;
  let slope = 0;
  const last = sortedHistory[N - 1].orm;
  
  if (N >= 2) {
    const d0 = Date.parse(sortedHistory[0].date + 'T00:00:00Z');
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    sortedHistory.forEach(h => {
      const xi = (Date.parse(h.date + 'T00:00:00Z') - d0) / 86400000;
      const yi = h.orm;
      sumX += xi;
      sumY += yi;
      sumXY += xi * yi;
      sumXX += xi * xi;
    });
    const denom = N * sumXX - sumX * sumX;
    if (denom !== 0) {
      const calculatedSlope = (N * sumXY - sumX * sumY) / denom;
      const maxDailyIncrement = last * 0.0015; // Realistic cap of 0.15% daily (4.5% monthly) progress
      slope = Math.max(0, Math.min(calculatedSlope, maxDailyIncrement));
    }
  } else {
    slope = last * 0.0005; // default conservative 0.05% daily increase (1.5% monthly) for sparse data
  }

  const today = localDate();
  const todayMs = Date.parse(today + 'T00:00:00Z');
  const sixtyDaysAgoMs = todayMs - 60 * 86400000;
  const sixtyDaysAgoStr = new Date(sixtyDaysAgoMs).toISOString().slice(0, 10);

  const filteredHistory = sortedHistory.filter(h => h.date >= sixtyDaysAgoStr);

  const historyPoints = filteredHistory.map(h => {
    const ms = Date.parse(h.date + 'T00:00:00Z');
    const pctInfo = getStrengthPercentile(exerciseName, h.orm) || { percentile: 0, tier: "Untrained" };
    return {
      ms,
      date: h.date,
      percentile: pctInfo.percentile,
      tier: pctInfo.tier,
      isFuture: false,
      label: h.date,
    };
  });

  const projectionPoints = [];
  for (let i = 0; i <= 30; i++) {
    const ms = todayMs + i * 86400000;
    const projectedOrm = last + slope * i;
    const pctInfo = getStrengthPercentile(exerciseName, projectedOrm) || { percentile: 0, tier: "Untrained" };
    projectionPoints.push({
      ms,
      date: new Date(ms).toISOString().slice(0, 10),
      percentile: pctInfo.percentile,
      tier: pctInfo.tier,
      isFuture: i > 0,
      label: i === 0 ? "Today" : `+${i}d`,
    });
  }

  const historyFiltered = historyPoints.filter(hp => hp.date < today);
  const allPoints = [...historyFiltered, ...projectionPoints];

  let startDateMs = todayMs;
  if (filteredHistory.length > 0) {
    const firstHistMs = Date.parse(filteredHistory[0].date + 'T00:00:00Z');
    if (firstHistMs < todayMs) {
      startDateMs = firstHistMs;
    }
  }
  const endDateMs = todayMs + 30 * 86400000;
  const totalDays = (endDateMs - startDateMs) / 86400000 || 1;

  const percentiles = allPoints.map(p => p.percentile);
  const minPct = Math.min(...percentiles);
  const maxPct = Math.max(...percentiles);
  const range = maxPct - minPct || 10;
  const w = 280, h = 48, padX = 8, padY = 4;
  
  const dayX = (ms) => padX + ((ms - startDateMs) / 86400000 / totalDays) * (w - 2 * padX);
  const yFor = (v) => (h - 14) - padY - ((v - minPct) / range) * (h - 14 - 2 * padY);

  const linePathForArea = allPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${dayX(p.ms).toFixed(1)} ${yFor(p.percentile).toFixed(1)}`).join(" ");
  const areaPath = `${linePathForArea} L ${dayX(endDateMs).toFixed(1)} ${h - 14} L ${dayX(startDateMs).toFixed(1)} ${h - 14} Z`;
  const gradId = `spark-proj-pct-${color.replace(/[^a-z0-9]/gi, "")}`;

  const historyLinePoints = [...historyFiltered, projectionPoints[0]];
  const histLinePath = historyLinePoints.length >= 2
    ? historyLinePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${dayX(p.ms).toFixed(1)} ${yFor(p.percentile).toFixed(1)}`).join(" ")
    : "";

  const projLinePath = projectionPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${dayX(p.ms).toFixed(1)} ${yFor(p.percentile).toFixed(1)}`).join(" ");

  const histMarkers = historyFiltered;
  const projMarkers = [0, 7, 14, 21, 28, 30].map(idx => projectionPoints[idx]);
  const markers = [...histMarkers, ...projMarkers];

  const firstHist = historyFiltered[0];
  const startLabel = firstHist ? firstHist.date.slice(5) : ""; // MM-DD

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ color: T.muted, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>{label}</span>
        <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 800, color: T.strong }}>
          {projectionPoints[0].percentile}%
          <span style={{ color: T.muted, fontWeight: 600, fontSize: 9.5, marginLeft: 6 }}>
            ({projectionPoints[0].tier})
          </span>
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block", height: h }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        
        {histLinePath && (
          <path d={histLinePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
        <path d={projLinePath} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Today vertical line */}
        <line x1={dayX(todayMs)} y1={padY} x2={dayX(todayMs)} y2={h - 14} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="3 3" />

        {/* Weekly projection grid lines */}
        {[7, 14, 21, 28, 30].map(d => {
          const ms = todayMs + d * 86400000;
          return (
            <line key={`projg${d}`} x1={dayX(ms)} y1={padY} x2={dayX(ms)} y2={h - 14}
              stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} strokeDasharray="2 3" />
          );
        })}

        {/* Weekly historical grid lines */}
        {[7, 14, 21, 28, 35, 42, 49, 56].map(d => {
          const ms = todayMs - d * 86400000;
          if (ms < startDateMs) return null;
          return (
            <line key={`histg${d}`} x1={dayX(ms)} y1={padY} x2={dayX(ms)} y2={h - 14}
              stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} strokeDasharray="2 3" />
          );
        })}

        {/* Hover/Interactive points */}
        {markers.map((d, i) => (
          <g key={`m${i}`}>
            <circle cx={dayX(d.ms)} cy={yFor(d.percentile)} r={d.isFuture ? (d.label === "+30d" ? 2.4 : 1.8) : 1.8} fill={color} />
            {d.label === "+30d" && (
              <circle cx={dayX(d.ms)} cy={yFor(d.percentile)} r="5" fill="none" stroke={color} strokeWidth="1" />
            )}
            <circle cx={dayX(d.ms)} cy={yFor(d.percentile)} r="8" fill="transparent"
              style={{ cursor: "default" }}
              onMouseEnter={(e) => showTip(e, d.isFuture
                ? `Projected ${d.label}: ${d.percentile}% (${d.tier})`
                : `${d.date} · ${d.percentile}% (${d.tier})`
              )}
              onMouseLeave={hideTip} />
          </g>
        ))}

        <text x={dayX(endDateMs)} y={yFor(projectionPoints[30].percentile) - 7} textAnchor="end" fill={color} style={{ fontSize: 8.5, fontFamily: T.mono, fontWeight: 800 }}>
          🎯 {projectionPoints[30].percentile}%
        </text>

        {/* X-axis Labels */}
        {startLabel && (
          <text x={dayX(startDateMs)} y={h - 2} textAnchor="start" fill={T.disabled} style={{ fontSize: 8.5, fontFamily: T.mono, fontWeight: 500 }}>
            {startLabel}
          </text>
        )}
        <text x={dayX(todayMs)} y={h - 2} textAnchor="middle" fill={T.accentLight} style={{ fontSize: 8.5, fontFamily: T.mono, fontWeight: 800 }}>
          Today
        </text>
        <text x={dayX(endDateMs)} y={h - 2} textAnchor="end" fill={T.disabled} style={{ fontSize: 8.5, fontFamily: T.mono, fontWeight: 500 }}>
          +30d
        </text>
      </svg>
    </div>
  );
};

function StatsPane({ exercise, history, statHistory, exercises }) {
  if (!exercise) return null;
  const today = localDate();
  const todayMs = Date.parse(today + 'T00:00:00Z');
  const sevenDaysAgoMs = todayMs - 7 * 86400000;
  
  const [tip, setTip] = useState(null);
  const showTip = (e, content) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ content, x: r.left + r.width / 2, y: r.top - 4 });
  };
  const hideTip = () => setTip(null);

  useEffect(() => {
    setTip(null);
  }, [exercise]);

  const muscleInfo = EXERCISE_MUSCLES[exercise.name] || { primary: [], secondary: [] };

  const muscleSets7d = {};
  (muscleInfo.primary || []).forEach(m => muscleSets7d[m] = []);
  (muscleInfo.secondary || []).forEach(m => muscleSets7d[m] = []);
  for (const sess of (history || [])) {
    if (!sess.date || sess.date === today) continue;
    const sessMs = Date.parse(sess.date + 'T00:00:00Z');
    if (sessMs <= sevenDaysAgoMs || sessMs > todayMs) continue;
    for (const st of (sess.sets || [])) {
      if (st.set_type !== 'working') continue;
      const mm = EXERCISE_MUSCLES[st.exercise];
      if (!mm) continue;
      for (const muscle of (mm.primary || [])) {
        if (muscle in muscleSets7d) muscleSets7d[muscle].push({
          date: sess.date, isToday: false,
          exercise: st.exercise,
          weight: +st.weight_lb || 0,
          reps: parseInt(st.reps) || 0,
          weightage: getMuscleImpact(st.exercise, muscle, true),
        });
      }
      for (const muscle of (mm.secondary || [])) {
        if (muscle in muscleSets7d) muscleSets7d[muscle].push({
          date: sess.date, isToday: false,
          exercise: st.exercise,
          weight: +st.weight_lb || 0,
          reps: parseInt(st.reps) || 0,
          weightage: getMuscleImpact(st.exercise, muscle, false),
        });
      }
    }
  }

  const chartTodayDate = new Date(todayMs).toISOString().slice(0, 10);
  for (const e of exercises) {
    const em = EXERCISE_MUSCLES[e.name];
    if (!em || e.skipped) continue;
    for (const s of e.sets) {
      if (!s.completed || s.kind !== 'work') continue;
      const bs = (s.bands || []).reduce((a, b) => a + b, 0);
      const weight = e.assist ? Math.max(0, (s.bodyweight || 0) - bs)
                    : e.isBandsOnly ? bs
                    : e.bandAddon ? (s.weight || 0) + bs
                    : (s.weight || 0);
      for (const muscle of (em.primary || [])) {
        if (muscle in muscleSets7d) muscleSets7d[muscle].push({
          date: chartTodayDate, isToday: true,
          exercise: e.name,
          weight,
          reps: parseInt(s.reps) || 0,
          weightage: getMuscleImpact(e.name, muscle, true),
        });
      }
      for (const muscle of (em.secondary || [])) {
        if (muscle in muscleSets7d) muscleSets7d[muscle].push({
          date: chartTodayDate, isToday: true,
          exercise: e.name,
          weight,
          reps: parseInt(s.reps) || 0,
          weightage: getMuscleImpact(e.name, muscle, false),
        });
      }
    }
  }

  Object.values(muscleSets7d).forEach(arr => arr.sort((a, b) => a.date.localeCompare(b.date)));

  const stat = statHistory || {};
  const pickSiblingForStats = () => {
    const grp = getSwapGroup(exercise.name);
    if (!grp) return null;
    const statOwn = ((stat.orm || {})[exercise.name] || []).length;
    const histOwn = (history || []).some(s =>
      (s.sets || []).some(st => st.exercise === exercise.name && st.set_type === 'working'));
    if (statOwn > 0 || histOwn) return null;
    let best = null, bestCount = 0;
    for (const member of grp) {
      if (member.name === exercise.name) continue;
      const statCnt = ((stat.orm || {})[member.name] || []).length;
      const histCnt = (history || []).filter(s =>
        (s.sets || []).some(st => st.exercise === member.name && st.set_type === 'working')).length;
      const cnt = statCnt + histCnt;
      if (cnt > bestCount) { bestCount = cnt; best = member.name; }
    }
    return bestCount > 0 ? best : null;
  };
  const sibling = pickSiblingForStats();
  const lookupName = sibling || exercise.name;

  const histByDate = {};
  (history || []).forEach(sess => {
    if (!sess.date) return;
    const sets = (sess.sets || []).filter(st => st.exercise === lookupName && st.set_type === 'working');
    if (!sets.length) return;
    let mo = 0, sv = 0, mw = 0, mr = 0;
    sets.forEach(st => {
      const w = +st.weight_lb || 0, r = parseInt(st.reps) || 0;
      if (w > mw) mw = w;
      if (r > mr) mr = r;
      if (w > 0 && r > 0) {
        const o = r > 1 ? w * (1 + r / 30) : w;
        if (o > mo) mo = o;
        sv += w * r;
      }
    });
    histByDate[sess.date] = { date: sess.date, orm: mo, vol: sv, wt: mw, reps: mr };
  });

  const mergeMetric = (statArr, key) => {
    const byDate = {};
    (statArr || []).forEach(d => { byDate[d.date] = +d[key] || 0; });
    Object.values(histByDate).forEach(h => { byDate[h.date] = h[key]; });
    return Object.entries(byDate)
      .map(([date, v]) => ({ date, [key]: v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };
  const ormHistRaw = mergeMetric((stat.orm || {})[lookupName], "orm");
  const wtHist     = mergeMetric((stat.wt  || {})[lookupName], "wt");
  const repsHist   = mergeMetric((stat.reps|| {})[lookupName], "reps");
  const volHistRaw = mergeMetric((stat.vol || {})[lookupName], "vol");

  let todayOrm = 0, todayVol = 0;
  (exercise.sets || []).forEach(s => {
    if (!s.completed || s.kind !== 'work') return;
    const bs = (s.bands || []).reduce((a, b) => a + b, 0);
    const w = exercise.assist ? Math.max(0, (s.bodyweight || 0) - bs)
            : exercise.isBandsOnly ? bs
            : exercise.bandAddon ? (s.weight || 0) + bs
            : (s.weight || 0);
    const r = parseInt(s.reps) || 0;
    if (r > 0 && w > 0) {
      const o = r > 1 ? w * (1 + r / 30) : w;
      if (o > todayOrm) todayOrm = o;
      todayVol += w * r;
    }
  });
  const chartTodayDateStr = new Date(todayMs).toISOString().slice(0, 10);

  const ormHist = (!sibling && todayOrm > 0)
    ? [...ormHistRaw.filter(d => d.date !== chartTodayDateStr), { date: chartTodayDateStr, orm: todayOrm }]
    : ormHistRaw;
  const volHist = (!sibling && todayVol > 0)
    ? [...volHistRaw.filter(d => d.date !== chartTodayDateStr), { date: chartTodayDateStr, vol: todayVol }]
    : volHistRaw;
  const bestOrm = ormHist.length ? Math.max(...ormHist.map(d => +d.orm || 0)) : 0;
  const bestWt = wtHist.length ? Math.max(...wtHist.map(d => +d.wt || 0)) : 0;
  const bestReps = repsHist.length ? Math.max(...repsHist.map(d => +d.reps || 0)) : 0;
  const bestVol = volHist.length ? Math.max(...volHist.map(d => +d.vol || 0)) : 0;

  const hasPRs = bestOrm > 0 || bestWt > 0 || bestVol > 0;
  const primaryList = (muscleInfo.primary || []);
  const secondaryList = (muscleInfo.secondary || []);

  return (
    <div
      onMouseLeave={hideTip}
      style={{
        padding: 14, borderRadius: 14,
        background: T.cardBg, border: `1px solid ${T.cardBorder}`,
        color: T.text,
        position: "relative",
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: T.faint, fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 1.0, marginBottom: 4 }}>STATS</div>
        <div style={{ color: T.strong, fontSize: 16, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.2 }}>{exercise.name}</div>
        {(primaryList.length > 0 || secondaryList.length > 0) && (
          <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {primaryList.map(m => (
              <span key={m} style={{
                color: T.bandsText, background: "rgba(192,132,252,0.12)",
                border: "1px solid rgba(192,132,252,0.25)",
                fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 0.4,
                padding: "2px 6px", borderRadius: 4, textTransform: "uppercase",
              }}>{m.replace("_", " ")}</span>
            ))}
            {secondaryList.map(m => (
              <span key={m} style={{
                color: T.muted, background: "rgba(255,255,255,0.03)",
                border: "1px dashed rgba(255,255,255,0.15)",
                fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 0.4,
                padding: "2px 6px", borderRadius: 4, textTransform: "uppercase",
              }}>{m.replace("_", " ")} ({Math.round(getMuscleImpact(exercise.name, m, false) * 100)}%)</span>
            ))}
          </div>
        )}
      </div>

      {(primaryList.length > 0 || secondaryList.length > 0) && (
        <Section label="HARD SETS · LAST 7 DAYS">
          {primaryList.map(m => (
            <VolumeBar key={m} exerciseName={exercise.name} muscle={m} events={muscleSets7d[m] || []} isPrimary={true} showTip={showTip} hideTip={hideTip} />
          ))}
          {secondaryList.map(m => (
            <VolumeBar key={m} exerciseName={exercise.name} muscle={m} events={muscleSets7d[m] || []} isPrimary={false} showTip={showTip} hideTip={hideTip} />
          ))}
        </Section>
      )}

      <Section label={sibling ? `PROGRESS · OVER LAST 30 DAYS · ${sibling.toUpperCase()}` : "PROGRESS · OVER LAST 30 DAYS"}>
        {sibling && (
          <div style={{ color: T.faint, fontFamily: T.mono, fontSize: 9.5, marginBottom: 6, lineHeight: 1.4 }}>
            {exercise.name} is new — showing your <span style={{ color: T.muted, fontWeight: 700 }}>{sibling}</span> history (same swap group).
          </div>
        )}
        <Sparkline exerciseName={lookupName} data={ormHist} valueKey="orm" color="#60A5FA" label="1RM EST" fmt={v => `${Math.round(v)} lb`} showTip={showTip} hideTip={hideTip} />
        <Sparkline exerciseName={lookupName} data={volHist} valueKey="vol" color="#34D399" label="VOLUME" fmt={v => `${Math.round(v).toLocaleString()} lb`} showTip={showTip} hideTip={hideTip} />
        <PercentileProjectionSparkline exerciseName={lookupName} ormHistory={ormHist} color="#FBBF24" label="PROJECTED PERCENTILE (30D)" showTip={showTip} hideTip={hideTip} />
      </Section>

      {hasPRs && (
        <Section label="PRS">
          {bestOrm > 0 && <KV k="1RM est" v={`${Math.round(bestOrm)} lb`} />}
          {bestWt > 0 && <KV k="Top weight" v={`${bestWt} lb`} />}
          {bestReps > 0 && <KV k="Top reps" v={String(bestReps)} />}
          {bestVol > 0 && <KV k="Top volume" v={`${bestVol.toLocaleString()} lb`} />}
        </Section>
      )}

      {tip && (
        <div style={{
          position: "fixed", left: tip.x, top: tip.y, transform: "translate(-50%, -100%)",
          background: "#1f2937", border: "1px solid rgba(255,255,255,0.08)",
          padding: "5px 8px 4px", borderRadius: 6, pointerEvents: "none", zIndex: 100,
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          color: T.strong, fontFamily: T.mono, fontSize: 10, fontWeight: 600,
          whiteSpace: "nowrap",
        }}>
          {tip.content}
        </div>
      )}
    </div>
  );
}

function MotivationsList({ exercises, motivations }) {
  const entries = exercises
    .map((e, i) => ({
      ex: e, idx: i,
      msg: motivations[e.id],
      done: !e.sets.find(s => s.active) && e.sets.every(s => s.completed),
      anyDone: e.sets.some(s => s.completed),
    }))
    .filter(x => x.msg && x.done && x.anyDone)
    .reverse();

  const empty = entries.length === 0;
  return (
    <div style={{
      padding: 14, borderRadius: 14,
      background: T.cardBg, border: `1px solid ${T.cardBorder}`,
      color: T.text,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ color: T.faint, fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 1.0 }}>
          ✨ NOTES
        </span>
        {!empty && (
          <span style={{ color: T.disabled, fontFamily: T.mono, fontSize: 10 }}>
            {entries.length}
          </span>
        )}
      </div>
      {empty ? (
        <div style={{ color: T.disabled, fontFamily: T.mono, fontSize: 11, textAlign: "center", padding: "16px 0", lineHeight: 1.5 }}>
          Finish an exercise<br/>to see AI takes here
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map(({ ex, msg }) => (
            <div key={ex.id} style={{
              padding: "10px 12px", borderRadius: 10,
              background: msg === "__loading__"
                ? "rgba(255,255,255,0.02)"
                : "linear-gradient(135deg, rgba(192,132,252,0.10), rgba(96,165,250,0.10))",
              border: msg === "__loading__"
                ? `1px dashed ${T.cardBorder}`
                : "1px solid rgba(192,132,252,0.2)",
            }}>
              <div style={{
                color: T.faint, fontFamily: T.mono,
                fontSize: 9, fontWeight: 800, letterSpacing: 0.6,
                textTransform: "uppercase", marginBottom: 4,
              }}>{ex.name}</div>
              <div style={{ color: "#E9D5FF", fontSize: 12.5, lineHeight: 1.45, fontWeight: 500 }}>
                {msg === "__loading__" ? <span style={{ opacity: 0.55, color: T.muted }}>thinking…</span> : msg}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
