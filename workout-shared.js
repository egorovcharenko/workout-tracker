// Shared constants and utility functions for Workout Tracker

// Design tokens — single source so a future tweak flows through the tree.
const T = {
  page:       "#0B0F14",
  cardBg:     "rgba(17,24,39,0.45)",
  cardBorder: "rgba(255,255,255,0.04)",
  text:       "#E5E7EB",
  strong:     "#F3F4F6",
  muted:      "#9CA3AF",
  faint:      "#6B7280",
  disabled:   "#4B5563",
  accent:     "#3B82F6",
  accentLight:"#60A5FA",
  amber:      "#FBBF24",
  amberMid:   "#D97706",
  amberMuted: "#D6B68A",
  bands:      "#C084FC",
  bandsText:  "#E9D5FF",
  green:      "#34D399",
  red:        "#F87171",
  inv:        "#0B0F14",
  mono:       "ui-monospace, Menlo, monospace",
};

const GRIP_LABELS = {
  neutral:   { label: "Neutral",   hint: "parallel" },
  chinup:    { label: "Chin-up",   hint: "underhand" },
  pullup:    { label: "Pull-up",   hint: "overhand" },
  hammer:    { label: "Hammer",    hint: "neutral" },
  supinated: { label: "Supinated", hint: "underhand" },
  reverse:   { label: "Reverse",   hint: "overhand" },
};

// Band resistance levels (Tribe set: 5 stackable bands)
const BANDS = [
  { color: "yellow", lb: 5 },
  { color: "green", lb: 15 },
  { color: "red", lb: 20 },
  { color: "blue", lb: 30 },
  { color: "black", lb: 35 }
];
const BAND_VALUES = BANDS.map(b => b.lb);

const EXERCISE_MUSCLES = {
  "Overhead Dumbbell Press": { primary: ["shoulders"], secondary: ["triceps"], ratios: { shoulders: 1.0, triceps: 0.4 } },
  "Dumbbell Bicep Curls": { primary: ["biceps"], secondary: ["forearms"], ratios: { biceps: 1.0, forearms: 0.3 } },
  "Band Bicep Curls": { primary: ["biceps"], secondary: ["forearms"], ratios: { biceps: 1.0, forearms: 0.3 } },
  "Overhead Tricep Extension": { primary: ["triceps"], secondary: [], ratios: { triceps: 1.0 } },
  "Band Tricep Pushdowns": { primary: ["triceps"], secondary: [], ratios: { triceps: 1.0 } },
  "Dumbbell Hammer Curls": { primary: ["biceps"], secondary: ["forearms"], ratios: { biceps: 1.0, forearms: 0.4 } },
  "Bench Dips": { primary: ["triceps"], secondary: ["chest", "shoulders"], ratios: { triceps: 1.0, chest: 0.4, shoulders: 0.4 } },
  "Dumbbell Bent-Over Rows": { primary: ["lats"], secondary: ["biceps", "rear_delts"], ratios: { lats: 1.0, biceps: 0.3, rear_delts: 0.4 } },
  "Single-Arm Dumbbell Rows": { primary: ["lats"], secondary: ["biceps", "rear_delts"], ratios: { lats: 1.0, biceps: 0.3, rear_delts: 0.4 } },
  "Assisted Pull-Ups": { primary: ["lats"], secondary: ["biceps", "upper_back", "rear_delts"], ratios: { lats: 1.0, biceps: 0.35, upper_back: 0.5, rear_delts: 0.3 } },
  "Reverse Flyes": { primary: ["rear_delts"], secondary: ["upper_back"], ratios: { rear_delts: 1.0, upper_back: 0.4 } },
  "Goblet Squat": { primary: ["quads", "glutes"], secondary: ["core"], ratios: { quads: 1.0, glutes: 1.0, core: 0.3 } },
  "Bulgarian Split Squat": { primary: ["quads", "glutes"], secondary: ["hamstrings", "core"], ratios: { quads: 1.0, glutes: 1.0, hamstrings: 0.4, core: 0.2 } },
  "Dumbbell Flat Bench Press": { primary: ["chest"], secondary: ["triceps", "shoulders"], ratios: { chest: 1.0, triceps: 0.4, shoulders: 0.4 } },
  "Dumbbell Romanian Deadlift": { primary: ["hamstrings", "glutes"], secondary: ["lower_back"], ratios: { hamstrings: 1.0, glutes: 1.0, lower_back: 0.5 } },
  "Seated Overhead Press": { primary: ["shoulders"], secondary: ["triceps"], ratios: { shoulders: 1.0, triceps: 0.4 } },
  "Band Squat": { primary: ["quads", "glutes"], secondary: ["core"], ratios: { quads: 1.0, glutes: 1.0, core: 0.3 } },
  "Band Row": { primary: ["lats", "upper_back"], secondary: ["biceps"], ratios: { lats: 1.0, upper_back: 1.0, biceps: 0.3 } },
  "Band Romanian Deadlift": { primary: ["hamstrings", "glutes"], secondary: ["lower_back"], ratios: { hamstrings: 1.0, glutes: 1.0, lower_back: 0.4 } },
  "Pallof Press": { primary: ["core"], secondary: [], ratios: { core: 1.0 } },
  "Lunges": { primary: ["quads", "glutes"], secondary: ["hamstrings"], ratios: { quads: 1.0, glutes: 1.0, hamstrings: 0.3 } },
  "Calf Raises": { primary: ["calves"], secondary: [], ratios: { calves: 1.0 } },
  "Single-Leg DB RDL": { primary: ["hamstrings", "glutes"], secondary: ["lower_back", "core"], ratios: { hamstrings: 1.0, glutes: 1.0, lower_back: 0.4, core: 0.3 } }
};

