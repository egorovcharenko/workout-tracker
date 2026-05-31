# Barbell Transition Strategy (A/B Split)

**Context:** The user recently acquired a power rack and a barbell and wants to slowly transition their current single "Full Body" dumbbell/band routine to a barbell-focused A/B split. The primary goal is to safely introduce the Barbell Back Squat and Barbell Deadlift without frying the Central Nervous System (CNS) or causing overtraining, while keeping their highly successful upper-body dumbbell work intact.

## The New A/B Split Structure
This split should be alternated across a ~3-day training week (e.g., A-B-A week one, B-A-B week two).

### Workout A: Squat Focus
* **Barbell Back Squat**: 3 sets × 5-8 reps (Heavy compound)
* **Dumbbell Flat Bench Press**: 4 sets × 8-12 reps
* **Barbell Bent-Over Row** or **Single-Arm DB Row**: 3 sets × 8-12 reps
* **Seated Overhead Dumbbell Press**: 4 sets × 8-12 reps
* **Dumbbell RDLs**: 3 sets × 10-15 reps (Light hinge for a hamstring stretch)
* **Sleeve-Buster Superset**: 
  * Band Tricep Pushdowns (12-15 reps)
  * Dumbbell Hammer Curls (10-15 reps)

### Workout B: Deadlift Focus
* **Barbell Deadlift**: 3 sets × 5-8 reps (Heavy compound)
* **Dumbbell Flat Bench Press**: 4 sets × 8-12 reps
* **Assisted Pull-Ups**: 4 sets × 5-8 reps
* **Seated Overhead Dumbbell Press**: 4 sets × 8-12 reps
* **Bulgarian Split Squats** or **Goblet Squats**: 3 sets × 10-15 reps (Light quads)
* **Sleeve-Buster Superset**:
  * Band Tricep Pushdowns (12-15 reps)
  * Supinated (Palms Up) DB Curls (10-15 reps)

## Volume & Programming Notes for the Implementing Agent
1. **Back Volume:** The user's previous routine had them doing *both* pull-ups and rows in the same session (21 sets/week). This routine cuts it to an optimal 10 sets/week by alternating horizontal and vertical pulls.
2. **CNS Load:** Barbell Squats and Deadlifts are separated into different days so they can be pushed hard without systemic burnout.
3. **Rep Ranges:** Barbell compounds are programmed for 5-8 reps (strength/hypertrophy balance). DB accessories are in the 8-12 range. Arms and isolations are 12-15+ reps.
4. **JS Implementation:** The agent implementing this will need to update `workout-shared.js` to add the new barbell exercises to `EXERCISE_MUSCLES`, register their standards in `STRENGTH_STANDARDS`, and create these two new workout structures in the `WORKOUTS` array.
