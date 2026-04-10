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

function assertStringArray(v, field, { max = 50, maxItemLen = 160 } = {}) {
  if (v == null) return [];
  if (!Array.isArray(v)) throw new ApiError("VALIDATION_ERROR", `${field} must be an array`, 400);
  if (v.length > max) throw new ApiError("VALIDATION_ERROR", `${field} can contain at most ${max} items`, 400);
  return v.map((item, idx) => assertString(item, `${field}[${idx}]`, { required: true, min: 1, max: maxItemLen }));
}

function normalizeGoals(goals) {
  if (goals == null) return null;
  if (!isObject(goals)) throw new ApiError("VALIDATION_ERROR", "profile.goals must be an object", 400);

  return {
    primary_goal: assertString(goals.primary_goal, "profile.goals.primary_goal", { required: false, max: 120 }),
    frequency_days_per_week: assertNullableNumber(goals.frequency_days_per_week, "profile.goals.frequency_days_per_week", { min: 1, max: 14 }),
    notes: assertString(goals.notes, "profile.goals.notes", { required: false, max: 1000 })
  };
}

function validateProfileUpsert(input) {
  if (!isObject(input)) throw new ApiError("VALIDATION_ERROR", "Request body must be an object", 400);
  const profile = isObject(input.profile) ? input.profile : input;

  return {
    age: assertNullableNumber(profile.age, "profile.age", { min: 1, max: 120 }),
    height_cm: assertNullableNumber(profile.height_cm ?? profile.heightCm, "profile.height_cm", { min: 50, max: 300 }),
    weight_kg: assertNullableNumber(profile.weight_kg ?? profile.weightKg, "profile.weight_kg", { min: 20, max: 450 }),
    goals: normalizeGoals(profile.goals),
    injuries: assertStringArray(profile.injuries, "profile.injuries", { max: 50, maxItemLen: 200 }),
    notes: assertString(profile.notes ?? profile.historyText, "profile.notes", { required: false, max: 4000 })
  };
}

function validateOhsaSubmission(input) {
  if (!isObject(input)) throw new ApiError("VALIDATION_ERROR", "Request body must be an object", 400);
  const summary = input.summary;
  if (!isObject(summary)) throw new ApiError("VALIDATION_ERROR", "summary is required and must be an object", 400);

  return {
    summary: {
      score: assertNullableNumber(summary.score, "summary.score", { min: 0, max: 100 }),
      riskLevel: assertString(summary.riskLevel, "summary.riskLevel", { required: false, max: 64 }),
      recommendations: assertStringArray(summary.recommendations, "summary.recommendations", { max: 30, maxItemLen: 300 }),
      notes: assertString(summary.notes, "summary.notes", { required: false, max: 4000 })
    },
    source: assertString(input.source, "source", { required: false, max: 64 }) || "client"
  };
}

function validateAuthBridge(input, { requestedTrustMode = null } = {}) {
  if (!isObject(input)) throw new ApiError("VALIDATION_ERROR", "Request body must be an object", 400);

  const manualUserId = assertString(input.userId ?? input.manualUserId, "userId", { required: false, max: 128 });
  const googleSub = assertString(input.googleSub, "googleSub", { required: false, max: 256 });
  const googleEmail = assertString(input.googleEmail, "googleEmail", { required: false, max: 256 });
  const googleIdToken = assertString(input.googleIdToken, "googleIdToken", { required: false, min: 20, max: 4096 });

  if (!manualUserId && !googleSub && !googleEmail && !googleIdToken) {
    throw new ApiError("VALIDATION_ERROR", "Provide one of userId/manualUserId, googleSub, googleEmail, or googleIdToken", 400);
  }

  if (manualUserId) {
    return {
      manualUserId,
      googleSub,
      googleEmail,
      googleIdToken,
      userId: manualUserId,
      provider: "manual",
      providerSubject: manualUserId,
      trustMode: requestedTrustMode || "manual_unverified"
    };
  }

  const providerSubject = googleSub || googleEmail || null;
  const derivedUserId = providerSubject
    ? `google_${providerSubject.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120)}`
    : null;

  return {
    manualUserId,
    googleSub,
    googleEmail,
    googleIdToken,
    userId: derivedUserId,
    provider: "google-bridge",
    providerSubject,
    trustMode: requestedTrustMode || "provider_unverified"
  };
}

module.exports = {
  validateProfileUpsert,
  validateOhsaSubmission,
  validateAuthBridge
};