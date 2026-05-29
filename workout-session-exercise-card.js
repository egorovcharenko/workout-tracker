function ExerciseCard({ exercise, supersetTag, rest, onRestAdd, onRestSkip, onRestToggle, onPickWeight, onPickBodyweight, onPickGrip, onToggleBand, onClearBands, onLogReps, onSkipWarmup, onSkipExercise, onSwapExercise, onReopenSet, onAddSet, onRemoveSet, onRemoveWarmup, motivation }) {
  // Full swap group (includes the current exercise) — drives the first-class
  // variant selector rendered under the title. null / single-member groups
  // render no selector.
  const swapGroup = getSwapGroup(exercise.name);
  const hasVariants = swapGroup && swapGroup.length > 1;
  // Lock the variant switch once a WORKING set is logged — switching after
  // real work would orphan those sets under the old exercise name. Warmups
  // don't lock it (a warmup shouldn't commit you to the variant).
  const anyLogged = exercise.sets.some(s => s.completed && s.kind === "work");

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

      {hasVariants && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 7,
            color: T.faint, fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 1.0,
          }}>
            <span aria-hidden style={{ fontSize: 11 }}>⇄</span>
            CHOOSE VARIANT
            {anyLogged && (
              <span style={{ marginLeft: "auto", color: T.disabled, fontWeight: 600, letterSpacing: 0.4, textTransform: "none" }}>
                locked — sets logged
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {swapGroup.map(opt => {
              const selected = opt.name === exercise.name;
              const locked = anyLogged && !selected;
              return (
                <button
                  key={opt.name}
                  onClick={selected || locked ? undefined : () => onSwapExercise(opt.name)}
                  disabled={selected || locked}
                  style={{
                    flex: "1 1 auto", minWidth: 0,
                    padding: "10px 14px", borderRadius: 11,
                    fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, letterSpacing: -0.2,
                    textAlign: "center", lineHeight: 1.2,
                    cursor: selected ? "default" : locked ? "not-allowed" : "pointer",
                    transition: "all 160ms ease",
                    border: selected
                      ? "1px solid rgba(96,165,250,0.7)"
                      : `1px solid ${T.cardBorder}`,
                    background: selected
                      ? "linear-gradient(180deg, rgba(96,165,250,0.22), rgba(59,130,246,0.12))"
                      : locked ? "transparent" : "rgba(255,255,255,0.03)",
                    color: selected ? "#DBEAFE" : locked ? T.disabled : T.text,
                    boxShadow: selected ? "0 4px 16px -6px rgba(59,130,246,0.6)" : "none",
                    opacity: locked ? 0.45 : 1,
                  }}
                >
                  {selected && <span aria-hidden style={{ marginRight: 6, color: T.accentLight }}>●</span>}
                  {opt.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${exercise.sets.length}, minmax(0, 1fr))`,
        gap: 6, marginTop: 12,
      }}>
        {exercise.sets.map((s, i) => (
          <SetCard key={i} s={s} idx={i} exercise={exercise} onReopenSet={onReopenSet} />
        ))}
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
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {hasWarmup && warmupActive && footerBtn("Skip warmup →", onSkipWarmup)}
          {hasWarmup && !warmupActive && footerBtn("× warmup", onRemoveWarmup)}
        </div>
      </div>
    </div>
  );
}

window.ExerciseCard = ExerciseCard;
