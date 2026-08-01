"use strict";

const PLACEHOLDER = /^(change[-_ ]?me|replace[-_ ]?me|todo|example|your[-_]|<.+>|xxx)/i;
const SECRET_NAMES = /SECRET|PASSWORD|TOKEN|API_KEY|PRIVATE|WEBHOOK/i;
const bool = value => value === "true" || value === "false";

const DEFINITIONS = Object.freeze([
  ["NODE_ENV", true], ["PUBLIC_BASE_URL", true], ["ALLOWED_ORIGINS", true], ["AUTH_TOKEN_SECRET", true],
  ["LOGIN_SEED_EMAIL", false], ["ADMIN_EMAILS", true], ["AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS", false],
  ["PILOT_LOGIN_PASSWORD", false], ["AUTH_BRIDGE_ALLOW_MANUAL", false, "boolean"], ["AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE", false, "boolean"],
  ["POCKET_PT_DATA_DIR", true], ["AI_COACH_ENABLED", false, "boolean"], ["AI_COACH_PROVIDER", false], ["AI_COACH_MODEL", false], ["OPENAI_API_KEY", false],
  ["DIAGNOSTIC_SUMMARIZER_ENABLED", false, "boolean"], ["DIAGNOSTIC_SUMMARIZER_PROVIDER", false], ["DIAGNOSTIC_SUMMARIZER_MODEL", false], ["OPENAI_DIAGNOSTIC_MODEL", false],
  ["AI_COACH_REQUEST_TIMEOUT_MS", false, "integer"], ["AI_COACH_FIRST_TOKEN_TIMEOUT_MS", false, "integer"], ["AI_COACH_MAX_OUTPUT_TOKENS", false, "integer"],
  ["AI_COACH_REQUESTS_PER_MINUTE", false, "integer"], ["AI_COACH_CIRCUIT_THRESHOLD", false, "integer"], ["AI_COACH_SAFETY_MODE", false],
  ["GAMIFICATION_EVENT_CAPTURE", true, "boolean"], ["GAMIFICATION_SOURCE_WORKOUT_COMPLETED", true, "boolean"], ["GAMIFICATION_EVALUATION", true, "boolean"],
  ["GAMIFICATION_READ_API", true, "boolean"], ["GAMIFICATION_OPERATIONS", true, "boolean"], ["GAMIFICATION_NOTIFICATIONS", false, "boolean"], ["GAMIFICATION_LEADERBOARDS", false, "boolean"],
  ["BILLING_ENABLED", false, "boolean"], ["STRIPE_LIVE_MODE", false, "boolean"], ["STRIPE_SECRET_KEY", false], ["STRIPE_WEBHOOK_SECRET", false], ["STRIPE_PRICE_ID", false],
  ["ENABLE_AVATAR_FEATURE", false, "boolean"], ["ENABLE_VISUAL_PROGRESS_SCAN", false, "boolean"]
]);

function validateEnvironment(env = process.env, { profile = env.NODE_ENV || "development" } = {}) {
  const ai = env.AI_COACH_ENABLED === "true";
  const billing = env.BILLING_ENABLED === "true";
  const summarizer = env.DIAGNOSTIC_SUMMARIZER_ENABLED === "true";
  const production = profile === "production";
  const entries = DEFINITIONS.map(([name, baseRequired, type]) => {
    const raw = String(env[name] || "").trim();
    const required = baseRequired && production || (ai && ["AI_COACH_PROVIDER", "AI_COACH_MODEL", "OPENAI_API_KEY"].includes(name)) || (summarizer && ["DIAGNOSTIC_SUMMARIZER_PROVIDER", "DIAGNOSTIC_SUMMARIZER_MODEL", "OPENAI_API_KEY"].includes(name)) || (billing && ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID"].includes(name));
    let status = raw ? "configured" : required ? "missing" : "not_required";
    if (raw && PLACEHOLDER.test(raw)) status = "placeholder";
    if (raw && type === "boolean" && !bool(raw)) status = "invalid";
    if (raw && type === "integer" && (!Number.isInteger(Number(raw)) || Number(raw) <= 0)) status = "invalid";
    return { name, status, configured: Boolean(raw), required, sensitive: SECRET_NAMES.test(name), restartRequired: name !== "NODE_ENV" };
  });
  const aliases = [];
  if (env.PUBLIC_BASE_URL && env.FRONTEND_PUBLIC_URL) aliases.push({ names: ["PUBLIC_BASE_URL", "FRONTEND_PUBLIC_URL"], status: "duplicate_alias_detected" });
  return { profile, entries, aliases, counts: Object.fromEntries(["configured", "missing", "invalid", "placeholder", "not_required"].map(status => [status, entries.filter(x => x.status === status).length])) };
}

module.exports = { validateEnvironment, DEFINITIONS };
