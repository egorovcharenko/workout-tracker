const EXERCISE_MUSCLES = {
  "Barbell RDL": { primary: ["hamstrings", "glutes", "lower_back"], secondary: ["upper_back", "lats", "quads", "forearms", "core"], ratios: { hamstrings: 1.0, glutes: 1.0, lower_back: 1.0, upper_back: 0.5, lats: 0.3, quads: 0.3, forearms: 0.4, core: 0.3 } },
  "Dumbbell Lateral Raises": { primary: ["shoulders"], secondary: [], ratios: { shoulders: 1.0 } },
  "Incline DB Curls": { primary: ["biceps"], secondary: ["forearms"], ratios: { biceps: 1.0, forearms: 0.3 } },
  "Overhead Dumbbell Press": { primary: ["shoulders"], secondary: ["triceps"], ratios: { shoulders: 1.0, triceps: 0.4 } },
  "Dumbbell Bicep Curls": { primary: ["biceps"], secondary: ["forearms"], ratios: { biceps: 1.0, forearms: 0.3 } },
  "Band Bicep Curls": { primary: ["biceps"], secondary: ["forearms"], ratios: { biceps: 1.0, forearms: 0.3 } },
  "Overhead Tricep Extension": { primary: ["triceps"], secondary: [], ratios: { triceps: 1.0 } },
  "Band Tricep Pushdowns": { primary: ["triceps"], secondary: [], ratios: { triceps: 1.0 } },
  "Dumbbell Hammer Curls": { primary: ["biceps"], secondary: ["forearms"], ratios: { biceps: 1.0, forearms: 0.4 } },
  "Dips": { primary: ["triceps"], secondary: ["chest", "shoulders"], ratios: { triceps: 1.0, chest: 0.4, shoulders: 0.4 } },
  "Dumbbell Bent-Over Rows": { primary: ["lats"], secondary: ["biceps", "rear_delts"], ratios: { lats: 1.0, biceps: 0.3, rear_delts: 0.4 } },
  "Single-Arm Dumbbell Rows": { primary: ["lats"], secondary: ["biceps", "rear_delts"], ratios: { lats: 1.0, biceps: 0.3, rear_delts: 0.4 } },
  "Assisted Pull-Ups": { primary: ["lats"], secondary: ["biceps", "upper_back", "rear_delts"], ratios: { lats: 1.0, biceps: 0.35, upper_back: 0.5, rear_delts: 0.3 } },
  "Reverse Flyes": { primary: ["rear_delts"], secondary: ["upper_back"], ratios: { rear_delts: 1.0, upper_back: 0.4 } },
  "Goblet Squat": { primary: ["quads", "glutes"], secondary: ["core"], ratios: { quads: 1.0, glutes: 1.0, core: 0.3 } },
  "Bulgarian Split Squat": { primary: ["quads", "glutes"], secondary: ["hamstrings", "core"], ratios: { quads: 1.0, glutes: 1.0, hamstrings: 0.4, core: 0.2 } },
  "Dumbbell Flat Bench Press": { primary: ["chest"], secondary: ["triceps", "shoulders"], ratios: { chest: 1.0, triceps: 0.4, shoulders: 0.4 } },
  "Barbell Bench Press": { primary: ["chest"], secondary: ["triceps", "shoulders"], ratios: { chest: 1.0, triceps: 0.4, shoulders: 0.4 } },
  "Dumbbell Romanian Deadlift": { primary: ["hamstrings", "glutes"], secondary: ["lower_back"], ratios: { hamstrings: 1.0, glutes: 1.0, lower_back: 0.5 } },
  "Seated Overhead Press": { primary: ["shoulders"], secondary: ["triceps"], ratios: { shoulders: 1.0, triceps: 0.4 } },
  "Band Squat": { primary: ["quads", "glutes"], secondary: ["core"], ratios: { quads: 1.0, glutes: 1.0, core: 0.3 } },
  "Band Row": { primary: ["lats", "upper_back"], secondary: ["biceps"], ratios: { lats: 1.0, upper_back: 1.0, biceps: 0.3 } },
  "Band Romanian Deadlift": { primary: ["hamstrings", "glutes"], secondary: ["lower_back"], ratios: { hamstrings: 1.0, glutes: 1.0, lower_back: 0.4 } },
  "Pallof Press": { primary: ["core"], secondary: [], ratios: { core: 1.0 } },
  "Lunges": { primary: ["quads", "glutes"], secondary: ["hamstrings"], ratios: { quads: 1.0, glutes: 1.0, hamstrings: 0.3 } },
  "Calf Raises": { primary: ["calves"], secondary: [], ratios: { calves: 1.0 } },
  "Single-Leg DB RDL": { primary: ["hamstrings", "glutes"], secondary: ["lower_back", "core"], ratios: { hamstrings: 1.0, glutes: 1.0, lower_back: 0.4, core: 0.3 } },
  "Barbell Back Squat": { primary: ["quads", "glutes"], secondary: ["lower_back", "core"], ratios: { quads: 1.0, glutes: 0.8, lower_back: 0.4, core: 0.4 } },
  "Bent-Over Barbell Rows": { primary: ["lats", "upper_back"], secondary: ["biceps", "rear_delts", "lower_back"], ratios: { lats: 1.0, upper_back: 1.0, biceps: 0.3, rear_delts: 0.4, lower_back: 0.4 } },
  "Bended Barbell Rows": { primary: ["lats", "upper_back"], secondary: ["biceps", "rear_delts", "lower_back"], ratios: { lats: 1.0, upper_back: 1.0, biceps: 0.3, rear_delts: 0.4, lower_back: 0.4 } },
  "Incline Dumbbell Press": { primary: ["chest"], secondary: ["shoulders", "triceps"], ratios: { chest: 1.0, shoulders: 0.6, triceps: 0.4 } },
  "Incline Barbell Press": { primary: ["chest"], secondary: ["shoulders", "triceps"], ratios: { chest: 1.0, shoulders: 0.6, triceps: 0.4 } },
  "Standing Overhead Press": { primary: ["shoulders"], secondary: ["triceps", "upper_back", "core"], ratios: { shoulders: 1.0, triceps: 0.5, upper_back: 0.3, core: 0.4 } },
  "Face Pulls": { primary: ["rear_delts"], secondary: ["upper_back"], ratios: { rear_delts: 1.0, upper_back: 0.5 } },
  "Band Torso Rotation": { primary: ["core"], secondary: [], ratios: { core: 1.0 } },
  "Hanging Knee Raise": { primary: ["core"], secondary: ["forearms"], ratios: { core: 1.0, forearms: 0.2 } },
  "Dumbbell Shrugs": { primary: ["upper_back"], secondary: ["forearms"], ratios: { upper_back: 1.0, forearms: 0.3 } },
  "Barbell Shrugs": { primary: ["upper_back"], secondary: ["forearms"], ratios: { upper_back: 1.0, forearms: 0.3 } },
  "Dead Hang + Scap Pulls": { primary: ["upper_back"], secondary: ["lats", "forearms"], ratios: { upper_back: 1.0, lats: 0.3, forearms: 0.5 } }
};

