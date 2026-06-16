// Shared constants and utility functions for Workout Tracker

// Test/sandbox mode: ?test=1 in the URL runs a session normally but persists
// NOTHING real — no /api/save (gated in autoSavePayload), and every session
// localStorage key is namespaced under a throwaway "test:" prefix. So you can
// rehearse a workout (auto-select, override, swaps, logging) without polluting
// real history or clobbering an in-progress real session.
const TEST_MODE = (typeof location !== "undefined") &&
  new URLSearchParams(location.search).get("test") === "1";
const LS_PREFIX = TEST_MODE ? "test:" : "";

// Design tokens — single source so a future tweak flows through the tree.
const T = {
  page: "#0B0F14", cardBg: "rgba(17,24,39,0.45)", cardBorder: "rgba(255,255,255,0.04)", text: "#E5E7EB", strong: "#F3F4F6",
  muted: "#9CA3AF", faint: "#6B7280", disabled: "#4B5563", accent: "#3B82F6", accentLight: "#60A5FA", amber: "#FBBF24",
  amberMid: "#D97706", amberMuted: "#D6B68A", bands: "#C084FC", bandsText: "#E9D5FF", green: "#34D399", red: "#F87171", inv: "#0B0F14", mono: "ui-monospace, Menlo, monospace"
};

const GRIP_LABELS = {
  neutral: { label: "Neutral", hint: "parallel" }, chinup: { label: "Chin-up", hint: "underhand" }, pullup: { label: "Pull-up", hint: "overhand" },
  hammer: { label: "Hammer", hint: "neutral" }, supinated: { label: "Supinated", hint: "underhand" }, reverse: { label: "Reverse", hint: "overhand" }
};

// Band resistance levels (Tribe set: 5 stackable bands)
const BANDS = [{ color: "yellow", lb: 5 }, { color: "green", lb: 15 }, { color: "red", lb: 20 }, { color: "blue", lb: 30 }, { color: "black", lb: 35 }];
const BAND_VALUES = BANDS.map(b => b.lb);

