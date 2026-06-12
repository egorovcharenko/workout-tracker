# Weekly Program: Main A/B + Micro Days (home: power rack + barbell + dumbbells)

Three ~40-min main days (Mon/Wed/Fri) alternating **A-B-A this week, B-A-B
next**, with two ~15-min micro days (Tue/Thu) for arms/core and rear
delts/traps. Micro days can shuffle freely; main days need a day between them.
The app highlights the next workout on the home screen, but any workout can be
started from the list.

## Main A (~40 min) — Mon/Fri slots
1. **Barbell Back Squat** — 3×5–8  *(3 warm-up ramp sets; safety pins set low)*
2. **Barbell Bench Press** — 4×6–10  *(1 warm-up set)*
3. **Assisted Pull-Ups (volume)** — 4×5–8  *(band that allows clean reps)*
4. **Standing Overhead Press** — 3×6–10  *(from the rack; 1 warm-up)*

## Micro: Arms & Core (~15 min) — Tue slot
1. **Dumbbell Hammer Curls** — 3×8–12
2. **Dumbbell Bicep Curls (supinated)** — 3×8–12
3. **Band Tricep Pushdowns** — 3×10–15
4. **Band Torso Rotation** — 2×10–12/side

## Main B (~40 min) — Wed slot
1. **Barbell Deadlift** — 3×5–8  *(3 warm-up ramp sets; reset each rep)*
2. **Incline Barbell Press** — 4×6–10  *(1 warm-up; bench at ~30°)*
3. **Bent-Over Barbell Rows** — 4×8–12
4. **Pull-Ups (heavy)** — 3×3–5  *(lightest band for strict reps, or negatives)*

## Micro: Delts & Traps (~15 min) — Thu slot
1. **Dumbbell Shrugs** — 3×10–15
2. **Face Pulls** — 3×12–15
3. **Reverse Flyes** — 3×12–15
4. **Dead Hang + Scap Pulls** — 2 sets  *(20–40s hang + 5–8 scap pulls)*

## Weekend
- **Sat (optional):** Weekend Extras — hanging knee raises + calf raises, or
  anything missed, or ride/climb.
- **Sun:** off.

## Progression
- **Barbell lifts:** hit the top of the rep range on all working sets → add ~5 lb
  (squat/bench/OHP) / ~10 lb (deadlift) next time. Stall twice → drop 10% and
  build back.
- **DB/band accessories:** double progression — add reps to the top of the range,
  then bump the weight and reset to the bottom.

## In the app
- Workouts live in `workout-shared.js` (`WORKOUTS` ids: `main-a`, `micro-arms`,
  `main-b`, `micro-delts`, `weekend-extras`; flagged `program: true`), with
  muscle maps in `workout-shared-standards.js` (`EXERCISE_MUSCLES`).
- **Next-up highlight** (`workout-ui-home.js`): mains alternate based on the
  last Main A/B in history; Tue/Thu highlight the micro done longer ago
  (Tue → arms, Thu → delts on a tie). Every workout stays startable from the
  home list regardless of the suggestion.
- **Swap** exercises from the session screen (CHOOSE VARIANT) via `SWAP_GROUPS`.
- **Test mode:** open a workout with `?test=1` (or the "🧪 Test" links on home)
  to rehearse the flow while **nothing is saved** (no `/api/save`; session
  localStorage is namespaced under `test:`).