const STRENGTH_STANDARDS = {
  "Dumbbell Flat Bench Press": { beg: 25, nov: 45, int: 70, adv: 95, elite: 120 },
  "Single-Arm Dumbbell Rows": { beg: 30, nov: 50, int: 75, adv: 105, elite: 135 },
  "Dumbbell Bent-Over Rows": { beg: 30, nov: 50, int: 75, adv: 105, elite: 135 },
  "Overhead Dumbbell Press": { beg: 20, nov: 35, int: 55, adv: 75, elite: 95 },
  "Seated Overhead Press": { beg: 20, nov: 35, int: 55, adv: 75, elite: 95 },
  "Goblet Squat": { beg: 35, nov: 60, int: 95, adv: 135, elite: 180 },
  "Bulgarian Split Squat": { beg: 20, nov: 40, int: 65, adv: 95, elite: 125 },
  "Dumbbell Romanian Deadlift": { beg: 30, nov: 55, int: 85, adv: 120, elite: 155 },
  "Single-Leg DB RDL": { beg: 20, nov: 35, int: 55, adv: 80, elite: 110 },
  "Dumbbell Bicep Curls": { beg: 12, nov: 22, int: 35, adv: 50, elite: 70 },
  "Dumbbell Hammer Curls": { beg: 12, nov: 22, int: 35, adv: 50, elite: 70 },
  "Bench Dips": { beg: -17, nov: 38, int: 106, adv: 183, elite: 267 },
  "Assisted Pull-Ups": { beg: -28, nov: 18, int: 75, adv: 138, elite: 206 },
  "Band Row": { beg: 20, nov: 35, int: 55, adv: 75, elite: 95 },
  "Band Squat": { beg: 25, nov: 45, int: 75, adv: 105, elite: 135 },
  "Band Romanian Deadlift": { beg: 25, nov: 45, int: 70, adv: 100, elite: 130 },
  "Band Bicep Curls": { beg: 8, nov: 15, int: 25, adv: 38, elite: 52 },
  "Band Tricep Pushdowns": { beg: 10, nov: 20, int: 35, adv: 52, elite: 70 },
  "Pallof Press": { beg: 10, nov: 20, int: 35, adv: 50, elite: 70 }
};