const STRENGTH_STANDARDS = {
  "Barbell RDL": { beg: 135, nov: 185, int: 275, adv: 365, elite: 465 },
  "Dumbbell Lateral Raises": { beg: 10, nov: 15, int: 25, adv: 35, elite: 45 },
  "Incline DB Curls": { beg: 12, nov: 22, int: 35, adv: 50, elite: 70 },
  "Dumbbell Flat Bench Press": { beg: 25, nov: 45, int: 70, adv: 95, elite: 120 },
  "Barbell Bench Press": { beg: 95, nov: 135, int: 185, adv: 225, elite: 315 },
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
  "Dips": { beg: -17, nov: 38, int: 106, adv: 183, elite: 267 },
  "Assisted Pull-Ups": { beg: -28, nov: 18, int: 75, adv: 138, elite: 206 },
  "Band Row": { beg: 20, nov: 35, int: 55, adv: 75, elite: 95 },
  "Band Squat": { beg: 25, nov: 45, int: 75, adv: 105, elite: 135 },
  "Band Romanian Deadlift": { beg: 25, nov: 45, int: 70, adv: 100, elite: 130 },
  "Band Bicep Curls": { beg: 8, nov: 15, int: 25, adv: 38, elite: 52 },
  "Band Tricep Pushdowns": { beg: 10, nov: 20, int: 35, adv: 52, elite: 70 },
  "Pallof Press": { beg: 10, nov: 20, int: 35, adv: 50, elite: 70 },
  "Barbell Back Squat": { beg: 95, nov: 135, int: 205, adv: 285, elite: 365 },
  "Bent-Over Barbell Rows": { beg: 85, nov: 125, int: 175, adv: 215, elite: 295 },
  "Bended Barbell Rows": { beg: 85, nov: 125, int: 175, adv: 215, elite: 295 },
  "Incline Dumbbell Press": { beg: 25, nov: 40, int: 65, adv: 90, elite: 115 },
  "Incline Barbell Press": { beg: 80, nov: 115, int: 155, adv: 190, elite: 265 },
  "Standing Overhead Press": { beg: 65, nov: 95, int: 135, adv: 175, elite: 225 },
  "Face Pulls": { beg: 10, nov: 20, int: 35, adv: 50, elite: 70 },
  "Reverse Flyes": { beg: 10, nov: 20, int: 30, adv: 45, elite: 60 },
  "Overhead Tricep Extension": { beg: 15, nov: 25, int: 45, adv: 65, elite: 85 },
  "Lunges": { beg: 25, nov: 45, int: 70, adv: 100, elite: 130 },
  "Calf Raises": { beg: 20, nov: 45, int: 75, adv: 110, elite: 150 },
  "Band Torso Rotation": { beg: 10, nov: 20, int: 35, adv: 50, elite: 70 },
  "Hanging Knee Raise": { beg: 15, nov: 35, int: 60, adv: 85, elite: 110 },
  "Dumbbell Shrugs": { beg: 30, nov: 50, int: 75, adv: 105, elite: 135 },
  "Barbell Shrugs": { beg: 135, nov: 185, int: 275, adv: 365, elite: 465 },
  "Dead Hang + Scap Pulls": { beg: -20, nov: 15, int: 50, adv: 85, elite: 120 }
};

