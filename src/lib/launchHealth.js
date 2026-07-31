"use strict";

const fs = require("fs");
const path = require("path");

const PLACEHOLDER = /(?:replace[-_ ]?(?:me|with)|your[-_ ]|example\.com|changeme|dev-only-secret)/i;

const ENVIRONMENT_CONTRACT = Object.freeze({
  required: ["AUTH_TOKEN_SECRET", "PILOT_LOGIN_PASSWORD", "LOGIN_SEED_EMAIL", "ALLOWED_ORIGINS", "POCKET_PT_DATA_DIR"],
  optional: [
    "ADMIN_EMAILS", "AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS", "ENABLE_AVATAR_FEATURE",
    "POCKET_PT_AVATAR_UPLOAD_DIR", "OPENAI_API_KEY", "GOOGLE_MAPS_API_KEY",
    "VITE_GOOGLE_MAPS_BROWSER_API_KEY", "USDA_FDC_API_KEY", "BILLING_ENABLED",
    "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID", "STRIPE_PUBLISHABLE_KEY",
    "GAMIFICATION_EVENT_CAPTURE", "GAMIFICATION_SOURCE_WORKOUT_COMPLETED",
    "GAMIFICATION_EVALUATION", "GAMIFICATION_READ_API", "GAMIFICATION_NOTIFICATIONS",
    "GAMIFICATION_LEADERBOARDS", "GAMIFICATION_OPERATIONS"
  ],
  deprecated: []
});

function valueState(env, name) {
  const value = String(env[name] || "").trim();
  if (!value) return "missing";
  return PLACEHOLDER.test(value) ? "placeholder" : "configured";
}

function check(id, ready, evidence, status = ready ? "ready" : "needs_work") {
  return { id, status, ready: Boolean(ready), evidence };
}

function fileExists(rootDir, relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function buildLaunchHealth({ env = process.env, rootDir = process.cwd(), buildVersion, frontendVersion } = {}) {
  const envState = Object.fromEntries([...ENVIRONMENT_CONTRACT.required, ...ENVIRONMENT_CONTRACT.optional]
    .map((name) => [name, valueState(env, name)]));
  const production = env.NODE_ENV === "production";
  const billingEnabled = env.BILLING_ENABLED === "true";
  const avatarEnabled = env.ENABLE_AVATAR_FEATURE === "true";
  const gamification = {
    eventCapture: env.GAMIFICATION_EVENT_CAPTURE === "true",
    workoutSource: env.GAMIFICATION_SOURCE_WORKOUT_COMPLETED === "true",
    evaluation: env.GAMIFICATION_EVALUATION === "true",
    readApi: env.GAMIFICATION_READ_API === "true",
    notifications: env.GAMIFICATION_NOTIFICATIONS === "true",
    leaderboards: env.GAMIFICATION_LEADERBOARDS === "true",
    operations: env.GAMIFICATION_OPERATIONS === "true"
  };
  const requiredMissing = ENVIRONMENT_CONTRACT.required.filter((name) => envState[name] === "missing");
  const requiredPlaceholders = ENVIRONMENT_CONTRACT.required.filter((name) => envState[name] === "placeholder");
  const stripeNames = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID", "STRIPE_PUBLISHABLE_KEY"];
  const stripeReady = !billingEnabled || stripeNames.every((name) => envState[name] === "configured")
    && String(env.STRIPE_SECRET_KEY).startsWith("sk_test_")
    && String(env.STRIPE_PUBLISHABLE_KEY).startsWith("pk_test_");
  const buildsMatch = Boolean(frontendVersion && buildVersion && frontendVersion === buildVersion);
  const checks = [
    check("deployment", buildsMatch, { frontendVersion: frontendVersion || "unknown", backendVersion: buildVersion || "unknown", buildsMatch, cachePolicy: "no-store" }),
    check("environment", !production || (!requiredMissing.length && !requiredPlaceholders.length), { production, requiredMissing, requiredPlaceholders, variables: envState }),
    check("storage", !production || envState.POCKET_PT_DATA_DIR === "configured", { dataDirectory: envState.POCKET_PT_DATA_DIR, avatarDirectory: envState.POCKET_PT_AVATAR_UPLOAD_DIR }),
    check("program_engine", fileExists(rootDir, "src/program-engine/programService.js"), { runtimeModule: "src/program-engine/programService.js" }),
    check("exercise_intelligence", fileExists(rootDir, "src/exercise-intelligence/exerciseService.js"), { runtimeModule: "src/exercise-intelligence/exerciseService.js" }),
    check("exercise_hub", fileExists(rootDir, "public/exercise-library.html"), { memberRoute: "/exercise-library.html" }),
    check("yoga", fileExists(rootDir, "public/yoga.html") && fileExists(rootDir, "src/services/yogaService.js"), { memberRoute: "/yoga.html" }),
    check("gamification", gamification.eventCapture && gamification.workoutSource && gamification.evaluation && gamification.readApi, { flags: gamification, implementationPresent: fileExists(rootDir, "src/gamification/achievementService.js") }),
    check("rewards", gamification.evaluation && gamification.readApi, { implementationPresent: fileExists(rootDir, "src/gamification/memberExperienceService.js") }),
    check("ai_coach", envState.OPENAI_API_KEY === "configured", { providerConfigured: envState.OPENAI_API_KEY, localFallbackPresent: fileExists(rootDir, "src/services/aiCoachService.js") }),
    check("stripe", stripeReady, { enabled: billingEnabled, mode: billingEnabled ? "test_required_for_launch_verification" : "disabled", variables: Object.fromEntries(stripeNames.map((name) => [name, envState[name]])) }),
    check("avatar", !avatarEnabled || envState.POCKET_PT_AVATAR_UPLOAD_DIR === "configured", { enabled: avatarEnabled, storage: envState.POCKET_PT_AVATAR_UPLOAD_DIR }),
    check("notifications", gamification.notifications && fileExists(rootDir, "src/gamification/notificationService.js"), { flagEnabled: gamification.notifications, implementationPresent: fileExists(rootDir, "src/gamification/notificationService.js") }),
    check("leaderboards", gamification.leaderboards && fileExists(rootDir, "src/gamification/leaderboardService.js"), { flagEnabled: gamification.leaderboards, implementationPresent: fileExists(rootDir, "src/gamification/leaderboardService.js") }),
    check("member_journey", fileExists(rootDir, "src/services/memberHomeService.js"), { memberHome: "/dashboard.html", legacyRoutes: ["/greatness.html", "/push-up-challenge.html"] }),
    check("pilot_readiness", false, { reason: "clean-account browser journey and live deployment evidence are required" }, "blocked")
  ];
  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    authoritative: true,
    overallStatus: checks.every((entry) => entry.ready) ? "ready" : "needs_work",
    checks,
    environmentContract: ENVIRONMENT_CONTRACT
  };
}

module.exports = { ENVIRONMENT_CONTRACT, buildLaunchHealth, valueState };
