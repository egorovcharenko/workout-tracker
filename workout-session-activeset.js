function BarbellVisualizer({ weight, onWeightChange }) {
  const PLATE_COLORS = {
    45: { bg: "#3B82F6", text: "#FFFFFF" }, // blue
    35: { bg: "#EAB308", text: "#1E293B" }, // yellow
    25: { bg: "#10B981", text: "#FFFFFF" }, // green
    15: { bg: "#F97316", text: "#FFFFFF" }, // orange
    10: { bg: "#F8FAFC", text: "#1E293B" }, // white
    5: { bg: "#6B7280", text: "#FFFFFF" },  // grey
  };

  const PLATE_SIZES = [45, 35, 25, 15, 10, 5];

  // Decompose weight into plates on one side
  const loadedPlates = [];
  let rem = (weight - 45) / 2;
  if (rem > 0) {
    for (const p of PLATE_SIZES) {
      while (rem >= p) {
        loadedPlates.push(p);
        rem -= p;
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
    const widths = { 45: 14, 35: 13, 25: 12, 15: 11, 10: 10, 5: 9 };
    return widths[p] || 12;
  };

  const getPlateHeight = (p) => {
    const heights = { 45: 48, 35: 43, 25: 38, 15: 33, 10: 28, 5: 22 };
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
          {loadedPlates.map((p, idx) => (
            <div
              key={`left-${idx}`}
              onClick={() => handleRemovePlateAtIndex(idx)}
              title="Click to remove plate"
              style={{
                width: getPlateWidth(p),
                height: getPlateHeight(p),
                background: PLATE_COLORS[p].bg,
                color: PLATE_COLORS[p].text,
                fontSize: 8,
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
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.06)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              {p}
            </div>
          ))}
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
          {loadedPlates.map((p, idx) => (
            <div
              key={`right-${idx}`}
              onClick={() => handleRemovePlateAtIndex(idx)}
              title="Click to remove plate"
              style={{
                width: getPlateWidth(p),
                height: getPlateHeight(p),
                background: PLATE_COLORS[p].bg,
                color: PLATE_COLORS[p].text,
                fontSize: 8,
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
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.06)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              {p}
            </div>
          ))}
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
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

      {!isBW && exercise.isBarbell && (
        <BarbellVisualizer
          weight={baseW || 45}
          onWeightChange={onPickWeight}
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

window.ActiveSetBlock = ActiveSetBlock;
