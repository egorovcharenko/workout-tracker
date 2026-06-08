// Muscle and Recovery status logic for Workout Tracker

function computeMuscleStatus(history) {
  const now = Date.now();
  const status = {};
  // Go through history (newest first) and find when each muscle was last worked
  for (const session of history) {
    const sessionDate = new Date(session.date + "T12:00:00");
    const hoursAgo = (now - sessionDate.getTime()) / (1000 * 60 * 60);
    for (const set of session.sets) {
      const mapping = EXERCISE_MUSCLES[set.exercise];
      if (!mapping) continue;
      const load = set.weight_lb || 0;
      const reps = parseInt(set.reps) || 0;
      const volume = load * reps;
      for (const m of mapping.primary) {
        const vol = volume * getMuscleImpact(set.exercise, m, true);
        if (!status[m] || hoursAgo < status[m].hoursAgo) {
          status[m] = { hoursAgo, volume: vol, date: session.date, workout: session.workout_name };
        } else if (hoursAgo === status[m].hoursAgo) {
          status[m].volume += vol;
        }
      }
      for (const m of mapping.secondary) {
        const vol = volume * getMuscleImpact(set.exercise, m, false);
        if (!status[m] || hoursAgo < status[m].hoursAgo) {
          status[m] = { hoursAgo, volume: vol, date: session.date, workout: session.workout_name };
        } else if (hoursAgo === status[m].hoursAgo) {
          status[m].volume += vol;
        }
      }
    }
  }
  return status;
}

function getRecoveryColor(hoursAgo) {
  if (hoursAgo == null) return { bg: "#f3f4f6", fg: "#9ca3af", label: "No data", pct: 0 };
  if (hoursAgo < 24) return { bg: "#fecaca", fg: "#dc2626", label: "Worked today", pct: 15 };
  if (hoursAgo < 48) return { bg: "#fed7aa", fg: "#ea580c", label: "Recovering", pct: 50 };
  if (hoursAgo < 72) return { bg: "#fef08a", fg: "#ca8a04", label: "Almost ready", pct: 80 };
  return { bg: "#bbf7d0", fg: "#16a34a", label: "Ready", pct: 100 };
}

function getWorkoutRecovery(workout) {
  // Collect all muscles this workout targets
  const musclePcts = {};
  const allExercises = [];
  for (const ex of workout.exercises) {
    if (ex.supersetExercises) ex.supersetExercises.forEach(sub => allExercises.push(sub));
    else allExercises.push(ex);
  }
  for (const ex of allExercises) {
    const mapping = EXERCISE_MUSCLES[ex.name];
    if (!mapping) continue;
    for (const m of mapping.primary) {
      const s = muscleStatus[m];
      musclePcts[m] = getRecoveryColor(s?.hoursAgo).pct;
    }
    for (const m of mapping.secondary) {
      const s = muscleStatus[m];
      if (!musclePcts[m]) musclePcts[m] = getRecoveryColor(s?.hoursAgo).pct;
    }
  }
  const vals = Object.values(musclePcts);
  if (vals.length === 0) return { avg: 0, muscles: {} };
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  return { avg, muscles: musclePcts };
}

function recoveryBadge(pct) {
  let bg, fg, label;
  if (pct >= 80) { bg = "#dcfce7"; fg = "#16a34a"; label = "Ready"; }
  else if (pct >= 50) { bg = "#fef9c3"; fg = "#ca8a04"; label = "Recovering"; }
  else if (pct > 0) { bg = "#fee2e2"; fg = "#dc2626"; label = "Sore"; }
  else { bg = "#f3f4f6"; fg = "#9ca3af"; label = "No data"; }
  return `<span style="font-size:11px;font-weight:600;color:${fg};background:${bg};padding:3px 8px;border-radius:8px;white-space:nowrap">${label} ${pct}%</span>`;
}

async function loadMuscleStatus() {
  try {
    const res = await fetch("/api/history?limit=30");
    const history = await res.json();
    muscleStatus = computeMuscleStatus(history);
    render();
  } catch (e) { console.error("[MUSCLE] Error:", e); }
}
