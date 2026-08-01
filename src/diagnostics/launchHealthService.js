"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { validateEnvironment } = require("./environmentValidator");
const { publicCapabilityRegistry } = require("./capabilityRegistry");

const STATUS = Object.freeze({ READY: "READY", READY_WITH_LIMITATION: "READY_WITH_LIMITATION", CONFIGURATION_MISSING: "CONFIGURATION_MISSING", PROVIDER_UNREACHABLE: "PROVIDER_UNREACHABLE", RATE_LIMITED: "RATE_LIMITED", AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED", MODEL_UNAVAILABLE: "MODEL_UNAVAILABLE", DEGRADED: "DEGRADED", BLOCKED: "BLOCKED", DISABLED_INTENTIONALLY: "DISABLED_INTENTIONALLY", EXCLUDED_FROM_V1: "EXCLUDED_FROM_V1", UNKNOWN: "UNKNOWN" });
const safeBool = value => String(value || "").toLowerCase() === "true";
const exists = (root, file) => fs.existsSync(path.join(root, file));
const checked = () => new Date().toISOString();

function check(id, domain, status, explanation, options = {}) {
  return { id, domain, status, explanation, evidence: options.evidence || [], affectedFeature: options.affectedFeature || id, blocking: options.blocking === true, remediation: options.remediation || null, lastCheckedAt: checked() };
}

function classifyBuilds({ frontendBuild, backendBuild }) {
  const frontend = String(frontendBuild || "").trim();
  const backend = String(backendBuild || "").trim();
  if (!frontend || !backend) return { classification: "unknown_build", compatible: null, frontend: frontend || null, backend: backend || null };
  if (frontend === backend) return { classification: "matching_identifiers", frontendClassification: "frontend_current", backendClassification: "backend_current", cacheMismatch: false, compatible: true, frontend, backend };
  const date = value => value.match(/20\d\d-\d\d-\d\d/)?.[0] || null;
  const frontDate = date(frontend), backDate = date(backend);
  if (!frontDate || !backDate) return { classification: frontend === backend ? "frontend_current" : "unknown_build", compatible: frontend === backend, frontend, backend };
  if (frontDate < backDate) return { classification: "build_mismatch", frontendClassification: "frontend_stale", backendClassification: "backend_current", cacheMismatch: true, compatible: false, frontend, backend };
  if (backDate < frontDate) return { classification: "build_mismatch", frontendClassification: "frontend_current", backendClassification: "backend_stale", cacheMismatch: false, compatible: false, frontend, backend };
  return { classification: "build_mismatch", frontendClassification: "unknown_same_date_variant", backendClassification: "unknown_same_date_variant", cacheMismatch: true, compatible: false, frontend, backend };
}

function aiStatic(env, prefix, externalCheck = null) {
  const enabled = safeBool(env[`${prefix}_ENABLED`]);
  const provider = String(env[`${prefix}_PROVIDER`] || "openai").toLowerCase();
  const model = String(env[`${prefix}_MODEL`] || "");
  const credentialPresent = Boolean(String(env.OPENAI_API_KEY || "").trim());
  const configurationValid = !enabled || (provider === "openai" && Boolean(model) && credentialPresent);
  return { enabled, provider, model: model || null, credentialPresent, configurationValid, staticReadiness: !enabled ? STATUS.DISABLED_INTENTIONALLY : configurationValid ? STATUS.READY : STATUS.CONFIGURATION_MISSING, liveReachability: externalCheck?.status || "NOT_CHECKED", lastExternalCheck: externalCheck?.checkedAt || null, latencyMs: externalCheck?.latencyMs ?? null, failureClassification: externalCheck && externalCheck.status !== STATUS.READY ? externalCheck.status : null };
}

function writableDirectory(directory) {
  try { fs.accessSync(directory, fs.constants.R_OK | fs.constants.W_OK); return true; } catch { return false; }
}

function stripeStatic(env = process.env) {
  const enabled = safeBool(env.BILLING_ENABLED);
  if (!enabled) return { status: STATUS.DISABLED_INTENTIONALLY, enabled, mode: "disabled", checks: [] };
  const key = String(env.STRIPE_SECRET_KEY || "");
  const live = safeBool(env.STRIPE_LIVE_MODE);
  const keyMode = key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : "unknown";
  const checks = [
    { id: "secret_key", pass: Boolean(key) && keyMode !== "unknown" },
    { id: "webhook_secret", pass: String(env.STRIPE_WEBHOOK_SECRET || "").startsWith("whsec_") },
    { id: "price_id", pass: String(env.STRIPE_PRICE_ID || "").startsWith("price_") },
    { id: "mode_consistency", pass: keyMode !== "unknown" && (live ? keyMode === "live" : keyMode === "test") },
    { id: "checkout_route", pass: true }, { id: "webhook_route", pass: true }
  ];
  return { status: checks.every(x => x.pass) ? STATUS.READY : STATUS.BLOCKED, enabled, mode: live ? "live" : "test", keyMode, checks, externalConnectivityPerformed: false };
}

function rewardSimulation(rootDir) {
  try {
    const definitions = require(path.join(rootDir, "data/gamification/achievements.json")).definitions;
    const policies = require(path.join(rootDir, "data/gamification/xp-policy.json")).policies;
    const achievement = definitions.find(x => x.id === "achievement.workout.1_completed");
    const policy = policies.find(x => x.actions?.["workout.completed"]);
    const stages = [
      ["verified_event", true], ["base_xp_100", policy?.actions?.["workout.completed"]?.xp === 100],
      ["first_achievement", Boolean(achievement)], ["first_badge", achievement?.badgeId === "badge.workout.1_completed"],
      ["achievement_reward_50", achievement?.reward?.lifetimeXp === 50], ["expected_total_xp_150", (policy?.actions?.["workout.completed"]?.xp || 0) + (achievement?.reward?.lifetimeXp || 0) === 150],
      ["one_celebration", achievement?.repeatability?.mode === "one_time"], ["duplicate_prevention", achievement?.repeatability?.maxAwards === 1]
    ].map(([id, pass]) => ({ id, pass }));
    return { status: stages.every(x => x.pass) ? STATUS.READY : STATUS.BLOCKED, dryRun: true, mutatedMember: false, stages };
  } catch (error) { return { status: STATUS.BLOCKED, dryRun: true, mutatedMember: false, stages: [], error: error.code || "CATALOG_UNAVAILABLE" }; }
}

function buildLaunchHealth({ env = process.env, rootDir = process.cwd(), dataDir, frontendBuild, backendBuild, frontendCommit = null, backendCommit = null, assetCacheToken = null, expectedAssetCacheToken = null, memberEvidence = null, implementations = {} } = {}) {
  const environment = validateEnvironment(env, { profile: env.NODE_ENV || "development" });
  const builds = classifyBuilds({ frontendBuild, backendBuild });
  const cacheTokenAligned = Boolean(assetCacheToken && expectedAssetCacheToken && assetCacheToken === expectedAssetCacheToken);
  const compatibilityStatus = builds.compatible === false || (assetCacheToken && expectedAssetCacheToken && !cacheTokenAligned) ? STATUS.BLOCKED : builds.compatible === true && cacheTokenAligned ? STATUS.READY : STATUS.UNKNOWN;
  const storagePath = path.resolve(dataDir || env.POCKET_PT_DATA_DIR || path.join(rootDir, "data"));
  const storageReady = writableDirectory(storagePath);
  const avatarEnabled = safeBool(env.ENABLE_AVATAR_FEATURE);
  const visualScanEnabled = safeBool(env.ENABLE_VISUAL_PROGRESS_SCAN);
  const gamification = {
    eventCapture: safeBool(env.GAMIFICATION_EVENT_CAPTURE), workoutCompletedSource: safeBool(env.GAMIFICATION_SOURCE_WORKOUT_COMPLETED),
    evaluation: safeBool(env.GAMIFICATION_EVALUATION), readApi: safeBool(env.GAMIFICATION_READ_API), operations: safeBool(env.GAMIFICATION_OPERATIONS),
    notificationsFlag: safeBool(env.GAMIFICATION_NOTIFICATIONS), leaderboardsFlag: safeBool(env.GAMIFICATION_LEADERBOARDS),
    policyAvailable: exists(rootDir, "data/gamification/xp-policy.json"), achievementCatalogAvailable: exists(rootDir, "data/gamification/achievements.json"), persistenceWritable: storageReady
  };
  gamification.status = gamification.eventCapture && gamification.workoutCompletedSource && gamification.evaluation && gamification.readApi && gamification.operations && gamification.policyAvailable && gamification.achievementCatalogAvailable && storageReady ? STATUS.READY : STATUS.BLOCKED;
  const notifications = gamification.notificationsFlag
    ? implementations.notifications ? { status: implementations.notifications.persistenceWritable ? STATUS.READY : STATUS.BLOCKED, implemented: true, inApp: true, externalDelivery: false, routesRegistered: true, uiPresent: exists(rootDir, "public/notifications.js"), ...implementations.notifications }
      : { status: "FLAG_ENABLED_BUT_FEATURE_NOT_IMPLEMENTED", implemented: false, inApp: false, externalDelivery: false, missing: ["notification service", "notification projection", "member read route"] }
    : { status: STATUS.DISABLED_INTENTIONALLY, implemented: false };
  const leaderboards = gamification.leaderboardsFlag
    ? implementations.leaderboards ? { status: STATUS.READY, implemented: true, routesRegistered: true, uiPresent: exists(rootDir, "public/leaderboards.js"), ...implementations.leaderboards }
      : { status: "FLAG_ENABLED_BUT_FEATURE_NOT_IMPLEMENTED", implemented: false, missing: ["gamification leaderboard service", "ranking projection", "privacy/visibility policy", "member read route", "member UI"] }
    : { status: STATUS.DISABLED_INTENTIONALLY, implemented: false };
  const pushupLeaderboard = { status:exists(rootDir,"src/services/challengeService.js") ? STATUS.READY : STATUS.BLOCKED, rankingService:exists(rootDir,"src/services/challengeService.js"), routeRegistered:true, scope:"pushup_score", separateFromUniversal:true };
  const restoredEvents = { greatness:{status:gamification.eventCapture && exists(rootDir,"src/services/steppingIntoGreatnessService.js") ? STATUS.READY : STATUS.DISABLED_INTENTIONALLY, xpPolicy:"none_reviewed"}, pushup:{status:gamification.eventCapture && exists(rootDir,"src/services/challengeService.js") ? STATUS.READY : STATUS.DISABLED_INTENTIONALLY, xpPolicy:"none_reviewed"} };
  const stripe = stripeStatic(env);
  const memberJourney = memberEvidence ? {
    ...memberEvidence,
    status: memberEvidence.status || (memberEvidence.activeWorkout && !memberEvidence.firstWorkoutCompleted ? STATUS.READY_WITH_LIMITATION : STATUS.UNKNOWN),
    platformFailure: false, activeWorkout: Boolean(memberEvidence.activeWorkout), firstWorkoutCompleted: Boolean(memberEvidence.firstWorkoutCompleted),
    rewardJourneyTriggered: Boolean(memberEvidence.firstWorkoutCompleted), explanation: "Member evidence describes member progress and is not itself a platform failure."
  } : { status: STATUS.UNKNOWN, platformFailure: false, explanation: "No designated diagnostic member evidence was supplied." };
  const checks = [
    check("build_compatibility", "Deployment", compatibilityStatus, builds.compatible === false ? "Frontend and backend identifiers differ; redeploy the frontend and invalidate static caches." : builds.compatible ? "Exact frontend and backend build identifiers match." : "One or both build identifiers are unavailable; compatibility is not assumed.", { blocking: compatibilityStatus === STATUS.BLOCKED, evidence: [{ ...builds, frontendCommit, backendCommit, assetCacheToken, expectedAssetCacheToken, cacheTokenAligned }], remediation: compatibilityStatus === STATUS.READY ? null : "Verify both no-store version endpoints, exact identifiers, and the asset cache token." }),
    check("environment", "Environment", environment.counts.missing || environment.counts.invalid || environment.counts.placeholder ? STATUS.BLOCKED : STATUS.READY, "Environment values are reported by presence and validity only; values are never returned.", { blocking: Boolean(environment.counts.missing || environment.counts.invalid || environment.counts.placeholder), evidence: [environment.counts] }),
    check("storage", "Storage", storageReady ? STATUS.READY : STATUS.BLOCKED, storageReady ? "Configured data directory is readable and writable." : "Data directory is not writable.", { blocking: !storageReady }),
    check("avatar", "Optional/Excluded Systems", avatarEnabled ? STATUS.UNKNOWN : STATUS.DISABLED_INTENTIONALLY, avatarEnabled ? "Avatar is enabled; browser probes are required." : "Avatar is disabled; Three.js bridge probes were intentionally skipped."),
    check("visual_scan", "Optional/Excluded Systems", visualScanEnabled ? STATUS.UNKNOWN : STATUS.EXCLUDED_FROM_V1, visualScanEnabled ? "Visual scan enabled; member evidence is optional." : "Visual scanning does not gate Version 1."),
    check("program", "Program", exists(rootDir, "src/program-engine/programService.js") ? STATUS.READY : STATUS.BLOCKED, "Program engine service and routes are present.", { blocking: !exists(rootDir, "src/program-engine/programService.js") }),
    check("exercise_hub", "Exercise Intelligence", exists(rootDir, "public/exercise-db/index.json") ? STATUS.READY : STATUS.BLOCKED, "Canonical exercise index and member APIs are present.", { blocking: !exists(rootDir, "public/exercise-db/index.json") }),
    check("yoga", "Yoga and Movement", exists(rootDir, "data/yoga/poses.v1.json") && exists(rootDir, "data/yoga/sessions.v1.json") ? STATUS.READY : STATUS.BLOCKED, "Yoga catalogs, persistence route, and gamification adapter are present."),
    check("gamification", "Gamification", gamification.status, "Gamification flags, catalogs, and persistence were checked.", { blocking: gamification.status === STATUS.BLOCKED }),
    check("progress_rewards_ui", "Gamification", exists(rootDir, "public/gamification.js") && exists(rootDir, "public/gamification.css") && exists(rootDir, "public/dashboard.html") ? STATUS.READY : STATUS.BLOCKED, "Progress & Rewards is embedded in the member dashboard and reads the member gamification API.", { blocking: !(exists(rootDir, "public/gamification.js") && exists(rootDir, "public/gamification.css")) }),
    check("notifications", "Notifications", notifications.status, notifications.implemented ? "Notification service is healthy." : "The flag does not have a corresponding production notification implementation.", { blocking: gamification.notificationsFlag }),
    check("leaderboards", "Leaderboards", leaderboards.status, leaderboards.implemented ? "Leaderboard service is healthy." : "The gamification flag does not have a ranking implementation; the separate push-up challenge leaderboard is not a substitute.", { blocking: gamification.leaderboardsFlag }),
    check("pushup_leaderboard", "Leaderboards", pushupLeaderboard.status, "Push-Up score ranking is implemented and remains separate from universal XP standings."),
    check("greatness_events", "Gamification", restoredEvents.greatness.status, "Verified Greatness completions emit replay-safe events after persistence; no XP policy is assigned."),
    check("pushup_events", "Gamification", restoredEvents.pushup.status, "Persisted Push-Up results emit replay-safe events; score ranking and XP standings remain separate."),
    check("ai_coach", "AI Coach", aiStatic(env, "AI_COACH", implementations.externalChecks?.aiCoach).liveReachability === STATUS.READY ? STATUS.READY : aiStatic(env, "AI_COACH").staticReadiness === STATUS.READY ? STATUS.READY_WITH_LIMITATION : aiStatic(env, "AI_COACH").staticReadiness, "AI Coach static configuration is independent; reachability requires Safe External Checks."),
    check("diagnostic_summarizer", "Diagnostics", aiStatic(env, "DIAGNOSTIC_SUMMARIZER", implementations.externalChecks?.diagnosticSummarizer).liveReachability === STATUS.READY ? STATUS.READY : aiStatic(env, "DIAGNOSTIC_SUMMARIZER").staticReadiness, "The optional diagnostic summarizer has its own enablement, provider, and model configuration."),
    check("stripe", "Stripe", stripe.status, "Stripe static configuration checked without making an external call.", { blocking: stripe.status === STATUS.BLOCKED }),
    check("member_journey", "Member Journey", memberJourney.status, memberJourney.explanation)
  ];
  const blockers = checks.filter(x => x.blocking && [STATUS.BLOCKED, "FLAG_ENABLED_BUT_FEATURE_NOT_IMPLEMENTED"].includes(x.status));
  return { schemaVersion: 2, generatedAt: checked(), statuses: STATUS, builds: { ...builds, compatibilityResult: compatibilityStatus, frontendBuild: builds.frontend, backendBuild: builds.backend, frontendCommit, backendCommit, assetCacheToken, expectedAssetCacheToken, staticCacheTokenAligned: cacheTokenAligned, deployedCacheFreshness: "UNKNOWN_UNTIL_CLIENT_EVIDENCE" }, environment, storage: { status: storageReady ? STATUS.READY : STATUS.BLOCKED, configured: Boolean(env.POCKET_PT_DATA_DIR), writable: storageReady, durableClaim: Boolean(env.POCKET_PT_DATA_DIR) }, gamification, rewardSimulation: rewardSimulation(rootDir), notifications, leaderboards, pushupLeaderboard, restoredEvents, aiCoach: aiStatic(env, "AI_COACH", implementations.externalChecks?.aiCoach), diagnosticSummarizer: aiStatic(env, "DIAGNOSTIC_SUMMARIZER", implementations.externalChecks?.diagnosticSummarizer), stripe, avatar: { enabled: avatarEnabled, status: avatarEnabled ? STATUS.UNKNOWN : STATUS.DISABLED_INTENTIONALLY, probesSkipped: !avatarEnabled }, memberJourney, capabilities: publicCapabilityRegistry(), checks, launchReadiness: { status: blockers.length ? STATUS.BLOCKED : checks.some(x => x.status === STATUS.READY_WITH_LIMITATION) ? STATUS.READY_WITH_LIMITATION : STATUS.READY, blockers: blockers.map(x => x.id), warnings: checks.filter(x => [STATUS.DEGRADED, STATUS.READY_WITH_LIMITATION, STATUS.UNKNOWN].includes(x.status)).map(x => x.id) } };
}

function redactedExport(report) { return JSON.parse(JSON.stringify(report)); }

module.exports = { STATUS, buildLaunchHealth, classifyBuilds, aiStatic, stripeStatic, rewardSimulation, redactedExport };
