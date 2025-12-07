// domains/fitness.js
// Mufasa Fitness domain (Day 2 + Ma'at coaching bridge)

"use strict";

// URL of your Ma'at / Python brain (FastAPI + OpenAI)
const MAAT_URL = process.env.MAAT_URL || "https://mufasabrain.onrender.com";

// Simple in-memory session ID generator for now
function createSessionId() {
  return "sess_" + Date.now();
}

/**
 * Entry point for all fitness-related commands.
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
      programId,
    });
  }

  return {
    ok: true,
    sessionId,
    programId,
    message: "Session started",
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
    depthScore,
  });

  // 1) Always broadcast the raw telemetry
  if (broadcast) {
    broadcast({
      event: "fitness.repUpdate",
      userId,
      sessionId,
      exerciseId,
      repsThisSet,
      depthScore,
    });
  }

  // 2) Call Ma'at (Python brain) for coaching text
  let coachingText = null;
  try {
    coachingText = await callMaatForCoaching({
      userId,
      sessionId,
      exerciseId,
      repsThisSet,
      depthScore,
    });
  } catch (err) {
    console.error("Error calling Ma'at coaching API:", err.message || err);
  }

  // 3) If we got coaching back, broadcast it too
  if (broadcast && coachingText) {
    broadcast({
      event: "fitness.coaching",
      userId,
      sessionId,
      exerciseId,
      repsThisSet,
      depthScore,
      coaching: coachingText,
    });
  }

  return {
    ok: true,
    coaching: coachingText,
    message: "Rep update processed",
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
      sessionId,
    });
  }

  return {
    ok: true,
    message: "Session ended",
  };
}

/**
 * Call Ma'at (Python FastAPI + OpenAI) to generate coaching text.
 * Expects Ma'at to expose POST { question: string } at `${MAAT_URL}/ask`
 */
async function callMaatForCoaching({
  userId,
  sessionId,
  exerciseId,
  repsThisSet,
  depthScore,
}) {
  if (!MAAT_URL) {
    console.warn("MAAT_URL is not set; skipping coaching call.");
    return null;
  }

  const question = [
    "You are Mufasa Fitness Brain, a concise, encouraging coach.",
    "Given this live telemetry, give one or two short coaching cues",
    "in second person (you...), mixing encouragement with 1 clear form tip.",
    "",
    `userId: ${userId || "unknown"}`,
    `sessionId: ${sessionId || "none"}`,
    `exerciseId: ${exerciseId || "unknown"}`,
    `repsThisSet: ${repsThisSet != null ? repsThisSet : "unknown"}`,
    `depthScore (0-1): ${depthScore != null ? depthScore : "unknown"}`,
  ].join("\n");

  const resp = await fetch(`${MAAT_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!resp.ok) {
    throw new Error(`Ma'at HTTP ${resp.status}`);
  }

  const data = await resp.json();
  // FastAPI /ask returns { ts, question, answer, ... }
  return data.answer || null;
}

module.exports = {
  handleFitnessCommand,
};
