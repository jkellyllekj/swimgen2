/**
 * data/workout-store.js - Workout state management
 * Extracted from legacy-index.js
 */

// Workout state storage
let currentWorkout = null;
let workoutHistory = [];

/**
 * Store a generated workout
 */
function storeWorkout(workout) {
  currentWorkout = {
    ...workout,
    timestamp: Date.now()
  };
  workoutHistory.push(currentWorkout);
  
  // Keep only last 10 workouts
  if (workoutHistory.length > 10) {
    workoutHistory = workoutHistory.slice(-10);
  }
  
  return currentWorkout;
}

/**
 * Get the current workout
 */
function getCurrentWorkout() {
  return currentWorkout;
}

/**
 * Get workout history
 */
function getWorkoutHistory() {
  return [...workoutHistory];
}

/**
 * Clear current workout
 */
function clearWorkout() {
  currentWorkout = null;
}

/**
 * Update a specific set in the current workout
 */
function updateSet(setIndex, newSetData) {
  if (!currentWorkout || !currentWorkout.sections) return null;
  
  if (setIndex >= 0 && setIndex < currentWorkout.sections.length) {
    currentWorkout.sections[setIndex] = {
      ...currentWorkout.sections[setIndex],
      ...newSetData,
      modified: true
    };
  }
  
  return currentWorkout;
}

module.exports = {
  storeWorkout,
  getCurrentWorkout,
  getWorkoutHistory,
  clearWorkout,
  updateSet
};
