// ExerciseNav — the workout's exercise list. Desktop LEFT pane
// (variant="list", rich) and mobile top strip (variant="strip", compact).
// Tapping a row focuses that exercise in the center column; the App's onSelect
// also activates the exercise's next set so you can log it.

// Mode-aware displayed weight for one set (mirrors SetCard's math).
function navSetDisplay(s, exercise) {
  const isBW = exercise.mode === "bodyweight";
  const isAssist = exercise.assist;
  const isBandsOnly = exercise.isBandsOnly;
  const baseW = isBW ? (s.bodyweight || 0) : (s.weight || 0);
  const lastBaseW = isBW ? (s.lastBodyweight || 0) : (s.lastWeight || 0);
  const bandSum = (s.bands || []).reduce((a, b) => a + b, 0);
  const lastBandSum = (s.lastBands || []).reduce((a, b) => a + b, 0);
  const cur = isAssist ? Math.max(0, baseW - bandSum) : (isBandsOnly ? bandSum : baseW + bandSum);
  const prevW = isAssist ? Math.max(0, lastBaseW - lastBandSum) : (isBandsOnly ? lastBandSum : lastBaseW + lastBandSum);
  if (s.completed) return { lb: cur, reps: s.reps, state: "done", kind: s.kind };
  if (s.active) {
    const reps = s.reps != null ? s.reps : (s.lastReps != null ? s.lastReps : null);
    return { lb: cur || prevW, reps, state: "current", kind: s.kind };
  }
  return { lb: prevW || cur, reps: s.lastReps != null ? s.lastReps : null, state: "upcoming", preview: true, kind: s.kind };
}

