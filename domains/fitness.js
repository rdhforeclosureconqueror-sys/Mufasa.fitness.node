// domains/fitness.js
// Mufasa Fitness domain + Ma'at 2.0 coaching & program bridge

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

    // 🔥 NEW: Overhead Squat Assessment result coming back from the front-end
    // payload is expected to contain:
    // {
    //   sessionId,
    //   assessmentSummary,  // plain text summary of OHS findings
    //   goal,               // e.g. "gain 20 lb muscle in 3 months"
    //   weeks,              // e.g. 12
    //   daysPerWeek,        // e.g. 4
    //   homeOnly,           // bool
    //   yogaHeavy,          // bool
    //   extraContext        // optional extra notes
    // }
    case "fitness.ohsaResult":
      return await handleOhsaResult(userId, payload, app);

    default:
      throw new Error("Unknown fitness command: " + command);
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// Session lifecycle
// ───────────────────────────────────────────────────────────────────────────────

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

  // 1) Always broadcast the raw telemetry so dashboards can listen
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

  // 2) Call Ma'at (Python brain) for short coaching text
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

// ───────────────────────────────────────────────────────────────────────────────
// Overhead Squat Assessment → Program generation
// ───────────────────────────────────────────────────────────────────────────────

async function handleOhsaResult(userId, payload, app) {
  const broadcast = app.locals.broadcast;
  const {
    sessionId,
    assessmentSummary,
    goal,
    weeks,
    daysPerWeek,
    homeOnly,
    yogaHeavy,
    extraContext,
  } = payload || {};

  console.log("OHS result received:", {
    userId,
    sessionId,
    goal,
    weeks,
    daysPerWeek,
    homeOnly,
    yogaHeavy,
  });

  if (!MAAT_URL) {
    console.warn("MAAT_URL not set; cannot generate program from OHS.");
    return {
      ok: false,
      error: "MAAT_URL not set on server",
    };
  }

  // Build the ProgramRequest Ma'at expects
  const programReq = {
    user_id: userId,
    goal:
      goal ||
      "Integrated program based on overhead squat assessment and user goal.",
    weeks: weeks != null ? weeks : 12,
    days_per_week: daysPerWeek != null ? daysPerWeek : 4,
    home_only: homeOnly !== undefined ? homeOnly : true,
    yoga_heavy: yogaHeavy !== undefined ? yogaHeavy : true,
    assessment_summary:
      assessmentSummary || "Overhead squat was completed; see raw data.",
    extra_context: extraContext || "",
  };

  let programResp;
  try {
    const resp = await fetch(`${MAAT_URL}/coach/program/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(programReq),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Ma'at /coach/program/generate error:", resp.status, txt);
      return {
        ok: false,
        error: `Ma'at program HTTP ${resp.status}`,
        body: txt,
      };
    }

    programResp = await resp.json();
  } catch (err) {
    console.error("Error calling Ma'at program API:", err.message || err);
    return {
      ok: false,
      error: "Error calling Ma'at program API: " + (err.message || String(err)),
    };
  }

  const program = programResp.program || null;
  const programId =
    programResp.program_id || (program && program.id) || null;

  // Broadcast so the front-end can:
  // - show "Today's Workout"
  // - draw the calendar from program.plan
  if (broadcast && program) {
    broadcast({
      event: "fitness.programGenerated",
      userId,
      sessionId,
      programId,
      goal: program.goal,
      title: program.title,
      weeks: program.weeks,
      daysPerWeek: program.days_per_week,
      plan: program.plan,
    });
  }

  return {
    ok: true,
    sessionId,
    programId,
    program,
    message: "OHS result stored and program generated by Ma'at.",
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// Ma'at coaching call
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Call Ma'at (Python FastAPI + OpenAI) to generate coaching text.
 * Expects Ma'at to expose POST /ask
 *   body: { question: string }
 * and return { ts, question, answer, ... }.
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
  return data.answer || null;
}

module.exports = {
  handleFitnessCommand,
};
