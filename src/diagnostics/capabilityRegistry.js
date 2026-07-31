"use strict";

const IMPORTANCE = Object.freeze({ BLOCKING: "blocking", IMPORTANT: "important", OPTIONAL: "optional" });

function capability(id, displayName, domain, overrides = {}) {
  return Object.freeze({
    id, displayName, domain,
    requiredFeatureFlags: [], requiredEnvironmentVariables: [], requiredRoutes: [],
    requiredFiles: [], requiredPermissions: [], requiredPersistence: [], dependencyChecks: [],
    launchImportance: IMPORTANCE.IMPORTANT, optionality: "required_v1", expectedMemberUi: null,
    acceptableDegradedMode: null, remediationGuidance: "Review the failed evidence and restore the declared dependency.",
    ...overrides
  });
}

const CAPABILITY_REGISTRY = Object.freeze([
  capability("authentication", "Authentication", "Authentication", { launchImportance: IMPORTANCE.BLOCKING, requiredEnvironmentVariables: ["AUTH_TOKEN_SECRET"], requiredPermissions: ["authenticated_member"], requiredRoutes: ["/api/auth/login"] }),
  capability("onboarding", "Onboarding", "Member Journey", { launchImportance: IMPORTANCE.BLOCKING, requiredRoutes: ["/api/client-intake", "/api/goals-baseline"] }),
  capability("dashboard", "Member Dashboard", "Deployment", { launchImportance: IMPORTANCE.BLOCKING, expectedMemberUi: "/dashboard.html" }),
  capability("program_engine", "Program Engine", "Program", { launchImportance: IMPORTANCE.BLOCKING, requiredRoutes: ["/api/me/program", "/api/me/program/today"], requiredFiles: ["src/program-engine/programService.js"], requiredPersistence: ["member program state"] }),
  capability("workout_execution", "Workout Execution", "Workout", { launchImportance: IMPORTANCE.BLOCKING, expectedMemberUi: "/workout.html" }),
  capability("workout_history", "Workout History", "Workout", { requiredRoutes: ["/api/sessions"] }),
  capability("workout_completion", "Workout Completion", "Workout", { launchImportance: IMPORTANCE.BLOCKING, requiredRoutes: ["/api/sessions/:id/complete"] }),
  capability("exercise_hub", "Exercise Hub", "Exercise Intelligence", { requiredRoutes: ["/api/me/exercises"], expectedMemberUi: "/exercise-library.html", requiredFiles: ["public/exercise-db/index.json"] }),
  capability("exercise_details", "Exercise Details", "Exercise Intelligence", { requiredRoutes: ["/api/me/exercises/:exerciseId"] }),
  capability("yoga", "Yoga", "Yoga and Movement", { requiredRoutes: ["/api/yoga/catalogue", "/api/yoga/history"], requiredFiles: ["data/yoga/poses.v1.json", "data/yoga/sessions.v1.json"], expectedMemberUi: "/yoga.html" }),
  capability("movement_analysis", "Movement Analysis", "Yoga and Movement", { optionality: "camera_optional", acceptableDegradedMode: "Static instruction remains available without a camera." }),
  capability("gamification_event_capture", "Gamification Event Capture", "Gamification", { requiredFeatureFlags: ["GAMIFICATION_EVENT_CAPTURE"], requiredPersistence: ["event store"] }),
  capability("xp_evaluation", "XP Evaluation", "Gamification", { requiredFeatureFlags: ["GAMIFICATION_EVALUATION"], requiredFiles: ["data/gamification/xp-policy.json"] }),
  capability("achievements", "Achievements", "Gamification", { requiredFeatureFlags: ["GAMIFICATION_EVALUATION"], requiredFiles: ["data/gamification/achievements.json"] }),
  capability("badges", "Badges", "Gamification", { requiredFeatureFlags: ["GAMIFICATION_EVALUATION"], requiredFiles: ["data/gamification/achievements.json"] }),
  capability("rewards", "Rewards", "Gamification", { requiredFeatureFlags: ["GAMIFICATION_READ_API"], expectedMemberUi: "/progress-rewards.html" }),
  capability("notifications", "Notifications", "Notifications", { requiredFeatureFlags: ["GAMIFICATION_NOTIFICATIONS"], optionality: "implementation_dependent", acceptableDegradedMode: "In-app only; external delivery is not implied by the flag." }),
  capability("leaderboards", "Leaderboards", "Leaderboards", { requiredFeatureFlags: ["GAMIFICATION_LEADERBOARDS"], optionality: "implementation_dependent" }),
  capability("progress_rewards_ui", "Progress & Rewards UI", "Gamification", { expectedMemberUi: "/progress-rewards.html" }),
  capability("ai_coach", "AI Coach", "AI Coach", { requiredFeatureFlags: ["AI_COACH_ENABLED"], requiredEnvironmentVariables: ["AI_COACH_PROVIDER", "AI_COACH_MODEL", "OPENAI_API_KEY"], acceptableDegradedMode: "Deterministic product flows continue while the provider is unavailable." }),
  capability("stripe_billing", "Stripe Billing", "Stripe", { requiredFeatureFlags: ["BILLING_ENABLED"], requiredEnvironmentVariables: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID"], requiredRoutes: ["/api/billing/checkout-session", "/api/billing/webhook"] }),
  capability("profile_settings", "Profile and Settings", "Member Journey", { requiredRoutes: ["/api/me"] }),
  capability("admin_audit", "Admin Audit", "Security", { launchImportance: IMPORTANCE.BLOCKING, requiredPermissions: ["ops.read_observability"], requiredPersistence: ["append-only audit log"] }),
  capability("content_curation", "Content Curation", "Exercise Intelligence", { requiredPermissions: ["exercise.content.manage"] }),
  capability("backups", "Backups", "Storage", { launchImportance: IMPORTANCE.BLOCKING, requiredPersistence: ["operator backup procedure"] }),
  capability("persistent_storage", "Persistent Data Storage", "Storage", { launchImportance: IMPORTANCE.BLOCKING, requiredEnvironmentVariables: ["POCKET_PT_DATA_DIR"], requiredPersistence: ["writable durable volume"] }),
  capability("route_authorization", "Route Authorization", "Security", { launchImportance: IMPORTANCE.BLOCKING, requiredPermissions: ["ops.read_observability"] }),
  capability("build_compatibility", "Frontend/Backend Compatibility", "Deployment", { launchImportance: IMPORTANCE.BLOCKING }),
  capability("avatar", "Avatar", "Optional/Excluded Systems", { requiredFeatureFlags: ["ENABLE_AVATAR_FEATURE"], optionality: "optional", launchImportance: IMPORTANCE.OPTIONAL }),
  capability("nutrition", "Nutrition", "Optional/Excluded Systems", { optionality: "excluded_v1", launchImportance: IMPORTANCE.OPTIONAL }),
  capability("trails", "Trails and Maps", "Optional/Excluded Systems", { optionality: "excluded_v1", launchImportance: IMPORTANCE.OPTIONAL }),
  capability("tts", "Text to Speech", "Optional/Excluded Systems", { optionality: "optional", launchImportance: IMPORTANCE.OPTIONAL })
]);

function publicCapabilityRegistry() { return CAPABILITY_REGISTRY.map(({ ...entry }) => entry); }

module.exports = { CAPABILITY_REGISTRY, IMPORTANCE, publicCapabilityRegistry };
