function SessionDivider({ label, emoji, color, bg, border }) {
  return (
    <div style={{ margin: "10px 16px 8px", display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 1, background: border }} />
      <span style={{
        color, fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: 1.4,
        padding: "3px 9px", borderRadius: 6,
        background: bg, border: `1px solid ${border}`,
        display: "inline-flex", alignItems: "center", gap: 5,
      }}>
        <span aria-hidden style={{ fontSize: 11 }}>{emoji}</span>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: border }} />
    </div>
  );
}

function PmGate({ exercises, onContinuePm }) {
  const pmExs = exercises.filter(e => e.session === "PM");
  const previewNames = pmExs
    .filter(e => !e.skipped)
    .map(e => e.superset ? null : e.name)
    .filter(Boolean);
  const pmSupersetTags = Array.from(new Set(pmExs.filter(e => e.superset && !e.skipped).map(e => `Superset ${e.superset}`)));
  const previewLabels = [...previewNames, ...pmSupersetTags].join(" · ") || "(all PM exercises currently skipped)";

  return (
    <div style={{
      margin: "16px 16px 4px",
      padding: "22px 18px 18px",
      borderRadius: 16,
      background: "linear-gradient(180deg, rgba(96,165,250,0.12), rgba(96,165,250,0.03))",
      border: "1px solid rgba(96,165,250,0.28)",
      boxShadow: "0 12px 30px -16px rgba(59,130,246,0.35)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 26, marginBottom: 4 }} aria-hidden>🌙</div>
      <div style={{
        color: T.accentLight, fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: 1.4,
        marginBottom: 8,
      }}>EVENING SESSION</div>
      <div style={{ color: T.strong, fontSize: 16, fontWeight: 700, lineHeight: 1.35, marginBottom: 4 }}>
        Ready for the second half?
      </div>
      {previewLabels && (
        <div style={{ color: T.muted, fontSize: 11.5, lineHeight: 1.45, marginBottom: 16, padding: "0 4px" }}>
          {previewLabels}
        </div>
      )}
      <button onClick={onContinuePm} style={{
        background: "linear-gradient(180deg, #60A5FA, #3B82F6)",
        border: 0, color: "#0B0F14",
        padding: "14px 32px", borderRadius: 12,
        fontFamily: "inherit", fontSize: 15, fontWeight: 800, letterSpacing: 0.3,
        cursor: "pointer",
        boxShadow: "0 8px 22px -6px rgba(59,130,246,0.55)",
        minWidth: 180,
      }}>Continue →</button>
    </div>
  );
}

window.SessionDivider = SessionDivider;
window.PmGate = PmGate;
