"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { validateEnvironment } = require("../src/diagnostics/environmentValidator");
const { buildLaunchHealth, classifyBuilds, stripeStatic, rewardSimulation } = require("../src/diagnostics/launchHealthService");
const { validStructuredSummary } = require("../src/lib/diagnosticSummarizer");
const { evaluatePilotReadiness } = require("../src/lib/pilotReadinessEvaluator");

const launchEnv = { NODE_ENV: "production", PUBLIC_BASE_URL: "https://example.test", ALLOWED_ORIGINS: "https://example.test", AUTH_TOKEN_SECRET: "a-secure-signing-value", ADMIN_EMAILS: "admin@example.test", POCKET_PT_DATA_DIR: process.cwd(), GAMIFICATION_EVENT_CAPTURE: "true", GAMIFICATION_SOURCE_WORKOUT_COMPLETED: "true", GAMIFICATION_EVALUATION: "true", GAMIFICATION_READ_API: "true", GAMIFICATION_OPERATIONS: "true", GAMIFICATION_NOTIFICATIONS: "true", GAMIFICATION_LEADERBOARDS: "true", ENABLE_AVATAR_FEATURE: "false", ENABLE_VISUAL_PROGRESS_SCAN: "false" };

test("environment diagnostics expose metadata but never values", () => {
  const report = validateEnvironment({ ...launchEnv, OPENAI_API_KEY: "sk-private-value", AI_COACH_ENABLED: "true", AI_COACH_PROVIDER: "openai", AI_COACH_MODEL: "model" }, { profile: "production" });
  assert.equal(JSON.stringify(report).includes("sk-private-value"), false);
  assert.equal(report.entries.find(x => x.name === "OPENAI_API_KEY").status, "configured");
});
test("placeholder and invalid values are classified", () => { const report = validateEnvironment({ ...launchEnv, AUTH_TOKEN_SECRET: "changeme", GAMIFICATION_READ_API: "yes" }, { profile: "production" }); assert.equal(report.entries.find(x => x.name === "AUTH_TOKEN_SECRET").status, "placeholder"); assert.equal(report.entries.find(x => x.name === "GAMIFICATION_READ_API").status, "invalid"); });
test("frontend/backend dated builds produce an explicit mismatch", () => { const result = classifyBuilds({ frontendBuild: "2026-05-03-shell", backendBuild: "2026-07-24-api" }); assert.equal(result.frontendClassification, "frontend_stale"); assert.equal(result.backendClassification, "backend_current"); assert.equal(result.compatible, false); });
test("avatar and visual scan disabled are not launch failures", () => { const report = buildLaunchHealth({ env: launchEnv, rootDir: process.cwd(), dataDir: process.cwd(), frontendBuild: "2026-07-24-ui", backendBuild: "2026-07-24-api" }); assert.equal(report.avatar.status, "DISABLED_INTENTIONALLY"); assert.equal(report.checks.find(x => x.id === "visual_scan").status, "EXCLUDED_FROM_V1"); });
test("enabled notification and leaderboard flags do not fabricate implementation", () => { const report = buildLaunchHealth({ env: launchEnv, rootDir: process.cwd(), dataDir: process.cwd() }); assert.equal(report.notifications.status, "FLAG_ENABLED_BUT_FEATURE_NOT_IMPLEMENTED"); assert.ok(report.leaderboards.missing.includes("ranking projection")); });
test("first workout reward dry run is deterministic and non-mutating", () => { const result = rewardSimulation(process.cwd()); assert.equal(result.status, "READY"); assert.equal(result.mutatedMember, false); assert.ok(result.stages.every(x => x.pass)); });
test("Stripe static validation identifies mode consistency without connectivity", () => { const result = stripeStatic({ BILLING_ENABLED: "true", STRIPE_LIVE_MODE: "false", STRIPE_SECRET_KEY: "sk_test_redacted", STRIPE_WEBHOOK_SECRET: "whsec_redacted", STRIPE_PRICE_ID: "price_redacted" }); assert.equal(result.status, "READY"); assert.equal(result.externalConnectivityPerformed, false); });
test("AI summary schema rejects plain text and incomplete objects", () => { assert.equal(validStructuredSummary("plain"), false); assert.equal(validStructuredSummary({ summary: "x" }), false); assert.equal(validStructuredSummary({ summary: "ok", likelyRootCause: "none", confidence: .9, evidence: [], recommendedNextSteps: [] }), true); });
test("member state incompleteness is distinct from platform failure", () => { const result = evaluatePilotReadiness({ payload: { memberEvidence: { activeWorkout: true, firstWorkoutCompleted: false } } }); assert.equal(result.blockers.length, 0); assert.equal(result.pilotStatus, "READY_WITH_LIMITATION"); });
test("diagnostic report ordering is deterministic and contains no injected secret", () => { const first = buildLaunchHealth({ env: launchEnv, rootDir: process.cwd(), dataDir: process.cwd() }); const second = buildLaunchHealth({ env: launchEnv, rootDir: process.cwd(), dataDir: process.cwd() }); assert.deepEqual(first.checks.map(x => x.id), second.checks.map(x => x.id)); assert.doesNotMatch(JSON.stringify(first), /a-secure-signing-value/); });
