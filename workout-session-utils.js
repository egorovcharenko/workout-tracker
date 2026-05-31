// Workout Tracker Session Utilities (Non-React Helpers)

// Expose React hooks globally to avoid redeclaration issues in Babel Standalone scripts
var { useState, useEffect, useRef, useMemo, useCallback } = React;

const SWAP_GROUPS = [
  [
    { name: "Band Romanian Deadlift", sets: 3, reps: "8-12", notes: "Stand on band, hinge at hips, handles at sides", video: "https://www.youtube.com/shorts/Op7zRCBjGvs", equipment: "band", rest: 120, noWarmup: true },
    { name: "Dumbbell Romanian Deadlift", sets: 3, reps: "8-12", notes: "Hinge at hips, slight knee bend", video: "https://www.youtube.com/shorts/cGMaBqaExBo", rest: 120, noWarmup: true },
    { name: "Single-Leg DB RDL", sets: 3, reps: "8", notes: "One DB in each hand, rear leg lifts as you hinge — slow tempo, 8 per leg. Warmup 1 set @ ~20lb, work @ ~30lb.", rest: 120 },
    { name: "Barbell Deadlift", sets: 3, warmups: 3, reps: "5", notes: "Ramp up across the warm-up sets. Flat back, brace, push the floor away. Reset each rep — don't bounce.", rest: 180 },
  ],
  [
    { name: "Band Tricep Pushdowns", sets: 3, reps: "12-15", notes: "Elbows glued to ribs, squeeze at bottom", equipment: "band", video: "https://www.youtube.com/shorts/eGjSphOefTI", rest: 60 },
    { name: "Bench Dips", sets: 3, reps: "10-15", notes: "Hands on bench behind you, lower until elbows ~90°. Band ASSISTS — loop it under your hips to take weight off; leave bands empty for full bodyweight.", equipment: "band", assist: true, video: "https://www.youtube.com/shorts/0326dy_-CzM", rest: 60 },
  ],
  [
    { name: "Goblet Squat", sets: 3, warmups: 2, reps: "10-12", notes: "Hold DB at chest, sit deep. Optional: stand on bands for extra resistance.", video: "https://www.youtube.com/shorts/MeIiIdhvXT4", bandAddon: true, rest: 120 },
    { name: "Bulgarian Split Squat", sets: 3, warmups: 2, reps: "8-10", notes: "Rear foot on bench, DB in each hand — 8-10 per leg, controlled. Optional: stand on bands for extra resistance.", video: "https://www.youtube.com/shorts/2C-uNgKwPLE", bandAddon: true, rest: 120 },
    { name: "Barbell Back Squat", sets: 3, warmups: 3, reps: "6-8", notes: "Bar on upper back, set the rack safety pins low so you can bail. Brace, sit between your hips, drive up.", rest: 180 },
  ],
  [
    { name: "Dumbbell Flat Bench Press", sets: 4, reps: "8-12", notes: "Control the descent", video: "https://www.youtube.com/shorts/YQ0g-a_QLag", rest: 150 },
    { name: "Incline Dumbbell Press", sets: 4, reps: "8-12", notes: "Bench at ~30°. Control the descent, press up and slightly back.", rest: 150 },
  ],
  [
    { name: "Seated Overhead Press", sets: 3, reps: "8-12", notes: "Seated, controlled", video: "https://www.youtube.com/shorts/E9ShwbwZ1zw", rest: 120, noWarmup: true },
    { name: "Standing Overhead Press", sets: 3, warmups: 2, reps: "6-8", notes: "From the rack, brace hard, press overhead, don't lean back.", rest: 150 },
  ],
  [
    { name: "Reverse Flyes", sets: 3, reps: "15-20", notes: "Rear delts & upper back, light weight, squeeze at the top", video: "https://www.youtube.com/shorts/LsT-bR_zxLo", rest: 60, noWarmup: true },
    { name: "Face Pulls", sets: 3, reps: "15-20", notes: "Anchor band at face height, pull toward your face, elbows high, squeeze rear delts.", equipment: "band", rest: 60, noWarmup: true },
  ],
];

