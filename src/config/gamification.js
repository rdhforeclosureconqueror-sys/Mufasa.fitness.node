"use strict";

function enabled(value) {
  return String(value || "").trim().toLowerCase() === "true";
}

function loadGamificationConfig(env = process.env) {
  const config = {
    eventCapture: enabled(env.GAMIFICATION_EVENT_CAPTURE),
    evaluation: enabled(env.GAMIFICATION_EVALUATION),
    readApi: enabled(env.GAMIFICATION_READ_API),
    operations: enabled(env.GAMIFICATION_OPERATIONS),
    notifications: enabled(env.GAMIFICATION_NOTIFICATIONS),
    leaderboards: enabled(env.GAMIFICATION_LEADERBOARDS),
    sources: Object.freeze({
      workoutCompleted: enabled(env.GAMIFICATION_SOURCE_WORKOUT_COMPLETED)
    })
  };
  const invalid = [];
  if (config.evaluation && !config.eventCapture) invalid.push("GAMIFICATION_EVALUATION requires GAMIFICATION_EVENT_CAPTURE");
  if (config.readApi && !config.evaluation) invalid.push("GAMIFICATION_READ_API requires GAMIFICATION_EVALUATION");
  if (config.operations && !config.readApi) invalid.push("GAMIFICATION_OPERATIONS requires GAMIFICATION_READ_API");
  if (config.notifications && !config.readApi) invalid.push("GAMIFICATION_NOTIFICATIONS requires GAMIFICATION_READ_API");
  if (config.leaderboards && !config.readApi) invalid.push("GAMIFICATION_LEADERBOARDS requires GAMIFICATION_READ_API");
  if (config.sources.workoutCompleted && !config.eventCapture) invalid.push("GAMIFICATION_SOURCE_WORKOUT_COMPLETED requires GAMIFICATION_EVENT_CAPTURE");
  if (invalid.length) throw new Error(`Invalid gamification feature configuration: ${invalid.join("; ")}`);
  return Object.freeze(config);
}

module.exports = { loadGamificationConfig };
