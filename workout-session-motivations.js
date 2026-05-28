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

window.MotivationsList = MotivationsList;
