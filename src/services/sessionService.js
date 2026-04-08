"use strict";

const { ApiError } = require("../lib/apiResponse");

function pushEvent(user, command, payload) {
  user.events = user.events || [];
  user.events.push({ command, ts: Date.now(), payload });
}

function createSessionService({ userStore }) {
  function startSession({ userId, sessionId, programId = null, exerciseId = null, payload = {} }) {
    const now = Date.now();
    const sid = sessionId || `sess_${now}`;
    let sessionData = null;

    userStore.updateUser(userId, (user) => {
      user.sessions = user.sessions || {};
      const existing = user.sessions[sid];
      if (existing && !existing.endedAt) {
        throw new ApiError("SESSION_ALREADY_ACTIVE", `Session ${sid} already exists and is not completed`, 409);
      }

      sessionData = {
        sessionId: sid,
        programId,
        exerciseId,
        startedAt: now,
        endedAt: null,
        repUpdates: []
      };

      user.sessions[sid] = sessionData;
      pushEvent(user, "fitness.startSession", payload);
      return user;
    });

    return {
      sessionId: sid,
      session: sessionData
    };
  }

  function appendRepUpdate({ userId, sessionId, exerciseId = null, repsThisSet = null, totalReps = null, depthScore = null, goodForm = null, payload = {} }) {
    let repUpdate = null;
    let repUpdatesCount = 0;

    userStore.updateUser(userId, (user) => {
      user.sessions = user.sessions || {};

      if (!user.sessions[sessionId]) {
        throw new ApiError("SESSION_NOT_FOUND", `Session ${sessionId} does not exist for user`, 404);
      }

      if (user.sessions[sessionId].endedAt) {
        throw new ApiError("SESSION_ALREADY_COMPLETED", `Session ${sessionId} is already completed`, 409);
      }

      repUpdate = {
        ts: Date.now(),
        exerciseId,
        repsThisSet,
        totalReps,
        depthScore,
        goodForm
      };

      user.sessions[sessionId].repUpdates = Array.isArray(user.sessions[sessionId].repUpdates)
        ? user.sessions[sessionId].repUpdates
        : [];
      user.sessions[sessionId].repUpdates.push(repUpdate);
      repUpdatesCount = user.sessions[sessionId].repUpdates.length;
      pushEvent(user, "fitness.repUpdate", payload);
      return user;
    });

    return {
      sessionId,
      repUpdate,
      repUpdatesCount
    };
  }

  function completeSession({ userId, sessionId, repsCompleted = 0, exerciseId = null, payload = {} }) {
    let endedAt = null;
    let summary = null;

    userStore.updateUser(userId, (user) => {
      user.sessions = user.sessions || {};
      const session = user.sessions[sessionId];

      if (!session) {
        throw new ApiError("SESSION_NOT_FOUND", `Session ${sessionId} does not exist for user`, 404);
      }

      if (session.endedAt) {
        throw new ApiError("SESSION_ALREADY_COMPLETED", `Session ${sessionId} is already completed`, 409);
      }

      session.endedAt = Date.now();
      session.summary = {
        repsCompleted,
        exerciseId
      };

      endedAt = session.endedAt;
      summary = session.summary;
      pushEvent(user, "fitness.endSession", payload);
      return user;
    });

    return {
      sessionId,
      endedAt,
      summary
    };
  }

  return {
    startSession,
    appendRepUpdate,
    completeSession
  };
}

module.exports = {
  createSessionService
};
