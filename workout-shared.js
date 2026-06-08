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

const WORKOUTS = [
  {
    id: "squat-day",
    name: "Squat Day",
    main: true,
    abSplit: "A",
    duration: "~50 min",
    rest: 90,
    warmup: "Empty-bar squats + arm circles, then ramp the bar",
    exercises: [
      { name: "Barbell Back Squat", sets: 3, warmups: 3, reps: "6-8", notes: "Bar on upper back. Set the rack safety pins at the bottom of your range so you can bail a missed rep. Brace, sit between your hips, drive up. Ramp the warm-up sets.", equipment: "barbell", rest: 120 },
      { name: "Dumbbell Flat Bench Press", sets: 4, reps: "8-12", notes: "Control the descent", video: "https://www.youtube.com/shorts/YQ0g-a_QLag", rest: 120 },
      { name: "Single-Arm Dumbbell Rows", sets: 3, reps: "8-12", notes: "Each side, brace on bench", video: "https://www.youtube.com/shorts/H8jf3DwlIlo", rest: 120 },
      { name: "Seated Overhead Press", sets: 3, reps: "8-12", notes: "Seated, controlled", video: "https://www.youtube.com/shorts/E9ShwbwZ1zw", rest: 120, noWarmup: true },
      { name: "Reverse Flyes", sets: 3, reps: "15-20", notes: "Rear delts & upper back, light weight, squeeze at the top", video: "https://www.youtube.com/shorts/LsT-bR_zxLo", rest: 60, noWarmup: true },
      { name: "Sleeve-Buster Superset", sets: 3, reps: "15", rest: 60, notes: "No rest between exercises, 60s between rounds",
        supersetExercises: [
          { name: "Band Tricep Pushdowns", reps: "12-15", equipment: "band", video: "https://www.youtube.com/shorts/eGjSphOefTI", notes: "Elbows glued to ribs, squeeze at bottom" },
          { name: "Dumbbell Hammer Curls", reps: "8-12", video: "https://www.youtube.com/shorts/0IAJqSwFnHI", notes: "Hammer grip default · toggle for variants", grips: ['hammer', 'supinated', 'reverse'] },
        ]},
      { name: "Band Torso Rotation", sets: 3, reps: "10-12", notes: "Anchor band at chest height, rotate left and right under control. 10-12 per side.", equipment: "band", rest: 60, noWarmup: true },
    ],
  },
  {
    id: "deadlift-day",
    name: "Deadlift Day",
    hidden: true,
    abSplit: "B",
    duration: "~50 min",
    rest: 90,
    warmup: "Light hinges + band pull-aparts, then ramp the bar",
    exercises: [
      { name: "Barbell Deadlift", sets: 3, warmups: 3, reps: "3-5", notes: "Ramp up across the warm-up sets. Flat back, brace, push the floor away. Reset each rep — don't bounce.", equipment: "barbell", rest: 120 },
      { name: "Incline Dumbbell Press", sets: 4, reps: "8-12", notes: "Bench at ~30°. Control the descent, press up and slightly back.", rest: 120 },
      { name: "Assisted Pull-Ups", sets: 4, reps: "5-8", notes: "Band ASSISTS (loops over bar, foot in loop). Chin over bar, controlled descent.", video: "https://www.youtube.com/shorts/0sRmDbT9Pm0", equipment: "band", assist: true, grips: ['neutral', 'chinup', 'pullup'], rest: 120, noWarmup: true },
      { name: "Standing Overhead Press", sets: 3, reps: "6-8", notes: "Un-rack from the pins at shoulder height. Brace hard, press overhead, don't lean back. Ramp the warm-ups.", equipment: "barbell", warmups: 1, rest: 120 },
      { name: "Face Pulls", sets: 3, reps: "15-20", equipment: "band", notes: "Anchor band at face height, pull toward your face, elbows high, squeeze the rear delts.", rest: 60, noWarmup: true },
      { name: "Sleeve-Buster Superset", sets: 3, reps: "15", rest: 60, notes: "No rest between exercises, 60s between rounds",
        supersetExercises: [
          { name: "Band Tricep Pushdowns", reps: "12-15", equipment: "band", video: "https://www.youtube.com/shorts/eGjSphOefTI", notes: "Elbows glued to ribs, squeeze at bottom" },
          { name: "Dumbbell Bicep Curls", reps: "8-12", video: "https://www.youtube.com/shorts/MKWBV29S6c0", notes: "Supinated (palms up) default · toggle for variants", grips: ['supinated', 'hammer', 'reverse'] },
        ]},
      { name: "Hanging Knee Raise", sets: 3, reps: "10-15", notes: "Hang from the bar, raise knees toward chest, control the lower. No swinging.", rest: 60, noWarmup: true },
    ],
  },
  {
    id: "full-body",
    name: "Full Body",
    hidden: true,
    duration: "~40 min",
    rest: 75,
    warmup: "Light goblet squats and arm circles to warm up",
    exercises: [
      { name: "Goblet Squat", sets: 3, warmups: 2, reps: "10-12", notes: "Hold DB at chest, sit deep. Optional: stand on bands for extra resistance.", video: "https://www.youtube.com/shorts/MeIiIdhvXT4", bandAddon: true, rest: 120 },
      { name: "Dumbbell Flat Bench Press", sets: 4, reps: "10-12", notes: "Control the descent", video: "https://www.youtube.com/shorts/YQ0g-a_QLag", rest: 120 },
      { name: "Assisted Pull-Ups", sets: 4, reps: "5-8", notes: "Band ASSISTS (loops over bar, foot in loop). Chin over bar, controlled descent.", video: "https://www.youtube.com/shorts/0sRmDbT9Pm0", equipment: "band", assist: true, grips: ['neutral', 'chinup', 'pullup'], rest: 120, noWarmup: true },
      { name: "Seated Overhead Press", sets: 4, reps: "8-10", notes: "Seated, controlled", video: "https://www.youtube.com/shorts/E9ShwbwZ1zw", rest: 120, noWarmup: true },
      { name: "Single-Arm Dumbbell Rows", sets: 3, reps: "10-12", notes: "Each side, brace on bench", video: "https://www.youtube.com/shorts/H8jf3DwlIlo", rest: 120 },
      { name: "Single-Leg DB RDL", sets: 3, reps: "8-10", notes: "One DB in each hand, rear leg lifts as you hinge — slow tempo, 8 per leg. Warmup 1 set @ ~20lb, work @ ~30lb.", rest: 120 },
      { name: "Sleeve-Buster Superset", sets: 3, reps: "15", rest: 60, notes: "No rest between exercises, 60s between rounds",
        supersetExercises: [
          { name: "Band Tricep Pushdowns", reps: "12-15", equipment: "band", video: "https://www.youtube.com/shorts/eGjSphOefTI", notes: "Elbows glued to ribs, squeeze at bottom" },
          { name: "Dumbbell Hammer Curls", reps: "8-12", video: "https://www.youtube.com/shorts/0IAJqSwFnHI", notes: "Hammer grip default · toggle for variants", grips: ['hammer', 'supinated', 'reverse'] },
        ]},
      { name: "Pallof Press", sets: 3, reps: "10-12", notes: "Anti-rotation core finisher: anchor band at chest height, press straight out and resist the twist. Each side.", equipment: "band", rest: 60, noWarmup: true },
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

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const interleavedSetNumber = (round, subIdx, subCount) => round * subCount + subIdx + 1;

// Expose the SWAP_GROUPS catalog to categorize exercises into families
const SWAP_GROUPS = [
  {
    family: "Deadlifts & Hinge (Posterior)",
    exercises: [
      { name: "Barbell Deadlift", sets: 3, warmups: 3, reps: "3-5", notes: "Ramp up across the warm-up sets. Flat back, brace, push the floor away. Reset each rep — don't bounce.", equipment: "barbell", rest: 120 },
      { name: "Dumbbell Romanian Deadlift", sets: 3, reps: "8-12", notes: "Hinge at hips, slight knee bend", video: "https://www.youtube.com/shorts/cGMaBqaExBo", rest: 120, noWarmup: true },
      { name: "Band Romanian Deadlift", sets: 3, reps: "8-12", notes: "Stand on band, hinge at hips, handles at sides", video: "https://www.youtube.com/shorts/Op7zRCBjGvs", equipment: "band", rest: 120, noWarmup: true },
      { name: "Single-Leg DB RDL", sets: 3, reps: "8-10", notes: "One DB in each hand, rear leg lifts as you hinge — slow tempo, 8 per leg. Warmup 1 set @ ~20lb, work @ ~30lb.", rest: 120 },
    ]
  },
  {
    family: "Squats & Quads (Legs)",
    exercises: [
      { name: "Barbell Back Squat", sets: 3, warmups: 3, reps: "6-8", notes: "Bar on upper back. Set the rack safety pins at the bottom of your range so you can bail a missed rep. Brace, sit between your hips, drive up. Ramp the warm-up sets.", equipment: "barbell", rest: 120 },
      { name: "Bulgarian Split Squat", sets: 3, warmups: 2, reps: "8-10", notes: "Rear foot on bench, DB in each hand — 8-10 per leg, controlled. Optional: stand on bands for extra resistance.", video: "https://www.youtube.com/shorts/2C-uNgKwPLE", bandAddon: true, rest: 120 },
      { name: "Goblet Squat", sets: 3, warmups: 2, reps: "10-12", notes: "Hold DB at chest, sit deep. Optional: stand on bands for extra resistance.", video: "https://www.youtube.com/shorts/MeIiIdhvXT4", bandAddon: true, rest: 120 },
      { name: "Band Squat", sets: 3, warmups: 2, reps: "12-15", notes: "Stand on band, handles at shoulders", video: "https://www.youtube.com/shorts/7VGmSe3FWPU", equipment: "band" },
      { name: "Lunges", sets: 3, reps: "10-12", notes: "Step forward, lower hips until rear knee nearly touches floor, push back. DBs or bands optional.", rest: 90 }
    ]
  },
  {
    family: "Chest Press (Push)",
    exercises: [
      { name: "Barbell Bench Press", sets: 4, warmups: 1, reps: "6-8", notes: "Lower the bar to your mid-chest, drive up. Keep feet flat on the floor.", equipment: "barbell", rest: 120 },
      { name: "Dumbbell Flat Bench Press", sets: 4, reps: "8-12", notes: "Control the descent", video: "https://www.youtube.com/shorts/YQ0g-a_QLag", rest: 120 },
      { name: "Incline Dumbbell Press", sets: 4, reps: "8-12", notes: "Bench at ~30°. Control the descent, press up and slightly back.", rest: 120 },
    ]
  },
  {
    family: "Overhead Press (Shoulders)",
    exercises: [
      { name: "Standing Overhead Press", sets: 3, warmups: 1, reps: "6-8", notes: "From the rack, brace hard, press overhead, don't lean back.", equipment: "barbell", rest: 120 },
      { name: "Seated Overhead Press", sets: 3, reps: "8-12", notes: "Seated, controlled", video: "https://www.youtube.com/shorts/E9ShwbwZ1zw", rest: 120, noWarmup: true },
    ]
  },
  {
    family: "Back Rows & Pulls (Pull)",
    exercises: [
      { name: "Assisted Pull-Ups", sets: 4, reps: "5-8", notes: "Band ASSISTS. Chin over bar, controlled descent.", video: "https://www.youtube.com/shorts/0sRmDbT9Pm0", equipment: "band", assist: true, grips: ['neutral', 'chinup', 'pullup'], rest: 120, noWarmup: true },
      { name: "Single-Arm Dumbbell Rows", sets: 3, reps: "8-12", notes: "Each side, brace on bench", video: "https://www.youtube.com/shorts/H8jf3DwlIlo", rest: 120 },
      { name: "Dumbbell Bent-Over Rows", sets: 3, reps: "8-12", notes: "Keep back flat, pull to hips", video: "https://www.youtube.com/shorts/dpYI8K6e-jE", rest: 120 },
      { name: "Band Row", sets: 3, reps: "12-15", notes: "Stand on band, pull to chest, squeeze back", video: "https://www.youtube.com/shorts/BAlsaA1wIhY", equipment: "band", rest: 120 }
    ]
  },
  {
    family: "Rear Delts & Face Pulls",
    exercises: [
      { name: "Face Pulls", sets: 3, reps: "15-20", notes: "Anchor band at face height, pull toward your face, elbows high, squeeze rear delts.", equipment: "band", rest: 60, noWarmup: true },
      { name: "Reverse Flyes", sets: 3, reps: "15-20", notes: "Rear delts & upper back, light weight, squeeze at the top", video: "https://www.youtube.com/shorts/LsT-bR_zxLo", rest: 60, noWarmup: true },
    ]
  },
  {
    family: "Triceps (Arm Extension)",
    exercises: [
      { name: "Band Tricep Pushdowns", sets: 3, reps: "12-15", notes: "Elbows glued to ribs, squeeze at bottom", equipment: "band", video: "https://www.youtube.com/shorts/eGjSphOefTI", rest: 60 },
      { name: "Bench Dips", sets: 3, reps: "10-15", notes: "Hands on bench behind you, lower until elbows ~90°. Band ASSISTS — loop it under your hips to take weight off; leave bands empty for full bodyweight.", equipment: "band", assist: true, video: "https://www.youtube.com/shorts/0326dy_-CzM", rest: 60 },
      { name: "Overhead Tricep Extension", sets: 2, reps: "10-15", notes: "Single DB, both hands", video: "https://www.youtube.com/shorts/b_r_LW4HEcM" },
    ]
  },
  {
    family: "Biceps (Arm Flexion)",
    exercises: [
      { name: "Dumbbell Bicep Curls", sets: 2, reps: "8-12", notes: "Finish strong", video: "https://www.youtube.com/shorts/MKWBV29S6c0", grips: ['supinated', 'hammer', 'reverse'] },
      { name: "Dumbbell Hammer Curls", sets: 3, reps: "8-12", video: "https://www.youtube.com/shorts/0IAJqSwFnHI", notes: "Hammer grip default · toggle for variants", grips: ['hammer', 'supinated', 'reverse'] },
      { name: "Band Bicep Curls", sets: 2, reps: "12-15", notes: "Stand on band, curl handles up", video: "https://www.youtube.com/shorts/5ACsDBt_sMQ", equipment: "band", grips: ['supinated', 'hammer', 'reverse'] },
    ]
  },
  {
    family: "Calves",
    exercises: [
      { name: "Calf Raises", sets: 3, reps: "15-20", notes: "Elevate toes on a block, full stretch at bottom, squeeze at top.", rest: 60 }
    ]
  },
  {
    family: "Core",
    exercises: [
      { name: "Band Torso Rotation", sets: 3, reps: "10-12", notes: "Anchor band at chest height, rotate left and right under control. 10-12 per side.", equipment: "band", rest: 60, noWarmup: true },
      { name: "Hanging Knee Raise", sets: 3, reps: "10-15", notes: "Hang from the bar, raise knees toward chest, control the lower. No swinging.", rest: 60, noWarmup: true },
      { name: "Pallof Press", sets: 3, reps: "10-12", notes: "Anti-rotation core finisher: anchor band at chest height, press straight out and resist the twist. Each side.", equipment: "band", rest: 60, noWarmup: true },
    ]
  }
];

function findExerciseConfig(exerciseName) {
  for (const grp of SWAP_GROUPS) {
    const found = grp.exercises.find(e => e.name === exerciseName);
    if (found) return found;
  }
  return null;
}

// Returns the array of exercises within the matching family
function getSwapGroup(exerciseName) {
  const grp = SWAP_GROUPS.find(g => g.exercises.some(e => e.name === exerciseName));
  return grp ? grp.exercises : null;
}

function getSwapGroupName(exerciseName) {
  const grp = SWAP_GROUPS.find(g => g.exercises.some(e => e.name === exerciseName));
  return grp ? grp.family : null;
}

function getSwapOptions(exerciseName) {
  const g = getSwapGroup(exerciseName);
  return g ? g.filter(e => e.name !== exerciseName) : [];
}

function isSwappable(exerciseName) {
  return SWAP_GROUPS.some(g => g.exercises.some(e => e.name === exerciseName));
}