const WORKOUTS = [
  {
    id: "full-body",
    name: "Full Body",
    main: true,
    duration: "~40 min",
    rest: 75,
    warmup: "Light goblet squats and arm circles to warm up",
    exercises: [
      { name: "Goblet Squat", sets: 3, warmups: 2, reps: "10-12", notes: "Hold DB at chest, sit deep. Optional: stand on bands for extra resistance.", video: "https://www.youtube.com/shorts/MeIiIdhvXT4", bandAddon: true, rest: 120, session: "AM" },
      { name: "Dumbbell Flat Bench Press", sets: 4, reps: "10-12", notes: "Control the descent", video: "https://www.youtube.com/shorts/YQ0g-a_QLag", rest: 120, session: "AM" },
      { name: "Assisted Pull-Ups", sets: 3, reps: "5-8", notes: "Band ASSISTS (loops over bar, foot in loop). Chin over bar, controlled descent.", video: "https://www.youtube.com/shorts/0sRmDbT9Pm0", equipment: "band", assist: true, grips: ['neutral', 'chinup', 'pullup'], rest: 120, noWarmup: true, session: "AM" },
      { name: "Seated Overhead Press", sets: 4, reps: "8-10", notes: "Seated, controlled", video: "https://www.youtube.com/shorts/E9ShwbwZ1zw", rest: 120, noWarmup: true, session: "AM" },
      { name: "Single-Arm Dumbbell Rows", sets: 3, reps: "10-12", notes: "Each side, brace on bench", video: "https://www.youtube.com/shorts/H8jf3DwlIlo", rest: 120, session: "PM" },
      { name: "Single-Leg DB RDL", sets: 3, reps: "8", notes: "One DB in each hand, rear leg lifts as you hinge — slow tempo, 8 per leg. Warmup 1 set @ ~20lb, work @ ~30lb.", rest: 120, session: "PM" },
      { name: "Sleeve-Buster Superset", sets: 3, reps: "15", rest: 60, notes: "No rest between exercises, 60s between rounds", session: "PM",
        supersetExercises: [
          { name: "Band Tricep Pushdowns", reps: "12-15", equipment: "band", video: "https://www.youtube.com/shorts/eGjSphOefTI", notes: "Elbows glued to ribs, squeeze at bottom" },
          { name: "Dumbbell Hammer Curls", reps: "8-12", video: "https://www.youtube.com/shorts/0IAJqSwFnHI", notes: "Hammer grip default · toggle for variants", grips: ['hammer', 'supinated', 'reverse'] },
        ]},
      { name: "Pallof Press", sets: 3, reps: "10-12", notes: "Anti-rotation core finisher: anchor band at chest height, press straight out and resist the twist. Each side.", equipment: "band", rest: 60, noWarmup: true, session: "PM" },
    ],
  },
  {
    id: "full-body-b",
    name: "Full Body B",
    hidden: true,
    duration: "~40 min",
    rest: 75,
    warmup: "Light band squats to warm up legs",
    exercises: [
      { name: "Band Squat", sets: 3, warmups: 2, reps: "12-15", notes: "Stand on band, handles at shoulders", video: "https://www.youtube.com/shorts/7VGmSe3FWPU", equipment: "band" },
      { name: "Dumbbell Flat Bench Press", sets: 4, reps: "10-12", notes: "Control the descent", video: "https://www.youtube.com/shorts/YQ0g-a_QLag", rest: 120 },
      { name: "Band Row", sets: 3, reps: "12-15", notes: "Stand on band, pull to chest, squeeze back", video: "https://www.youtube.com/shorts/BAlsaA1wIhY", equipment: "band", rest: 120 },
      { name: "Band Romanian Deadlift", sets: 3, reps: "8-12", notes: "Stand on band, hinge at hips, handles at sides", video: "https://www.youtube.com/shorts/Op7zRCBjGvs", equipment: "band", rest: 120, noWarmup: true },
      { name: "Seated Overhead Press", sets: 4, reps: "8-10", notes: "Seated, controlled", video: "https://www.youtube.com/shorts/E9ShwbwZ1zw", rest: 120, noWarmup: true },
      { name: "Overhead Tricep Extension", sets: 2, reps: "10-15", notes: "Single DB, both hands", video: "https://www.youtube.com/shorts/b_r_LW4HEcM" },
      { name: "Sleeve-Buster Superset", sets: 3, reps: "15", rest: 60, notes: "No rest between exercises, 60s between rounds",
        supersetExercises: [
          { name: "Band Tricep Pushdowns", reps: "12-15", equipment: "band", video: "https://www.youtube.com/shorts/eGjSphOefTI", notes: "Elbows glued to ribs, squeeze at bottom" },
          { name: "Dumbbell Hammer Curls", reps: "8-12", video: "https://www.youtube.com/shorts/0IAJqSwFnHI", notes: "Hammer grip default · toggle for variants", grips: ['hammer', 'supinated', 'reverse'] },
        ]},
    ],
  },
  {
    id: "arms-shoulders",
    name: "Arms & Shoulders",
    hidden: true,
    duration: "~15 min",
    rest: 60,
    warmup: "A few light sets to warm up elbows and wrists",
    exercises: [
      { name: "Overhead Dumbbell Press", sets: 4, reps: "6-10", notes: "Seated or standing", video: "https://www.youtube.com/shorts/E9ShwbwZ1zw", rest: 120 },
      { name: "Dumbbell Bicep Curls", sets: 3, reps: "8-12", notes: "Superset with next", superset: "A", video: "https://www.youtube.com/shorts/MKWBV29S6c0", grips: ['supinated', 'hammer', 'reverse'] },
      { name: "Overhead Tricep Extension", sets: 3, reps: "10-15", notes: "Single DB, both hands", superset: "A", video: "https://www.youtube.com/shorts/b_r_LW4HEcM" },
    ],
  },
  {
    id: "back",
    name: "Back",
    hidden: true,
    duration: "~20 min",
    rest: 60,
    warmup: "Light rows to warm up shoulders and back",
    exercises: [
      { name: "Dumbbell Bent-Over Rows", sets: 3, reps: "8-12", notes: "Keep back flat, pull to hips", video: "https://www.youtube.com/shorts/dpYI8K6e-jE" },
      { name: "Single-Arm Dumbbell Rows", sets: 3, reps: "8-12", notes: "Each side, knee on bench", video: "https://www.youtube.com/shorts/H8jf3DwlIlo", rest: 75, noWarmup: true },
      { name: "Reverse Flyes", sets: 3, reps: "15-20", notes: "Rear delts & upper back, light weight", video: "https://www.youtube.com/shorts/LsT-bR_zxLo" },
    ],
  }
];