function ExerciseNav({ exercises, shownIdx, currentIdx, onSelect, onSwapExercise, variant }) {
  const [swapOpenIdx, setSwapOpenIdx] = useState(null);

  const STATUS_COLOR = { done: T.green, current: T.accentLight, skipped: T.disabled, upcoming: T.faint };
  const STATUS_GLYPH = { done: "✓", current: "●", skipped: "×", upcoming: "○" };

  const meta = (e, i) => {
    const doneWork = e.sets.filter(s => s.completed).length;
    const allDone = e.sets.length > 0 && e.sets.every(s => s.completed);
    let status = "upcoming";
    if (e.skipped) status = "skipped";
    else if (allDone) status = "done";
    else if (i === currentIdx) status = "current";
    return {
      work: e.sets, doneWork, totalWork: e.sets.length, status,
      tag: e.superset ? `${e.superset}${e.supersetPos || ""}` : null,
    };
  };

  // ── small bordered set chip ──────────────────────────────────────────────
  const SetChip = ({ d, k }) => {
    let box;
    if (d.state === "current") {
      box = { border: "1px solid rgba(96,165,250,0.85)", background: "rgba(59,130,246,0.85)", color: "#FFFFFF", xColor: "rgba(255,255,255,0.65)" };
    } else if (d.state === "done") {
      box = { border: "1px solid rgba(52,211,153,0.32)", background: "rgba(52,211,153,0.07)", color: T.strong, xColor: T.faint };
    } else {
      box = { border: "1px dashed rgba(255,255,255,0.16)", background: "transparent", color: T.muted, xColor: T.disabled };
    }

    if (d.kind === "warmup") {
      if (d.state === "current") {
        box.border = "1px solid rgba(251,191,36,0.85)";
        box.background = "rgba(251,191,36,0.85)";
      } else if (d.state === "done") {
        box.border = "1px solid rgba(251,191,36,0.4)";
        box.background = "rgba(251,191,36,0.08)";
      } else {
        box.border = "1px dashed rgba(251,191,36,0.4)";
      }
    }
    return (
      <span key={k} style={{
        display: "inline-flex", alignItems: "baseline", gap: 1,
        padding: "5px 9px", borderRadius: 8,
        border: box.border, background: box.background, color: box.color,
        fontFamily: T.mono, fontSize: 12.5, fontWeight: 700,
        fontStyle: d.preview ? "italic" : "normal", whiteSpace: "nowrap",
      }}>
        {d.lb || "—"}<span style={{ color: box.xColor, fontWeight: 400, fontSize: 11 }}>×</span>{d.reps != null ? d.reps : "—"}
      </span>
    );
  };

  const chipRow = (e) => {
    const work = e.sets;
    if (!work.length) return null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
        {work.map((s, k) => <SetChip key={k} k={k} d={navSetDisplay(s, e)} />)}
      </div>
    );
  };

  // ── small rounded icon button / marker ───────────────────────────────────
  const iconBox = ({ glyph, active, color, bg, border, onClick, title }) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        flexShrink: 0, width: 28, height: 26, padding: 0, borderRadius: 7,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontFamily: "inherit", fontSize: 12, lineHeight: 1,
        cursor: onClick ? "pointer" : "default",
        border: border || `1px solid ${active ? "rgba(96,165,250,0.6)" : T.cardBorder}`,
        background: bg || (active ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.03)"),
        color: color || (active ? T.accentLight : T.faint),
      }}
    >{glyph}</button>
  );

  const tagChip = (tag) => (
    <span style={{
      color: T.bandsText, fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: 0.4,
      padding: "2px 6px", borderRadius: 5, background: "rgba(192,132,252,0.18)", border: "1px solid rgba(192,132,252,0.3)",
      flexShrink: 0, marginRight: 8,
    }}>{tag}</span>
  );

  if (variant === "strip") {
    return (
      <div className="scroll-row" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "10px 16px" }}>
        {exercises.map((e, i) => {
          const m = meta(e, i);
          const sel = i === shownIdx;
          return (
            <button key={e.id} onClick={() => onSelect(i)} style={{
              flex: "0 0 auto", width: 132, textAlign: "left",
              padding: "8px 10px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
              border: sel ? `1px solid ${T.accentLight}` : `1px solid ${T.cardBorder}`,
              background: sel ? "rgba(96,165,250,0.14)" : "rgba(255,255,255,0.03)",
              transition: "all 150ms ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                <span style={{ color: STATUS_COLOR[m.status], fontSize: 10, flexShrink: 0 }}>{STATUS_GLYPH[m.status]}</span>
                {m.tag && <span style={{ color: T.bands, fontFamily: T.mono, fontSize: 9, fontWeight: 800 }}>{m.tag}</span>}
                <span style={{ marginLeft: "auto", fontFamily: T.mono, fontSize: 9, color: m.status === "done" ? T.green : T.faint }}>{m.doneWork}/{m.totalWork}</span>
              </div>
              <div style={{
                color: m.status === "skipped" ? T.muted : T.strong,
                fontSize: 12, fontWeight: 700, lineHeight: 1.25,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                textDecoration: m.status === "skipped" ? "line-through" : "none",
                minHeight: 30,
              }}>{e.name}</div>
            </button>
          );
        })}
      </div>
    );
  }

  // ── desktop list ──────────────────────────────────────────────────────────
  // Inner content of one exercise row — header (status, optional A-tag, name,
  // swap box, defer marker, progress), optional variant picker, and the chip
  // row. Shared by standalone cards and superset members.
  const renderInner = (i, { inGroup } = {}) => {
    const e = exercises[i];
    const m = meta(e, i);
    const sel = i === shownIdx;
    const swapGroup = getSwapGroup(e.name);
    const hasVariants = swapGroup && swapGroup.length > 1;
    const workLogged = e.sets.some(s => s.completed && s.kind === "work");
    const swapOpen = swapOpenIdx === i;
    const nameColor = m.status === "skipped" ? T.muted : T.strong;
    return (
      <div style={{ padding: "11px 12px" }}>
        <div onClick={() => onSelect(i)} role="button" style={{
          display: "flex", alignItems: "flex-start", gap: 9, cursor: "pointer",
        }}>
          <span style={{ width: 13, textAlign: "center", color: STATUS_COLOR[m.status], fontSize: 12, flexShrink: 0, marginTop: 2 }}>{STATUS_GLYPH[m.status]}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {inGroup && m.tag && tagChip(m.tag)}
            <span style={{
              color: nameColor, fontSize: 14, fontWeight: 700, letterSpacing: -0.2, lineHeight: 1.3,
              textDecoration: m.status === "skipped" ? "line-through" : "none",
            }}>{e.name}</span>
          </div>
          {hasVariants && iconBox({
            glyph: "⇄", active: swapOpen, title: "Swap variant",
            onClick: (ev) => { ev.stopPropagation(); setSwapOpenIdx(o => o === i ? null : i); },
          })}
          {e.deferred && m.status !== "done" && iconBox({
            glyph: "↓", color: T.amber, border: "1px solid rgba(251,191,36,0.4)", bg: "rgba(251,191,36,0.12)",
            title: "Deferred — moved to later",
          })}
          <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 800, color: m.status === "done" ? T.green : T.faint, flexShrink: 0, marginTop: 3 }}>
            {m.doneWork}/{m.totalWork}
          </span>
        </div>

        {!e.skipped && hasVariants && swapOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
            {swapGroup.map(opt => {
              const isSel = opt.name === e.name;
              const locked = workLogged && !isSel;
              return (
                <button
                  key={opt.name}
                  onClick={(ev) => { ev.stopPropagation(); if (!isSel && !locked) { onSwapExercise(i, opt.name); setSwapOpenIdx(null); } }}
                  disabled={isSel || locked}
                  style={{
                    textAlign: "left", padding: "6px 9px", borderRadius: 7, fontFamily: "inherit",
                    fontSize: 12, fontWeight: 600,
                    cursor: isSel ? "default" : locked ? "not-allowed" : "pointer",
                    border: isSel ? "1px solid rgba(96,165,250,0.6)" : `1px solid ${T.cardBorder}`,
                    background: isSel ? "rgba(96,165,250,0.16)" : locked ? "transparent" : "rgba(255,255,255,0.04)",
                    color: isSel ? "#DBEAFE" : locked ? T.disabled : T.text,
                    opacity: locked ? 0.5 : 1,
                  }}
                >{isSel && <span style={{ color: T.accentLight, marginRight: 6 }}>●</span>}{opt.name}</button>
              );
            })}
            {workLogged && <span style={{ color: T.disabled, fontFamily: T.mono, fontSize: 9, paddingLeft: 2 }}>locked — sets logged</span>}
          </div>
        )}

        {!e.skipped && chipRow(e)}
      </div>
    );
  };

  // Group consecutive same-superset exercises into one bracketed unit.
  const groups = [];
  exercises.forEach((e, i) => {
    const last = groups[groups.length - 1];
    if (e.superset && last && last.superset === e.superset) last.items.push(i);
    else groups.push({ superset: e.superset || null, items: [i] });
  });

  const cardShell = (i, children) => {
    const sel = i === shownIdx;
    return (
      <div style={{
        borderRadius: 12, overflow: "hidden",
        border: sel ? "1px solid rgba(96,165,250,0.6)" : `1px solid ${T.cardBorder}`,
        background: sel ? "rgba(96,165,250,0.10)" : "rgba(255,255,255,0.02)",
        boxShadow: sel ? "0 6px 22px -10px rgba(59,130,246,0.6)" : "none",
        transition: "all 150ms ease",
      }}>{children}</div>
    );
  };

  return (
    <div style={{ padding: 12, borderRadius: 14, background: T.cardBg, border: `1px solid ${T.cardBorder}` }}>
      <div style={{ color: T.faint, fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 1.0, marginBottom: 12, padding: "0 2px" }}>EXERCISES</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {groups.map((g, gi) => {
          if (!g.superset) {
            const i = g.items[0];
            return <React.Fragment key={`g${gi}`}>{cardShell(i, renderInner(i))}</React.Fragment>;
          }
          // Superset → purple-bracketed container: icon-box header + members
          // separated by a "THEN" connector, with a purple left accent bar.
          return (
            <div key={`g${gi}`} style={{
              borderRadius: 14, overflow: "hidden",
              border: "1px solid rgba(192,132,252,0.28)",
              background: "rgba(192,132,252,0.045)",
              boxShadow: "inset 3px 0 0 rgba(192,132,252,0.65)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px 8px", flexWrap: "wrap" }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(192,132,252,0.18)", border: "1px solid rgba(192,132,252,0.35)",
                  color: T.bands, fontSize: 12,
                }} aria-hidden>⇄</span>
                <span style={{ color: T.bands, fontFamily: T.mono, fontSize: 11, fontWeight: 800, letterSpacing: 1.2, whiteSpace: "nowrap" }}>SUPERSET {g.superset}</span>
                <span style={{ color: "rgba(192,132,252,0.65)", fontFamily: T.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.0, whiteSpace: "nowrap" }}>NO REST BETWEEN</span>
              </div>
              <div style={{ padding: "0 8px 8px" }}>
                {g.items.map((i, k) => {
                  const sel = i === shownIdx;
                  return (
                    <React.Fragment key={exercises[i].id}>
                      {k > 0 && (
                        <div style={{ display: "flex", justifyContent: "center", margin: "7px 0" }}>
                          <span style={{
                            color: T.bands, fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 2,
                            padding: "3px 13px", borderRadius: 99,
                            border: "1px solid rgba(192,132,252,0.4)", background: "rgba(192,132,252,0.10)",
                          }}>THEN</span>
                        </div>
                      )}
                      <div style={{
                        borderRadius: 10, overflow: "hidden",
                        border: sel ? "1px solid rgba(96,165,250,0.6)" : "1px solid rgba(255,255,255,0.06)",
                        background: sel ? "rgba(96,165,250,0.10)" : "rgba(0,0,0,0.18)",
                        boxShadow: sel ? "0 6px 22px -10px rgba(59,130,246,0.6)" : "none",
                        transition: "all 150ms ease",
                      }}>
                        {renderInner(i, { inGroup: true })}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.ExerciseNav = ExerciseNav;
