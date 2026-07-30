"use strict";

const { longestDailyStreak } = require("./achievementEvaluator");

function projectUtcWorkoutStreak(events) {
  return longestDailyStreak(events.filter((event) => event.eventType === "workout.completed"));
}

module.exports = { projectUtcWorkoutStreak };