const WORKOUTS = [
  {
    id: "main-a",
    name: "Main A",
    main: true,
    program: true,
    kind: "main",
    abSplit: "A",
    duration: "~45 min",
    rest: 120,
    warmup: "Empty-bar squats + arm circles, then ramp the bar",
    exercises: [
      { name: "Barbell Back Squat", sets: 3, warmups: 3, reps: "6-10", notes: "Primary quad driver. Bar on upper back. Set safety pins low.", equipment: "barbell", rest: 150 },
      { name: "Barbell Bench Press", sets: 3, warmups: 3, reps: "6-10", notes: "Lower bar to mid-chest. Set rack safeties just below chest height.", equipment: "barbell", rest: 150 },
      { name: "Pull-Ups", sets: 3, reps: "1-8", notes: "Solo — see pull-up protocol. 1. Fresh attempt (1 unassisted). 2. Set 1–2: assisted pull-ups (stop 1 rep shy of failure). 3. Set 3: weighted negatives (lower 3–5s, 3–5 reps).", equipment: "band", assist: true, grips: ['pullup', 'neutral', 'chinup'], rest: 150, noWarmup: true },
      { name: "Standing Overhead Press", sets: 3, warmups: 1, reps: "6-10", notes: "Front delt. Brace hard, press overhead.", equipment: "barbell", rest: 120 },
      { name: "Bulgarian Split Squat", sets: 2, reps: "10-15", notes: "Only if you want more quad/glute volume.", equipment: "dumbbell", bandAddon: true, rest: 90, optional: true },
    ],
  },
  {
    id: "micro-arms", name: "Micro: Arms & Core", program: true, kind: "micro", duration: "~12 min", rest: 60, warmup: "One light feel set",
    exercises: [
      { name: "Dips", sets: 3, reps: "8-12", equipment: "band", assist: true, video: "https://www.youtube.com/shorts/0326dy_-CzM", notes: "Real triceps load. Add weight once >12. Dip attachment.", superset: "A", rest: 60, noWarmup: true },
      { name: "Dumbbell Bicep Curls", sets: 2, reps: "10-15", video: "https://www.youtube.com/shorts/MKWBV29S6c0", grips: ['supinated', 'hammer', 'reverse'], notes: "Push/pull antagonist pair with dips.", superset: "A", rest: 60, noWarmup: true },
      { name: "Dumbbell Hammer Curls", sets: 2, reps: "10-15", video: "https://www.youtube.com/shorts/0IAJqSwFnHI", grips: ['hammer', 'supinated', 'reverse'], notes: "Superset with lateral raises.", superset: "B", rest: 60, noWarmup: true },
      { name: "Dumbbell Lateral Raises", sets: 3, reps: "12-20", notes: "Side delts. Chase reps and clean stretch, then add lengthened partials past failure.", superset: "B", rest: 60, noWarmup: true },
      { name: "Band Torso Rotation", sets: 2, reps: "12-15", equipment: "band", rest: 45, notes: "Rotate left and right. Alternate with hanging knee raises.", noWarmup: true },
    ],
  },
  {
    id: "main-b", name: "Main B", program: true, kind: "main", abSplit: "B", duration: "~45 min", rest: 120, warmup: "Light hinges + band pull-aparts",
    exercises: [
      { name: "Barbell RDL", sets: 3, warmups: 3, reps: "8-12", equipment: "barbell", rest: 150, notes: "Hamstring gap + fatigue fix in one move. Flat back, hinge at hips. Swap conventional deadlift back in on weeks you want it." },
      { name: "Incline Barbell Press", sets: 3, warmups: 1, reps: "6-10", equipment: "barbell", rest: 120, notes: "Superset with rows (push). Bench at ~30°.", superset: "A" },
      { name: "Bent-Over Barbell Rows", sets: 3, warmups: 1, reps: "8-12", equipment: "barbell", rest: 120, notes: "Superset with incline (pull); rest after the pair. Keep back flat, pull to lower chest.", superset: "A" },
      { name: "Pull-Ups", sets: 3, reps: "1-8", notes: "Solo — see pull-up protocol. 1. Fresh attempt (1 unassisted). 2. Set 1–2: assisted pull-ups (stop 1 rep shy of failure). 3. Set 3: weighted negatives (lower 3–5s, 3–5 reps).", equipment: "band", assist: true, grips: ['pullup', 'neutral', 'chinup'], rest: 150, noWarmup: true },
    ],
  },
  {
    id: "micro-delts", name: "Micro: Delts & Traps", program: true, kind: "micro", duration: "~14 min", rest: 60, warmup: "Band pull-aparts",
    exercises: [
      { name: "Dumbbell Lateral Raises", sets: 3, reps: "12-20", rest: 45, notes: "Second weekly delt hit. Chase reps and clean stretch, then add lengthened partials past failure.", superset: "A", noWarmup: true },
      { name: "Face Pulls", sets: 2, reps: "15-20", equipment: "band", rest: 45, notes: "Rear delt + upper trap; anchor band to rack.", superset: "A", noWarmup: true },
      { name: "Dumbbell Shrugs", sets: 3, reps: "12-20", rest: 45, notes: "Pause + squeeze at top; trap priority.", superset: "B", noWarmup: true },
      { name: "Reverse Flyes", sets: 2, reps: "12-20", video: "https://www.youtube.com/shorts/LsT-bR_zxLo", rest: 45, notes: "Rear delt.", superset: "B", noWarmup: true },
      { name: "Overhead Tricep Extension", sets: 2, reps: "10-15", video: "https://www.youtube.com/shorts/b_r_LW4HEcM", rest: 60, notes: "Long-head stretch — complements dips on Arms day.", superset: "C", noWarmup: true },
      { name: "Incline DB Curls", sets: 2, reps: "10-15", rest: 60, notes: "Stretch-biased biceps — different angle than Arms day.", superset: "C", noWarmup: true },
      { name: "Dead Hang + Scap Pulls", sets: 2, reps: "5-8", rest: 45, notes: "Grip + scap control for the pull-up goal. Hang 20-40s, then 5-8 scap pulls.", noWarmup: true, assist: true },
    ],
  },
  {
    id: "squat-day", name: "Squat Day", hidden: true, abSplit: "A", duration: "~50 min", rest: 90, warmup: "Squats + arm circles",
    exercises: [
      { name: "Barbell Back Squat", sets: 3, warmups: 3, reps: "6-8", notes: "Set safety pins low.", equipment: "barbell", rest: 120 },
      { name: "Dumbbell Flat Bench Press", sets: 4, reps: "8-12", notes: "Control descent", video: "https://www.youtube.com/shorts/YQ0g-a_QLag", rest: 120 },
      { name: "Single-Arm Dumbbell Rows", sets: 3, reps: "8-12", notes: "Brace on bench", video: "https://www.youtube.com/shorts/H8jf3DwlIlo", rest: 120 },
      { name: "Seated Overhead Press", sets: 3, reps: "8-12", notes: "Seated, controlled", video: "https://www.youtube.com/shorts/E9ShwbwZ1zw", rest: 120, noWarmup: true },
      { name: "Reverse Flyes", sets: 3, reps: "15-20", notes: "Rear delts", video: "https://www.youtube.com/shorts/LsT-bR_zxLo", rest: 60, noWarmup: true },
      { name: "Sleeve-Buster Superset", sets: 3, reps: "15", rest: 60, notes: "Superset", supersetExercises: [{ name: "Dips", reps: "8-12", equipment: "band", assist: true, video: "https://www.youtube.com/shorts/0326dy_-CzM", notes: "Dip attachment" }, { name: "Dumbbell Hammer Curls", reps: "8-12", video: "https://www.youtube.com/shorts/0IAJqSwFnHI", grips: ['hammer', 'supinated', 'reverse'] }]},
      { name: "Band Torso Rotation", sets: 3, reps: "10-12", notes: "Rotate left/right", equipment: "band", rest: 60, noWarmup: true },
    ],
  },
  {
    id: "deadlift-day", name: "Deadlift Day", hidden: true, abSplit: "B", duration: "~50 min", rest: 90, warmup: "Hinges + pull-aparts",
    exercises: [
      { name: "Barbell Deadlift", sets: 3, warmups: 3, reps: "3-5", notes: "Flat back, brace.", equipment: "barbell", rest: 120 },
      { name: "Incline Barbell Press", sets: 4, warmups: 1, reps: "8-12", notes: "Bench at ~30°. Take to 1-2 RIR.", equipment: "barbell", rest: 120 },
      { name: "Assisted Pull-Ups", sets: 4, reps: "5-8", notes: "Band assists", video: "https://www.youtube.com/shorts/0sRmDbT9Pm0", equipment: "band", assist: true, grips: ['neutral', 'chinup', 'pullup'], rest: 120, noWarmup: true },
      { name: "Standing Overhead Press", sets: 3, reps: "6-8", notes: "Press overhead", equipment: "barbell", warmups: 1, rest: 120 },
      { name: "Face Pulls", sets: 3, reps: "15-20", equipment: "band", notes: "Anchor band face height", rest: 60, noWarmup: true },
      { name: "Sleeve-Buster Superset", sets: 3, reps: "15", rest: 60, notes: "Superset", supersetExercises: [{ name: "Band Tricep Pushdowns", reps: "12-15", equipment: "band", video: "https://www.youtube.com/shorts/eGjSphOefTI" }, { name: "Dumbbell Bicep Curls", reps: "8-12", video: "https://www.youtube.com/shorts/MKWBV29S6c0", grips: ['supinated', 'hammer', 'reverse'] }]},
      { name: "Hanging Knee Raise", sets: 3, reps: "10-15", notes: "Raise knees to chest", rest: 60, noWarmup: true, assist: true },
    ],
  },
  {
    id: "full-body", name: "Full Body", hidden: true, duration: "~40 min", rest: 75, warmup: "Squats + arm circles",
    exercises: [
      { name: "Goblet Squat", sets: 3, warmups: 2, reps: "10-12", notes: "Sit deep", video: "https://www.youtube.com/shorts/MeIiIdhvXT4", bandAddon: true, rest: 120 },
      { name: "Dumbbell Flat Bench Press", sets: 4, reps: "10-12", notes: "Control descent", video: "https://www.youtube.com/shorts/YQ0g-a_QLag", rest: 120 },
      { name: "Assisted Pull-Ups", sets: 4, reps: "5-8", notes: "Band assists", video: "https://www.youtube.com/shorts/0sRmDbT9Pm0", equipment: "band", assist: true, grips: ['neutral', 'chinup', 'pullup'], rest: 120, noWarmup: true },
      { name: "Seated Overhead Press", sets: 4, reps: "8-10", notes: "Controlled", video: "https://www.youtube.com/shorts/E9ShwbwZ1zw", rest: 120, noWarmup: true },
      { name: "Single-Arm Dumbbell Rows", sets: 3, reps: "10-12", notes: "Brace on bench", video: "https://www.youtube.com/shorts/H8jf3DwlIlo", rest: 120 },
      { name: "Single-Leg DB RDL", sets: 3, reps: "8-10", notes: "8 per leg", rest: 120 },
      { name: "Sleeve-Buster Superset", sets: 3, reps: "15", rest: 60, notes: "Superset", supersetExercises: [{ name: "Band Tricep Pushdowns", reps: "12-15", equipment: "band", video: "https://www.youtube.com/shorts/eGjSphOefTI" }, { name: "Dumbbell Hammer Curls", reps: "8-12", video: "https://www.youtube.com/shorts/0IAJqSwFnHI", grips: ['hammer', 'supinated', 'reverse'] }]},
      { name: "Pallof Press", sets: 3, reps: "10-12", notes: "Resist the twist", equipment: "band", rest: 60, noWarmup: true },
    ],
  },
  {
    id: "full-body-b", name: "Full Body B", hidden: true, duration: "~40 min", rest: 75, warmup: "Light band squats",
    exercises: [
      { name: "Band Squat", sets: 3, warmups: 2, reps: "12-15", notes: "Stand on band", video: "https://www.youtube.com/shorts/7VGmSe3FWPU", equipment: "band" },
      { name: "Dumbbell Flat Bench Press", sets: 4, reps: "10-12", notes: "Control descent", video: "https://www.youtube.com/shorts/YQ0g-a_QLag", rest: 120 },
      { name: "Band Row", sets: 3, reps: "12-15", notes: "Pull to chest", video: "https://www.youtube.com/shorts/BAlsaA1wIhY", equipment: "band", rest: 120 },
      { name: "Band Romanian Deadlift", sets: 3, reps: "8-12", notes: "Stand on band", video: "https://www.youtube.com/shorts/Op7zRCBjGvs", equipment: "band", rest: 120, noWarmup: true },
      { name: "Seated Overhead Press", sets: 4, reps: "8-10", notes: "Seated, controlled", video: "https://www.youtube.com/shorts/E9ShwbwZ1zw", rest: 120, noWarmup: true },
      { name: "Overhead Tricep Extension", sets: 2, reps: "10-15", notes: "Single DB, both hands", video: "https://www.youtube.com/shorts/b_r_LW4HEcM" },
      { name: "Sleeve-Buster Superset", sets: 3, reps: "15", rest: 60, notes: "Superset", supersetExercises: [{ name: "Band Tricep Pushdowns", reps: "12-15", equipment: "band", video: "https://www.youtube.com/shorts/eGjSphOefTI" }, { name: "Dumbbell Hammer Curls", reps: "8-12", video: "https://www.youtube.com/shorts/0IAJqSwFnHI", grips: ['hammer', 'supinated', 'reverse'] }]},
    ],
  },
  {
    id: "arms-shoulders", name: "Arms & Shoulders", hidden: true, duration: "~15 min", rest: 60, warmup: "Elbows/wrists",
    exercises: [
      { name: "Overhead Dumbbell Press", sets: 4, reps: "6-10", notes: "Seated/standing", video: "https://www.youtube.com/shorts/E9ShwbwZ1zw", rest: 120 },
      { name: "Dumbbell Bicep Curls", sets: 3, reps: "8-12", notes: "Superset", superset: "A", video: "https://www.youtube.com/shorts/MKWBV29S6c0", grips: ['supinated', 'hammer', 'reverse'] },
      { name: "Overhead Tricep Extension", sets: 3, reps: "10-15", notes: "Single DB", superset: "A", video: "https://www.youtube.com/shorts/b_r_LW4HEcM" },
    ],
  },
  {
    id: "back", name: "Back", hidden: true, duration: "~20 min", rest: 60, warmup: "Light rows",
    exercises: [
      { name: "Dumbbell Bent-Over Rows", sets: 3, reps: "8-12", notes: "Flat back", video: "https://www.youtube.com/shorts/dpYI8K6e-jE" },
      { name: "Single-Arm Dumbbell Rows", sets: 3, reps: "8-12", notes: "Knee on bench", video: "https://www.youtube.com/shorts/H8jf3DwlIlo", rest: 75, noWarmup: true },
      { name: "Reverse Flyes", sets: 3, reps: "15-20", notes: "Rear delts", video: "https://www.youtube.com/shorts/LsT-bR_zxLo" },
    ],
  }
];

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const interleavedSetNumber = (round, subIdx, subCount) => round * subCount + subIdx + 1;

