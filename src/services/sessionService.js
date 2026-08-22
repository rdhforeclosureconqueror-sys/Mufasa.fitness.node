"use strict";

const { ApiError } = require("../lib/apiResponse");

function pushEvent(user, command, payload) {
  user.events = user.events || [];
  user.events.push({ command, ts: Date.now(), payload });
}

function createSessionService({ userStore, workoutCompletedAdapter = null, onSessionCompleted = null, logger = console, clock = () => Date.now() }) {
  function startSession({ userId, sessionId, programId = null, exerciseId = null, payload = {} }) {
    const now = clock();
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
        repUpdates: [],
        sourceMetadata: payload.sourceMetadata || null,
        canonicalWorkout: payload.canonicalWorkout || null
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

  function getSession({ userId, sessionId }) {
    const session = userStore.loadUser(userId)?.sessions?.[sessionId];
    if (!session) throw new ApiError("SESSION_NOT_FOUND", `Session ${sessionId} does not exist for user`, 404);
    return structuredClone(session);
  }

  function updateRuntimeProgress({ userId, sessionId, exerciseIndex, unitIndex, phase }) {
    let sessionData;
    userStore.updateUser(userId, (user) => {
      const session = user.sessions?.[sessionId];
      if (!session) throw new ApiError("SESSION_NOT_FOUND", `Session ${sessionId} does not exist for user`, 404);
      if (session.endedAt) throw new ApiError("SESSION_ALREADY_COMPLETED", `Session ${sessionId} is already completed`, 409);
      const activities = session.canonicalWorkout?.activities;
      if (!Array.isArray(activities)) throw new ApiError("INVALID_SESSION", "Session has no canonical workout", 409);
      if (!Number.isInteger(exerciseIndex) || exerciseIndex < 0 || exerciseIndex >= activities.length) throw new ApiError("VALIDATION_ERROR", "exerciseIndex is outside the canonical workout", 400);
      const maxUnits = activities[exerciseIndex].sets || activities[exerciseIndex].rounds || 1;
      if (!Number.isInteger(unitIndex) || unitIndex < 1 || unitIndex > maxUnits) throw new ApiError("VALIDATION_ERROR", "unitIndex is outside the canonical prescription", 400);
      if (!["ready", "working", "rest", "paused"].includes(phase)) throw new ApiError("VALIDATION_ERROR", "invalid runtime phase", 400);
      session.runtimeProgress = { exerciseIndex, unitIndex, phase, updatedAt: clock() };
      sessionData = structuredClone(session);
      return user;
    });
    return sessionData;
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
        ts: clock(),
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

  function completeSession({ userId, sessionId, repsCompleted = 0, exerciseId = null, payload = {}, correlationId = null }) {
    let endedAt = null;
    let summary = null;
    let duplicate = false;

    userStore.updateUser(userId, (user) => {
      user.sessions = user.sessions || {};
      const session = user.sessions[sessionId];

      if (!session) {
        throw new ApiError("SESSION_NOT_FOUND", `Session ${sessionId} does not exist for user`, 404);
      }

      if (session.endedAt && session.sourceMetadata?.type === "challenge_commitment") {
        endedAt=session.endedAt;summary=session.summary;duplicate=true;return user;
      }
      if (session.endedAt) {
        throw new ApiError("SESSION_ALREADY_COMPLETED", `Session ${sessionId} is already completed`, 409);
      }

      session.endedAt = clock();
      session.summary = {
        repsCompleted,
        exerciseId
      };

      endedAt = session.endedAt;
      summary = session.summary;
      pushEvent(user, "fitness.endSession", payload);
      return user;
    });

    const result = {
      sessionId,
      endedAt,
      summary,
      duplicate
    };
    if(onSessionCompleted){const committed=userStore.loadUser(userId).sessions[sessionId];result.sourceCompletion=onSessionCompleted({userId,session:committed,correlationId});}
    // The user store update above is authoritative. Shadow capture is deliberately
    // isolated so an unavailable event pipeline cannot change domain success.
    if (workoutCompletedAdapter && !duplicate) {
      try {
        const committed = userStore.loadUser(userId).sessions[sessionId];
        workoutCompletedAdapter({ userId, session: committed, correlationId });
      } catch (error) {
        logger.error("[gamification-event-capture-failed]", { source: "workout.completed", correlationId, errorCode: error.code || "CAPTURE_FAILED" });
      }
    }
    return result;
  }

  return {
    startSession,
    getSession,
    updateRuntimeProgress,
    appendRepUpdate,
    completeSession
  };
}

module.exports = {
  createSessionService
};
