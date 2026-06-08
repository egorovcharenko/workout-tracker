function useWorkoutActions({
  workout,
  exercises,
  setExercises,
  sessionDate,
  sessionId,
  setSessionId,
  startedAt,
  elapsed,
  swaps,
  setSwaps,
  dataRef,
  startTimer,
  setRest,
  queueSave
}) {

  const patchSet = (eIdx, sIdx, patch) => {
    return exercises.map((e, i) => i !== eIdx ? e : ({
      ...e,
      sets: e.sets.map((s, j) => j !== sIdx ? s : ({ ...s, ...patch })),
    }));
  };

  const updateAndSave = (next) => {
    setExercises(next);
    queueSave(next, sessionId, startedAt, elapsed);
    saveSessionSets(workout.name, sessionDate, next);
  };

  const onPickWeight = (eIdx, sIdx, w) => {
    startTimer();
    updateAndSave(patchSet(eIdx, sIdx, { weight: w }));
  };

  const onPickBodyweight = (eIdx, sIdx, w) => {
    startTimer();
    saveBodyweight(w);
    const next = exercises.map(e => e.assist
      ? { ...e, sets: e.sets.map(s => ({ ...s, bodyweight: w })) }
      : e);
    updateAndSave(next);
  };

  const onPickGrip = (eIdx, sIdx, g) => {
    startTimer();
    updateAndSave(patchSet(eIdx, sIdx, { grip: g }));
  };

  const onToggleBand = (eIdx, sIdx, b) => {
    startTimer();
    const next = exercises.map((e, i) => {
      if (i !== eIdx) return e;
      return {
        ...e,
        sets: e.sets.map((s, j) => {
          if (j !== sIdx) return s;
          const cur = s.bands || [];
          let bands;
          if (b === "__use_last__") {
            bands = (s.lastBands || []).slice();
          } else {
            bands = cur.includes(b) ? cur.filter(x => x !== b) : [...cur, b].sort((a, c) => a - c);
          }
          return { ...s, bands };
        }),
      };
    });
    updateAndSave(next);
  };

  const onClearBands = (eIdx, sIdx) => {
    startTimer();
    updateAndSave(patchSet(eIdx, sIdx, { bands: [] }));
  };

  const onLogReps = (eIdx, sIdx, r) => {
    startTimer();
    let next = patchSet(eIdx, sIdx, { reps: r, completed: true });

    const ex = next[eIdx];
    const inSuperset = !!ex.superset;
    let shouldRest = !inSuperset;
    if (inSuperset) {
      const isRoundEnd = next.every((e2) => {
        if (e2.superset !== ex.superset || e2.skipped) return true;
        const setAtIdx = e2.sets[sIdx];
        return !setAtIdx || setAtIdx.completed;
      });
      shouldRest = isRoundEnd;
    }

    if (shouldRest) {
      let nextSet = null;
      const sameExNextIdx = ex.sets.findIndex((s, k) => k > sIdx && !s.completed);
      if (sameExNextIdx !== -1) {
        nextSet = ex.sets[sameExNextIdx];
      } else {
        const nextExIdx = next.findIndex((e, k) => k > eIdx && e.sets.some(s => !s.completed));
        if (nextExIdx !== -1) {
          nextSet = next[nextExIdx].sets.find(s => !s.completed);
        }
      }

      const restKind = (nextSet && nextSet.kind === "warmup") ? "warmup" : "work";
      const total = restKind === "warmup" ? 30 : (ex.rest || 90);
      setRest({ total, left: total, endAt: Date.now() + total * 1000, eIdx, sIdx, kind: restKind, paused: false });
    } else {
      setRest(null);
    }

    setTimeout(() => {
      setExercises(prev => transitionActiveSetAfterLog(prev, eIdx, sIdx));
    }, 350);

    updateAndSave(next);
  };

  const onReopenSet = (eIdx, sIdx) => {
    const next = exercises.map((e, i) => {
      if (i !== eIdx) return e;
      return {
        ...e,
        sets: e.sets.map((s, j) => {
          if (j === sIdx) return { ...s, active: true, completed: false, userSkipped: false };
          if (s.active) return { ...s, active: false };
          return s;
        }),
      };
    });
    const cleaned = next.map((e, i) => i === eIdx ? e : ({
      ...e,
      sets: e.sets.map(s => s.active ? { ...s, active: false } : s),
    }));
    updateAndSave(cleaned);
  };

  const onSkipWarmup = (eIdx) => {
    const next = exercises.map((e, i) => {
      if (i !== eIdx) return e;
      const sets = e.sets.map(s => s.kind === "warmup" ? { ...s, active: false, completed: false, userSkipped: true } : s);
      const firstWork = sets.findIndex(s => s.kind === "work" && !s.completed);
      if (firstWork !== -1) sets[firstWork] = { ...sets[firstWork], active: true };
      return { ...e, sets };
    });
    updateAndSave(next);
  };

  const onSkipExercise = (eIdx) => {
    const next = exercises.map((e, i) => {
      if (i !== eIdx) return e;
      const skipped = !e.skipped;
      const sets = e.sets.map(s => ({ ...s, active: false }));
      return { ...e, skipped, sets };
    });
    activateNextSet(next);
    const skippedNames = new Set(next.filter(e => e.skipped).map(e => e.name));
    saveSkippedExercises(workout.name, sessionDate, skippedNames);
    updateAndSave(next);
  };

  const onDeferExercise = (eIdx) => {
    const target = exercises[eIdx];
    if (!target || target.superset) return;
    const moved = { ...target, deferred: true, sets: target.sets.map(s => ({ ...s, active: false })) };
    const next = [...exercises.filter((_, i) => i !== eIdx), moved];
    activateNextSet(next);
    saveDeferred(workout.name, sessionDate, next.filter(e => e.deferred).map(e => e.name));
    updateAndSave(next);
  };

  const onSwapExercise = (eIdx, newName) => {
    const ex = exercises[eIdx];
    const tIdx = ex.templateExIdx;
    const isSub = ex.subIdx != null;
    const swapKey = isSub ? `${tIdx}-${ex.subIdx}` : `${tIdx}`;
    const wrapper = workout.exercises[tIdx];
    const originalName = isSub
      ? (wrapper?.supersetExercises?.[ex.subIdx]?.name || ex.name)
      : (wrapper?.name || ex.name);
    const nextSwaps = { ...swaps };
    if (newName === originalName) delete nextSwaps[swapKey];
    else nextSwaps[swapKey] = newName;
    saveSwaps(workout.name, sessionDate, nextSwaps);
    setSwaps(nextSwaps);
    const { last, hints } = dataRef.current;
    let exs = flattenTemplate(applySwaps(workout, nextSwaps), last, hints);
    exs = exs.map((item, i) => {
      if (i === eIdx) return item;
      const prevEx = exercises[i];
      if (prevEx && prevEx.name === item.name) {
        return { ...item, sets: prevEx.sets.map(s => ({ ...s })) };
      }
      return item;
    });
    const skippedNames = loadSkippedExercises(workout.name, sessionDate);
    if (skippedNames.size) exs = exs.map(e => skippedNames.has(e.name) ? { ...e, skipped: true } : e);
    activateNextSet(exs);
    updateAndSave(exs);
  };

  const onAddSet = (eIdx) => {
    const next = exercises.map((e, i) => {
      if (i !== eIdx) return e;
      const lastWork = [...e.sets].reverse().find(s => s.kind === "work");
      const newIdx = (typeof lastWork?.idx === "number" ? lastWork.idx : 0) + 1;
      const newSetNumber = (lastWork?.setNumber || 0) + 1;
      const newSet = {
        kind: "work", idx: newIdx,
        setNumber: newSetNumber,
        saveExerciseName: lastWork?.saveExerciseName || e.name,
        completed: false, active: false, reps: null,
        weight: lastWork?.weight || 0,
        bodyweight: lastWork?.bodyweight,
        bands: lastWork?.bands ? lastWork.bands.slice() : [],
        grip: lastWork?.grip,
        lastWeight: null, lastBands: [], lastReps: null,
      };
      return { ...e, sets: [...e.sets, newSet] };
    });
    updateAndSave(next);
  };

  const onRemoveSet = (eIdx) => {
    const next = exercises.map((e, i) => {
      if (i !== eIdx) return e;
      const workEntries = e.sets.map((s, k) => ({ s, k })).filter(x => x.s.kind === "work");
      if (workEntries.length <= 1) return e;
      const trailing = workEntries[workEntries.length - 1];
      const wasActive = trailing.s.active;
      let sets = e.sets.filter((_, j) => j !== trailing.k);
      if (wasActive) {
        const reactivate = [...sets].map((s, k) => ({ s, k })).reverse()
          .find(x => x.s.kind === "work" && !x.s.completed)?.k;
        if (reactivate != null) sets = sets.map((s, k) => k === reactivate ? { ...s, active: true } : s);
      }
      return { ...e, sets };
    });
    updateAndSave(next);
  };

  const onRemoveWarmup = (eIdx) => {
    const next = exercises.map((e, i) => i !== eIdx ? e : ({ ...e, sets: e.sets.filter(s => s.kind !== "warmup") }));
    updateAndSave(next);
  };

  const onFinishWorkout = (elapsedSec) => {
    localStorage.removeItem(SETS_LS_KEY(workout.name, sessionDate));
    const payload = serializeForSave(exercises, workout.name, sessionId, startedAt, elapsedSec, sessionDate);
    api.save(payload).finally(() => {
      window.location.href = "/";
    });
  };

  return {
    onPickWeight,
    onPickBodyweight,
    onPickGrip,
    onToggleBand,
    onClearBands,
    onLogReps,
    onReopenSet,
    onSkipWarmup,
    onSkipExercise,
    onDeferExercise,
    onSwapExercise,
    onAddSet,
    onRemoveSet,
    onRemoveWarmup,
    onFinishWorkout
  };
}

if (typeof window !== "undefined") {
  window.useWorkoutActions = useWorkoutActions;
}