const SWAP_GROUPS = [
  { family: "Deadlifts & Hinge (Posterior)", exercises: [
    { name: "Barbell Deadlift", sets: 3, warmups: 3, reps: "3-5", equipment: "barbell", rest: 120 },
    { name: "Barbell Back Squat", sets: 3, warmups: 3, reps: "6-8", equipment: "barbell", rest: 120 },
    { name: "Barbell RDL", sets: 3, warmups: 3, reps: "8-12", equipment: "barbell", rest: 150 },
    { name: "Dumbbell Romanian Deadlift", sets: 3, reps: "8-12", video: "https://www.youtube.com/shorts/cGMaBqaExBo", rest: 120, noWarmup: true },
    { name: "Band Romanian Deadlift", sets: 3, reps: "8-12", video: "https://www.youtube.com/shorts/Op7zRCBjGvs", equipment: "band", rest: 120, noWarmup: true },
    { name: "Single-Leg DB RDL", sets: 3, reps: "8-10", rest: 120 },
  ]},
  { family: "Squats & Quads (Legs)", exercises: [
    { name: "Barbell Back Squat", sets: 3, warmups: 3, reps: "6-8", equipment: "barbell", rest: 120 },
    { name: "Barbell Deadlift", sets: 3, warmups: 3, reps: "3-5", equipment: "barbell", rest: 120 },
    { name: "Bulgarian Split Squat", sets: 3, warmups: 2, reps: "8-10", video: "https://www.youtube.com/shorts/2C-uNgKwPLE", bandAddon: true, rest: 120 },
    { name: "Goblet Squat", sets: 3, warmups: 2, reps: "10-12", video: "https://www.youtube.com/shorts/MeIiIdhvXT4", bandAddon: true, rest: 120 },
    { name: "Band Squat", sets: 3, warmups: 2, reps: "12-15", video: "https://www.youtube.com/shorts/7VGmSe3FWPU", equipment: "band" },
    { name: "Lunges", sets: 3, reps: "10-12", rest: 90 },
  ]},
  { family: "Chest Press (Push)", exercises: [
    { name: "Barbell Bench Press", sets: 4, warmups: 1, reps: "6-8", equipment: "barbell", rest: 120 },
    { name: "Incline Barbell Press", sets: 4, warmups: 1, reps: "5-8", equipment: "barbell", rest: 120 },
    { name: "Dumbbell Flat Bench Press", sets: 4, reps: "8-12", video: "https://www.youtube.com/shorts/YQ0g-a_QLag", rest: 120 },
    { name: "Incline Dumbbell Press", sets: 4, reps: "8-12", rest: 120 },
  ]},
  { family: "Overhead Press (Shoulders)", exercises: [
    { name: "Standing Overhead Press", sets: 3, warmups: 1, reps: "6-8", equipment: "barbell", rest: 120 },
    { name: "Seated Overhead Press", sets: 3, reps: "8-12", video: "https://www.youtube.com/shorts/E9ShwbwZ1zw", rest: 120, noWarmup: true },
  ]},
  { family: "Back Rows & Pulls (Pull)", exercises: [
    { name: "Assisted Pull-Ups", sets: 4, reps: "5-8", video: "https://www.youtube.com/shorts/0sRmDbT9Pm0", equipment: "band", assist: true, grips: ['neutral', 'chinup', 'pullup'], rest: 120, noWarmup: true },
    { name: "Pull-Ups", sets: 3, reps: "1-8", notes: "Solo — see pull-up protocol. 1. Fresh attempt (1 unassisted). 2. Set 1–2: assisted pull-ups (stop 1 rep shy of failure). 3. Set 3: weighted negatives (lower 3–5s, 3–5 reps).", equipment: "band", assist: true, grips: ['pullup', 'neutral', 'chinup'], rest: 150, noWarmup: true },
    { name: "Single-Arm Dumbbell Rows", sets: 3, reps: "8-12", video: "https://www.youtube.com/shorts/H8jf3DwlIlo", rest: 120 },
    { name: "Bent-Over Barbell Rows", sets: 3, reps: "8-12", equipment: "barbell", rest: 120 },
    { name: "Dumbbell Bent-Over Rows", sets: 3, reps: "8-12", video: "https://www.youtube.com/shorts/dpYI8K6e-jE", rest: 120 },
    { name: "Band Row", sets: 3, reps: "12-15", video: "https://www.youtube.com/shorts/BAlsaA1wIhY", equipment: "band", rest: 120 },
  ]},
  { family: "Rear Delts & Face Pulls", exercises: [
    { name: "Face Pulls", sets: 3, reps: "15-20", equipment: "band", rest: 60, noWarmup: true },
    { name: "Reverse Flyes", sets: 3, reps: "15-20", video: "https://www.youtube.com/shorts/LsT-bR_zxLo", rest: 60, noWarmup: true },
  ]},
  { family: "Triceps (Arm Extension)", exercises: [
    { name: "Band Tricep Pushdowns", sets: 3, reps: "12-15", equipment: "band", video: "https://www.youtube.com/shorts/eGjSphOefTI", rest: 60 },
    { name: "Dips", sets: 3, reps: "8-12", equipment: "band", assist: true, video: "https://www.youtube.com/shorts/0326dy_-CzM", rest: 60 },
    { name: "Overhead Tricep Extension", sets: 2, reps: "10-15", video: "https://www.youtube.com/shorts/b_r_LW4HEcM" },
  ]},
  { family: "Biceps (Arm Flexion)", exercises: [
    { name: "Dumbbell Bicep Curls", sets: 2, reps: "8-12", video: "https://www.youtube.com/shorts/MKWBV29S6c0", grips: ['supinated', 'hammer', 'reverse'] },
    { name: "Incline DB Curls", sets: 2, reps: "10-15", rest: 60 },
    { name: "Dumbbell Hammer Curls", sets: 3, reps: "8-12", video: "https://www.youtube.com/shorts/0IAJqSwFnHI", grips: ['hammer', 'supinated', 'reverse'] },
    { name: "Band Bicep Curls", sets: 2, reps: "12-15", video: "https://www.youtube.com/shorts/5ACsDBt_sMQ", equipment: "band", grips: ['supinated', 'hammer', 'reverse'] },
  ]},
  { family: "Calves", exercises: [{ name: "Calf Raises", sets: 3, reps: "15-20", rest: 60 }]},
  { family: "Core", exercises: [
    { name: "Band Torso Rotation", sets: 3, reps: "10-12", equipment: "band", rest: 60, noWarmup: true },
    { name: "Hanging Knee Raise", sets: 3, reps: "10-15", rest: 60, noWarmup: true },
    { name: "Pallof Press", sets: 3, reps: "10-12", equipment: "band", rest: 60, noWarmup: true },
  ]}
];

function findExerciseConfig(n) {
  const name = n === "Bench Dips" ? "Dips" : n;
  for (const g of SWAP_GROUPS) { const f = g.exercises.find(e => e.name === name); if (f) return f; }
  return null;
}
function getSwapGroup(n) { const name = n === "Bench Dips" ? "Dips" : n, g = SWAP_GROUPS.find(grp => grp.exercises.some(e => e.name === name)); return g ? g.exercises : null; }
function getSwapGroupName(n) { const name = n === "Bench Dips" ? "Dips" : n, g = SWAP_GROUPS.find(grp => grp.exercises.some(e => e.name === name)); return g ? g.family : null; }
function getSwapOptions(n) { const name = n === "Bench Dips" ? "Dips" : n, g = getSwapGroup(name); return g ? g.filter(e => e.name !== name) : []; }
function isSwappable(n) { const name = n === "Bench Dips" ? "Dips" : n; return SWAP_GROUPS.some(g => g.exercises.some(e => e.name === name)); }

if (typeof window !== "undefined") {
  Object.assign(window, { WORKOUTS, localDate, interleavedSetNumber, SWAP_GROUPS, findExerciseConfig, getSwapGroup, getSwapGroupName, getSwapOptions, isSwappable });
}

