// domains/fitness.js
// Day 2 + Brain link: Fitness domain now emits live events via WebSockets
// and calls the Python "Ma'at" coaching brain on rep updates.

// Simple in-memory session ID generator for now
function createSessionId() {
  return "sess_" + Date.now();
}

// Where to call the Python brain (Ma'at)
// Set MAAT_URL in Render env for the Node service.
// e.g. MAAT_URL = https://mufasabrain.onrender.com
const MAAT_URL = process.env.MAAT_URL || "https://mufasabrain.onrender.com";

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
      programId,
    });
  }

  return {
    ok: true,
    sessionId,
    programId,
    message: "Session started (Node + WS basic logic)",
  };
}

/**
 * Send a rep snapshot to the Python brain and try to get
 * a short coaching cue back.
 */
async function askMaatForCoaching({ userId, sessionId, exerciseId, repsThisSet, depthScore }) {
  // If MAAT_URL isn't set, just skip and return null.
  if (!MAAT_URL) {
    console.warn("MAAT_URL not set; skipping coaching call.");
    return null;
  }

  try {
    const question = `
User ${userId} is doing exercise ${exerciseId} in session ${sessionId}.
They just reported a rep update: repsThisSet=${repsThisSet}, depthScore=${depthScore}.
Give ONE short, encouraging coaching cue for this rep in plain language,
no more than 1 sentence.
    `.trim();

    const res = await fetch(`${MAAT_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    if (!res.ok) {
      console.error("Ma'at coaching call failed:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    // Your Python /ask endpoint returns { question, answer }
    return data.answer || null;
  } catch (err) {
    console.error("Error calling Ma'at coaching endpoint:", err);
    return null;
  }
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

  // 1) Call the Python brain for coaching (non-blocking if it fails)
  const coaching = await askMaatForCoaching({
    userId,
    sessionId,
    exerciseId,
    repsThisSet,
    depthScore,
  });

  // 2) Broadcast the rep update + any coaching over WebSockets
  if (broadcast) {
    broadcast({
      event: "fitness.repUpdate",
      userId,
      sessionId,
      exerciseId,
      repsThisSet,
      depthScore,
      coaching, // might be null
    });
  }

  // 3) Return the response to whoever called /command
  return {
    ok: true,
    message: "Rep update received",
    coaching,
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

module.exports = {
  handleFitnessCommand,
};
