// domains/fitness.js
// Day 2: Fitness domain now emits live events via WebSockets.

// Simple in-memory session ID generator for now
function createSessionId() {
  return "sess_" + Date.now();
}

/**
 * Handle fitness-related commands.
 *
 * context = {
 *   command: string,
 *   userId: string,
 *   payload: any,
 *   app: ExpressApp
 * }
 */
async function handleFitnessCommand(context) {
  const { command, userId, payload, app } = context;

  switch (command) {
    case "fitness.startSession":
      return await handleStartSession(userId, payload, app);

    case "fitness.repUpdate":
      return await handleRepUpdate(userId, payload, app);

    case "fitness.endSession":
      return await handleEndSession(userId, payload, app);

    default:
      throw new Error("Unknown fitness command: " + command);
  }
}

async function handleStartSession(userId, payload, app) {
  const broadcast = app.locals.broadcast;
  const { programId } = payload || {};
  const sessionId = createSessionId();

  console.log("Start session:", { userId, programId, sessionId });

  if (broadcast) {
    broadcast({
      event: "fitness.sessionStarted",
      userId,
      sessionId,
      programId
    });
  }

  return {
    ok: true,
    sessionId,
    programId,
    message: "Session started (Day 2 basic logic)"
  };
}

async function handleRepUpdate(userId, payload, app) {
  const broadcast = app.locals.broadcast;
  const { sessionId, exerciseId, repsThisSet, depthScore } = payload || {};

  console.log("Rep update:", {
    userId,
    sessionId,
    exerciseId,
    repsThisSet,
    depthScore
  });

  if (broadcast) {
    broadcast({
      event: "fitness.repUpdate",
      userId,
      sessionId,
      exerciseId,
      repsThisSet,
      depthScore
    });
  }

  return {
    ok: true,
    message: "Rep update received (Day 2 basic logic)"
  };
}

async function handleEndSession(userId, payload, app) {
  const broadcast = app.locals.broadcast;
  const { sessionId } = payload || {};

  console.log("End session:", { userId, sessionId });

  if (broadcast) {
    broadcast({
      event: "fitness.sessionEnded",
      userId,
      sessionId
    });
  }

  return {
    ok: true,
    message: "Session ended (Day 2 basic logic)"
  };
}

module.exports = {
  handleFitnessCommand
};
