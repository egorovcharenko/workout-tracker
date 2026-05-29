// ExerciseNav — the workout's exercise list, used both as the desktop LEFT
// pane (variant="list", vertical) and the mobile top strip (variant="strip",
// horizontal scroll). Tapping a row focuses that exercise in the center
// column; the App's onSelect also activates the exercise's next set so you
// can log it (or, for a finished exercise, just review it).
function ExerciseNav({ exercises, shownIdx, currentIdx, onSelect, variant }) {
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
      doneWork, totalWork: work.length, status,
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
              flex: "0 0 auto", minWidth: 98, maxWidth: 150, textAlign: "left",
              padding: "8px 10px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
              border: sel ? `1px solid ${T.accentLight}` : `1px solid ${T.cardBorder}`,
              background: sel ? "rgba(96,165,250,0.14)" : "rgba(255,255,255,0.03)",
              transition: "all 150ms ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <span style={{ color: STATUS_COLOR[m.status], fontSize: 10, flexShrink: 0 }}>{STATUS_GLYPH[m.status]}</span>
                {m.tag && tagChip(m.tag)}
                <span style={{ marginLeft: "auto", fontFamily: T.mono, fontSize: 9, color: T.faint }}>{m.doneWork}/{m.totalWork}</span>
              </div>
              <div style={{
                color: sel ? T.strong : T.muted, fontSize: 12, fontWeight: 600,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                textDecoration: m.status === "skipped" ? "line-through" : "none",
              }}>{e.name}</div>
            </button>
          );
        })}
      </div>
    );
  }

  // variant "list" — desktop left pane
  return (
    <div style={{ padding: 14, borderRadius: 14, background: T.cardBg, border: `1px solid ${T.cardBorder}` }}>
      <div style={{ color: T.faint, fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 1.0, marginBottom: 10 }}>EXERCISES</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {exercises.map((e, i) => {
          const m = meta(e, i);
          const sel = i === shownIdx;
          const prev = i > 0 ? exercises[i - 1] : null;
          const firstInSuperset = e.superset && (!prev || prev.superset !== e.superset);
          return (
            <React.Fragment key={e.id}>
              {firstInSuperset && (
                <div style={{ color: T.bands, fontFamily: T.mono, fontSize: 8.5, fontWeight: 800, letterSpacing: 1.0, padding: "6px 4px 2px" }}>
                  SUPERSET {e.superset}
                </div>
              )}
              <button onClick={() => onSelect(i)} style={{
                display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left",
                padding: "9px 10px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit",
                border: sel ? "1px solid rgba(96,165,250,0.5)" : "1px solid transparent",
                background: sel ? "rgba(96,165,250,0.12)" : "transparent",
                transition: "all 150ms ease",
              }}>
                <span style={{ width: 14, textAlign: "center", color: STATUS_COLOR[m.status], fontSize: 11, flexShrink: 0 }}>{STATUS_GLYPH[m.status]}</span>
                <span style={{
                  minWidth: 0, flex: 1,
                  color: sel ? T.strong : m.status === "done" ? T.muted : T.text,
                  fontSize: 13, fontWeight: sel ? 700 : 600,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  textDecoration: m.status === "skipped" ? "line-through" : "none",
                }}>{e.name}</span>
                <span style={{ fontFamily: T.mono, fontSize: 10, color: m.status === "done" ? T.green : T.faint, flexShrink: 0 }}>
                  {m.doneWork}/{m.totalWork}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

window.ExerciseNav = ExerciseNav;