function getMuscleImpact(exName, muscle, isPrimary) {
  const mapping = EXERCISE_MUSCLES[exName];
  if (!mapping) return isPrimary ? 1.0 : 0.5;
  if (mapping.ratios && mapping.ratios[muscle] !== undefined) {
    return mapping.ratios[muscle];
  }
  return isPrimary ? 1.0 : 0.5;
}

function calcSet1RM(exerciseName, weight, reps, bandsJson) {
  const isAssist = exerciseName === "Assisted Pull-Ups" || exerciseName === "Dips" || exerciseName === "Dead Hang + Scap Pulls" || exerciseName === "Hanging Knee Raise";
  
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
    return reps > 1 ? weight * (1 + reps / 30.0) : weight;
  }
}

if (typeof window !== "undefined") {
  window.USER_SETTINGS = { gender: "male", birth_date: "1983-11-08", bodyweight: 175 };
}

function getMcCullochCoefficient(age) {
  if (age <= 40) return 1.0;
  const table = [
    { age: 40, coeff: 1.0 },
    { age: 45, coeff: 1.06 },
    { age: 50, coeff: 1.15 },
    { age: 55, coeff: 1.25 },
    { age: 60, coeff: 1.38 },
    { age: 65, coeff: 1.53 },
    { age: 70, coeff: 1.70 },
    { age: 75, coeff: 1.87 },
    { age: 80, coeff: 2.06 },
    { age: 90, coeff: 2.50 }
  ];
  if (age >= 90) return 2.50;
  for (let i = 0; i < table.length - 1; i++) {
    const p1 = table[i];
    const p2 = table[i+1];
    if (age >= p1.age && age <= p2.age) {
      const t = (age - p1.age) / (p2.age - p1.age);
      return p1.coeff + t * (p2.coeff - p1.coeff);
    }
  }
  return 1.0;
}

