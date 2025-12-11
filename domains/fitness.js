// src/domains/fitness.js
// Mufasa + Ma’at 2.0 Fitness domain

"use strict";

// URL of your Ma’at 2.0 / Python brain (FastAPI + OpenAI)
const BRAIN_BASE_URL =
  process.env.MAAT_URL || "https://mufasabrain.onrender.com";

const ASK_URL = `${BRAIN_BASE_URL}/ask`;
const PROFILE_UPSERT_URL = `${BRAIN_BASE_URL}/users/profile/upsert`;
const PROGRAM_GEN_URL = `${BRAIN_BASE_URL}/coach/program/generate`;
const PROGRAM_LIST_URL = `${BRAIN_BASE_URL}/coach/program/list`;
const PROGRAM_GET_URL = `${BRAIN_BASE_URL}/coach/program/get`;

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

    case "fitness.saveProfile":
      return await handleSaveProfile(userId, payload, app);

    case "fitness.ohsaResult":
      return await handleOhsaResult(userId, payload, app);

    case "fitness.generateProgram":
      return await handleGenerateProgram(userId, payload, app);

    case "fitness.listPrograms":
      return await handleListPrograms(userId, payload, app);

    case "fitness.getProgram":
      return await handleGetProgram(userId, payload, app);

    // 🔥 NEW: front-end chat goes through Node using this action-aware wrapper
    case "fitness.askCoach":
      return await handleAskCoach(userId, payload, app);

    default:
      throw new Error("Unknown fitness command: " + command);
  }
}

// ─────────────────────────────────────────────
// Session + Telemetry
// ─────────────────────────────────────────────

async function handleStartSession(userId, payload, app) {
  const broadcast = app.locals.broadcast;
  const { programId } = payload || {};
  const sessionId = payload?.sessionId || createSessionId();

  console.log("Start session:", { userId, programId, sessionId });

  if (broadcast) {
    broadcast({
      event: "fitness.sessionStarted",
      userId,
      sessionId,
      programId: programId || null,
    });
  }

  return {
    ok: true,
    sessionId,
    programId: programId || null,
    message: "Session started",
  };
}

