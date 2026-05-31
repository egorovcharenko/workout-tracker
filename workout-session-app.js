function App() {
  const [workoutId, setWorkoutId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("w");
    if (fromUrl && WORKOUTS.some(w => w.id === fromUrl)) return fromUrl;
    return (WORKOUTS.find(w => w.main) || WORKOUTS[0]).id;
  });
  const workout = useMemo(() => WORKOUTS.find(w => w.id === workoutId) || WORKOUTS[0], [workoutId]);

  const onPickWorkout = (id) => {
    if (id === workoutId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("w", id);
    window.history.replaceState({}, "", url);
    setWorkoutId(id);
  };

  const [exercises, setExercises] = useState([]);
  const [sessionDate, setSessionDate] = useState(() => localDate());
  const [loaded, setLoaded] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  // Which exercise the center column shows. null = follow the current (active)
  // exercise automatically. A number = the user tapped a row in the exercise
  // nav to focus it; cleared back to auto-follow whenever the active exercise
  // advances (see effect below).
  const [focusIdx, setFocusIdx] = useState(null);
  const {
    elapsed,
    running,
    startedAt,
    rest,
    setElapsed,
    setRunning,
    setStartedAt,
    setRest,
    startTimer,
    restAdd,
    restSkip,
    restToggle
  } = useWorkoutTimers(workoutId, exercises);
  const [motivations, setMotivations] = useState({});
  const [history, setHistory] = useState([]);
  const [statHistory, setStatHistory] = useState({});
  const [swaps, setSwaps] = useState({});
  const dataRef = useRef({ last: {}, hints: {} });
  const lastInteractionRef = useRef(Date.now());
  const IDLE_THRESHOLD_MS = 5 * 60 * 1000;

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setExercises([]);
    setSessionId(null);
    setMotivations({});
    setHistory([]);
    setStatHistory({});
    setSwaps({});
    (async () => {
      try {
        const results = await Promise.allSettled([
          api.lastSession(workout.name),
          api.todaySession(workout.name),
          api.hints(),
          api.history(20),
          api.history1RM(),
        ]);
        if (cancelled) return;
        const [lastR, todayR, hintsR, histR, stat1rmR] = results;
        const last = lastR.status === "fulfilled" ? lastR.value : {};
        const today = todayR.status === "fulfilled" ? todayR.value : null;
        const hints = hintsR.status === "fulfilled" ? hintsR.value : {};
        const hist = histR.status === "fulfilled" ? histR.value : [];
        const stat1rm = stat1rmR.status === "fulfilled" ? stat1rmR.value : {};
        if (lastR.status === "rejected") console.warn("[V2] last-session failed:", lastR.reason);
        if (todayR.status === "rejected") console.warn("[V2] today-session failed:", todayR.reason);
        if (hintsR.status === "rejected") console.warn("[V2] hints failed:", hintsR.reason);
        if (histR.status === "rejected") console.warn("[V2] history failed:", histR.reason);
        if (stat1rmR.status === "rejected") console.warn("[V2] 1rm-history failed:", stat1rmR.reason);
        setHistory(hist || []);
        setStatHistory(stat1rm || {});
        dataRef.current = { last: last || {}, hints: hints || {} };
        const activeDate = (today && today.date) ? today.date : localDate();
        setSessionDate(activeDate);
        const swapMap = loadSwaps(workout.name, activeDate);
        setSwaps(swapMap);
        let exs = flattenTemplate(applySwaps(workout, swapMap), last || {}, hints || {});
        const savedSetsMap = loadSessionSets(workout.name, activeDate);
        if (savedSetsMap && Object.keys(savedSetsMap).length) {
          exs = exs.map(ex => {
            const saved = savedSetsMap[ex.name];
            if (saved) {
              return { ...ex, sets: saved.map(s => ({ ...s })) };
            }
            return ex;
          });
        }
        if (today && today.id) {
          exs = hydrateToday(exs, today.sets || []);
          setSessionId(today.id);
          if (today.started_at) {
            const startedMs = Date.parse(today.started_at);
            if (!isNaN(startedMs)) setStartedAt(startedMs);
          }
          setElapsed(today.duration_sec || 0);
          // (AI motivation hydration removed — the feature's UI is disabled.)
        } else {
          if (exs.length && exs[0].sets.length) exs[0].sets[0].active = true;
        }
        const skippedNames = loadSkippedExercises(workout.name, activeDate);
        if (skippedNames.size) {
          exs = exs.map(e => skippedNames.has(e.name) ? { ...e, skipped: true } : e);
        }
        const deferredNames = loadDeferred(workout.name, activeDate);
        if (deferredNames.length) exs = applyDeferredOrder(exs, deferredNames);
        if (skippedNames.size || deferredNames.length) activateNextSet(exs);

        setExercises(exs);
        setLoaded(true);
      } catch (e) {
        console.error("[V2] mount failed:", e);
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [workout]);

  const saveDebounceRef = useRef(null);
  const queueSave = (currentExercises, currentSessionId, currentStartedAt, currentElapsed) => {
    clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      const payload = serializeForSave(currentExercises, workout.name, currentSessionId, currentStartedAt, currentElapsed, sessionDate);
      if (payload.sets.length === 0) return;
      autoSavePayload(payload, (newId) => {
        if (!currentSessionId && newId) setSessionId(newId);
      });
    }, 400);
  };

  const patchSet = (eIdx, sIdx, patch) => {
    const next = exercises.map((e, i) => i !== eIdx ? e : ({
      ...e,
      sets: e.sets.map((s, j) => j !== sIdx ? s : ({ ...s, ...patch })),
    }));
    return next;
  };

  const updateAndSave = (next) => {
    setExercises(next);
    queueSave(next, sessionId, startedAt, elapsed);
    saveSessionSets(workout.name, sessionDate, next);
  };

  const onPickWeight = (eIdx, sIdx, w) => { startTimer(); updateAndSave(patchSet(eIdx, sIdx, { weight: w })); };
  // Bodyweight is global: adjusting it on any set updates every assist
  // exercise's sets at once and persists it for future sessions.
  const onPickBodyweight = (eIdx, sIdx, w) => {
    startTimer();
    saveBodyweight(w);
    const next = exercises.map(e => e.assist
      ? { ...e, sets: e.sets.map(s => ({ ...s, bodyweight: w })) }
      : e);
    updateAndSave(next);
  };
  const onPickGrip = (eIdx, sIdx, g) => { startTimer(); updateAndSave(patchSet(eIdx, sIdx, { grip: g })); };

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
    const kind = ex.sets[sIdx].kind;
    const inSuperset = !!ex.superset;
    const partnerHasMore = inSuperset && next.some((e2, j) =>
      j !== eIdx && e2.superset === ex.superset && e2.sets.some(s => !s.completed)
    );
    if (!partnerHasMore) {
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
      setExercises(prev => {
        const cur = prev[eIdx];
        if (cur.superset) {
          const partnerIdx = prev.findIndex((e2, j) => j !== eIdx && e2.superset === cur.superset);
          if (partnerIdx !== -1) {
            const partner = prev[partnerIdx];
            const partnerNext = partner.sets.findIndex(s => !s.completed);
            if (partnerNext !== -1) {
              return prev.map((e, i) => {
                if (i === eIdx) return { ...e, sets: e.sets.map((s, j) => j === sIdx ? { ...s, active: false } : s) };
                if (i === partnerIdx) return { ...e, sets: e.sets.map((s, j) => j === partnerNext ? { ...s, active: true } : s) };
                return e;
              });
            }
          }
        }
        const sameExNext = cur.sets.findIndex((s, k) => k > sIdx && !s.completed);
        if (sameExNext !== -1) {
          return prev.map((e, i) => i !== eIdx ? e : ({
            ...e,
            sets: e.sets.map((s, j) => {
              if (j === sIdx) return { ...s, active: false };
              if (j === sameExNext) return { ...s, active: true };
              return s;
            }),
          }));
        }
        const nextExIdx = prev.findIndex((e, k) => k > eIdx && e.sets.some(s => !s.completed));
        return prev.map((e, i) => {
          if (i === eIdx) return { ...e, sets: e.sets.map((s, j) => j === sIdx ? { ...s, active: false } : s) };
          if (i === nextExIdx) {
            const firstUndone = e.sets.findIndex(s => !s.completed);
            if (firstUndone === -1) return e;
            return { ...e, sets: e.sets.map((s, j) => j === firstUndone ? { ...s, active: true } : s) };
          }
          return e;
        });
      });
    }, 350);

    setExercises(next);
    queueSave(next, sessionId, startedAt, elapsed);
    // AI motivation messages are disabled for now (the UI surface was removed),
    // so we no longer fire requestMotivation on exercise completion.
  };

  const buildMotivatePayload = (exercise, sid) => {
    const subNames = [exercise.name];
    const today = sessionDate;
    const todayMs = Date.parse(today + 'T00:00:00Z');

    const current = [];
    exercise.sets.forEach(s => {
      if (!s.completed) return;
      const bandSum = (s.bands || []).reduce((a, b) => a + b, 0);
      let weight_lb;
      if (exercise.assist) {
        weight_lb = Math.max(0, (s.bodyweight || 0) - bandSum);
      } else if (exercise.isBandsOnly) {
        weight_lb = bandSum;
      } else if (exercise.bandAddon) {
        weight_lb = (s.weight || 0) + bandSum;
      } else {
        weight_lb = s.weight || 0;
      }
      current.push({
        sub: exercise.name,
        type: s.kind === "warmup" ? "warmup" : "working",
        set_number: s.setNumber,
        reps: parseInt(s.reps) || 0,
        weight_lb,
      });
    });

    const previous = [];
    for (const sess of (history || []).slice(0, 4)) {
      const sessSets = (sess.sets || []).filter(st => subNames.includes(st.exercise));
      if (sessSets.length) previous.push({
        date: sess.date,
        sets: sessSets.map(st => ({ sub: st.exercise, type: st.set_type, reps: st.reps, weight_lb: st.weight_lb })),
      });
      if (previous.length >= 2) break;
    }

    const muscles = [];
    subNames.forEach(name => {
      const m = EXERCISE_MUSCLES[name];
      if (m) muscles.push(...(m.primary || []), ...(m.secondary || []));
    });

    const statsLoaded = Object.keys(statHistory.orm || {}).length > 0;
    const ormOf = (w, r) => r > 1 ? w * (1 + r / 30) : w;

    const prs = subNames.map(subName => {
      const histSessions = (history || []).filter(s =>
        (s.sets || []).some(st => st.exercise === subName && st.set_type === 'working')
      );
      let histMaxWt = 0, histMaxReps = 0, histMaxOrm = 0;
      const histByDate = {};
      histSessions.forEach(sess => {
        let mw = 0, mr = 0, mo = 0, sv = 0;
        sess.sets.forEach(st => {
          if (st.exercise !== subName || st.set_type !== 'working') return;
          const w = +st.weight_lb || 0;
          const r = parseInt(st.reps) || 0;
          if (w > mw) mw = w; if (mw > histMaxWt) histMaxWt = mw;
          if (r > mr) mr = r; if (mr > histMaxReps) histMaxReps = mr;
            const o = calcSet1RM(subName, w, r, st.bands_json);
            if (o > mo) mo = o;
            if (mo > histMaxOrm) histMaxOrm = mo;
            sv += w * r;
        });
        histByDate[sess.date] = { date: sess.date, orm: mo, wt: mw, reps: mr, vol: sv };
      });

      const ormHist  = ((statHistory.orm  || {})[subName] || []);
      const wtHist   = ((statHistory.wt   || {})[subName] || []);
      const repsHist = ((statHistory.reps || {})[subName] || []);
      const volHist  = ((statHistory.vol  || {})[subName] || []);
      const statMaxOrm  = ormHist.length  ? Math.max(...ormHist.map(d => +d.orm  || 0)) : 0;
      const statMaxWt   = wtHist.length   ? Math.max(...wtHist.map(d => +d.wt    || 0)) : 0;
      const statMaxReps = repsHist.length ? Math.max(...repsHist.map(d => +d.reps|| 0)) : 0;
      const byDate = { ...histByDate };
      ormHist.forEach (d => { (byDate[d.date] = byDate[d.date] || { date: d.date }).orm  = +d.orm  || 0; });
      wtHist.forEach  (d => { (byDate[d.date] = byDate[d.date] || { date: d.date }).wt   = +d.wt   || 0; });
      repsHist.forEach(d => { (byDate[d.date] = byDate[d.date] || { date: d.date }).reps = +d.reps || 0; });
      volHist.forEach (d => { (byDate[d.date] = byDate[d.date] || { date: d.date }).vol  = +d.vol  || 0; });

      const prevMaxOrm  = Math.max(histMaxOrm,  statMaxOrm);
      const prevMaxWt   = Math.max(histMaxWt,   statMaxWt);
      const prevMaxReps = Math.max(histMaxReps, statMaxReps);
      const allHist = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

      if (allHist.length === 0) return null;

      const workingSets = exercise.sets.filter(s => s.kind === "work" && s.completed);
      const curWt   = workingSets.reduce((m, s) => Math.max(m, (() => {
        const bs = (s.bands || []).reduce((a, b) => a + b, 0);
        return exercise.assist ? Math.max(0, (s.bodyweight || 0) - bs)
             : exercise.isBandsOnly ? bs
             : exercise.bandAddon ? (s.weight || 0) + bs
             : (s.weight || 0);
      })()), 0);
      const curReps = workingSets.reduce((m, s) => Math.max(m, parseInt(s.reps) || 0), 0);
      const curOrm  = workingSets.reduce((m, s) => {
        const reps = parseInt(s.reps) || 0;
        const bs = (s.bands || []).reduce((a, b) => a + b, 0);
        const w = exercise.assist ? Math.max(0, (s.bodyweight || 0) - bs)
                : exercise.isBandsOnly ? bs
                : exercise.bandAddon ? (s.weight || 0) + bs
                : (s.weight || 0);
        const isAssist = exercise.assist;
        const o = isAssist ? (reps > 1 ? (w * reps / 30.0) - bs : -bs) : ormOf(w, reps);
        return reps > 0 && w > 0 ? Math.max(m, o) : m;
      }, 0);
      const curVol = workingSets.reduce((sum, s) => {
        const reps = parseInt(s.reps) || 0;
        const bs = (s.bands || []).reduce((a, b) => a + b, 0);
        const w = exercise.assist ? Math.max(0, (s.bodyweight || 0) - bs)
                : exercise.isBandsOnly ? bs
                : exercise.bandAddon ? (s.weight || 0) + bs
                : (s.weight || 0);
        return sum + (reps > 0 && w > 0 ? w * reps : 0);
      }, 0);

      const trimmed = allHist.slice(-12);

      const lastDate = allHist[allHist.length - 1].date;
      const daysSinceLast = Math.round((todayMs - Date.parse(lastDate + 'T00:00:00Z')) / 86400000);
      const recent = allHist.filter(h => todayMs - Date.parse(h.date + 'T00:00:00Z') <= 28 * 86400000);
      const prior  = allHist.filter(h => {
        const ago = todayMs - Date.parse(h.date + 'T00:00:00Z');
        return ago > 28 * 86400000 && ago <= 56 * 86400000;
      });
      const avg = arr => arr.length ? arr.reduce((s, x) => s + (+x.vol || 0), 0) / arr.length : 0;
      const recentAvg = avg(recent), priorAvg = avg(prior);
      const volTrendPct = priorAvg > 0 ? Math.round((recentAvg - priorAvg) / priorAvg * 100) : null;

      const sameWtReps = curWt > 0 ? allHist.filter(h => h.wt === curWt).map(h => h.reps).filter(r => r > 0) : [];
      const repsAtCurWtImproved = sameWtReps.length >= 2 && curReps > Math.max(...sameWtReps);

      return {
        sub: subName,
        current_orm: curOrm,           previous_best_orm: prevMaxOrm,    is_orm_pr:    !!(curOrm && curOrm > prevMaxOrm),
        current_max_weight: curWt,     previous_best_weight: prevMaxWt,  is_weight_pr: !!(curWt && curWt > prevMaxWt),
        current_max_reps: curReps,     previous_best_reps: prevMaxReps,  is_reps_pr:   !!(curReps && curReps > prevMaxReps),
        current_volume: curVol,
        sessions_in_history: allHist.length,
        days_since_last_session: daysSinceLast,
        returning_after_layoff: daysSinceLast >= 14,
        vol_trend_pct_4wk_vs_prior: volTrendPct,
        reps_at_current_weight_improved: repsAtCurWtImproved,
        tied_previous_best_orm: !!(curOrm && prevMaxOrm && curOrm === prevMaxOrm),
        history_timeseries: trimmed,
        stats_source: statsLoaded ? "full" : "recent_history_only",
      };
    }).filter(Boolean);

    const statsFailed = !statsLoaded;

    return {
      session_id: sid,
      exercise: exercise.name,
      muscles: [...new Set(muscles)],
      stats_loaded: !statsFailed,
      current,
      previous,
      prs,
    };
  };

  const requestMotivation = async (exercise, sid) => {
    setMotivations(m => ({ ...m, [exercise.id]: "__loading__" }));
    try {
      const payload = buildMotivatePayload(exercise, sid);
      const res = await api.motivate(payload);
      if (res && res.message) {
        setMotivations(m => ({ ...m, [exercise.id]: res.message }));
      } else {
        setMotivations(m => { const c = { ...m }; delete c[exercise.id]; return c; });
      }
    } catch (e) {
      console.warn("[V2-MOTIVATE]", e);
      setMotivations(m => { const c = { ...m }; delete c[exercise.id]; return c; });
    }
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

  // Defer ("do later"): move this exercise to the end of the workout so the
  // flow continues with the next one and you come back to it after everything
  // else. Distinct from skip (which drops it entirely). Standalone exercises
  // only — superset members can't be deferred without breaking interleaving.
  // Persisted (workout, date) so a reload keeps the new order.
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

  // Remove the trailing working set — now unconditional (works even if that
  // set is the active one or already completed), as long as >1 working set
  // remains. If the removed set was active, the new trailing incomplete set
  // becomes active so focus/logging continues seamlessly.
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

  // The current (active) exercise's index: the one with an active set, else the
  // next non-skipped incomplete, else the last. Drives the nav highlight and
  // the auto-follow behavior for the center column.
  const currentIdx = (() => {
    let i = exercises.findIndex(e => !e.skipped && e.sets.some(s => s.active));
    if (i !== -1) return i;
    i = exercises.findIndex(e => !e.skipped && e.sets.some(s => !s.completed));
    if (i !== -1) return i;
    return exercises.length - 1;
  })();

  // Auto-follow: when the active exercise advances (currentIdx changes), drop
  // any manual focus so the center column tracks the live workout again.
  useEffect(() => { setFocusIdx(null); }, [currentIdx]);

  // Tap an exercise in the nav → focus it in the center. If it has work left
  // and nothing in it is active yet, also make its next set active so it can
  // be logged immediately (deactivating whatever was active elsewhere). A
  // finished exercise just gets focused for review.
  const onSelectExercise = (idx) => {
    setFocusIdx(idx);
    const ex = exercises[idx];
    if (!ex || ex.skipped) return;
    const hasActiveHere = ex.sets.some(s => s.active);
    const firstIncomplete = ex.sets.findIndex(s => !s.completed);
    if (!hasActiveHere && firstIncomplete !== -1) {
      const next = exercises.map((e) => ({
        ...e,
        sets: e.sets.map(s => s.active ? { ...s, active: false } : s),
      }));
      next[idx] = {
        ...next[idx],
        sets: next[idx].sets.map((s, j) => j === firstIncomplete ? { ...s, active: true } : s),
      };
      updateAndSave(next);
    }
  };

  const totalSets = exercises.reduce((n, e) => n + e.sets.length, 0);
  const doneSets = exercises.reduce((n, e) =>
    e.skipped ? n + e.sets.length : n + e.sets.filter(s => s.completed).length, 0);

  if (!loaded) {
    return (
      <div style={{ height: "100%", overflowY: "auto" }}>
        <div style={{ maxWidth: 448, margin: "0 auto", minHeight: "100%", background: T.page }}>
          <Header workout={workout} workouts={WORKOUTS} onPickWorkout={onPickWorkout} done={0} total={0} elapsedSec={0} running={false} onToggleTimer={() => {}} />
          <div style={{ margin: "40px 16px", padding: "20px", textAlign: "center", color: T.muted, fontFamily: T.mono, fontSize: 13, border: `1px dashed ${T.cardBorder}`, borderRadius: 12 }}>
            loading workout…
          </div>
        </div>
      </div>
    );
  }

  // The exercise shown in the center column: the user's manual focus if set
  // and still valid, otherwise the current (active) exercise.
  const shownIdx = (focusIdx != null && exercises[focusIdx]) ? focusIdx : currentIdx;
  const shownExercise = exercises[shownIdx] || null;

  const nav = (variant) => (
    <ExerciseNav
      exercises={exercises}
      shownIdx={shownIdx}
      currentIdx={currentIdx}
      onSelect={onSelectExercise}
      onSwapExercise={onSwapExercise}
      variant={variant}
    />
  );

  return (
    <div style={{ height: "100%", overflowY: "auto", background: T.page }}>
      {TEST_MODE && (
        <div style={{ position: "sticky", top: 0, zIndex: 9000, background: "#F59E0B", color: "#1A1A1A", textAlign: "center", fontFamily: T.mono, fontWeight: 800, fontSize: 12, letterSpacing: 1, padding: "6px 10px" }}>
          ⚠ TEST MODE — nothing is being saved
        </div>
      )}
      <div className="session-shell">
        <aside className="exercise-nav-pane">
          {nav("list")}
        </aside>
        <div className="session-main">
          <Header
            workout={workout}
            workouts={WORKOUTS}
            onPickWorkout={onPickWorkout}
            done={doneSets}
            total={totalSets}
            elapsedSec={elapsed}
            running={running}
            onToggleTimer={() => setRunning(r => !r)}
          />
          <div className="exercise-nav-strip">
            {nav("strip")}
          </div>
          {shownExercise && (() => {
            const i = shownIdx;
            const ex = shownExercise;
            const supersetTag = ex.superset ? `${ex.superset}${ex.supersetPos || ''}` : null;
            return (
              <React.Fragment key={ex.id}>
                {ex.superset && (
                  <div style={{ margin: "4px 16px 6px", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(192,132,252,0.18)" }} />
                    <span style={{ color: T.bands, fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: 1.2 }}>
                      SUPERSET {ex.superset} · NO REST
                    </span>
                    <div style={{ flex: 1, height: 1, background: "rgba(192,132,252,0.18)" }} />
                  </div>
                )}
                <ExerciseCard
                  exercise={ex}
                  supersetTag={supersetTag}
                  rest={rest && rest.eIdx === i ? rest : null}
                  onRestAdd={restAdd}
                  onRestSkip={restSkip}
                  onRestToggle={restToggle}
                  onPickWeight={(sIdx, w) => onPickWeight(i, sIdx, w)}
                  onPickBodyweight={(sIdx, w) => onPickBodyweight(i, sIdx, w)}
                  onPickGrip={(sIdx, g) => onPickGrip(i, sIdx, g)}
                  onToggleBand={(sIdx, b) => onToggleBand(i, sIdx, b)}
                  onClearBands={(sIdx) => onClearBands(i, sIdx)}
                  onLogReps={(sIdx, r) => onLogReps(i, sIdx, r)}
                  onSkipWarmup={() => onSkipWarmup(i)}
                  onSkipExercise={() => onSkipExercise(i)}
                  onDeferExercise={() => onDeferExercise(i)}
                  onSwapExercise={(newName) => onSwapExercise(i, newName)}
                  onReopenSet={(sIdx) => onReopenSet(i, sIdx)}
                  onAddSet={() => onAddSet(i)}
                  onRemoveSet={() => onRemoveSet(i)}
                  onRemoveWarmup={() => onRemoveWarmup(i)}
                />
              </React.Fragment>
            );
          })()}
        </div>
        <aside className="stats-pane-wrap">
          <StatsPane
            exercise={shownExercise}
            history={history}
            statHistory={statHistory}
            exercises={exercises}
          />
        </aside>
      </div>
    </div>
  );
}

window.App = App;