function getSwapGroup(exerciseName) {
  return SWAP_GROUPS.find(g => g.some(e => e.name === exerciseName)) || null;
}

function getSwapOptions(exerciseName) {
  const g = getSwapGroup(exerciseName);
  return g ? g.filter(e => e.name !== exerciseName) : [];
}

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
    // Prefer the globally-remembered bodyweight, then this set's last value,
    // then a 175 default. Keeps every assist exercise consistent on a fresh load.
    set.bodyweight = loadBodyweight() || set.lastBodyweight || 175;
    set.bands = (set.lastBands || []).slice();
    set.grip = set.lastGrip || (template.grips ? template.grips[0] : null);
  } else if (isBandOnly) {
    set.weight = 0;
    set.bands = (set.lastBands || []).slice();
    set.bandsOnly = true;
  } else {
    set.weight = set.lastWeight || 0;
    set.bands = template.bandAddon ? (set.lastBands || []).slice() : [];
    if (template.grips) set.grip = set.lastGrip || template.grips[0];
  }
  return set;
}

const safeJSON = (s) => { try { return JSON.parse(s); } catch (_) { return []; } };

function hydrateToday(exercises, todaySets) {
  const map = new Map();
  exercises.forEach((ex, eIdx) => {
    ex.sets.forEach((s, sIdx) => {
      const key = `${s.saveExerciseName}|${s.kind === "warmup" ? "warmup" : "working"}|${s.setNumber}`;
      map.set(key, { eIdx, sIdx });
    });
  });
  const next = exercises.map(ex => ({
    ...ex,
    sets: ex.sets.map(s => ({ ...s, completed: false, active: false }))
  }));
  if (todaySets && todaySets.length) {
    todaySets.forEach(row => {
      const key = `${row.exercise}|${row.set_type}|${row.set_number}`;
      const ref = map.get(key);
      if (!ref) return;
      const ex = next[ref.eIdx];
      const set = ex.sets[ref.sIdx];
      set.reps = parseInt(row.reps) || null;
      set.completed = true;
      const bands = row.bands_json ? safeJSON(row.bands_json) : [];
      set.bands = bands;
      const bandSum = bands.reduce((a, b) => a + b, 0);
      const savedLb = row.weight_lb || 0;
      if (ex.assist) {
        set.bodyweight = savedLb + bandSum;
      } else if (ex.bandAddon) {
        set.weight = Math.max(0, savedLb - bandSum);
      } else if (ex.isBandsOnly) {
        set.weight = 0;
      } else {
        set.weight = savedLb;
      }
      if (row.grip) set.grip = row.grip;
    });
  }
  return activateNextSet(next);
}

function activateNextSet(exercises) {
  for (const ex of exercises) {
    for (const s of ex.sets) if (s.active) s.active = false;
  }
  let activated = false;
  for (const ex of exercises) {
    if (activated) break;
    if (ex.skipped) continue;
    let highestCompleted = -1;
    for (let i = 0; i < ex.sets.length; i++) {
      if (ex.sets[i].completed) highestCompleted = i;
    }
    for (let i = highestCompleted + 1; i < ex.sets.length; i++) {
      if (!ex.sets[i].completed && !ex.sets[i].userSkipped) {
        ex.sets[i].active = true;
        activated = true;
        break;
      }
    }
  }
  return exercises;
}

