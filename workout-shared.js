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
  // ── Weekly program (Jun 2026): Main A/B alternate Mon/Wed/Fri (A/B/A, then
  //    B/A/B next week); micro days slot into Tue/Thu and can shuffle freely.
  {
    id: "main-a",
    name: "Main A",
    main: true,
    program: true,
    kind: "main",
    abSplit: "A",
    duration: "~40 min",
    rest: 120,
    warmup: "Empty-bar squats + arm circles, then ramp the bar",
    exercises: [
      { name: "Barbell Back Squat", sets: 4, warmups: 3, reps: "5-8", notes: "Bar on upper back. Set safety pins low.", equipment: "barbell", rest: 180 },
      { name: "Barbell Bench Press", sets: 4, warmups: 3, reps: "6", notes: "Lower bar to mid-chest. **Safety**: Set rack safeties just below chest height. Collars on; if you stall, lower to safeties.", equipment: "barbell", rest: 120 },
      { name: "Assisted Pull-Ups", sets: 4, reps: "5-8", notes: "Volume day: band for 5-8 reps.", video: "https://www.youtube.com/shorts/0sRmDbT9Pm0", equipment: "band", assist: true, grips: ['neutral', 'chinup', 'pullup'], rest: 120, noWarmup: true },
      { name: "Standing Overhead Press", sets: 3, warmups: 1, reps: "6-10", notes: "Brace hard, press overhead.", equipment: "barbell", rest: 120 },
    ],
  },
  {
    id: "micro-arms", name: "Micro: Arms & Core", program: true, kind: "micro", duration: "~10 min", rest: 60, warmup: "One light feel set",
    exercises: [
      { name: "Dumbbell Hammer Curls", sets: 3, reps: "8-12", video: "https://www.youtube.com/shorts/0IAJqSwFnHI", notes: "Superset with pushdowns.", superset: "A", grips: ['hammer', 'supinated', 'reverse'], rest: 60, noWarmup: true },
      { name: "Band Tricep Pushdowns", sets: 3, reps: "10-15", equipment: "band", video: "https://www.youtube.com/shorts/eGjSphOefTI", notes: "Elbows glued to ribs", superset: "A", rest: 60, noWarmup: true },
      { name: "Dumbbell Bicep Curls", sets: 3, reps: "8-12", notes: "Superset with torso rotation.", video: "https://www.youtube.com/shorts/MKWBV29S6c0", superset: "B", grips: ['supinated', 'hammer', 'reverse'], rest: 60, noWarmup: true },
      { name: "Band Torso Rotation", sets: 2, reps: "12-15", notes: "Rotate left and right.", equipment: "band", superset: "B", rest: 60, noWarmup: true },
    ],
  },
  {
    id: "main-b", name: "Main B", program: true, kind: "main", abSplit: "B", duration: "~40 min", rest: 120, warmup: "Light hinges + band pull-aparts",
    exercises: [
      { name: "Barbell Deadlift", sets: 4, warmups: 3, reps: "5-8", notes: "Flat back, brace. Reset each rep.", equipment: "barbell", rest: 180 },
      { name: "Incline Barbell Press", sets: 4, warmups: 1, reps: "8-12", notes: "Bench at ~30°. Take to 1-2 RIR. Add 5 lb when 12 reps completed on all sets.", equipment: "barbell", rest: 120 },
      { name: "Assisted Pull-Ups", sets: 3, reps: "3-5", notes: "Heavy day: lightest band for 3-5 reps.", video: "https://www.youtube.com/shorts/0sRmDbT9Pm0", equipment: "band", assist: true, grips: ['neutral', 'chinup', 'pullup'], rest: 150, noWarmup: true },
      { name: "Bent-Over Barbell Rows", sets: 4, warmups: 1, reps: "8-12", notes: "Keep back flat, pull to lower chest.", equipment: "barbell", rest: 120 },
    ],
  },
  {
    id: "micro-delts", name: "Micro: Delts & Traps", program: true, kind: "micro", duration: "~10 min", rest: 60, warmup: "Band pull-aparts",
    exercises: [
      { name: "Face Pulls", sets: 3, reps: "12-15", equipment: "band", notes: "Squeeze rear delts. Superset with shrugs.", superset: "A", rest: 60, noWarmup: true },
      { name: "Dumbbell Shrugs", sets: 3, reps: "10-15", notes: "Pause at top.", superset: "A", rest: 60, noWarmup: true },
      { name: "Reverse Flyes", sets: 3, reps: "12-15", notes: "Superset with dead hangs.", video: "https://www.youtube.com/shorts/LsT-bR_zxLo", superset: "B", rest: 60, noWarmup: true },
      { name: "Dead Hang + Scap Pulls", sets: 3, reps: "5-8", notes: "Hang 20-40s, then 5-8 scap pulls.", superset: "B", rest: 60, noWarmup: true, assist: true },
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

const BENCH_STEPS = [
  { id: "A1", label: "A1: Top + Volume" },
  { id: "A2", label: "A2: Top + Volume" },
  { id: "A3", label: "A3: Top + Volume" },
  { id: "A4", label: "A4: Top + Volume" },
  { id: "A5", label: "A5: Top + Volume" },
  { id: "A6", label: "A6: Top + Volume" },
  { id: "A7", label: "A7: Top + Volume" },
  { id: "A8", label: "A8: 180 lb Peak Attempt" }
];

function getSuggestedBenchStep(history) {
  const count = (history || []).filter(h => h.sets && h.sets.some(s => s.exercise === "Barbell Bench Press" && s.set_type === "working" && s.completed)).length;
  return Math.min(7, count);
}

function getBenchWeights(history) {
  const workouts = (history || [])
    .filter(h => h.sets && h.sets.some(s => s.exercise === "Barbell Bench Press" && s.set_type === "working" && s.completed))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  let topWeight = 150, backoffWeight = 120;
  for (const w of workouts) {
    const working = w.sets.filter(s => s.exercise === "Barbell Bench Press" && s.set_type === "working" && s.completed);
    if (!working.length || working.some(s => s.weight_lb >= 180)) continue;
    const topSet = working[0];
    if (topSet && topSet.weight_lb >= topWeight && parseInt(topSet.reps) >= 5) topWeight += 5;
    const backoffs = working.slice(1);
    const successfulBackoffs = backoffs.filter(s => s.weight_lb >= backoffWeight && parseInt(s.reps) >= 8);
    if (successfulBackoffs.length >= 3) backoffWeight += 5;
  }
  return { topWeight, backoffWeight };
}

function applyBenchStep(ex, stepIdx, history) {
  const { topWeight, backoffWeight } = getBenchWeights(history);
  const stepId = stepIdx === 7 ? "A8" : `A${stepIdx + 1}`;
  const sets = [
    { kind: "warmup", idx: "W1", setNumber: 0, saveExerciseName: "Barbell Bench Press", completed: false, active: true, reps: null, weight: 45, lastReps: 10, lastWeight: 45, bands: [], lastBands: [] },
    { kind: "warmup", idx: "W2", setNumber: 1, saveExerciseName: "Barbell Bench Press", completed: false, active: false, reps: null, weight: 95, lastReps: 5, lastWeight: 95, bands: [], lastBands: [] },
    { kind: "warmup", idx: "W3", setNumber: 2, saveExerciseName: "Barbell Bench Press", completed: false, active: false, reps: null, weight: 115, lastReps: 3, lastWeight: 115, bands: [], lastBands: [] }
  ];
  if (stepId === "A8") {
    [{ w: 135, r: 3 }, { w: 155, r: 1 }, { w: 170, r: 1 }, { w: 180, r: 1 }].forEach((spec, i) => {
      sets.push({ kind: "work", idx: i + 1, setNumber: i + 1, saveExerciseName: "Barbell Bench Press", completed: false, active: false, reps: null, weight: spec.w, lastReps: spec.r, lastWeight: spec.w, bands: [], lastBands: [] });
    });
    for (let i = 0; i < 3; i++) {
      sets.push({ kind: "work", idx: i + 5, setNumber: i + 5, saveExerciseName: "Barbell Bench Press", completed: false, active: false, reps: null, weight: backoffWeight, lastReps: 8, lastWeight: backoffWeight, bands: [], lastBands: [] });
    }
  } else {
    sets.push({ kind: "work", idx: 1, setNumber: 1, saveExerciseName: "Barbell Bench Press", completed: false, active: false, reps: null, weight: topWeight, lastReps: 5, lastWeight: topWeight, bands: [], lastBands: [] });
    for (let i = 0; i < 3; i++) {
      sets.push({ kind: "work", idx: i + 2, setNumber: i + 2, saveExerciseName: "Barbell Bench Press", completed: false, active: false, reps: null, weight: backoffWeight, lastReps: 8, lastWeight: backoffWeight, bands: [], lastBands: [] });
    }
  }
  const label = stepId === "A8" ? "A8: 180 lb Peak Attempt" : `${stepId}: Top ${topWeight} lb / Vol ${backoffWeight} lb`;
  return { ...ex, benchStepLabel: label, repRange: stepId === "A8" ? "1-3" : "4-8", sets, note: `**Safety**: Set safeties just below chest height. Verify height with empty bar. Keep collars on; if a rep stalls, lower onto safeties.` };
}

if (typeof window !== "undefined") {
  Object.assign(window, { WORKOUTS, localDate, interleavedSetNumber, SWAP_GROUPS, findExerciseConfig, getSwapGroup, getSwapGroupName, getSwapOptions, isSwappable, BENCH_STEPS, getSuggestedBenchStep, applyBenchStep, getBenchWeights });
}

