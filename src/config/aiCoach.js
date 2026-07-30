"use strict";

function integer(env, name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = env[name];
  const value = raw == null || raw === "" ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer from ${min} to ${max}`);
  return value;
}

function loadAiCoachConfig(env = process.env) {
  const enabled = env.AI_COACH_ENABLED === "true";
  const provider = String(env.AI_COACH_PROVIDER || "openai").toLowerCase();
  if (enabled && provider !== "openai") throw new Error("AI_COACH_PROVIDER must be openai");
  if (enabled && !String(env.OPENAI_API_KEY || "").trim()) throw new Error("OPENAI_API_KEY is required when AI_COACH_ENABLED=true");
  if (enabled && !String(env.AI_COACH_MODEL || "").trim()) throw new Error("AI_COACH_MODEL is required when AI_COACH_ENABLED=true");
  return Object.freeze({
    enabled, provider, model: String(env.AI_COACH_MODEL || ""), apiKey: enabled ? String(env.OPENAI_API_KEY) : "",
    requestTimeoutMs: integer(env, "AI_COACH_REQUEST_TIMEOUT_MS", 30_000, { min: 1_000, max: 120_000 }),
    firstTokenTimeoutMs: integer(env, "AI_COACH_FIRST_TOKEN_TIMEOUT_MS", 8_000, { min: 500, max: 60_000 }),
    maxOutputTokens: integer(env, "AI_COACH_MAX_OUTPUT_TOKENS", 600, { min: 32, max: 4_096 }),
    maxMessageChars: integer(env, "AI_COACH_MAX_MESSAGE_CHARS", 2_000, { min: 100, max: 10_000 }),
    historyLimit: integer(env, "AI_COACH_HISTORY_LIMIT", 24, { min: 2, max: 100 }),
    requestsPerMinute: integer(env, "AI_COACH_REQUESTS_PER_MINUTE", 20, { min: 1, max: 120 }),
    circuitThreshold: integer(env, "AI_COACH_CIRCUIT_THRESHOLD", 5, { min: 1, max: 100 }),
    circuitCooldownMs: integer(env, "AI_COACH_CIRCUIT_COOLDOWN_MS", 30_000, { min: 1_000, max: 600_000 }),
    temperature: 0.3, loggingMode: env.AI_COACH_LOGGING_MODE || "metadata", safetyMode: env.AI_COACH_SAFETY_MODE || "enforce"
  });
}
module.exports = { loadAiCoachConfig };