const SWAP_LS_KEY = (workoutName, date) => `${LS_PREFIX}v2-swaps:${workoutName}:${date}`;
function loadSwaps(workoutName, date) {
  try {
    const raw = localStorage.getItem(SWAP_LS_KEY(workoutName, date));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveSwaps(workoutName, date, swapMap) {
  try {
    if (swapMap && Object.keys(swapMap).length) {
      localStorage.setItem(SWAP_LS_KEY(workoutName, date), JSON.stringify(swapMap));
    } else {
      localStorage.removeItem(SWAP_LS_KEY(workoutName, date));
    }
  } catch (e) {
    console.warn("[V2-SWAP] localStorage save failed:", e);
  }
}

const PM_STARTED_LS_KEY = (workoutName, date) => `${LS_PREFIX}v2-pm-started:${workoutName}:${date}`;
function loadPmStarted(workoutName, date) {
  try { return localStorage.getItem(PM_STARTED_LS_KEY(workoutName, date)) === "1"; }
  catch { return false; }
}
function savePmStarted(workoutName, date, started) {
  try {
    if (started) localStorage.setItem(PM_STARTED_LS_KEY(workoutName, date), "1");
    else localStorage.removeItem(PM_STARTED_LS_KEY(workoutName, date));
  } catch (e) {
    console.warn("[V2-PM] localStorage save failed:", e);
  }
}

function applySwaps(workout, swapMap) {
  if (!swapMap || !Object.keys(swapMap).length) return workout;
  return {
    ...workout,
    exercises: workout.exercises.map((ex, idx) => {
      const topWant = swapMap[`${idx}`];
      if (topWant && topWant !== ex.name) {
        const grp = getSwapGroup(ex.name);
        const repl = grp && grp.find(e => e.name === topWant);
        if (repl) return { ...repl };
      }
      if (ex.supersetExercises) {
        let changed = false;
        const newSubs = ex.supersetExercises.map((sub, subIdx) => {
          const subWant = swapMap[`${idx}-${subIdx}`];
          if (!subWant || subWant === sub.name) return sub;
          const grp = getSwapGroup(sub.name);
          const repl = grp && grp.find(e => e.name === subWant);
          if (!repl) return sub;
          changed = true;
          const { sets: _s, rest: _r, warmups: _w, ...subFields } = repl;
          return subFields;
        });
        if (changed) return { ...ex, supersetExercises: newSubs };
      }
      return ex;
    }),
  };
}

function serializeForSave(exercises, workoutName, sessionId, startedAt, elapsed, activeDate) {
  const sets = [];
  exercises.forEach(ex => {
    ex.sets.forEach(s => {
      if (!s.completed) return;
      const isAssist = ex.assist;
      const bands = s.bands || [];
      const bandSum = bands.reduce((a, b) => a + b, 0);
      let weight_lb;
      if (isAssist) {
        weight_lb = Math.max(0, (s.bodyweight || 0) - bandSum);
      } else if (ex.isBandsOnly) {
        weight_lb = bandSum;
      } else if (ex.bandAddon) {
        weight_lb = (s.weight || 0) + bandSum;
      } else {
        weight_lb = s.weight || 0;
      }
      sets.push({
        exercise: s.saveExerciseName,
        set_type: s.kind === "warmup" ? "warmup" : "working",
        set_number: s.setNumber,
        reps: String(s.reps || ""),
        weight_lb,
        bands_json: bands.length ? JSON.stringify(bands) : null,
        grip: s.grip || null,
      });
    });
  });
  return {
    workout: workoutName,
    date: activeDate || localDate(),
    duration_sec: elapsed,
    session_id: sessionId || null,
    started_at: startedAt ? new Date(startedAt).toISOString() : null,
    sets,
  };
}

let _saveInFlight = false;
let _savePending = null;
async function autoSavePayload(payload, onResolved) {
  // Sandbox: never write to the backend in test mode.
  if (TEST_MODE) return;
  if (_saveInFlight) {
    _savePending = { payload, onResolved };
    return;
  }
  _saveInFlight = true;
  try {
    const res = await api.save(payload);
    if (res.ok) onResolved(res.id);
  } catch (e) {
    console.error("[V2-SAVE] error:", e);
  } finally {
    _saveInFlight = false;
    if (_savePending) {
      const next = _savePending; _savePending = null;
      autoSavePayload(next.payload, next.onResolved);
    }
  }
}
