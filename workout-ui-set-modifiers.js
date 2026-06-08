// Set Modifiers logic for Workout Tracker

function addSet(exIdx) {
  if (!state.extraSets) state.extraSets = {};
  state.extraSets[exIdx] = (state.extraSets[exIdx] || 0) + 1;
  render();
}

function removeLastSet(exIdx) {
  const count = getSetCount(exIdx);
  if (count <= 1) return;
  const lastIdx = count - 1;
  // Remove last set — even if completed
  delete state.weights[`${exIdx}-${lastIdx}`];
  delete state.reps[`${exIdx}-${lastIdx}`];
  delete state.completed[`${exIdx}-${lastIdx}`];
  if (!state.extraSets) state.extraSets = {};
  const base = state.workout.exercises[exIdx].sets;
  const extra = state.extraSets[exIdx] || 0;
  if (extra > 0) {
    state.extraSets[exIdx] = extra - 1;
  } else {
    state.extraSets[exIdx] = (state.extraSets[exIdx] || 0) - 1;
  }
  triggerSave();
  render();
}

// Swappable exercise group helpers are loaded globally from workout-shared.js

function swapExercise(exIdx, newName) {
  const swap = findExerciseConfig(newName);
  if (!swap) return;
  // Clear progress for this exercise
  delete state.completed[`${exIdx}-warmup`];
  delete state.weights[`${exIdx}-warmup`];
  delete state.reps[`${exIdx}-warmup`];
  for (let i = 0; i < getSetCount(exIdx); i++) {
    delete state.completed[`${exIdx}-${i}`];
    delete state.weights[`${exIdx}-${i}`];
    delete state.reps[`${exIdx}-${i}`];
  }
  if (state.extraSets) state.extraSets[exIdx] = 0;
  state.workout.exercises[exIdx] = { ...swap };
  state.swapOpen = null;
  triggerSave();
  render();
}

function toggleSwapMenu(exIdx) {
  state.swapOpen = state.swapOpen === exIdx ? null : exIdx;
  render();
}