function getStrengthPercentile(exerciseName, weight1RM) {
  const stds = STRENGTH_STANDARDS[exerciseName];
  if (!stds) return null;
  const w = weight1RM || 0;

  const settings = (typeof window !== "undefined" && window.USER_SETTINGS) || { gender: "male", birth_date: "1983-11-08", bodyweight: 175 };
  const gender = settings.gender || "male";
  const birthDate = settings.birth_date || "1983-11-08";
  const bodyweight = parseFloat(settings.bodyweight) || 175;

  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  const ageCoeff = getMcCullochCoefficient(age);
  const bwCoeff = Math.pow(bodyweight / 180, 0.9);

  let genderCoeff = 1.0;
  if (gender === "female") {
    const lowerExercises = ["Barbell Back Squat", "Barbell RDL", "Bulgarian Split Squat", "Goblet Squat", "Band Squat", "Band Romanian Deadlift", "Lunges", "Calf Raises"];
    const isLower = lowerExercises.some(ex => exerciseName.toLowerCase().includes(ex.toLowerCase()));
    genderCoeff = isLower ? 0.75 : 0.65;
  }

  const scale = (val) => val * genderCoeff * bwCoeff / ageCoeff;

  const beg = scale(stds.beg);
  const nov = scale(stds.nov);
  const int = scale(stds.int);
  const adv = scale(stds.adv);
  const elite = scale(stds.elite);

  if (w < beg) {
    const minW = beg < 0 ? beg * 2 : 0;
    if (w <= minW) return { percentile: 0, tier: "Untrained" };
    const p = 0 + ((w - minW) / (beg - minW)) * 5;
    return { percentile: Math.round(p), tier: "Untrained" };
  } else if (w < nov) {
    const p = 5 + ((w - beg) / (nov - beg)) * 15;
    return { percentile: Math.round(p), tier: "Beginner" };
  } else if (w < int) {
    const p = 20 + ((w - nov) / (int - nov)) * 30;
    return { percentile: Math.round(p), tier: "Novice" };
  } else if (w < adv) {
    const p = 50 + ((w - int) / (adv - int)) * 30;
    return { percentile: Math.round(p), tier: "Intermediate" };
  } else if (w < elite) {
    const p = 80 + ((w - adv) / (elite - adv)) * 15;
    return { percentile: Math.round(p), tier: "Advanced" };
  } else {
    const p = 95 + Math.min(4, ((w - elite) / (elite || 1)) * 5);
    return { percentile: Math.round(p), tier: "Elite" };
  }
}

function applySwaps(workout, swapMap) {
  if (!swapMap || !Object.keys(swapMap).length) return workout;
  return {
    ...workout,
    exercises: workout.exercises.map((ex, idx) => {
      const topWant = swapMap[`${idx}`];
      if (topWant && topWant !== ex.name) {
        const repl = findExerciseConfig(topWant);
        if (repl) return { ...repl };
      }
      if (ex.supersetExercises) {
        let changed = false;
        const newSubs = ex.supersetExercises.map((sub, subIdx) => {
          const subWant = swapMap[`${idx}-${subIdx}`];
          if (!subWant || subWant === sub.name) return sub;
          const repl = findExerciseConfig(subWant);
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

if (typeof window !== "undefined") {
  window.EXERCISE_MUSCLES = EXERCISE_MUSCLES;
  window.STRENGTH_STANDARDS = STRENGTH_STANDARDS;
  window.getMuscleImpact = getMuscleImpact;
  window.calcSet1RM = calcSet1RM;
  window.getStrengthPercentile = getStrengthPercentile;
  window.applySwaps = applySwaps;
}
