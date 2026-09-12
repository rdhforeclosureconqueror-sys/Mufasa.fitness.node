"use strict";

const { ApiError } = require("../lib/apiResponse");

const PUSH_UP_CHALLENGE = Object.freeze({
  entryContext: "push_up_challenge",
  challengeId: "push_up",
  challengeTitle: "Push-Up Challenge"
});
const FITNESS_LEVELS = new Set(["beginner", "intermediate", "advanced"]);

function clone(value) { return value == null ? null : structuredClone(value); }

function createChallengeParticipantService({ userStore, clock = () => new Date() }) {
  function capture(userId, input = {}) {
    const fitnessLevel = String(input.fitnessLevel || "").trim().toLowerCase();
    if (!FITNESS_LEVELS.has(fitnessLevel)) {
      throw new ApiError("INVALID_FITNESS_LEVEL", "Fitness level must be beginner, intermediate, or advanced", 422);
    }
    let saved;
    userStore.updateUser(userId, user => {
      user.challengeParticipants = user.challengeParticipants && typeof user.challengeParticipants === "object"
        ? user.challengeParticipants : {};
      const previous = user.challengeParticipants[PUSH_UP_CHALLENGE.challengeId];
      const capturedAt = new Date(clock()).toISOString();
      saved = {
        ...PUSH_UP_CHALLENGE,
        fitnessLevel,
        joinedAt: previous?.joinedAt || capturedAt,
        capturedAt
      };
      user.challengeParticipants[PUSH_UP_CHALLENGE.challengeId] = saved;
      return user;
    });
    return clone(saved);
  }

  function get(userId) {
    return clone(userStore.loadUser(userId).challengeParticipants?.[PUSH_UP_CHALLENGE.challengeId] || null);
  }

  return { capture, get };
}

module.exports = { createChallengeParticipantService, PUSH_UP_CHALLENGE, FITNESS_LEVELS };
