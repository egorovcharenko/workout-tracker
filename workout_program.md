# Barbell A/B Split (home: power rack + barbell + dumbbells)

Two full-body days run on a ~3-day week, alternating **A-B-A / B-A-B**. The app
auto-selects the next day by alternating from your last A/B session (override on
the home screen). Squat and deadlift are the only lifts not duplicated — they're
too heavy to run both days, so each owns one day.

## Workout A — Squat Day
1. **Barbell Back Squat** — 3×6–8  *(3 warm-up ramp sets; safety pins set low)*
2. **Dumbbell Flat Bench Press** — 4×8–12
3. **Single-Arm Dumbbell Row** — 3×8–12
4. **Seated Overhead Press** — 3×8–12
5. **Reverse Flyes** — 3×15–20  *(rear delts / mid-traps)*
6. **Superset** — Band Tricep Pushdowns + DB Hammer Curls — 3 rounds
7. **Band Torso Rotation** — 3×10–12/side  *(rotational core)*

## Workout B — Deadlift Day
1. **Barbell Deadlift** — 3×3–5  *(3 warm-up ramp sets; reset each rep)*
2. **Incline Dumbbell Press** — 4×8–12
3. **Assisted Pull-Ups** — 4×5–8
4. **Standing Overhead Press** — 3×6–8  *(from the rack; 2 warm-ups)*
5. **Superset** — Face Pulls + Bulgarian Split Squat — 3 rounds  *(rear delts + quads)*
6. **Superset** — Band Tricep Pushdowns + DB Bicep Curls (supinated) — 3 rounds
7. **Hanging Knee Raise** — 3×10–15  *(core)*

## Progression
- **Barbell lifts:** hit the top of the rep range on all working sets → add ~5 lb
  (squat) / ~10 lb (deadlift) next time. Stall twice → drop 10% and build back.
- **DB accessories:** double progression — add reps to the top of the range, then
  bump the dumbbell and reset to the bottom.

## Why it's built this way
- **Squat ≠ deadlift on the same day** — they share the low-back/posterior recovery
  bottleneck, so they're split. No redundant hinge on squat day, no redundant squat
  on deadlift day.
- **Pressing balanced with pulling** — Reverse Flyes (A) and Face Pulls (B) keep
  rear delts / traps from lagging behind all the bench + OHP volume.
- **Everything trained both days with a different variation** (bench ↔ incline,
  seated ↔ standing press, row ↔ pull-up, hammer ↔ supinated curls).

## Known gaps (deliberate, low priority)
- **Side (lateral) delts** — no direct work; add lateral raises if you want width.
- **Calves** — none; add calf raises if you care about them.
- Quad/hamstring volume is on the lower side (one source each) — fine for a
  strength-first transition.

## In the app
- Workouts live in `workout-shared.js` (`WORKOUTS`: ids `squat-day`, `deadlift-day`),
  with muscle maps in `EXERCISE_MUSCLES` and tiers in `STRENGTH_STANDARDS`.
- **Swap** any main slot from the session screen (CHOOSE VARIANT): squat ↔ goblet ↔
  bulgarian, deadlift ↔ RDL variants, flat ↔ incline bench, seated ↔ standing press,
  reverse fly ↔ face pull (`SWAP_GROUPS` in `workout-session-utils.js`).
- **Test mode:** open a workout with `?test=1` (or the "🧪 Test" links on home) to
  rehearse the flow — auto-select, override, swaps, logging — while **nothing is
  saved** (no `/api/save`; session localStorage is namespaced under `test:`).