function getMuscleImpact(exName, muscle, isPrimary) {
  const mapping = EXERCISE_MUSCLES[exName];
  if (!mapping) return isPrimary ? 1.0 : 0.5;
  if (mapping.ratios && mapping.ratios[muscle] !== undefined) {
    return mapping.ratios[muscle];
  }
  return isPrimary ? 1.0 : 0.5;
}

function calcSet1RM(exerciseName, weight, reps, bandsJson) {
  const isAssist = exerciseName === "Bench Dips" || exerciseName === "Assisted Pull-Ups";
  const isBandAddon = exerciseName === "Goblet Squat" || exerciseName === "Bulgarian Split Squat";
  
  let bandSum = 0;
  if (bandsJson) {
    try {
      const b = typeof bandsJson === 'string' ? JSON.parse(bandsJson) : bandsJson;
      if (Array.isArray(b)) {
        bandSum = b.reduce((a, x) => a + (+x || 0), 0);
      }
    } catch(e){}
  }
  
  if (isAssist) {
    return reps > 1 ? (weight * reps / 30.0) - bandSum : -bandSum;
  } else {
    const effW = isBandAddon ? (weight + bandSum) : weight;
    return reps > 1 ? effW * (1 + reps / 30.0) : effW;
  }
}

function getStrengthPercentile(exerciseName, weight1RM) {
  const stds = STRENGTH_STANDARDS[exerciseName];
  if (!stds) return null;
  const w = weight1RM || 0;
  
  if (w < stds.beg) {
    const minW = stds.beg < 0 ? stds.beg * 2 : 0;
    if (w <= minW) return { percentile: 0, tier: "Untrained" };
    const p = 0 + ((w - minW) / (stds.beg - minW)) * 5;
    return { percentile: Math.round(p), tier: "Untrained" };
  } else if (w < stds.nov) {
    const p = 5 + ((w - stds.beg) / (stds.nov - stds.beg)) * 15;
    return { percentile: Math.round(p), tier: "Beginner" };
  } else if (w < stds.int) {
    const p = 20 + ((w - stds.nov) / (stds.int - stds.nov)) * 30;
    return { percentile: Math.round(p), tier: "Novice" };
  } else if (w < stds.adv) {
    const p = 50 + ((w - stds.int) / (stds.adv - stds.int)) * 30;
    return { percentile: Math.round(p), tier: "Intermediate" };
  } else if (w < stds.elite) {
    const p = 80 + ((w - stds.adv) / (stds.elite - stds.adv)) * 15;
    return { percentile: Math.round(p), tier: "Advanced" };
  } else {
    const p = 95 + Math.min(4, ((w - stds.elite) / (stds.elite || 1)) * 5);
    return { percentile: Math.round(p), tier: "Elite" };
  }
}

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const interleavedSetNumber = (round, subIdx, subCount) => round * subCount + subIdx + 1;

const SKIPPED_LS_KEY = (workoutName, date) => `v2-skipped:${workoutName}:${date}`;
function loadSkippedExercises(workoutName, date) {
  try {
    const raw = localStorage.getItem(SKIPPED_LS_KEY(workoutName, date));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function saveSkippedExercises(workoutName, date, namesSet) {
  try {
    localStorage.setItem(SKIPPED_LS_KEY(workoutName, date), JSON.stringify([...namesSet]));
  } catch (e) {
    console.warn("[V2-SKIPPED] localStorage save failed:", e);
  }
}

const SETS_LS_KEY = (workoutName, date) => `v2-session-sets:${workoutName}:${date}`;
function loadSessionSets(workoutName, date) {
  try {
    const raw = localStorage.getItem(SETS_LS_KEY(workoutName, date));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveSessionSets(workoutName, date, exercises) {
  try {
    const map = {};
    exercises.forEach(ex => {
      map[ex.name] = ex.sets;
    });
    localStorage.setItem(SETS_LS_KEY(workoutName, date), JSON.stringify(map));
  } catch (e) {
    console.warn("[V2-SESSION-SETS] localStorage save failed:", e);
  }
}

