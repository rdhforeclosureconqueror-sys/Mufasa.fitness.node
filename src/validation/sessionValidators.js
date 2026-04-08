"use strict";

const { ApiError } = require("../lib/apiResponse");

function isObject(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function assertString(v, field, { required = false, min = 1, max = 256 } = {}) {
  if (v == null || v === "") {
    if (required) throw new ApiError("VALIDATION_ERROR", `${field} is required`, 400);
    return null;
  }
  if (typeof v !== "string") throw new ApiError("VALIDATION_ERROR", `${field} must be a string`, 400);
  const t = v.trim();
  if (t.length < min || t.length > max) throw new ApiError("VALIDATION_ERROR", `${field} length must be ${min}-${max}`, 400);
  return t;
}

function assertNullableNumber(v, field, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) {
  if (v == null) return null;
  if (typeof v !== "number" || Number.isNaN(v)) throw new ApiError("VALIDATION_ERROR", `${field} must be a number`, 400);
  if (v < min || v > max) throw new ApiError("VALIDATION_ERROR", `${field} must be between ${min} and ${max}`, 400);
  return v;
}

function assertNullableBoolean(v, field) {
  if (v == null) return null;
  if (typeof v !== "boolean") throw new ApiError("VALIDATION_ERROR", `${field} must be a boolean`, 400);
  return v;
}

function validateSessionCreate(input) {
  if (!isObject(input)) throw new ApiError("VALIDATION_ERROR", "Request body must be an object", 400);
  return {
    userId: assertString(input.userId, "userId", { required: true, max: 128 }),
    sessionId: assertString(input.sessionId, "sessionId", { required: false, max: 128 }),
    programId: assertString(input.programId, "programId", { required: false, max: 128 }),
    exerciseId: assertString(input.exerciseId, "exerciseId", { required: false, max: 128 }),
    payload: input
  };
}

function validateRepUpdate(input, sessionIdFromParams) {
  if (!isObject(input)) throw new ApiError("VALIDATION_ERROR", "Request body must be an object", 400);
  return {
    userId: assertString(input.userId, "userId", { required: true, max: 128 }),
    sessionId: assertString(sessionIdFromParams, "sessionId", { required: true, max: 128 }),
    exerciseId: assertString(input.exerciseId, "exerciseId", { required: false, max: 128 }),
    repsThisSet: assertNullableNumber(input.repsThisSet, "repsThisSet", { min: 0, max: 10000 }),
    totalReps: assertNullableNumber(input.totalReps, "totalReps", { min: 0, max: 100000 }),
    depthScore: assertNullableNumber(input.depthScore, "depthScore", { min: 0, max: 1 }),
    goodForm: assertNullableBoolean(input.goodForm, "goodForm"),
    payload: { ...input, sessionId: sessionIdFromParams }
  };
}

function validateSessionComplete(input, sessionIdFromParams) {
  if (!isObject(input)) throw new ApiError("VALIDATION_ERROR", "Request body must be an object", 400);
  return {
    userId: assertString(input.userId, "userId", { required: true, max: 128 }),
    sessionId: assertString(sessionIdFromParams, "sessionId", { required: true, max: 128 }),
    repsCompleted: assertNullableNumber(input.repsCompleted, "repsCompleted", { min: 0, max: 100000 }) ?? 0,
    exerciseId: assertString(input.exerciseId, "exerciseId", { required: false, max: 128 }),
    payload: { ...input, sessionId: sessionIdFromParams }
  };
}

function validateLegacySessionCommand(input) {
  if (!isObject(input)) throw new ApiError("VALIDATION_ERROR", "Request body must be an object", 400);

  const domain = assertString(input.domain, "domain", { required: true, max: 32 });
  const command = assertString(input.command, "command", { required: true, max: 64 });
  const userId = assertString(input.userId, "userId", { required: true, max: 128 });
  const payload = isObject(input.payload) ? input.payload : {};

  if (domain !== "fitness") {
    throw new ApiError("VALIDATION_ERROR", "domain must be 'fitness'", 400);
  }

  const supported = new Set(["fitness.startSession", "fitness.repUpdate", "fitness.endSession"]);
  if (!supported.has(command)) {
    throw new ApiError("UNSUPPORTED_LEGACY_COMMAND", `Unsupported legacy session command: ${command}`, 400);
  }

  if (command === "fitness.startSession") {
    return { command, parsed: validateSessionCreate({ userId, ...payload }) };
  }
  if (command === "fitness.repUpdate") {
    const sid = assertString(payload.sessionId, "payload.sessionId", { required: true, max: 128 });
    return { command, parsed: validateRepUpdate({ userId, ...payload }, sid) };
  }

  const sid = assertString(payload.sessionId, "payload.sessionId", { required: true, max: 128 });
  return { command, parsed: validateSessionComplete({ userId, ...payload }, sid) };
}

module.exports = {
  validateSessionCreate,
  validateRepUpdate,
  validateSessionComplete,
  validateLegacySessionCommand
};
