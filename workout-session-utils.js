// Workout Tracker Session Utilities (Non-React Helpers)

// Expose React hooks globally to avoid redeclaration issues in Babel Standalone scripts
var { useState, useEffect, useRef, useMemo, useCallback } = React;

const fetchT = (url, ms = 6000) => Promise.race([
  fetch(url),
  new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${url}`)), ms)),
]).then(async (r) => {
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  const txt = await r.text();
  try { return JSON.parse(txt); }
  catch (e) { throw new Error(`${url} → non-JSON response: ${txt.slice(0, 80)}`); }
});

const fetchTRetry = (url, timeout) => fetchT(url, timeout)
  .catch(e => { console.warn(`[V2] ${url} retry:`, e); return fetchT(url, timeout); });

const api = {
  todaySession: (workout) => fetchTRetry(`/api/today-session?workout=${encodeURIComponent(workout)}`, 6000),
  lastSession:  (workout) => fetchTRetry(`/api/last-session?workout=${encodeURIComponent(workout)}`, 6000),
  hints: () => fetchTRetry("/api/exercise-hints", 8000),
  history: (limit = 20) => fetchTRetry(`/api/history?limit=${limit}`, 10000),
  history1RM: () => fetchTRetry("/api/1rm-history", 10000),
  settings: () => fetchTRetry("/api/settings", 6000),
  save: (body) => fetch("/api/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
  motivate: (body) => fetch("/api/motivate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
  motivations: (sid) => fetchT(`/api/motivations?session_id=${sid}`),
};

function flattenTemplate(workout, lastSessionMap, hintsMap) {
  hintsMap = hintsMap || {};
  const lookupLast = (key) => hintsMap[key] || lastSessionMap[key] || null;
  const exerciseGripCache = {};
  const lookupExerciseGrip = (exName) => {
    if (exerciseGripCache[exName] !== undefined) return exerciseGripCache[exName];
    let found = null;
    const scan = (src, kF) => Object.keys(src || {}).forEach(k => {
      const [n, kind] = k.split("|");
      if (!found && n === exName && (!kF || kind === kF) && src[k].grip) found = src[k].grip;
    });
    scan(hintsMap, "working"); scan(lastSessionMap, "working"); scan(hintsMap, "warmup"); scan(lastSessionMap, "warmup");
    return exerciseGripCache[exName] = found;
  };
  const out = [];
  let supersetLetter = 'A';
  workout.exercises.forEach((ex, exIdx) => {
    if (ex.supersetExercises) {
      const subs = ex.supersetExercises;
      const letter = supersetLetter;
      supersetLetter = String.fromCharCode(supersetLetter.charCodeAt(0) + 1);
      let hasLastSessionSuperset = false;
      subs.forEach(sub => {
        if (Object.keys(lastSessionMap || {}).some(k => {
          const [exName, kind] = k.split("|");
          return exName === sub.name && kind === "working";
        })) {
          hasLastSessionSuperset = true;
        }
      });
      const supersetSources = hasLastSessionSuperset ? [lastSessionMap] : [lastSessionMap, hintsMap];

      let maxLastSets = 0;
      subs.forEach(sub => {
        supersetSources.forEach(src => {
          Object.keys(src || {}).forEach(k => {
            const [exName, kind, setNumStr] = k.split("|");
            if (exName === sub.name && kind === "working") {
              const num = parseInt(setNumStr);
              if (num > maxLastSets) maxLastSets = num;
            }
          });
        });
      });
      const historyRounds = maxLastSets > 0 ? Math.floor((maxLastSets - 1) / subs.length) + 1 : 0;
      const rounds = Math.max(ex.sets || 3, historyRounds);
      subs.forEach((sub, subIdx) => {
        const sets = [];
        let subWorkingBySetNum = {};
        supersetSources.forEach(src => {
          Object.keys(src || {}).forEach(k => {
            const [exName, kind, setNumStr] = k.split("|");
            if (exName === sub.name && kind === "working") {
              subWorkingBySetNum[parseInt(setNumStr)] = src[k];
            }
          });
        });
        const subFallback = (want) => {
          if (subWorkingBySetNum[want] != null) return subWorkingBySetNum[want];
          const nums = Object.keys(subWorkingBySetNum).map(Number).sort((a, b) => Math.abs(a - want) - Math.abs(b - want));
          return nums.length ? subWorkingBySetNum[nums[0]] : null;
        };
        const subExerciseGrip = lookupExerciseGrip(sub.name);
        const subIsAssist = !!sub.assist;
        const subIsBandOnly = sub.equipment === "band" && !sub.bandAddon && !subIsAssist;
        for (let r = 0; r < rounds; r++) {
          const setNumber = interleavedSetNumber(r, subIdx, subs.length);
          const last = subFallback(setNumber) || lookupLast(`${sub.name}|working|${setNumber}`);
          sets.push(buildSet({
            kind: "work", idx: r + 1,
            template: sub,
            last,
            setNumber,
            saveExerciseName: sub.name,
            isAssist: subIsAssist,
            isBandOnly: subIsBandOnly,
            fallbackGrip: subExerciseGrip,
          }));
        }
        out.push({
          id: `${exIdx}-${subIdx}`,
          templateExIdx: exIdx,
          subIdx,
          name: sub.name,
          mode: subIsAssist ? "bodyweight" : undefined,
          superset: letter,
          supersetPos: subIdx + 1,
          repRange: sub.reps,
          note: sub.notes || ex.notes || "",
          rest: ex.rest || 60,
          grips: sub.grips ? sub.grips.map(g => ({ id: g, ...GRIP_LABELS[g] })) : null,
          isBandsOnly: subIsBandOnly,
          bandAddon: !!sub.bandAddon,
          assist: subIsAssist,
          isBarbell: sub.equipment === "barbell" || sub.name.includes("Barbell") || sub.name === "Standing Overhead Press",
          session: ex.session || null,
          sets,
        });
      });
    } else {
      const sets = [];
      const isAssist = !!ex.assist;
      const isBandOnly = ex.equipment === "band" && !ex.bandAddon && !isAssist;
      const hasLastSessionWarmup = Object.keys(lastSessionMap || {}).some(k => {
        const [exName, kind] = k.split("|");
        return exName === ex.name && kind === "warmup";
      });
      const warmupSources = hasLastSessionWarmup ? [lastSessionMap] : [lastSessionMap, hintsMap];

      if (!ex.noWarmup) {
        let warmupLastBySetNum = {};
        warmupSources.forEach(src => {
          Object.keys(src || {}).forEach(k => {
            const [exName, kind, setNumStr] = k.split("|");
            if (exName === ex.name && kind === "warmup") warmupLastBySetNum[parseInt(setNumStr)] = src[k];
          });
        });
        const maxWarmupLast = Math.max(0, ...Object.keys(warmupLastBySetNum).map(Number).map(n => n + 1));
        const warmupCount = Math.max(1, ex.warmups || 1, maxWarmupLast);
        const fallbackForWarmup = (want) => {
          return warmupLastBySetNum[want] || null;
        };
        const exGripFallback = lookupExerciseGrip(ex.name);
        for (let wi = 0; wi < warmupCount; wi++) {
          const setNumber = wi;
          const last = fallbackForWarmup(setNumber);
          sets.push(buildSet({
            kind: "warmup",
            idx: warmupCount > 1 ? `W${wi + 1}` : "W",
            template: ex,
            last,
            setNumber,
            saveExerciseName: ex.name,
            isAssist, isBandOnly,
            fallbackGrip: exGripFallback,
          }));
        }
      }
      
      const hasLastSessionWorking = Object.keys(lastSessionMap || {}).some(k => {
        const [exName, kind] = k.split("|");
        return exName === ex.name && kind === "working";
      });
      const workingSources = hasLastSessionWorking ? [lastSessionMap] : [lastSessionMap, hintsMap];

      let workingLastBySetNum = {};
      workingSources.forEach(src => {
        Object.keys(src || {}).forEach(k => {
          const [exName, kind, setNumStr] = k.split("|");
          if (exName === ex.name && kind === "working") workingLastBySetNum[parseInt(setNumStr)] = src[k];
        });
      });
      const sortedHistNums = Object.keys(workingLastBySetNum).map(Number).sort((a, b) => a - b);
      const fallbackForWorking = (idx) => {
        if (idx < sortedHistNums.length) return workingLastBySetNum[sortedHistNums[idx]];
        if (sortedHistNums.length > 0) return workingLastBySetNum[sortedHistNums[sortedHistNums.length - 1]];
        return null;
      };
      const workGripFallback = lookupExerciseGrip(ex.name);
      if (ex.name === "Assisted Pull-Ups") {
        const uaSet = buildSet({
          kind: "work", idx: "UA",
          template: ex,
          last: lookupLast(`${ex.name}|working|0`),
          setNumber: 0,
          saveExerciseName: ex.name,
          isAssist: true,
          isBandOnly: false,
          fallbackGrip: workGripFallback,
        });
        uaSet.bands = [];
        uaSet.lastBands = [];
        sets.push(uaSet);
      }
      const workingCount = Math.max(ex.sets || 3, sortedHistNums.length);
      for (let i = 0; i < workingCount; i++) {
        const setNumber = i + 1;
        const last = fallbackForWorking(i);
        sets.push(buildSet({
          kind: "work", idx: i + 1,
          template: ex,
          last,
          setNumber,
          saveExerciseName: ex.name,
          fallbackGrip: workGripFallback,
          isAssist, isBandOnly,
        }));
      }
      out.push({
        id: String(exIdx),
        templateExIdx: exIdx,
        subIdx: null,
        name: ex.name,
        mode: isAssist ? "bodyweight" : undefined,
        superset: ex.superset || null,
        supersetPos: null,
        repRange: ex.reps,
        note: ex.notes || "",
        rest: ex.rest || 60,
        grips: ex.grips ? ex.grips.map(g => ({ id: g, ...GRIP_LABELS[g] })) : null,
        isBandsOnly: isBandOnly,
        bandAddon: !!ex.bandAddon,
        assist: isAssist,
        isBarbell: ex.equipment === "barbell" || ex.name.includes("Barbell") || ex.name === "Standing Overhead Press",
        session: ex.session || null,
        sets,
      });
    }
  });
  return out;
}

function buildSet({ kind, idx, template, last, setNumber, saveExerciseName, isAssist, isBandOnly, fallbackGrip }) {
  const set = { kind, idx, setNumber, saveExerciseName, completed: false, active: false, reps: null };
  let defW = null, defR = null;
  if (kind === "warmup" && template.defaultWarmup) {
    defW = template.defaultWarmup[setNumber]; defR = template.defaultWarmupReps?.[setNumber];
  } else if (kind === "work" && template.defaultWork) {
    defW = template.defaultWork[setNumber - 1]; defR = template.defaultWorkReps?.[setNumber - 1];
  }
  if (last) {
    set.lastReps = parseInt(last.reps) || defR || null;
    set.lastBands = last.bands_json ? safeJSON(last.bands_json) : [];
    set.lastGrip = last.grip || fallbackGrip || null;
    const sum = set.lastBands.reduce((a, b) => a + b, 0), saved = last.weight_lb || 0;
    if (template.assist) set.lastBodyweight = saved + sum;
    else set.lastWeight = template.bandAddon ? Math.max(0, saved - sum) : saved;
  } else {
    set.lastBands = [];
    if (fallbackGrip) set.lastGrip = fallbackGrip;
    if (defR) set.lastReps = defR;
    if (defW) {
      if (template.assist) set.lastBodyweight = defW; else set.lastWeight = defW;
    }
  }
  if (template.assist) {
    set.bodyweight = loadBodyweight() || set.lastBodyweight || 175;
    set.bands = [...set.lastBands]; set.grip = set.lastGrip || template.grips?.[0] || null;
  } else if (isBandOnly) {
    set.weight = 0; set.bands = [...set.lastBands]; set.bandsOnly = true;
  } else {
    const isB = template.equipment === "barbell" || template.name.includes("Barbell") || template.name === "Standing Overhead Press";
    set.weight = set.lastWeight || defW || (isB ? 45 : 0);
    set.bands = template.bandAddon ? [...set.lastBands] : [];
    if (template.grips) set.grip = set.lastGrip || template.grips[0];
  }
  return set;
}

const safeJSON = (s) => { try { return JSON.parse(s); } catch (_) { return []; } };

function transitionActiveSetAfterLog(prev, eIdx, sIdx) {
  const cur = prev[eIdx];
  if (cur.superset) {
    const partnerIdx = prev.findIndex((e2, j) => j !== eIdx && e2.superset === cur.superset);
    const partnerNext = partnerIdx !== -1 ? prev[partnerIdx].sets.findIndex(s => !s.completed) : -1;
    if (partnerNext !== -1) {
      return prev.map((e, i) => i === eIdx ? { ...e, sets: e.sets.map((s, j) => j === sIdx ? { ...s, active: false } : s) } : i === partnerIdx ? { ...e, sets: e.sets.map((s, j) => j === partnerNext ? { ...s, active: true } : s) } : e);
    }
  }
  const sameExNext = cur.sets.findIndex((s, k) => k > sIdx && !s.completed);
  if (sameExNext !== -1) {
    return prev.map((e, i) => i !== eIdx ? e : ({ ...e, sets: e.sets.map((s, j) => j === sIdx ? { ...s, active: false } : j === sameExNext ? { ...s, active: true } : s) }));
  }
  const nextExIdx = prev.findIndex((e, k) => k > eIdx && e.sets.some(s => !s.completed));
  return prev.map((e, i) => {
    if (i === eIdx) return { ...e, sets: e.sets.map((s, j) => j === sIdx ? { ...s, active: false } : s) };
    if (i === nextExIdx) {
      const firstUndone = e.sets.findIndex(s => !s.completed);
      return firstUndone === -1 ? e : { ...e, sets: e.sets.map((s, j) => j === firstUndone ? { ...s, active: true } : s) };
    }
    return e;
  });
}

if (typeof window !== "undefined") {
  window.api = api;
  window.flattenTemplate = flattenTemplate;
  window.buildSet = buildSet;
  window.safeJSON = safeJSON;
  window.transitionActiveSetAfterLog = transitionActiveSetAfterLog;
}

