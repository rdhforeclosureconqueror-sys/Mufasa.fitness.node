"use strict";

function enabled(value) {
  return String(value || "").trim().toLowerCase() === "true";
}

function loadGamificationConfig(env = process.env) {
  return Object.freeze({
    eventCapture: enabled(env.GAMIFICATION_EVENT_CAPTURE),
    evaluation: enabled(env.GAMIFICATION_EVALUATION),
    readApi: enabled(env.GAMIFICATION_READ_API),
    notifications: enabled(env.GAMIFICATION_NOTIFICATIONS),
    leaderboards: enabled(env.GAMIFICATION_LEADERBOARDS),
    sources: Object.freeze({
      workoutCompleted: enabled(env.GAMIFICATION_SOURCE_WORKOUT_COMPLETED)
    })
  });
}

module.exports = { loadGamificationConfig };