async function handleRepUpdate(userId, payload, app) {
  const broadcast = app.locals.broadcast;
  const { sessionId, exerciseId, repsThisSet, totalReps, depthScore, goodForm } =
    payload || {};

  console.log("Rep update:", {
    userId,
    sessionId,
    exerciseId,
    repsThisSet,
    totalReps,
    depthScore,
    goodForm,
  });

  // 1) Broadcast raw telemetry
  if (broadcast) {
    broadcast({
      event: "fitness.repUpdate",
      userId,
      sessionId,
      exerciseId,
      repsThisSet,
      totalReps,
      depthScore,
      goodForm,
    });
  }

  // 2) Call Ma’at 2.0 coaching
  let coachingText = null;
  try {
    coachingText = await callMaatForCoaching({
      userId,
      sessionId,
      exerciseId,
      repsThisSet,
      totalReps,
      depthScore,
      goodForm,
    });
  } catch (err) {
    console.error("Error calling Ma'at 2.0 coaching API:", err.message || err);
  }

  // 3) Broadcast coaching if we got some
  if (broadcast && coachingText) {
    broadcast({
      event: "fitness.coaching",
      userId,
      sessionId,
      exerciseId,
      repsThisSet,
      totalReps,
      depthScore,
      goodForm,
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
  const { sessionId, repsCompleted, exerciseId } = payload || {};

  console.log("End session:", { userId, sessionId, repsCompleted, exerciseId });

  if (broadcast) {
    broadcast({
      event: "fitness.sessionEnded",
      userId,
      sessionId,
      repsCompleted: repsCompleted || 0,
      exerciseId: exerciseId || null,
    });
  }

  return {
    ok: true,
    message: "Session ended",
  };
}

/**
 * Call Ma’at 2.0 (/ask) to generate coaching text from telemetry.
 * Matches AskPayload in main.py.
 */
async function callMaatForCoaching({
  userId,
  sessionId,
  exerciseId,
  repsThisSet,
  totalReps,
  depthScore,
  goodForm,
}) {
  if (!BRAIN_BASE_URL) {
    console.warn("BRAIN_BASE_URL is not set; skipping coaching call.");
    return null;
  }

  const question = [
    "You are Ma’at 2.0, a concise, encouraging Pan-African coach.",
    "Given this live telemetry, give one or two short coaching cues",
    "in second person (you...), mixing encouragement with 1 clear form tip.",
    "",
    `userId: ${userId || "unknown"}`,
    `sessionId: ${sessionId || "none"}`,
    `exerciseId: ${exerciseId || "unknown"}`,
    `repsThisSet: ${repsThisSet != null ? repsThisSet : "unknown"}`,
    `totalReps: ${totalReps != null ? totalReps : "unknown"}`,
    `depthScore (0-1): ${depthScore != null ? depthScore : "unknown"}`,
    `goodForm: ${goodForm !== undefined ? goodForm : "unknown"}`,
  ].join("\n");

  const telemetry = {
    exercise_id: exerciseId || "unknown",
    reps: totalReps ?? repsThisSet ?? 0,
    depth_score: depthScore ?? 0,
    good_form: goodForm ?? false,
  };

  const body = {
    question,
    user_id: userId || "anonymous",
    session_id: sessionId || null,
    telemetry,
    mode: "chat",
  };

  const resp = await fetch(ASK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`Ma’at 2.0 /ask HTTP ${resp.status}`);
  }

  const data = await resp.json();
  // FastAPI /ask returns { ts, question, answer, ... }
  return data.answer || null;
}

// ─────────────────────────────────────────────
// Profile sync → /users/profile/upsert
// ─────────────────────────────────────────────

async function handleSaveProfile(userId, payload, app) {
  const broadcast = app.locals.broadcast;
  const profile = (payload && payload.profile) || {};

  if (!userId) {
    throw new Error("fitness.saveProfile requires userId");
  }

  // Map generic profile into the Pydantic fields (extras are ignored).
  const body = {
    user_id: userId,
    age: profile.age ?? null,
    height_cm: profile.height_cm ?? profile.heightCm ?? null,
    weight_kg: profile.weight_kg ?? profile.weightKg ?? null,
    goals: profile.goals || null,
    injuries: profile.injuries || null,
    notes: profile.notes || profile.historyText || null,
  };

  console.log("Saving profile for", userId, body);

  const resp = await fetch(PROFILE_UPSERT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("Profile upsert failed:", resp.status, text);
    throw new Error(`Profile upsert HTTP ${resp.status}`);
  }

  const data = await resp.json();

  if (broadcast) {
    broadcast({
      event: "fitness.profileSaved",
      userId,
      profile: data.profile || null,
    });
  }

  return { ok: true, profile: data.profile || null };
}

// ─────────────────────────────────────────────
// OHSA result → auto program generation
// ─────────────────────────────────────────────

async function handleOhsaResult(userId, payload, app) {
  const broadcast = app.locals.broadcast;
  const {
    summary,
    goal,
    weeks,
    daysPerWeek,
    homeOnly,
    yogaHeavy,
    extraContext,
    autoProgram = true,
  } = payload || {};

  if (!summary) {
    throw new Error("fitness.ohsaResult requires payload.summary");
  }

  console.log("OHSA result for", userId, summary);

  if (broadcast) {
    broadcast({
      event: "fitness.ohsaResult",
      userId,
      summary,
    });
  }

  let program = null;
  let programId = null;

  if (autoProgram) {
    try {
      const prog = await generateProgramForUser(userId, {
        goal:
          goal ||
          "Gain 20 lb of muscle in ~3 months with safe yoga-heavy training.",
        weeks: weeks || 12,
        daysPerWeek: daysPerWeek || 4,
        homeOnly: homeOnly !== undefined ? homeOnly : true,
        yogaHeavy: yogaHeavy !== undefined ? yogaHeavy : true,
        assessmentSummary: JSON.stringify(summary),
        extraContext:
          extraContext ||
          "Program generated from Overhead Squat Assessment via Ma’at 2.0.",
      });

      program = prog.program;
      programId = prog.program_id;

      if (broadcast) {
        broadcast({
          event: "fitness.programGenerated",
          userId,
          from: "ohsa",
          programId,
          programMeta: {
            title: program?.title,
            goal: program?.goal,
            weeks: program?.weeks,
            days_per_week: program?.days_per_week,
          },
        });
      }
    } catch (e) {
      console.error("Error auto-generating program from OHSA:", e);
    }
  }

  return {
    ok: true,
    summary,
    programId,
    program,
  };
}

// ─────────────────────────────────────────────
// Program generation / listing / fetch
// ─────────────────────────────────────────────

async function generateProgramForUser(
  userId,
  {
    goal,
    weeks,
    daysPerWeek,
    homeOnly = true,
    yogaHeavy = true,
    assessmentSummary = null,
    extraContext = "",
  }
) {
  if (!userId) throw new Error("generateProgramForUser requires userId");

  const body = {
    user_id: userId,
    goal: goal || "General strength and wellness program.",
    weeks: weeks || 8,
    days_per_week: daysPerWeek || 3,
    home_only: homeOnly,
    yoga_heavy: yogaHeavy,
    assessment_summary: assessmentSummary,
    extra_context: extraContext,
  };

  console.log("Program generate body:", body);

  const resp = await fetch(PROGRAM_GEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("Program generate failed:", resp.status, text);
    throw new Error(`Program generate HTTP ${resp.status}`);
  }

  const data = await resp.json();
  return {
    program_id: data.program_id,
    program: data.program,
  };
}

/**
 * Voice / command-driven program generation.
 * E.g. "create an 8-week yoga program around the eight limbs"
 */
async function handleGenerateProgram(userId, payload, app) {
  const broadcast = app.locals.broadcast;

  const {
    goal,
    weeks,
    daysPerWeek,
    homeOnly,
    yogaHeavy,
    assessmentSummary,
    extraContext,
  } = payload || {};

  const prog = await generateProgramForUser(userId, {
    goal:
      goal ||
      "Eight-week program focused on the eight limbs of yoga plus gentle strength.",
    weeks: weeks || 8,
    daysPerWeek: daysPerWeek || 3,
    homeOnly: homeOnly !== undefined ? homeOnly : true,
    yogaHeavy: yogaHeavy !== undefined ? yogaHeavy : true,
    assessmentSummary: assessmentSummary || null,
    extraContext:
      extraContext ||
      "User requested a program via Mufasa voice/command inside the virtual gym.",
  });

  if (broadcast) {
    broadcast({
      event: "fitness.programGenerated",
      userId,
      from: "command",
      programId: prog.program_id,
      programMeta: {
        title: prog.program?.title,
        goal: prog.program?.goal,
        weeks: prog.program?.weeks,
        days_per_week: prog.program?.days_per_week,
      },
    });
  }

  return {
    ok: true,
    programId: prog.program_id,
    program: prog.program,
  };
}

async function handleListPrograms(userId, payload, app) {
  if (!userId) throw new Error("fitness.listPrograms requires userId");

  const url = `${PROGRAM_LIST_URL}?user_id=${encodeURIComponent(userId)}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    console.error("Program list failed:", resp.status, text);
    throw new Error(`Program list HTTP ${resp.status}`);
  }

  const data = await resp.json();
  return {
    ok: true,
    programs: data.programs || [],
  };
}

async function handleGetProgram(userId, payload, app) {
  const { programId } = payload || {};
  if (!programId) throw new Error("fitness.getProgram requires programId");

  const url = `${PROGRAM_GET_URL}?program_id=${encodeURIComponent(programId)}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    console.error("Program get failed:", resp.status, text);
    throw new Error(`Program get HTTP ${resp.status}`);
  }

  const data = await resp.json();
  return {
    ok: true,
    program: data.program || null,
  };
}

// ─────────────────────────────────────────────
// NEW: Environment Action wrapper – fitness.askCoach
// ─────────────────────────────────────────────

async function handleAskCoach(userId, payload, app) {
  const broadcast = app.locals.broadcast;
  const {
    question,
    telemetry,
    context,
    sessionId,
    mode = "chat",
  } = payload || {};

  if (!question) {
    throw new Error("fitness.askCoach requires payload.question");
  }

  const body = {
    question,
    user_id: userId || "anonymous",
    session_id: sessionId || null,
    telemetry: telemetry || null,
    context: typeof context === "string" ? context : JSON.stringify(context || {}),
    mode,
  };

  console.log("fitness.askCoach → /ask body:", body);

  const resp = await fetch(ASK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("Ma’at /ask failed:", resp.status, text);
    throw new Error(`Ma’at /ask HTTP ${resp.status}`);
  }

  const data = await resp.json();
  const answer = data.answer || data.response || "";
  const actions = Array.isArray(data.actions) ? data.actions : [];

  if (broadcast) {
    broadcast({
      event: "fitness.llmAnswer",
      userId,
      question,
      answer,
      actions,
    });
  }

  // For now, Node does NOT mutate anything by itself.
  // It just passes back the actions so the front-end can update
  // calendar, programs, etc. Later we can add server-side effects here.
  return {
    ok: true,
    answer,
    actions,
  };
}

module.exports = {
  handleFitnessCommand,
};
