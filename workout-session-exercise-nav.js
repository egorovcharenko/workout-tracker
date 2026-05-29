// ExerciseNav — the workout's exercise list, used both as the desktop LEFT
// pane (variant="list", vertical, rich) and the mobile top strip
// (variant="strip", horizontal scroll, compact). Tapping a row focuses that
// exercise in the center column; the App's onSelect also activates the
// exercise's next set so you can log it (or, for a finished one, review it).
//
// The list variant shows per-set weight×reps and — for exercises in a
// SWAP_GROUP — a ⇄ toggle that expands inline variant pills so you can swap
// straight from the list without it cluttering every row.

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
  if (s.completed) return { lb: cur, reps: s.reps, state: "done" };
  if (s.active) {
    const reps = s.reps != null ? s.reps : (s.lastReps != null ? s.lastReps : null);
    return { lb: cur || prevW, reps, state: "current" };
  }
  return { lb: prevW || cur, reps: s.lastReps != null ? s.lastReps : null, state: "upcoming", preview: true };
}

function ExerciseNav({ exercises, shownIdx, currentIdx, onSelect, onSwapExercise, variant }) {
  const [swapOpenIdx, setSwapOpenIdx] = useState(null);

  const STATUS_COLOR = { done: T.green, current: T.accentLight, skipped: T.disabled, upcoming: T.faint };
  const STATUS_GLYPH = { done: "✓", current: "●", skipped: "×", upcoming: "○" };

  const meta = (e, i) => {
    const work = e.sets.filter(s => s.kind === "work");
    const doneWork = work.filter(s => s.completed).length;
    const allDone = e.sets.length > 0 && e.sets.every(s => s.completed);
    let status = "upcoming";
    if (e.skipped) status = "skipped";
    else if (allDone) status = "done";
    else if (i === currentIdx) status = "current";
    return {
      work, doneWork, totalWork: work.length, status,
      tag: e.superset ? `${e.superset}${e.supersetPos || ""}` : null,
    };
  };

  const tagChip = (tag) => (
    <span style={{
      color: T.bands, fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 0.6,
      padding: "1px 4px", borderRadius: 3, background: "rgba(192,132,252,0.12)", flexShrink: 0,
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
                {m.tag && tagChip(m.tag)}
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

  // variant "list" — desktop left pane (rich, readable)
  return (
    <div style={{ padding: 12, borderRadius: 14, background: T.cardBg, border: `1px solid ${T.cardBorder}` }}>
      <div style={{ color: T.faint, fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 1.0, marginBottom: 10, padding: "0 2px" }}>EXERCISES</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {exercises.map((e, i) => {
          const m = meta(e, i);
          const sel = i === shownIdx;
          const prev = i > 0 ? exercises[i - 1] : null;
          const firstInSuperset = e.superset && (!prev || prev.superset !== e.superset);
          const swapGroup = getSwapGroup(e.name);
          const hasVariants = swapGroup && swapGroup.length > 1;
          const workLogged = e.sets.some(s => s.completed && s.kind === "work");
          const swapOpen = swapOpenIdx === i;
          // Names render at max brightness for every active exercise (done
          // included — a finished lift is an achievement, not something to
          // mute). Only skipped exercises dim down.
          const nameColor = m.status === "skipped" ? T.muted : T.strong;
          return (
            <React.Fragment key={e.id}>
              {firstInSuperset && (
                <div style={{ color: T.bands, fontFamily: T.mono, fontSize: 8.5, fontWeight: 800, letterSpacing: 1.0, padding: "6px 4px 2px" }}>
                  SUPERSET {e.superset}
                </div>
              )}
              <div style={{
                borderRadius: 10, overflow: "hidden",
                border: sel ? "1px solid rgba(96,165,250,0.55)" : `1px solid ${T.cardBorder}`,
                background: sel ? "rgba(96,165,250,0.10)" : "rgba(255,255,255,0.02)",
                transition: "all 150ms ease",
              }}>
                {/* header — click anywhere (except ⇄) to focus */}
                <div onClick={() => onSelect(i)} role="button" style={{
                  display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 11px", cursor: "pointer",
                }}>
                  <span style={{ width: 13, textAlign: "center", color: STATUS_COLOR[m.status], fontSize: 11, flexShrink: 0, marginTop: 1 }}>{STATUS_GLYPH[m.status]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {m.tag && <span style={{ marginRight: 6 }}>{tagChip(m.tag)}</span>}
                    <span style={{
                      color: nameColor, fontSize: 13.5, fontWeight: sel ? 700 : 600, letterSpacing: -0.2,
                      lineHeight: 1.3,
                      textDecoration: m.status === "skipped" ? "line-through" : "none",
                    }}>{e.name}</span>
                  </div>
                  {hasVariants && (
                    <button
                      onClick={(ev) => { ev.stopPropagation(); setSwapOpenIdx(o => o === i ? null : i); }}
                      title="Swap variant"
                      style={{
                        flexShrink: 0, marginTop: -1,
                        width: 24, height: 22, padding: 0, borderRadius: 6,
                        cursor: "pointer", fontFamily: "inherit", fontSize: 12, lineHeight: 1,
                        border: swapOpen ? "1px solid rgba(96,165,250,0.6)" : `1px solid ${T.cardBorder}`,
                        background: swapOpen ? "rgba(96,165,250,0.15)" : "transparent",
                        color: swapOpen ? T.accentLight : T.faint,
                      }}
                    >⇄</button>
                  )}
                  {e.deferred && m.status !== "done" && (
                    <span title="Deferred — moved to later" style={{
                      color: T.amber, fontFamily: T.mono, fontSize: 8, fontWeight: 800, letterSpacing: 0.4,
                      padding: "2px 4px", borderRadius: 3, background: "rgba(251,191,36,0.12)", flexShrink: 0, marginTop: 1, whiteSpace: "nowrap",
                    }}>↓</span>
                  )}
                  <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: m.status === "done" ? T.green : T.faint, flexShrink: 0, marginTop: 2 }}>
                    {m.doneWork}/{m.totalWork}
                  </span>
                </div>

                {!e.skipped && (
                  <div style={{ padding: "0 11px 9px" }}>
                    {/* inline variant swap (only when toggled open) */}
                    {hasVariants && swapOpen && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: m.work.length ? 8 : 0 }}>
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
                    {/* per-set weight × reps — logged sets bright, the active
                        set in accent, upcoming previews in a readable muted
                        (not the near-invisible disabled gray). */}
                    {m.work.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 0", fontFamily: T.mono, fontSize: 11.5 }}>
                        {m.work.map((s, k) => {
                          const d = navSetDisplay(s, e);
                          const color = d.state === "done" ? T.strong : d.state === "current" ? T.accentLight : T.muted;
                          return (
                            <span key={k} style={{ color, fontWeight: 700, fontStyle: d.preview ? "italic" : "normal" }}>
                              {d.lb || "—"}<span style={{ color: T.faint, fontWeight: 400 }}>×</span>{d.reps != null ? d.reps : "—"}
                              {k < m.work.length - 1 && <span style={{ color: T.faint, fontWeight: 400 }}>{"  ·  "}</span>}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

window.ExerciseNav = ExerciseNav;
