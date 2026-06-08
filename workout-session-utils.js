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
  save: (body) => fetch("/api/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
  motivate: (body) => fetch("/api/motivate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
  motivations: (sid) => fetchT(`/api/motivations?session_id=${sid}`),
};

function flattenTemplate(workout, lastSessionMap, hintsMap) {
  hintsMap = hintsMap || {};
  const lookupLast = (key) => lastSessionMap[key] || hintsMap[key] || null;
  const exerciseGripCache = {};
  const lookupExerciseGrip = (exName) => {
    if (exerciseGripCache[exName] !== undefined) return exerciseGripCache[exName];
    let found = null;
    const scan = (src, kindFilter) => {
      Object.keys(src || {}).forEach(k => {
        if (found) return;
        const [n, kind] = k.split("|");
        if (n === exName && (!kindFilter || kind === kindFilter) && src[k].grip) found = src[k].grip;
      });
    };
    scan(lastSessionMap, "working");
    scan(hintsMap, "working");
    scan(lastSessionMap, "warmup");
    scan(hintsMap, "warmup");
    exerciseGripCache[exName] = found;
    return found;
  };
  const out = [];
  let supersetLetter = 'A';
  workout.exercises.forEach((ex, exIdx) => {
    if (ex.supersetExercises) {
      const subs = ex.supersetExercises;
      const letter = supersetLetter;
      supersetLetter = String.fromCharCode(supersetLetter.charCodeAt(0) + 1);
      const rounds = ex.sets || 3;
      subs.forEach((sub, subIdx) => {
        const sets = [];
        const subWorkingBySetNum = {};
        [hintsMap, lastSessionMap].forEach(src => {
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
      if (!ex.noWarmup) {
        const warmupCount = Math.max(1, ex.warmups || 1);
        const warmupLastBySetNum = {};
        [hintsMap, lastSessionMap].forEach(src => {
          Object.keys(src || {}).forEach(k => {
            const [exName, kind, setNumStr] = k.split("|");
            if (exName === ex.name && kind === "warmup") {
              warmupLastBySetNum[parseInt(setNumStr)] = src[k];
            }
          });
        });
        const fallbackForWarmup = (want) => {
          if (warmupLastBySetNum[want] != null) return warmupLastBySetNum[want];
          const nums = Object.keys(warmupLastBySetNum).map(Number).sort((a, b) => Math.abs(a - want) - Math.abs(b - want));
          return nums.length ? warmupLastBySetNum[nums[0]] : null;
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
      const workingLastBySetNum = {};
      [hintsMap, lastSessionMap].forEach(src => {
        Object.keys(src || {}).forEach(k => {
          const [exName, kind, setNumStr] = k.split("|");
          if (exName === ex.name && kind === "working") {
            workingLastBySetNum[parseInt(setNumStr)] = src[k];
          }
        });
      });
      const fallbackForWorking = (want) => {
        if (workingLastBySetNum[want] != null) return workingLastBySetNum[want];
        const nums = Object.keys(workingLastBySetNum).map(Number).sort((a, b) => Math.abs(a - want) - Math.abs(b - want));
        return nums.length ? workingLastBySetNum[nums[0]] : null;
      };
      const workGripFallback = lookupExerciseGrip(ex.name);
      for (let i = 0; i < (ex.sets || 3); i++) {
        const setNumber = i + 1;
        const last = fallbackForWorking(setNumber);
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
  const set = {
    kind, idx,
    setNumber,
    saveExerciseName,
    completed: false,
    active: false,
    reps: null,
  };
  if (last) {
    set.lastReps = parseInt(last.reps) || null;
    set.lastBands = last.bands_json ? safeJSON(last.bands_json) : [];
    set.lastGrip = last.grip || fallbackGrip || null;
    const lastBandSum = (set.lastBands || []).reduce((a, b) => a + b, 0);
    const savedLb = last.weight_lb || 0;
    if (template.assist) {
      set.lastBodyweight = savedLb + lastBandSum;
    } else if (template.bandAddon) {
      set.lastWeight = Math.max(0, savedLb - lastBandSum);
    } else if (isBandOnly) {
      // noop
    } else {
      set.lastWeight = savedLb;
    }
  } else {
    set.lastBands = [];
    if (fallbackGrip) set.lastGrip = fallbackGrip;
  }
  if (template.assist) {
    set.bodyweight = loadBodyweight() || set.lastBodyweight || 175;
    set.bands = (set.lastBands || []).slice();
    set.grip = set.lastGrip || (template.grips ? template.grips[0] : null);
  } else if (isBandOnly) {
    set.weight = 0;
    set.bands = (set.lastBands || []).slice();
    set.bandsOnly = true;
  } else {
    const isBarbell = template.equipment === "barbell" || template.name.includes("Barbell") || template.name === "Standing Overhead Press";
    set.weight = set.lastWeight || (isBarbell ? 45 : 0);
    set.bands = template.bandAddon ? (set.lastBands || []).slice() : [];
    if (template.grips) set.grip = set.lastGrip || template.grips[0];
  }
  return set;
}

const safeJSON = (s) => { try { return JSON.parse(s); } catch (_) { return []; } };

function transitionActiveSetAfterLog(prev, eIdx, sIdx) {
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
}

if (typeof window !== "undefined") {
  window.api = api;
  window.flattenTemplate = flattenTemplate;
  window.buildSet = buildSet;
  window.safeJSON = safeJSON;
  window.transitionActiveSetAfterLog = transitionActiveSetAfterLog;
}

