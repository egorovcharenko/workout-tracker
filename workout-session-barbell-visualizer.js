function BarbellVisualizer({ weight, onWeightChange }) {
  const PLATE_COLORS = {
    45: { bg: "#3B82F6", text: "#FFFFFF" }, // blue
    35: { bg: "#EAB308", text: "#1E293B" }, // yellow
    25: { bg: "#10B981", text: "#FFFFFF" }, // green
    15: { bg: "#F97316", text: "#FFFFFF" }, // orange
    10: { bg: "#F8FAFC", text: "#1E293B" }, // white
    5: { bg: "#6B7280", text: "#FFFFFF" },  // grey
    2.5: { bg: "#EF4444", text: "#FFFFFF" }, // red
    1: { bg: "#06B6D4", text: "#FFFFFF" },   // cyan
    0.5: { bg: "#A855F7", text: "#FFFFFF" }, // purple
  };

  const PLATE_SIZES = [45, 35, 25, 15, 10, 5, 2.5, 1, 0.5];

  // Decompose weight into plates on one side
  const loadedPlates = [];
  let rem = (weight - 45) / 2;
  if (rem > 0) {
    for (const p of PLATE_SIZES) {
      while (rem >= p - 0.0001) {
        loadedPlates.push(p);
        rem = Math.round((rem - p) * 100) / 100;
      }
    }
  }

  const handleAddPlate = (p) => {
    onWeightChange(weight + p * 2);
  };

  const handleRemovePlateAtIndex = (idx) => {
    const p = loadedPlates[idx];
    onWeightChange(Math.max(45, weight - p * 2));
  };

  const handleClear = () => {
    onWeightChange(45);
  };

  const getPlateWidth = (p) => {
    const widths = { 45: 14, 35: 13, 25: 12, 15: 11, 10: 10, 5: 8, 2.5: 7, 1: 6, 0.5: 5 };
    return widths[p] || 12;
  };

  const getPlateHeight = (p) => {
    const heights = { 45: 48, 35: 43, 25: 38, 15: 33, 10: 28, 5: 20, 2.5: 16, 1: 13, 0.5: 10 };
    return heights[p] || 36;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
      {/* Barbell load graphic */}
      <div style={{
        position: "relative",
        height: 64,
        background: "rgba(255,255,255,0.015)",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}>
        {/* Central Shaft */}
        <div style={{
          position: "absolute",
          left: "35%",
          right: "35%",
          height: 4,
          background: "linear-gradient(180deg, #94A3B8, #475569)",
          borderRadius: 1,
        }} />

        {/* Left Sleeve (where plates go) */}
        <div style={{
          position: "absolute",
          left: "8%",
          width: "27%",
          height: 8,
          background: "linear-gradient(180deg, #CBD5E1, #94A3B8)",
          borderRadius: "2px 0 0 2px",
        }} />

        {/* Right Sleeve (where plates go) */}
        <div style={{
          position: "absolute",
          right: "8%",
          width: "27%",
          height: 8,
          background: "linear-gradient(180deg, #CBD5E1, #94A3B8)",
          borderRadius: "0 2px 2px 0",
        }} />

        {/* Left Collar Sleeve Stop */}
        <div style={{
          position: "absolute",
          left: "35%",
          width: 3,
          height: 16,
          background: "#475569",
          borderRadius: 1,
        }} />

        {/* Right Collar Sleeve Stop */}
        <div style={{
          position: "absolute",
          right: "35%",
          width: 3,
          height: 16,
          background: "#475569",
          borderRadius: 1,
        }} />

        {/* Left sleeve loaded plates (inside out: right to left) */}
        <div style={{
          position: "absolute",
          right: "65%",
          marginRight: 2,
          display: "flex",
          flexDirection: "row-reverse",
          alignItems: "center",
          gap: 2,
        }}>
          {loadedPlates.map((p, idx) => {
            const extraMargin = (p <= 5 && idx > 0 && loadedPlates[idx - 1] > 5) ? 6 : 0;
            return (
              <div
                key={`left-${idx}`}
                onClick={() => handleRemovePlateAtIndex(idx)}
                title="Click to remove plate"
                style={{
                  width: getPlateWidth(p),
                  height: getPlateHeight(p),
                  background: PLATE_COLORS[p].bg,
                  color: PLATE_COLORS[p].text,
                  fontSize: p < 5 ? 6 : 8,
                  fontWeight: 900,
                  fontFamily: T.mono,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 2,
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
                  userSelect: "none",
                  transition: "transform 100ms",
                  marginRight: extraMargin,
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.06)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                {p === 0.5 ? '.5' : p}
              </div>
            );
          })}
        </div>

        {/* Right sleeve loaded plates (inside out: left to right) */}
        <div style={{
          position: "absolute",
          left: "65%",
          marginLeft: 2,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 2,
        }}>
          {loadedPlates.map((p, idx) => {
            const extraMargin = (p <= 5 && idx > 0 && loadedPlates[idx - 1] > 5) ? 6 : 0;
            return (
              <div
                key={`right-${idx}`}
                onClick={() => handleRemovePlateAtIndex(idx)}
                title="Click to remove plate"
                style={{
                  width: getPlateWidth(p),
                  height: getPlateHeight(p),
                  background: PLATE_COLORS[p].bg,
                  color: PLATE_COLORS[p].text,
                  fontSize: p < 5 ? 6 : 8,
                  fontWeight: 900,
                  fontFamily: T.mono,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 2,
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
                  userSelect: "none",
                  transition: "transform 100ms",
                  marginLeft: extraMargin,
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.06)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                {p === 0.5 ? '.5' : p}
              </div>
            );
          })}
        </div>

        {/* Central Display Bubble */}
        <div style={{
          position: "absolute",
          background: "rgba(11,15,20,0.9)",
          border: `1px solid rgba(255,255,255,0.08)`,
          borderRadius: 8,
          padding: "4px 10px",
          fontFamily: T.mono,
          fontSize: 13,
          fontWeight: 800,
          color: T.strong,
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          pointerEvents: "none",
        }}>
          {weight} <span style={{ color: T.faint, fontSize: 10, fontWeight: 500 }}>lb</span>
        </div>
      </div>

      {/* Plate Loader buttons row */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: T.muted, fontFamily: T.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.6 }}>
            ADD PLATES (PER SIDE)
          </span>
          {loadedPlates.length > 0 && (
            <button
              onClick={handleClear}
              style={{
                background: "transparent",
                border: 0,
                color: T.red,
                fontFamily: T.mono,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 0.4,
                cursor: "pointer",
                padding: "2px 4px",
              }}
            >
              RESET TO BAR (45LB)
            </button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
          {PLATE_SIZES.map(p => (
            <button
              key={p}
              onClick={() => handleAddPlate(p)}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid rgba(255,255,255,0.06)`,
                color: PLATE_COLORS[p].bg,
                fontFamily: T.mono,
                fontSize: 12,
                fontWeight: 700,
                padding: "8px 0",
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 120ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.borderColor = PLATE_COLORS[p].bg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              }}
            >
              +{p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

window.BarbellVisualizer = BarbellVisualizer;
