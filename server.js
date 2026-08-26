// server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");

const { requestContext, asyncHandler } = require("./src/middleware/requestContext");
const { createTrailResponseDiagnostics, logTrailResponseException } = require("./src/middleware/trailResponseDiagnostics");
const { createRateLimiter } = require("./src/middleware/rateLimit");
const { ApiError, ok, fail } = require("./src/lib/apiResponse");
const { createAuthTokenLib } = require("./src/lib/authToken");
const { authContext, requireAuth, ensureUserScopedAccess, requirePermission } = require("./src/middleware/auth");
const { createUserStore } = require("./src/repositories/userStore");
const avatarUploadContract = require("./public/avatar-upload-contract");
const { createAuthCredentialStore } = require("./src/repositories/authCredentialStore");
const { createTrainerWorkspaceStore } = require("./src/repositories/trainerWorkspaceStore");
const { createTrainerWorkspaceService } = require("./src/services/trainerWorkspaceService");
const { createClientMessagingStore } = require("./src/repositories/clientMessagingStore");
const { createClientCrmService } = require("./src/services/clientCrmService");
const { createSessionService } = require("./src/services/sessionService");
const { createYogaService } = require("./src/services/yogaService");
const { loadGamificationConfig } = require("./src/config/gamification");
const { createGamificationEventStore } = require("./src/repositories/gamificationEventStore");
const { createGamificationGenerationStore } = require("./src/repositories/gamificationGenerationStore");
const { createEventService } = require("./src/gamification/eventService");
const { createAchievementService } = require("./src/gamification/achievementService");
const { createProjectionService } = require("./src/gamification/projectionService");
const { createLevelService } = require("./src/gamification/levelService");
const { validateAchievementDefinitions } = require("./src/gamification/policyService");
const { createXpPolicyService, validateXpPolicy } = require("./src/gamification/xpPolicyService");
const { createReadModelService, validUserId } = require("./src/gamification/readModelService");
const { createMemberExperienceService } = require("./src/gamification/memberExperienceService");
const { createReplayJobStore } = require("./src/repositories/replayJobStore");
const { createReplayWorker } = require("./src/gamification/replayWorker");
const { createPolicyManager } = require("./src/gamification/policyManager");
const { createGamificationPreflightService } = require("./src/gamification/preflightService");
const { createUserDataService } = require("./src/services/userDataService");
const { createJourneyIntakeService } = require("./src/services/journeyIntakeService");
const { createGeneratedWorkoutService } = require("./src/services/generatedWorkoutService");
const { createGeneratedWorkoutProgressionService } = require("./src/services/generatedWorkoutProgressionService");
const { createTrainingAdaptationService } = require("./src/services/trainingAdaptationService");
const { createPersonalizationService } = require("./src/services/personalizationService");
const { createMembershipService } = require("./src/services/membershipService");
const { createChallengeService } = require("./src/services/challengeService");
const { createChallengeEngineService } = require("./src/services/challengeEngineService");
const { EXERCISES } = require("./data/challenges/kettlebellCanonicalProgram");
const { MEDIA: kettlebellMedia, getEducation: getKettlebellEducation } = require("./data/challenges/kettlebellExerciseEducation");
const { createMemberExperienceCapabilityService } = require("./src/services/memberExperienceCapabilityService");
const { createExerciseTemplateService } = require("./src/services/exerciseTemplateService");
const { createNutritionService, createProviderClient } = require("./src/services/nutritionService");
const { createMemberHomeService } = require("./src/services/memberHomeService");
const { createCoachContextService } = require("./src/ai/coachContextService");
const { createMemberExerciseService } = require("./src/exercise-intelligence/memberExerciseService");
const { createExerciseCurationService } = require("./src/exercise-intelligence/exerciseCurationService");
const { createProgramPersistence, createProgramService } = require("./src/program-engine");
const { createAiCoachService } = require("./src/services/aiCoachService");
const { loadAiCoachConfig } = require("./src/config/aiCoach");
const { createOpenAiCoachProvider } = require("./src/ai/openAiCoachProvider");
const { createSteppingIntoGreatnessService } = require("./src/services/steppingIntoGreatnessService");
const { loadHealthKitConfig } = require("./src/config/healthKit");
const { createHealthKitEvidenceService } = require("./src/services/healthKitEvidenceService");
const { createTrailContributionService } = require("./src/services/trailContributionService");
const { createNearbyTrailService, createConfiguredTrailProvider } = require("./src/services/nearbyTrailService");
const { createTrailRouteStore } = require("./src/repositories/trailRouteStore");
const { parseGeoJSON, parseGpx } = require("./src/trails/geometry");
const { createGoogleWalkingRouteProvider, createWalkingRouteService } = require("./src/services/walkingRouteService");
const { loadRoutePlanningConfig } = require("./src/config/routePlanningConfig");
const routePlanningConfig=loadRoutePlanningConfig();
const { createTrailGeometryService, createOverpassGeometryProvider } = require("./src/services/trailGeometryService");
const {
  validateSessionCreate,
  validateRepUpdate,
  validateSessionComplete,
  validateLegacySessionCommand
} = require("./src/validation/sessionValidators");
const {
  validateProfileUpsert,
  validateOhsaSubmission,
  validateAuthBridge
} = require("./src/validation/meValidators");
const { validateAvatarGlb } = require("./src/validation/avatarGlbValidator");
const {
  validateCheckoutConfig,
  validatePortalConfig,
  validateWebhookConfig,
  rejectRawPaymentCredentialFields,
  resolveMembershipReturnUrl,
  getPublicBillingPlan
} = require("./src/validation/billingValidation");
const {
  validateClientIntake,
  validateGoalsBaseline,
  validateProgramAssignment,
  validateWorkoutTracking,
  validateWeeklyCheckIn,
  validateVisualProgressScan
} = require("./src/validation/retentionValidators");
const { createWriteObservability, mapRouteAction } = require("./src/lib/writeObservability");
const { createAuthorizationResolver, parseAuthorizationConfig } = require("./src/lib/authorization");
const { createEnforcementStateStore } = require("./src/lib/enforcementStateStore");
const { createAdminAuditLog, summarizeActor } = require("./src/lib/adminAuditLog");
const { validateAuthorizationConfigShape, validateParsedEnforcementConfig } = require("./src/lib/authzEnforcementValidation");
const { createControlPlaneAlertEmitter, ALERT_TYPES } = require("./src/lib/controlPlaneAlerts");
const { runControlPlanePreflight } = require("./src/lib/controlPlanePreflight");
const {
  parseTrustPolicyConfig,
  summarizeTrustPolicy,
  validateTrustPolicy
} = require("./src/lib/trustPolicy");
const { createTokenDenylistStore } = require("./src/lib/tokenDenylistStore");
const { resolveAuthBridgeIdentity } = require("./src/lib/providerIdentity");
const { createDiagnosticStore } = require("./src/lib/diagnosticStore");
const { summarizeDiagnosticWithOpenAI } = require("./src/lib/diagnosticSummarizer");
const { runRouteDiagnostics } = require("./src/lib/diagnosticRouteChecker");
const { evaluatePilotReadiness } = require("./src/lib/pilotReadinessEvaluator");
const { buildLaunchHealth, redactedExport } = require("./src/diagnostics/launchHealthService");
const { createClientEvidenceService } = require("./src/diagnostics/clientEvidenceService");
const { createRunClubDiagnosticsService } = require("./src/diagnostics/runClubDiagnosticsService");
const routeAuthorizationContract = require("./config/route-authorization-contract");
const { publicCapabilityRegistry } = require("./src/diagnostics/capabilityRegistry");
const { createNotificationService } = require("./src/notifications/notificationService");
const { createLeaderboardService } = require("./src/leaderboards/leaderboardService");
const { createMemberJourneyService } = require("./src/diagnostics/memberJourneyService");
const { createYouthProgramRepository } = require("./src/youth-fitness/runtime/repository");
const { createYouthProgramService } = require("./src/youth-fitness/runtime/service");
const { createYouthCsrf } = require("./src/youth-fitness/runtime/csrf");
const { createGarveyLaunchHandler } = require("./src/youth-fitness/integration/garveyLaunch");

const ENFORCEABLE_ACTIONS = Object.freeze([
  "profile",
  "session_start",
  "session_complete",
  "ohsa",
  "rep_update"
]);
const APP_BUILD_VERSION = "2026-08-20-motion-lab-ios-trace-v2";
const INDEX_CACHE_BUST_TOKEN = "20260731-launch-readiness";
const safeCommit = value => /^[a-f0-9]{7,40}$/i.test(String(value || "")) ? String(value) : null;
const AVATAR_FEATURE_DISABLED_MESSAGE = "Avatar feature is disabled for this pilot.";
const MEMBER_AVATAR_PILOT_ENABLED = true;

function isAvatarFeatureEnabled(_env = process.env) {
  // The bounded member-avatar pilot is code-enabled. Authentication, ownership,
  // compatibility validation, and Motion Lab authorization remain independent.
  return MEMBER_AVATAR_PILOT_ENABLED;
}

function assertProductionPersistenceConfig({ env = process.env, rootDirWasExplicit = false, dataDirWasExplicit = false } = {}) {
  if (env.NODE_ENV !== "production" || rootDirWasExplicit || dataDirWasExplicit) return;
  if (!String(env.POCKET_PT_DATA_DIR || "").trim()) {
    throw new Error("POCKET_PT_DATA_DIR is required in production and must point to an attached persistent volume");
  }
}

function normalizeAuthBridgeTrustMode(raw) {
  const mode = String(raw || "").trim().toLowerCase();
  if (!mode) return null;
  if (mode === "provider_verified" || mode === "google_verified") return "google_verified";
  if (mode === "manual_unverified" || mode === "provider_unverified") return mode;
  return null;
}

function deriveAuthBridgeRejectionReason(error) {
  if (!error) return "unknown";
  return error?.details?.reason
    || error?.details?.diagnostics?.rejectionReason
    || error?.code
    || error?.message
    || "unknown";
}

function parseEmailAllowlist(raw) {
  return String(raw || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function normalizePilotEmail(raw) {
  return String(raw || "").trim().toLowerCase();
}

function toPilotUserId(email) {
  const slug = normalizePilotEmail(email)
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
  return `pilot_email_${slug || "user"}`;
}

function parseBooleanEnv(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

function parseActionEnforcementFromEnv(env = process.env) {
  const enabledByAction = Object.fromEntries(ENFORCEABLE_ACTIONS.map((action) => [action, false]));
  const requireExplicitAll = parseBooleanEnv(env.LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS);
  if (requireExplicitAll === true) {
    for (const action of ENFORCEABLE_ACTIONS) enabledByAction[action] = true;
  }
  const invalidActions = [];

  const list = requireExplicitAll === null
    ? String(env.LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
    : [];
  for (const action of list) {
    if (action in enabledByAction) enabledByAction[action] = true;
    else invalidActions.push(action);
  }

  for (const action of ENFORCEABLE_ACTIONS) {
    const envKey = `LEGACY_FALLBACK_REQUIRE_EXPLICIT_${action.toUpperCase()}`;
    if (env[envKey] === "true") enabledByAction[action] = true;
    if (env[envKey] === "false") enabledByAction[action] = false;
  }

  return {
    enabledByAction,
    enforcedActions: ENFORCEABLE_ACTIONS.filter((action) => enabledByAction[action]),
    invalidActions
  };
}


function buildActionEnforcementState(base, runtimeOverrides = {}) {
  const enabledByAction = { ...base.enabledByAction };
  for (const action of ENFORCEABLE_ACTIONS) {
    if (Object.prototype.hasOwnProperty.call(runtimeOverrides, action)) {
      enabledByAction[action] = Boolean(runtimeOverrides[action]);
    }
  }

  return {
    enabledByAction,
    enforcedActions: ENFORCEABLE_ACTIONS.filter((action) => enabledByAction[action]),
    runtimeOverrides
  };
}

function sanitizeAuthHeader(headerValue) {
  if (!headerValue || typeof headerValue !== "string") return null;
  const [scheme, token] = headerValue.split(" ");
  if (!token) return `${scheme || "unknown"} [missing-token]`;
  return `${scheme || "unknown"} [redacted:${Math.min(token.length, 12)}]`;
}


function redactTtsSecrets(value, env = process.env) {
  if (value == null) return value;
  let text = String(value);
  for (const secret of [env.SKILL_WORLD_TTS_TOKEN, env.AIVOICE_API_KEY]) {
    if (secret) text = text.split(secret).join("[redacted]");
  }
  return text;
}

function sanitizeSpeakHeaders(req) {
  return {
    authorization: sanitizeAuthHeader(req.get("authorization")),
    contentType: req.get("content-type") || null,
    userAgent: req.get("user-agent") || null,
    origin: req.get("origin") || null
  };
}

function resolveRequestOrigin(req) {
  const forwardedProto = String(req.get("x-forwarded-proto") || "").split(",")[0].trim();
  const forwardedHost = String(req.get("x-forwarded-host") || "").split(",")[0].trim();
  const host = forwardedHost || req.get("host");
  if (!host) return null;
  const protocol = forwardedProto || req.protocol || "https";
  return `${protocol}://${host}`;
}

function shouldLogSystemRequest(pathname = "") {
  if (!pathname) return false;
  if (pathname === "/__version" || pathname === "/__diagnostic-smoke") return true;
  if (pathname.startsWith("/api/")) return true;
  return false;
}

function createApp(options = {}) {
  const env = options.env || process.env;
  assertProductionPersistenceConfig({
    rootDirWasExplicit: Boolean(options.rootDir),
    dataDirWasExplicit: Boolean(options.dataDir)
  });
  const insecureTestCompatibility = options.allowInsecureTestRoutes === true;
  const requireCriticalRouteAuth = insecureTestCompatibility ? (_req, _res, next) => next() : requireAuth;
  const app = express();
  app.use(requestContext);
  app.use(createTrailResponseDiagnostics({ logger: options.logger || console }));
  const visualProgressScanEnabled = process.env.ENABLE_VISUAL_PROGRESS_SCAN === "true";
  const avatarFeatureEnabled = isAvatarFeatureEnabled(env);
  // Motion Lab is an independent, fail-closed diagnostic capability. It does
  // not enable (and is not enabled by) the member-facing avatar flag.
  const motionLabEnabled = String(env.ENABLE_MOTION_LAB || "").toLowerCase() === "true";
  const motionLabSessions = new Map();
  const motionLabSessionTtlMs = options.motionLabSessionTtlMs || 10 * 60 * 1000;
  const motionLabCookieName = "PocketPTMotionLabSession";
  const pilotBypassRuntimeAllowed = process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development";
  const disableLoginForPilot = pilotBypassRuntimeAllowed && process.env.DISABLE_LOGIN_FOR_PILOT === "true";

  const rootDir = options.rootDir || process.cwd();
  // Transactional/member state must be separable from the application image. On
  // Render this directory is pointed at the mounted persistent disk; rootDir is
  // intentionally retained as the development/test default.
  const DATA_DIR = path.resolve(options.dataDir || process.env.POCKET_PT_DATA_DIR || path.join(rootDir, "data"));
  const OPS_DIR = path.join(DATA_DIR, "ops");
  const writeObservability = createWriteObservability();
  const auditLog = createAdminAuditLog({
    filePath: path.join(OPS_DIR, "admin-audit.ndjson"),
    maxBytes: Number(process.env.ADMIN_AUDIT_MAX_BYTES || 512 * 1024),
    maxArchives: Number(process.env.ADMIN_AUDIT_MAX_ARCHIVES || 4),
    hashChain: process.env.ADMIN_AUDIT_HASH_CHAIN !== "false",
    checkpointFilePath: process.env.ADMIN_AUDIT_CHECKPOINT_FILE_PATH || path.join(OPS_DIR, "admin-audit.checkpoints.ndjson"),
    checkpointIntervalMs: Number(process.env.ADMIN_AUDIT_CHECKPOINT_INTERVAL_MS || 0)
  });
  const controlPlaneAlerts = createControlPlaneAlertEmitter({
    sink: options.controlPlaneAlertSink
  });
  const legacyDependencyCatalog = {
    profile: ["fitness.saveProfile"],
    session_start: ["fitness.startSession"],
    rep_update: ["fitness.repUpdate"],
    session_complete: ["fitness.endSession"],
    ohsa: ["fitness.ohsaResult"]
  };
  const baseActionEnforcement = parseActionEnforcementFromEnv(process.env);
  const runtimeEnforcementOverrides = {};
  const enforcementOverrideStore = createEnforcementStateStore({
    filePath: path.join(OPS_DIR, "enforcement-overrides.json"),
    enforceableActions: ENFORCEABLE_ACTIONS
  });
  const persistedOverrideState = enforcementOverrideStore.load();
  if (persistedOverrideState.loaded) {
    Object.assign(runtimeEnforcementOverrides, persistedOverrideState.overrides);
  }
  let actionEnforcement = buildActionEnforcementState(baseActionEnforcement, runtimeEnforcementOverrides);
  writeObservability.setEnforcementState(actionEnforcement.enabledByAction);

  const authorizationConfig = parseAuthorizationConfig(process.env);
  const authorizationResolver = createAuthorizationResolver(authorizationConfig);
  writeObservability.setAuthorizationState(authorizationResolver.describe());

  const PRODUCTION_FRONTEND_ORIGIN = "https://mufasafitsite.onrender.com";
  const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || (process.env.NODE_ENV === "production" ? PRODUCTION_FRONTEND_ORIGIN : ""))
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const corsOptions = {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.length === 0) return cb(null, true);
      return cb(null, ALLOWED_ORIGINS.includes(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Request-ID"],
    exposedHeaders: ["X-Request-ID", "X-App-Build-Version", "X-Asset-Cache-Token", "Content-Length", "Content-Type", "Cache-Control", "Content-Encoding"],
    optionsSuccessStatus: 200
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      if (req.originalUrl === "/api/billing/webhook") {
        req.rawBody = Buffer.from(buf);
      }
    }
  }));
  const speakLimit = createRateLimiter({ name: "tts", max: Number(process.env.TTS_RATE_LIMIT || 20), windowMs: 60_000 });
  const legacyLimit = createRateLimiter({ name: "legacy-command", max: 60, windowMs: 60_000 });
  const challengeLimit = createRateLimiter({ name: "pushup-results", max: 20, windowMs: 60_000 });
  const telemetryLimit = createRateLimiter({ name: "pilot-events", max: 60, windowMs: 60_000 });
  const trainerWriteLimit = createRateLimiter({ name: "trainer-writes", max: 30, windowMs: 60_000 });
  const notificationLimit = createRateLimiter({ name:"member-notifications",max:60,windowMs:60_000 });
  const leaderboardLimit = createRateLimiter({ name:"member-leaderboards",max:60,windowMs:60_000 });
  const clientEvidenceLimit = createRateLimiter({ name:"client-capability-evidence",max:12,windowMs:60_000 });
  const authAttemptLimit = createRateLimiter({ name:"auth-attempts",max:Number(process.env.AUTH_RATE_LIMIT || 20),windowMs:60_000 });
  app.use((req, _res, next) => {
    if (!shouldLogSystemRequest(req.path)) return next();
    console.info("[request]", {
      method: req.method,
      path: req.path,
      origin: resolveRequestOrigin(req),
      userAgent: req.get("user-agent") || null,
      requestId: req.requestId || null
    });
    next();
  });

  // ---- Paths ----
  const PUBLIC_DIR = path.join(rootDir, "public");
  const AVATAR_UPLOAD_DIR = path.resolve(options.avatarUploadDir || process.env.POCKET_PT_AVATAR_UPLOAD_DIR || path.join(PUBLIC_DIR, "uploads", "avatars"));
  const EX_DB_DIR = path.join(PUBLIC_DIR, "exercise-db");
  const EX_INDEX_PATH = path.join(EX_DB_DIR, "index.json");
  const USER_DIR = path.join(DATA_DIR, "users");
  const GAMIFICATION_EVENT_PATH = path.join(DATA_DIR, "gamification", "events.json");
  const PILOT_EVENT_LOG_PATH = path.join(OPS_DIR, "pilot-events.ndjson");
  const DIAGNOSTIC_REPORT_PATH = path.join(OPS_DIR, "diagnostic-reports.ndjson");
  const PUSHUP_CHALLENGE_PATH = path.join(OPS_DIR, "pushup-challenge-results.json");
  const EXERCISE_TEMPLATE_PATH = path.join(OPS_DIR, "exercise-templates.json");

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(OPS_DIR)) fs.mkdirSync(OPS_DIR, { recursive: true });
  if (avatarFeatureEnabled && !fs.existsSync(AVATAR_UPLOAD_DIR)) fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
  const diagnosticStore = createDiagnosticStore({ filePath: DIAGNOSTIC_REPORT_PATH });
  const clientEvidenceService = createClientEvidenceService();
  let latestLaunchHealth = null;
  const latestExternalChecks = { aiCoach:null, diagnosticSummarizer:null, stripe:null };
  const challengeService = createChallengeService({ filePath: PUSHUP_CHALLENGE_PATH });
  const exerciseTemplateService = createExerciseTemplateService({ filePath: EXERCISE_TEMPLATE_PATH });
  let challengeEngineService = null;

  const userStore = createUserStore({ userDir: USER_DIR });
  const youthProgramRepository = createYouthProgramRepository({ filePath: path.join(DATA_DIR, "youth-fitness", "runtime-v1.json") });
  const youthProgramService = createYouthProgramService({ repository: youthProgramRepository });
  const youthCsrf = createYouthCsrf({ secret: (options.env || process.env).YOUTH_CSRF_SECRET || (options.env || process.env).AUTH_TOKEN_SECRET });
  const authCredentialStore = createAuthCredentialStore({ filePath: options.authCredentialPath || path.join(OPS_DIR, "auth-credentials.json") });
  const steppingService = createSteppingIntoGreatnessService({ userStore });
  const healthKitConfig = loadHealthKitConfig(options.env || process.env);
  const healthKitEvidenceService = createHealthKitEvidenceService({ userStore, config:healthKitConfig, hashSecret:(options.env || process.env).HEALTHKIT_EVIDENCE_HASH_SECRET });
  let trailContributionService = null;
  const memberExperienceCapabilityService = createMemberExperienceCapabilityService({ userStore, challengeService });
  const trailProvider = options.nearbyTrailProvider || createConfiguredTrailProvider({ env: process.env, fetchImpl: options.fetch || global.fetch });
  const trailRouteStore = createTrailRouteStore({ filePath: options.trailRouteFilePath || path.join(DATA_DIR, "trail-routes.json") });
  const nearbyTrailService = createNearbyTrailService({ provider: trailProvider, routeStore: trailRouteStore });
  const walkingRouteProvider = options.walkingRouteProvider || createGoogleWalkingRouteProvider({ apiKey:process.env.GOOGLE_MAPS_API_KEY,fetchImpl:options.fetch||global.fetch });
  const trailGeometryProvider = options.trailGeometryProvider || createOverpassGeometryProvider({fetchImpl:options.fetch||global.fetch});
  const trailGeometryService = options.trailGeometryService || createTrailGeometryService({routeStore:trailRouteStore,provider:trailGeometryProvider});
  const walkingRouteService = options.walkingRouteService || createWalkingRouteService({ provider:walkingRouteProvider,routeStore:trailRouteStore,trailGeometryService });
  userStore.ensureDirs();
  const trainerWorkspaceStore = createTrainerWorkspaceStore({ filePath: path.join(DATA_DIR, "trainer-workspace.json") });
  const trainerWorkspaceService = createTrainerWorkspaceService({ store: trainerWorkspaceStore, userStore, authorizationResolver });
  const clientMessagingStore = createClientMessagingStore({ filePath: options.clientMessagingPath || path.join(DATA_DIR, "client-messaging.json") });
  const gamificationConfig = loadGamificationConfig(options.env || process.env);
  let gamificationEventService = null;
  let gamificationEventStore = null;
  let achievementService = null;
  let gamificationReadService = null;
  let memberGamificationService = null;
  let replayWorker = null;
  let policyManager = null;
  let gamificationPreflightService = null;
  if (gamificationConfig.eventCapture) {
    gamificationEventStore = createGamificationEventStore({ filePath: options.gamificationEventPath || GAMIFICATION_EVENT_PATH });
    gamificationEventService = createEventService({ eventStore: gamificationEventStore });
    if (gamificationConfig.evaluation) {
      const definitions = validateAchievementDefinitions(require(options.gamificationAchievementPath || path.join(rootDir, "data", "gamification", "achievements.json")).definitions);
      const levels = require(options.gamificationLevelPath || path.join(rootDir, "data", "gamification", "levels.json")).levels;
      const configuredXpPolicies = validateXpPolicy(require(options.gamificationXpPolicyPath || path.join(rootDir, "data", "gamification", "xp-policy.json")));
      if (gamificationConfig.operations) {
        policyManager = createPolicyManager({ filePath: options.gamificationPolicyRegistryPath || path.join(DATA_DIR, "gamification", "policy-registry.json"), validate: validateXpPolicy,
          audit: (event) => auditLog.appendEvent({ ...event, source: "gamification-operations" }) });
        policyManager.seedPublished(configuredXpPolicies);
      }
      const policyProvider = () => policyManager ? validateXpPolicy({ schemaVersion: 1, policies: policyManager.allPublished() }) : configuredXpPolicies;
      const xpPolicies = policyProvider();
      const generationStore = createGamificationGenerationStore({ directory: options.gamificationGenerationDirectory || path.join(DATA_DIR, "gamification") });
      const { projectionStore, awardStore, ledgerStore } = generationStore;
      const levelService = createLevelService(levels);
      const xpPolicyService = createXpPolicyService(policyProvider);
      achievementService = createAchievementService({
        eventStore: gamificationEventStore,
        definitions,
        awardStore,
        ledgerStore,
        projectionService: createProjectionService({ projectionStore, levelService }),
        xpPolicyService,
        generationStore,
        policyVersions: () => policyProvider().map((policy) => policy.policyVersion)
      });
      if (gamificationConfig.readApi) gamificationReadService = createReadModelService({ eventStore: gamificationEventStore,
        projectionStore, ledgerStore, awardStore, achievementService, xpPolicies: policyProvider, xpPolicyService, definitions, levelService });
      if (gamificationReadService) memberGamificationService = createMemberExperienceService({ readModelService: gamificationReadService, definitions, levels });
      try { gamificationReadService ? gamificationReadService.replay("startup") : achievementService.replay(); } catch (error) {
        console.error("Gamification startup replay failed", { errorCode: "EVALUATION_FAILED" });
      }
      if (gamificationConfig.operations && gamificationReadService) {
        const replayStore = createReplayJobStore({ filePath: options.gamificationReplayPath || path.join(DATA_DIR, "gamification", "replay-jobs.json") });
        replayWorker = createReplayWorker({ store: replayStore, enabled: true, policyVersion: xpPolicies.at(-1)?.policyVersion || null,
          audit: (event) => auditLog.appendEvent({ ...event, source: "gamification-operations" }),
          execute: async (job, report, { assertCommitOwner }) => {
            report({ progressPercentage: 20, currentPhase: "evaluating" });
            const result = job.userId ? gamificationReadService.rebuild(job.userId, { assertCommitOwner }) : gamificationReadService.replay(job.replayType, { assertCommitOwner });
            const projections = result.projections || (result ? { [job.userId]: result } : {});
            report({ progressPercentage: 90, currentPhase: "persisting_projection" });
            return { eventsProcessed: gamificationEventStore.metrics().count, usersProcessed: Object.keys(projections).length, checksum: result.checksum || result.diagnostics?.projectionChecksum || null };
          } });
        gamificationPreflightService = createGamificationPreflightService({ dataDirectory: generationStore.directory, eventStore: gamificationEventStore,
          generationStore, replayStore, policyManager, readModelService: gamificationReadService });
      }
    }
  }
  trailContributionService = createTrailContributionService({ userStore, uploadDir:path.join(PUBLIC_DIR, "uploads", "trail-contributions"), eventService:gamificationEventService, onCommitted:()=>achievementService?.replay() });
  const notificationService = gamificationConfig.notifications && gamificationReadService
    ? createNotificationService({ filePath: options.notificationPath || path.join(DATA_DIR, "gamification", "notifications.json") }) : null;
  const leaderboardService = gamificationConfig.leaderboards && gamificationReadService
    ? createLeaderboardService({ readModelService: gamificationReadService, userStore }) : null;
  const workoutCompletedAdapter = gamificationConfig.eventCapture && gamificationConfig.sources.workoutCompleted
    ? (fact) => {
      const result = gamificationEventService.recordWorkoutCompleted(fact);
      if (achievementService) achievementService.replay();
      return result;
    }
    : null;
  challengeEngineService = createChallengeEngineService({ filePath: options.challengeEnginePath || path.join(DATA_DIR, "challenges", "runtime-v1.json"), onWorkoutCompleted: workoutCompletedAdapter });
  const sessionService = createSessionService({ userStore, workoutCompletedAdapter, onSessionCompleted: fact => {
    const completion=challengeEngineService.completeCommitmentWorkout(fact);
    if(completion?.comeback&&gamificationEventService)gamificationEventService.recordComebackCompleted({userId:fact.userId,session:completion.session});
    return completion;
  } });
  const yogaService = createYogaService({ userStore, poses: require("./data/yoga/poses.v1.json").poses, sessions: require("./data/yoga/sessions.v1.json").sessions, movementDefinitions: [require("./data/movements/warrior-ii.v1.json")], eventService: gamificationEventService, onCommitted:()=>achievementService?.replay() });
  const userDataService = createUserDataService({ userStore });
  const journeyIntakeService = createJourneyIntakeService({ userStore });
  const generatedWorkoutService = createGeneratedWorkoutService({ userStore, userDataService });
  const generatedWorkoutProgressionService = createGeneratedWorkoutProgressionService({ userStore });
  const trainingAdaptationService = createTrainingAdaptationService({ userStore });
  const personalizationService = createPersonalizationService({ journeyIntakeService });
  const nutritionService = createNutritionService({ userStore });
  const programPersistence = createProgramPersistence({ userStore });
  const programService = createProgramService({ persistence: programPersistence, eventAdapter: gamificationEventService ? (fact) => { const result=gamificationEventService.recordProgramEvent(fact); achievementService?.replay(); return result; } : null });
  const memberJourneyService = createMemberJourneyService({ filePath: path.join(OPS_DIR, "diagnostic-member.json"), userStore, memberGamificationService, programService, steppingService, challengeService });
  const memberExerciseService = createMemberExerciseService({ programService, userStore });
  const exerciseCurationService = createExerciseCurationService({ audit: event => auditLog.appendEvent({ ...event, source: "exercise-curation" }) });
  const coachContextService = createCoachContextService({ userStore, memberGamificationService, programService, challengeService });
  const aiCoachConfig = loadAiCoachConfig(options.env || process.env);
  const aiCoachProvider = options.aiCoachProvider || (aiCoachConfig.enabled ? createOpenAiCoachProvider({ config: aiCoachConfig, fetchImpl: options.fetch || global.fetch }) : null);
  const aiCoachService = createAiCoachService({ userStore, contextService: coachContextService, responder: options.aiCoachResponder, provider: aiCoachProvider, config: aiCoachConfig });
  const memberHomeService = createMemberHomeService({ journeyIntakeService, personalizationService, generatedWorkoutService, generatedWorkoutProgressionService, trainingAdaptationService, nutritionService, userDataService });
  const nutritionProviderClient = createProviderClient({
    fetchImpl: options.fetch || global.fetch,
    env: process.env
  });
  const membershipService = createMembershipService({
    userStore,
    stripeClient: options.stripeClient
  });
  const clientCrmService = createClientCrmService({ userStore, authCredentialStore, membershipService, trainerWorkspaceStore, messagingStore: clientMessagingStore, authorizationResolver });

  function hasOperatorBillingBypass(req) {
    const role = String(req.authz?.role || req.auth?.role || "").toLowerCase();
    return req.auth?.userId === "pilot_admin" || ["super_admin", "admin", "operator"].includes(role);
  }

  function requireMembershipEntitlement(req, _res, next) {
    if (String(process.env.NODE_ENV || "").toLowerCase() === "test" && process.env.MEMBERSHIP_GATE_TEST_ENFORCED !== "true") {
      req.membershipEntitlement = { hasAccess: true, bypass: true, reason: "test_environment_bypass" };
      return next();
    }
    if (hasOperatorBillingBypass(req)) {
      req.membershipEntitlement = { hasAccess: true, bypass: true, reason: "admin_operator_bypass" };
      return next();
    }
    const membership = membershipService.getMembership(req.auth.userId);
    if (membership.hasAccess) {
      req.membershipEntitlement = { hasAccess: true, bypass: false, membership };
      return next();
    }
    return _res.status(402).json({
      code: "membership_required",
      message: "Start your 7-day free trial to continue.",
      membershipUrl: "/membership.html"
    });
  }
  const tokenDenylist = createTokenDenylistStore({
    filePath: path.join(OPS_DIR, "token-denylist.json"),
    retentionMs: Number(process.env.AUTH_TOKEN_DENYLIST_RETENTION_MS || 1000 * 60 * 60 * 24 * 14)
  });
  const trustPolicyConfig = parseTrustPolicyConfig(process.env);
  const trustPolicy = summarizeTrustPolicy(trustPolicyConfig);
  const authTokenLib = createAuthTokenLib({
    secret: process.env.AUTH_TOKEN_SECRET || "dev-only-secret-change-me",
    secretSource: process.env.AUTH_TOKEN_SECRET ? "AUTH_TOKEN_SECRET" : "development_fallback",
    issuer: process.env.AUTH_TOKEN_ISSUER || "mufasa-fitness-node",
    audience: process.env.AUTH_TOKEN_AUDIENCE || null,
    isRevokedJti: (jti) => tokenDenylist.isRevoked(jti),
    minSecretLength: Number(process.env.AUTH_TOKEN_MIN_SECRET_LENGTH || 16),
    maxTtlMs: Number(process.env.AUTH_TOKEN_MAX_TTL_MS || 1000 * 60 * 60 * 24 * 14),
    clockSkewMs: Number(process.env.AUTH_TOKEN_CLOCK_SKEW_MS || 5000)
  });
  const authTokenMaxTtlMs = Number(process.env.AUTH_TOKEN_MAX_TTL_MS || 1000 * 60 * 60 * 24 * 14);
  const authSessionTtlMs = Math.min(Number(process.env.AUTH_TOKEN_SESSION_TTL_MS || 1000 * 60 * 60 * 8), authTokenMaxTtlMs);
  const authPersistentTtlMs = Math.min(Number(process.env.AUTH_TOKEN_PERSISTENT_TTL_MS || authTokenMaxTtlMs), authTokenMaxTtlMs);

  const startupWarnings = [];
  const strictStartupIssues = [];
  const strictStartupEnabled = process.env.CONTROL_PLANE_STRICT_STARTUP === "true";
  const preflight = runControlPlanePreflight({
    env: process.env,
    enforceableActions: ENFORCEABLE_ACTIONS,
    trustPolicy: trustPolicyConfig
  });
  const usingDefaultAuthSecret = !process.env.AUTH_TOKEN_SECRET || process.env.AUTH_TOKEN_SECRET === "dev-only-secret-change-me";
  if (usingDefaultAuthSecret) {
    startupWarnings.push("AUTH_TOKEN_SECRET is missing or default; authenticated writes are not production-safe.");
  } else if (String(process.env.AUTH_TOKEN_SECRET).length < 16) {
    startupWarnings.push("AUTH_TOKEN_SECRET is set but short; use at least 16 characters for pilot hardening.");
  }
  const legacyFallbackEnabled = process.env.LEGACY_FALLBACK_ENABLED !== "false";
  if (!legacyFallbackEnabled) {
    startupWarnings.push("LEGACY_FALLBACK_ENABLED=false; clients relying on /command fallback may fail.");
  }
  if (legacyFallbackEnabled && actionEnforcement.enforcedActions.length > 0) {
    startupWarnings.push(`Action-level /command enforcement active for: ${actionEnforcement.enforcedActions.join(", ")}`);
  }
  const authzWarnings = validateAuthorizationConfigShape(authorizationConfig);
  const enforcementWarnings = validateParsedEnforcementConfig(baseActionEnforcement, ENFORCEABLE_ACTIONS);
  const trustPolicyValidation = validateTrustPolicy(trustPolicyConfig);
  startupWarnings.push(...authzWarnings);
  startupWarnings.push(...enforcementWarnings);
  startupWarnings.push(...trustPolicyValidation.warnings);
  startupWarnings.push(...persistedOverrideState.warnings);
  if (persistedOverrideState.found && persistedOverrideState.loaded) {
    startupWarnings.push("Recovered persisted enforcement overrides from disk.");
  }
  if (authzWarnings.length > 0) {
    strictStartupIssues.push(`Authorization config warnings: ${authzWarnings.join(" | ")}`);
  }
  if (baseActionEnforcement.invalidActions.length > 0) {
    strictStartupIssues.push(
      `Invalid enforcement action names in LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS: ${baseActionEnforcement.invalidActions.join(", ")}`
    );
  }
  if (persistedOverrideState.found && !persistedOverrideState.loaded) {
    strictStartupIssues.push("Persisted enforcement overrides could not be loaded safely.");
  }
  strictStartupIssues.push(...trustPolicyValidation.issues);
  if (!String(process.env.PILOT_LOGIN_PASSWORD || "").trim()) {
    console.warn("[auth-login] PILOT_LOGIN_PASSWORD is not configured; /api/auth/login will return 503 until configured.");
  }
  if (startupWarnings.length) {
    for (const warning of startupWarnings) {
      console.warn("[startup-warning]", warning);
    }
  }
  if (strictStartupEnabled && strictStartupIssues.length > 0) {
    const alert = controlPlaneAlerts.emit(ALERT_TYPES.STRICT_STARTUP_FAILURE, {
      severity: "critical",
      issues: strictStartupIssues
    });
    writeObservability.trackControlPlaneAlert(alert.type, { issueCount: strictStartupIssues.length });
    const strictError = new Error("CONTROL_PLANE_STRICT_STARTUP is enabled and strict startup checks failed.");
    strictError.code = "STRICT_STARTUP_FAILED";
    strictError.issues = strictStartupIssues;
    throw strictError;
  }

  const issuedTokenFingerprints = new Map();
  const issuedTokenIdentifiers = new Map();
  const authRuntimeIdentity = Object.freeze({
    instance: String(process.env.RENDER_INSTANCE_ID || process.env.INSTANCE_ID || os.hostname()),
    hostname: os.hostname(),
    pid: process.pid,
    build: APP_BUILD_VERSION,
    commit: safeCommit(process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT),
    deployment: String(process.env.RENDER_DEPLOY_ID || process.env.DEPLOYMENT_ID || "NOT_CONFIGURED")
  });
  const authTraceConfiguration = Object.freeze({
    ...authTokenLib.configuration,
    audience: authTokenLib.configuration.audience || "NOT_CONFIGURED"
  });
  const authTrace = details => (options.logger || console).info("[auth-token-trace]", {
    timestamp: new Date().toISOString(),
    ...authRuntimeIdentity,
    uptimeSeconds: Math.floor(process.uptime()),
    ...details
  });
  function traceIssuance(result, requestId, endpoint = "/api/auth/login") {
    let verifiedClaims;
    try {
      verifiedClaims = authTokenLib.verify(result.token);
    } catch (error) {
      const verification = error?.details?.verification || {};
      authTrace({ event: "post_issuance_self_verification", endpoint, requestId, result: "FAIL", httpStatus: 500, reason: error?.details?.reason || "unknown_verification_failure", failureStage: verification.failureStage || "self_verification", issuedTokenFingerprint: result.fingerprint, selfVerifiedTokenFingerprint: verification.tokenFingerprint || result.fingerprint, compactToken: result.compact, signerKeyMaterial: authTokenLib.configuration.keyMaterial, verifierKeyMaterial: verification.verifierKeyMaterial || authTokenLib.configuration.keyMaterial });
      const internal = new Error(`JWT post-issuance self-verification failed at ${verification.failureStage || "self_verification"}`);
      internal.code = "JWT_SELF_VERIFICATION_FAILED";
      throw internal;
    }
    const selfVerifiedTokenFingerprint = authTokenLib.fingerprintToken(result.token);
    result.selfVerification = Object.freeze({
      result: "PASS", failureStage: null,
      issuedTokenFingerprint: result.fingerprint, selfVerifiedTokenFingerprint,
      fingerprintsIdentical: result.fingerprint === selfVerifiedTokenFingerprint,
      signingInputFingerprintsIdentical: true,
      issuedAlgorithm: result.compact.algorithm, verifiedAlgorithm: authTokenLib.configuration.algorithm,
      compactToken: result.compact,
      signerKeyMaterial: authTokenLib.configuration.keyMaterial,
      verifierKeyMaterial: authTokenLib.configuration.keyMaterial,
      signerLibrary: authTokenLib.configuration.library,
      verifierLibrary: authTokenLib.configuration.library,
      issuerRulesIdentical: verifiedClaims.iss === result.claims.iss && authTokenLib.configuration.issuer === result.claims.iss,
      audienceRulesIdentical: authTokenLib.configuration.audience == null ? result.claims.aud == null : authTokenLib.configuration.audience === result.claims.aud
    });
    if (issuedTokenFingerprints.size >= 1000) issuedTokenFingerprints.delete(issuedTokenFingerprints.keys().next().value);
    if (issuedTokenIdentifiers.size >= 1000) issuedTokenIdentifiers.delete(issuedTokenIdentifiers.keys().next().value);
    issuedTokenFingerprints.set(result.fingerprint, result.selfVerification);
    issuedTokenIdentifiers.set(result.jti, result.selfVerification);
    authTrace({ event: "issuance", endpoint, requestId, result: "PASS", httpStatus: 200, reason: null, loginSucceeded: endpoint === "/api/auth/login", authConfiguration: authTraceConfiguration, subjectClaimPresent: Boolean(result.claims.sub), roleClaimPresent: Boolean(result.claims.role), iatPresent: Number.isFinite(result.claims.iat), expPresent: Number.isFinite(result.claims.exp), expAfterIat: result.claims.exp > result.claims.iat, tokenFingerprint: result.fingerprint, selfVerification: result.selfVerification });
  }
  function publicAuthTrace(details = {}, requestId = null) {
    const issuance = details.tokenFingerprint ? (issuedTokenFingerprints.get(details.tokenFingerprint) || (details.tokenIdentifier ? issuedTokenIdentifiers.get(details.tokenIdentifier) : null)) : null;
    const receivedCompact = details.tokenFingerprint && details.receivedCompact ? details.receivedCompact : null;
    return {
      instance: authRuntimeIdentity.instance, build: authRuntimeIdentity.build,
      deployment: authRuntimeIdentity.deployment, requestId,
      serverTimestamp: new Date().toISOString(),
      keyFingerprint: authTraceConfiguration.keyFingerprint,
      issuerExpected: details.issuerExpected ?? authTraceConfiguration.issuer,
      issuerReceived: details.issuerReceived ?? null,
      audienceExpected: details.audienceExpected ?? authTokenLib.configuration.audience,
      audienceReceived: details.audienceReceived ?? null,
      tokenFingerprint: details.tokenFingerprint ?? null,
      tokenHandoff: details.tokenHandoff ?? null,
      authorizationHeaderPresent: details.authorizationHeaderPresent ?? null,
      signature: details.signature ?? "NOT_RUN", issuer: details.issuer ?? "NOT_RUN",
      audience: details.audience ?? "NOT_RUN", expiration: details.expiration ?? "NOT_RUN",
      subjectLookup: details.subjectLookup ?? "NOT_RUN", reason: details.reason ?? null,
      failureStage: details.failureStage ?? null,
      immediateSelfVerification: details.immediateSelfVerification ?? issuance?.result ?? null,
      issuedTokenFingerprint: issuance?.issuedTokenFingerprint ?? details.issuedTokenFingerprint ?? details.tokenFingerprint ?? null,
      selfVerifiedTokenFingerprint: issuance?.selfVerifiedTokenFingerprint ?? details.selfVerifiedTokenFingerprint ?? null,
      receivedTokenFingerprint: details.tokenFingerprint ?? null,
      fingerprintsIdentical: issuance && details.tokenFingerprint ? issuance.issuedTokenFingerprint === details.tokenFingerprint : null,
      signingInputFingerprintsIdentical: issuance && receivedCompact ? issuance.compactToken.signingInputFingerprint === receivedCompact.signingInputFingerprint : null,
      compactToken: receivedCompact || issuance?.compactToken || details.compactToken || null,
      issuedCompactToken: issuance?.compactToken || details.compactToken || null,
      signerKeyMaterial: issuance?.signerKeyMaterial || authTokenLib.configuration.keyMaterial,
      verifierKeyMaterial: details.verifierKeyMaterial || authTokenLib.configuration.keyMaterial,
      signerLibrary: issuance?.signerLibrary || authTokenLib.configuration.library,
      verifierLibrary: details.verifierLibrary || authTokenLib.configuration.library,
      algorithmConsistent: issuance && receivedCompact ? issuance.issuedAlgorithm === receivedCompact.algorithm && receivedCompact.algorithm === authTokenLib.configuration.algorithm : null,
      issuerRulesIdentical: issuance?.issuerRulesIdentical ?? null,
      audienceRulesIdentical: issuance?.audienceRulesIdentical ?? null,
      rootCause: issuance && details.tokenFingerprint !== issuance.issuedTokenFingerprint ? "TOKEN_MUTATED_BETWEEN_LOGIN_AND_VERIFICATION" : null
    };
  }
  app.use(authContext(authTokenLib, authorizationResolver, {
    publicTrace: (details, req) => {
      const receivedToken = details.tokenFingerprint ? req.get("authorization").replace(/^Bearer\s+/i, "") : null;
      let tokenIdentifier = null;
      try { tokenIdentifier = receivedToken ? JSON.parse(Buffer.from(receivedToken.split(".")[1], "base64url").toString("utf8"))?.jti ?? null : null; } catch (_) {}
      return publicAuthTrace({ ...details, tokenIdentifier, receivedCompact: receivedToken ? authTokenLib.compactDiagnostics(receivedToken) : null }, req.requestId);
    },
    trace(details) {
      authTrace({
        endpoint: "/api/auth/me",
        authConfiguration: authTraceConfiguration,
        result: details.httpStatus === 200 ? "PASS" : "FAIL",
        ...details,
        fingerprintIssuedByThisProcess: details.tokenFingerprint
          ? (issuedTokenFingerprints.has(details.tokenFingerprint) ? "YES" : "NO")
          : "NOT_AVAILABLE"
      });
    },
    pilotBypass: disableLoginForPilot
      ? {
        enabled: true,
        runtimeAllowed: pilotBypassRuntimeAllowed,
        userId: "pilot_admin",
        name: "Rashad Harbour",
        email: "RDHForeclosureConquer@gmail.com",
        role: "super_admin",
        roles: ["super_admin", "admin", "operator", "trainer", "client"]
      }
      : { enabled: false }
  }));
  const trackAdminOpsAuthorizationDecision = ({ req, permission, allowed, reason }) => {
    writeObservability.trackAdminOpsAuthorization({
      permission,
      allowed,
      role: req.authz?.role || "user",
      isBootstrapSuperAdmin: Boolean(req.authz?.isBootstrapSuperAdmin),
      reason
    });
    if (permission === authorizationResolver.PERMISSIONS.OPS_MANAGE_ENFORCEMENT || permission === authorizationResolver.PERMISSIONS.OPS_READ_AUTHZ) {
      auditLog.appendEvent({
        category: "authorization",
        action: "ops_permission_check",
        status: allowed ? "allowed" : "denied",
        permission,
        actor: summarizeActor(req),
        reason
      });
    }
    if (allowed && req.authz?.resolutionReason === "admin_email_allowlist") {
      console.info("[authz] admin allowlist access granted", {
        email: req.auth?.email || null,
        permission,
        endpoint: req.originalUrl || req.path || null
      });
    }
  };

  function currentEnforcementView() {
    return {
      configuredDefaults: baseActionEnforcement.enabledByAction,
      persistedOverrides: persistedOverrideState.loaded ? persistedOverrideState.overrides : {},
      persistedVersion: Number.isInteger(persistedOverrideState.version) ? persistedOverrideState.version : 0,
      runtimeOverrides: { ...runtimeEnforcementOverrides },
      effective: actionEnforcement
    };
  }

  function isSuperAdmin(req) {
    return req?.authz?.role === "super_admin";
  }

  function requireSuperAdmin(req) {
    if (isSuperAdmin(req)) return;
    throw new ApiError("FORBIDDEN", "Break-glass operations require super_admin role", 403);
  }

  app.use((req, res, next) => {
    const action = mapRouteAction(req);
    if (!action) return next();

    const isLegacy = req.path === "/command";
    res.on("finish", () => {
      const status = res.statusCode;
      const succeeded = status >= 200 && status < 400;
      if (isLegacy && req.legacyFallbackBlockedAction) {
        const reason = req.legacyFallbackBlockedReason || "fallback_blocked_by_action";
        writeObservability.trackLegacyFallbackBlocked(req.legacyFallbackBlockedAction, reason);
      } else if (isLegacy) {
        const reason = req.body?.payload?._fallback?.reason || req.get("x-fallback-reason") || "legacy_direct";
        writeObservability.trackLegacyFallback(action, reason);
      } else {
        writeObservability.trackExplicit(action, succeeded);
      }

      if (succeeded) {
        console.info("[write-route]", {
          requestId: req.requestId,
          route: req.path,
          action,
          mode: isLegacy ? "legacy_fallback" : "explicit_api",
          status
        });
      } else {
        console.warn("[write-route-failure]", {
          requestId: req.requestId,
          route: req.path,
          action,
          mode: isLegacy ? "legacy_fallback" : "explicit_api",
          status
        });
      }
    });
    next();
  });

  // ---- Static hosting ----
  const CANONICAL_SHELL_PATH = path.join(PUBLIC_DIR, "index.html");
  const SHELL_NO_STORE_HEADERS = Object.freeze({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store"
  });
  app.get("/", (req, res) => {
    if (req.query?.v !== INDEX_CACHE_BUST_TOKEN) {
      return res.redirect(302, `/?v=${INDEX_CACHE_BUST_TOKEN}`);
    }
    res.set(SHELL_NO_STORE_HEADERS);
    res.set("X-App-Build-Version", APP_BUILD_VERSION);
    res.type("html").send(
      fs.readFileSync(CANONICAL_SHELL_PATH, "utf8")
        .replace(/__ENABLE_AVATAR_FEATURE__/g, avatarFeatureEnabled ? "true" : "false")
    );
  });
  app.get("/workout.html", (_req, res) => {
    res.set(SHELL_NO_STORE_HEADERS);
    res.set("X-App-Build-Version", APP_BUILD_VERSION);
    res.type("html").send(
      fs.readFileSync(path.join(PUBLIC_DIR, "workout.html"), "utf8")
        .replace(/__ENABLE_AVATAR_FEATURE__/g, avatarFeatureEnabled ? "true" : "false")
    );
  });
  app.get("/dashboard.html", (_req, res) => {
    res.set(SHELL_NO_STORE_HEADERS);
    res.sendFile(path.join(PUBLIC_DIR, "dashboard.html"));
  });
  app.get("/exercise-library.html", (_req, res) => {
    res.set(SHELL_NO_STORE_HEADERS);
    res.sendFile(path.join(PUBLIC_DIR, "exercise-library.html"));
  });
  app.get("/nutrition.html", (_req, res) => {
    res.set(SHELL_NO_STORE_HEADERS);
    res.sendFile(path.join(PUBLIC_DIR, "nutrition.html"));
  });
  app.get("/pocketpt/my-program", (_req, res) => {
    res.set(SHELL_NO_STORE_HEADERS);
    res.sendFile(path.join(PUBLIC_DIR, "pocketpt-my-program.html"));
  });
  app.get("/integrations/garvey/launch", createGarveyLaunchHandler({ env, now: options.garveyLaunchNow }));

  const youthResult = (res, req, data, status = 200) => res.status(status).json({ ok: true, requestId: req.requestId, data });
  const youthHandler = (handler) => asyncHandler(async (req, res) => {
    try { return handler(req, res); }
    catch (error) { throw new ApiError(error.message === "program_not_found" ? "YOUTH_PROGRAM_NOT_FOUND" : "YOUTH_PROGRAM_REQUEST_INVALID", error.message, error.status || 422, error.details); }
  });
  const youthOwned = (value) => {
    if (!value) throw Object.assign(new Error("session_not_found"), { status: 404 });
    return value;
  };
  app.get("/api/me/youth-fitness/csrf", requireAuth, (req, res) => {
    const token = youthCsrf.issue(req.auth.userId);
    res.setHeader("Set-Cookie", `${youthCsrf.COOKIE}=${encodeURIComponent(token)}; Path=/api/me/youth-fitness; SameSite=Strict; Secure; Max-Age=1800`);
    return youthResult(res, req, { token, header: youthCsrf.HEADER, cookie: youthCsrf.COOKIE });
  });
  app.post("/api/me/youth-fitness/program/enroll", requireAuth, youthCsrf.requireToken, youthHandler((req, res) => youthResult(res, req, youthProgramService.enrollment(req.auth.userId, req.body || {}), 201)));
  app.get("/api/me/youth-fitness/program", requireAuth, youthHandler((req, res) => youthResult(res, req, youthProgramService.dashboard(req.auth.userId))));
  app.post("/api/me/youth-fitness/sessions/:sessionRef/start", requireAuth, youthCsrf.requireToken, youthHandler((req, res) => youthResult(res, req, youthOwned(youthProgramService.start(req.auth.userId, req.params.sessionRef)), 201)));
  app.get("/api/me/youth-fitness/sessions/:sessionRef", requireAuth, youthHandler((req, res) => youthResult(res, req, youthOwned(youthProgramService.view(req.auth.userId, req.params.sessionRef)))));
  app.put("/api/me/youth-fitness/sessions/:sessionRef/readiness", requireAuth, youthCsrf.requireToken, youthHandler((req, res) => youthResult(res, req, youthOwned(youthProgramService.readiness(req.auth.userId, req.params.sessionRef, req.body || {})))));
  app.put("/api/me/youth-fitness/sessions/:sessionRef/activities/:activityId", requireAuth, youthCsrf.requireToken, youthHandler((req, res) => youthResult(res, req, youthOwned(youthProgramService.recordActivity(req.auth.userId, req.params.sessionRef, req.params.activityId, req.body || {})))));
  app.post("/api/me/youth-fitness/sessions/:sessionRef/activities/:activityId/stop", requireAuth, youthCsrf.requireToken, youthHandler((req, res) => youthResult(res, req, youthOwned(youthProgramService.stopActivity(req.auth.userId, req.params.sessionRef, req.params.activityId, req.body || {})))));
  app.post("/api/me/youth-fitness/sessions/:sessionRef/finish", requireAuth, youthCsrf.requireToken, youthHandler((req, res) => youthResult(res, req, youthOwned(youthProgramService.finish(req.auth.userId, req.params.sessionRef, req.body || {})))));
  app.get("/avatar-runtime.js", (req, res, next) => {
    if (avatarFeatureEnabled) return next();
    console.info("[avatar-runtime] disabled", { requestId: req.requestId || null });
    return fail(res, req.requestId || "unknown", {
      code: "FEATURE_DISABLED",
      message: AVATAR_FEATURE_DISABLED_MESSAGE
    }, 404);
  });
  app.get("/__version", (req, res) => {
    console.info("[version]", { requestId: req.requestId, route: req.path });
    res.set(SHELL_NO_STORE_HEADERS);
    return res.json({
      schemaVersion: 1,
      service: "backend",
      build: APP_BUILD_VERSION,
      commit: safeCommit(process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT),
      assetCacheToken: INDEX_CACHE_BUST_TOKEN,
      loginDisabledForPilot: disableLoginForPilot,
      loginRemovedForPilot: disableLoginForPilot,
      pilotSuperAdminActive: disableLoginForPilot,
      authGateDisabled: disableLoginForPilot,
      superAdminActive: disableLoginForPilot,
      allFeatureGatesBypassed: disableLoginForPilot,
      avatarFeatureEnabled
    });
  });
  app.get("/__frontend-version.json", (_req, res) => {
    let manifest; try { manifest=readJSON(path.join(PUBLIC_DIR, "__frontend-version.json")); } catch { res.set(SHELL_NO_STORE_HEADERS); return res.status(503).json({schemaVersion:1,service:"frontend",build:null,commit:null,assetCacheToken:null,error:"VERSION_EVIDENCE_UNAVAILABLE"}); }
    res.set(SHELL_NO_STORE_HEADERS);
    res.set("X-App-Build-Version", manifest.build);
    res.set("X-Asset-Cache-Token", manifest.assetCacheToken || INDEX_CACHE_BUST_TOKEN);
    return res.json({ schemaVersion:1, service:"frontend", build:manifest.build, commit:/^[a-f0-9]{7,40}$/i.test(String(manifest.commit||""))?manifest.commit:null, assetCacheToken:manifest.assetCacheToken || null, generatedAt:manifest.timestamp || null });
  });
  app.get("/__diagnostic-smoke", (req, res) => {
    console.info("[diagnostic-smoke]", { requestId: req.requestId, route: req.path });
    res.set(SHELL_NO_STORE_HEADERS);
    return res.json({
      ok: true,
      build: APP_BUILD_VERSION,
      diagnostics: true,
      loginDisabledForPilot: disableLoginForPilot,
      loginRemovedForPilot: disableLoginForPilot,
      pilotSuperAdminActive: disableLoginForPilot,
      authGateDisabled: disableLoginForPilot,
      superAdminActive: disableLoginForPilot,
      allFeatureGatesBypassed: disableLoginForPilot,
      avatarFeatureEnabled
    });
  });
  // ---- Helpers ----
  function readJSON(p) {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  }

  function writeJSON(p, obj) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  }

  function appendPilotEvent(event) {
    try {
      fs.mkdirSync(path.dirname(PILOT_EVENT_LOG_PATH), { recursive: true });
      fs.appendFileSync(PILOT_EVENT_LOG_PATH, `${JSON.stringify(event)}\n`);
    } catch (error) {
      console.warn("[pilot-events] append failed", { message: error?.message || String(error) });
    }
  }

  async function parseAvatarMultipartUpload(req, maxBytes) {
    const contentType = String(req.headers["content-type"] || "");
    const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
    if (!contentType.toLowerCase().startsWith("multipart/form-data") || !boundaryMatch) {
      throw new ApiError("VALIDATION_ERROR", "Content-Type must be multipart/form-data", 400);
    }
    const boundary = `--${boundaryMatch[1].trim()}`;
    const chunks = [];
    let size = 0;
    await new Promise((resolve, reject) => {
      req.on("data", (chunk) => {
        size += chunk.length;
        if (size > maxBytes) {
          reject(new ApiError("VALIDATION_ERROR", "Avatar file exceeds size limit", 400));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", resolve);
      req.on("error", reject);
    });

    const bodyBuffer = Buffer.concat(chunks);
    const body = bodyBuffer.toString("binary");
    const nameMarker = `name="${avatarUploadContract.field}"`;
    const fieldIndex = body.indexOf(nameMarker);
    if (fieldIndex === -1) {
      throw new ApiError("AVATAR_FILE_MISSING", "Missing avatar file upload", 400);
    }

    const headerStart = body.lastIndexOf(boundary, fieldIndex);
    const dataStart = body.indexOf("\r\n\r\n", fieldIndex);
    if (headerStart === -1 || dataStart === -1) {
      throw new ApiError("VALIDATION_ERROR", "Invalid multipart avatar payload", 400);
    }
    const headerSection = body.slice(headerStart, dataStart);
    const filenameMatch = headerSection.match(/filename="([^"]+)"/i);
    const originalName = filenameMatch?.[1] || "";
    const ext = path.extname(originalName).toLowerCase();
    if (ext !== ".glb") {
      throw new ApiError("VALIDATION_ERROR", "Only .glb avatar files are allowed", 400);
    }

    const nextBoundaryIndex = body.indexOf(`\r\n${boundary}`, dataStart + 4);
    if (nextBoundaryIndex === -1) {
      throw new ApiError("VALIDATION_ERROR", "Invalid multipart avatar payload", 400);
    }
    const fileStart = dataStart + 4;
    const fileEnd = nextBoundaryIndex;
    if (fileEnd <= fileStart) {
      throw new ApiError("VALIDATION_ERROR", "Avatar upload is empty", 400);
    }
    const fileBuffer = bodyBuffer.slice(fileStart, fileEnd);
    return { fileBuffer, originalName };
  }

  function avatarAssetId(value) {
    const id = String(value || "").replace(/\.glb$/i, "");
    if (!/^[a-f0-9-]{16,64}$/i.test(id)) throw new ApiError("AVATAR_ASSET_NOT_FOUND", "Avatar asset not found", 404);
    return id;
  }
  function avatarAssetPaths(value) { const id = avatarAssetId(value); return { id, glb: path.join(AVATAR_UPLOAD_DIR, `${id}.glb`), metadata: path.join(AVATAR_UPLOAD_DIR, `${id}.json`) }; }
  function profileOwnsLegacyAvatar(userId, fileName) {
    const modelUrl = userStore.loadUser(userId)?.profile?.avatar?.avatarModelUrl; if (!modelUrl) return false;
    try { const pathname = new URL(String(modelUrl), "https://pocketpt.invalid").pathname; return pathname === `/uploads/avatars/${fileName}` || pathname === `/api/me/avatar/assets/${fileName.replace(/\.glb$/i, "")}`; }
    catch (_) { return false; }
  }
  function requireOwnedAvatarAsset(req) {
    const paths = avatarAssetPaths(req.params.assetId || req.params.fileName);
    if (!fs.existsSync(paths.glb)) throw new ApiError("AVATAR_ASSET_NOT_FOUND", "Avatar asset not found", 404);
    let owned = false;
    if (fs.existsSync(paths.metadata)) { try { owned = readJSON(paths.metadata)?.ownerUserId === req.auth.userId; } catch (_) { owned = false; } }
    else { owned = profileOwnsLegacyAvatar(req.auth.userId, `${paths.id}.glb`); if (owned) writeJSON(paths.metadata, { assetId: paths.id, ownerUserId: req.auth.userId, migratedAt: new Date().toISOString() }); }
    if (!owned) throw new ApiError("AVATAR_ASSET_NOT_FOUND", "Avatar asset not found", 404);
    return paths;
  }

  function loadExerciseIndex() {
    if (!fs.existsSync(EX_INDEX_PATH)) return null;
    try {
      return readJSON(EX_INDEX_PATH);
    } catch {
      return null;
    }
  }

  function normalizeExerciseIndexList(index) {
    if (Array.isArray(index)) return index;
    if (Array.isArray(index?.exercises)) return index.exercises;
    return [];
  }

  function exerciseSearchText(exercise) {
    return [
      exercise?.name,
      exercise?.id,
      exercise?.slug,
      exercise?.category,
      exercise?.equipment,
      exercise?.target,
      ...(Array.isArray(exercise?.primaryMuscles) ? exercise.primaryMuscles : []),
      ...(Array.isArray(exercise?.secondaryMuscles) ? exercise.secondaryMuscles : [])
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function findExerciseBySlug(index, slug) {
    const requested = String(slug || "");
    const list = normalizeExerciseIndexList(index);
    return list.find(x => x.slug === requested || x.id === requested) || null;
  }

  // ---- Health ----
  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "mufasa-fitness-node",
      hasExerciseIndex: fs.existsSync(EX_INDEX_PATH),
      authConfigured: !usingDefaultAuthSecret,
      legacyFallbackEnabled,
      trustPolicy,
      tokenRevocation: tokenDenylist.stats(),
      actionFallbackEnforcement: currentEnforcementView(),
      authorization: authorizationResolver.describe(),
      persistedOverrideRecovery: {
        found: persistedOverrideState.found,
        loaded: persistedOverrideState.loaded,
        version: Number.isInteger(persistedOverrideState.version) ? persistedOverrideState.version : 0,
        warnings: persistedOverrideState.warnings
      },
      strictStartup: {
        enabled: strictStartupEnabled,
        passed: strictStartupIssues.length === 0,
        issues: strictStartupIssues
      },
      preflight,
      adminAudit: auditLog.recentSummary(10),
      degraded: startupWarnings.length > 0,
      startupWarnings,
      time: new Date().toISOString()
    });
  });

  if (memberGamificationService) {
    app.get("/api/me/gamification", requireAuth, (req, res) => {
      res.set("Cache-Control", "private, no-store");
      return ok(res, req.requestId, memberGamificationService.get(req.auth.userId));
    });
  }

  if (notificationService) {
    const projectNotifications = (memberId) => { try { notificationService.ingestFacts(gamificationReadService?.notificationFacts?.(memberId) || []); } catch (error) { console.error("Notification projection failed", { errorCode: "NOTIFICATION_PROJECTION_FAILED" }); } };
    app.get("/api/me/notifications", requireAuth, notificationLimit, (req, res) => { projectNotifications(req.auth.userId); res.set("Cache-Control", "private, no-store"); return ok(res, req.requestId, notificationService.list(req.auth.userId, req.query)); });
    app.get("/api/me/notifications/unread-count", requireAuth, notificationLimit, (req, res) => { projectNotifications(req.auth.userId); res.set("Cache-Control", "private, no-store"); return ok(res, req.requestId, { unreadCount: notificationService.unreadCount(req.auth.userId) }); });
    app.post("/api/me/notifications/:notificationId/read", requireAuth, notificationLimit, (req, res) => { const result = notificationService.markRead(req.auth.userId, req.params.notificationId); if (!result) throw new ApiError("NOTIFICATION_NOT_FOUND", "Notification not found", 404); return ok(res, req.requestId, result); });
    app.post("/api/me/notifications/read-all", requireAuth, notificationLimit, (req, res) => ok(res, req.requestId, notificationService.readAll(req.auth.userId)));
    app.post("/api/me/notifications/:notificationId/dismiss", requireAuth, notificationLimit, (req, res) => { const result = notificationService.dismiss(req.auth.userId, req.params.notificationId); if (!result) throw new ApiError("NOTIFICATION_NOT_FOUND", "Notification not found", 404); return ok(res, req.requestId, result); });
  }
  if (leaderboardService) {
    app.get("/api/me/leaderboards", requireAuth, leaderboardLimit, (req, res) => ok(res, req.requestId, { leaderboards: leaderboardService.definitions(), preferences: leaderboardService.preferences(req.auth.userId) }));
    app.get("/api/me/leaderboards/:leaderboardId", requireAuth, leaderboardLimit, (req, res) => { const result = leaderboardService.calculate(req.auth.userId, req.params.leaderboardId, req.query); if (!result) throw new ApiError("LEADERBOARD_NOT_FOUND", "Leaderboard not found", 404); res.set("Cache-Control", "private, no-store"); return ok(res, req.requestId, result); });
    app.get("/api/me/leaderboards/:leaderboardId/position", requireAuth, leaderboardLimit, (req, res) => { const result = leaderboardService.calculate(req.auth.userId, req.params.leaderboardId, { limit: 1 }); if (!result) throw new ApiError("LEADERBOARD_NOT_FOUND", "Leaderboard not found", 404); return ok(res, req.requestId, { leaderboardId: result.leaderboardId, position: result.selfPosition }); });
    app.put("/api/me/leaderboard-preferences", requireAuth, leaderboardLimit, (req, res) => ok(res, req.requestId, leaderboardService.updatePreferences(req.auth.userId, req.body || {})));
  }
  app.post("/api/me/client-diagnostics", requireAuth, clientEvidenceLimit, (req, res) => {
    const record = clientEvidenceService.report(req.body || {});
    if (!record) throw new ApiError("INVALID_CLIENT_DIAGNOSTIC", "Client diagnostic report is invalid", 422);
    latestLaunchHealth = null;
    return ok(res, req.requestId, { accepted: true, capability: record.capability }, 202);
  });

  if (gamificationReadService) {
    const internalGuard = requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.OPS_READ_OBSERVABILITY, trackAdminOpsAuthorizationDecision);
    const mutationGuard = requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.GAMIFICATION_OPERATIONS_MANAGE, trackAdminOpsAuthorizationDecision);
    const userId = (req) => {
      if (!validUserId(req.params.id)) throw new ApiError("INVALID_USER_ID", "A valid user id is required", 422);
      return req.params.id;
    };
    const found = (value) => { if (!value) throw new ApiError("PROJECTION_NOT_FOUND", "Gamification projection not found", 404); return value; };
    app.get("/internal/gamification/profile/:id", internalGuard, (req, res) => ok(res, req.requestId, found(gamificationReadService.profile(userId(req)))));
    app.get("/internal/gamification/xp/:id", internalGuard, (req, res) => { const p = found(gamificationReadService.profile(userId(req))); return ok(res, req.requestId, { currentXp: p.currentXp, lifetimeXp: p.lifetimeXp, currentLevel: p.currentLevel, highestLevel: p.highestLevel, ledgerSummary: p.xpLedgerSummary }); });
    app.get("/internal/gamification/achievements/:id", internalGuard, (req, res) => { const p = found(gamificationReadService.profile(userId(req))); return ok(res, req.requestId, { achievements: p.achievements, earned: p.earnedAchievements, hidden: p.hiddenAchievements, revoked: p.revokedAchievements }); });
    app.get("/internal/gamification/ledger/:id", internalGuard, (req, res) => ok(res, req.requestId, { entries: gamificationReadService.ledger(userId(req)) }));
    app.get("/internal/gamification/replay/status", internalGuard, (req, res) => ok(res, req.requestId, gamificationReadService.status()));
    app.get("/internal/gamification/replay/history", internalGuard, (req, res) => ok(res, req.requestId, { history: gamificationReadService.history() }));
    app.get("/internal/gamification/policy/current", internalGuard, (req, res) => ok(res, req.requestId, gamificationReadService.currentPolicy()));
    app.get("/internal/gamification/integrity", internalGuard, (req, res) => ok(res, req.requestId, gamificationReadService.verify()));
    app.get("/internal/gamification/metrics", internalGuard, (req, res) => ok(res, req.requestId, gamificationReadService.analytics()));
    app.post("/internal/gamification/simulate", internalGuard, (req, res) => {
      try { return ok(res, req.requestId, gamificationReadService.simulate(req.body || {})); }
      catch (error) { throw new ApiError("INVALID_SIMULATION", error.message, 422); }
    });
    app.post("/internal/gamification/replay/all", mutationGuard, (req, res) => ok(res, req.requestId, gamificationReadService.replay().diagnostics));
    app.post("/internal/gamification/replay/:id", mutationGuard, (req, res) => ok(res, req.requestId, found(gamificationReadService.rebuild(userId(req)))));
    app.post("/internal/gamification/recalculate/xp/:id", mutationGuard, (req, res) => ok(res, req.requestId, found(gamificationReadService.rebuild(userId(req)))));
    app.post("/internal/gamification/recalculate/achievements/:id", mutationGuard, (req, res) => ok(res, req.requestId, found(gamificationReadService.rebuild(userId(req)))));
    app.delete("/internal/gamification/projection/:id", mutationGuard, (req, res) => ok(res, req.requestId, { deleted: gamificationReadService.deleteProjection(userId(req)) }));
  }

  if (replayWorker && policyManager) {
    const internalGuard = requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.OPS_READ_OBSERVABILITY, trackAdminOpsAuthorizationDecision);
    const mutationGuard = requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.GAMIFICATION_OPERATIONS_MANAGE, trackAdminOpsAuthorizationDecision);
    const enqueue = (type) => (req, res) => {
      try { return ok(res.status(202), req.requestId, replayWorker.enqueue({ type, userId: req.params.id || req.body?.userId || null, initiatedBy: req.auth?.userId || "internal-admin" })); }
      catch (error) { throw new ApiError(error.code || "INVALID_REPLAY", error.message, error.code === "DUPLICATE_REPLAY" ? 409 : 422); }
    };
    app.get("/internal/gamification/operations/replay/queue", internalGuard, (_req, res) => res.json({ ok: true, jobs: replayWorker.jobs() }));
    app.get("/internal/gamification/operations/replay/history", internalGuard, (_req, res) => res.json({ ok: true, history: replayWorker.history() }));
    app.get("/internal/gamification/operations/replay/:jobId", internalGuard, (req, res) => ok(res, req.requestId, replayWorker.progress(req.params.jobId)));
    app.post("/internal/gamification/operations/replay/all", mutationGuard, enqueue("replay_all"));
    app.post("/internal/gamification/operations/replay/user/:id", mutationGuard, enqueue("replay_user"));
    app.post("/internal/gamification/operations/projection/rebuild", mutationGuard, enqueue("rebuild_projection"));
    app.post("/internal/gamification/operations/recalculate/xp", mutationGuard, enqueue("recalculate_xp"));
    app.post("/internal/gamification/operations/recalculate/achievements", mutationGuard, enqueue("recalculate_achievements"));
    app.post("/internal/gamification/operations/replay/schedule", mutationGuard, (req, res) => { try { return ok(res.status(202), req.requestId, replayWorker.schedule({ ...(req.body || {}), initiatedBy: req.auth?.userId || "internal-admin" })); } catch (error) { throw new ApiError("INVALID_SCHEDULE", error.message, 422); } });
    app.post("/internal/gamification/operations/replay/:jobId/cancel", mutationGuard, (req, res) => ok(res, req.requestId, replayWorker.cancel(req.params.jobId)));
    app.get("/internal/gamification/operations/policies", internalGuard, (_req, res) => res.json({ ok: true, policies: policyManager.list() }));
    app.get("/internal/gamification/operations/policies/:version", internalGuard, (req, res) => ok(res, req.requestId, policyManager.inspect(req.params.version)));
    const policyMutation = (operation, successStatus = 200) => (req, res) => { try { const result = operation(req); auditLog.appendEvent({ action: "gamification.policy.admin_mutation", actor: summarizeActor(req), requestId: req.requestId, policyVersion: req.params.version || req.body?.policyVersion }); return ok(res.status(successStatus), req.requestId, result); } catch (error) { throw new ApiError("INVALID_POLICY_OPERATION", error.message, 422); } };
    app.post("/internal/gamification/operations/policies", mutationGuard, policyMutation((req) => policyManager.create(req.body || {}), 201));
    app.post("/internal/gamification/operations/policies/:version/validate", mutationGuard, policyMutation((req) => policyManager.validate(req.params.version)));
    app.post("/internal/gamification/operations/policies/:version/publish", mutationGuard, policyMutation((req) => policyManager.publish(req.params.version)));
    app.post("/internal/gamification/operations/policies/:version/archive", mutationGuard, policyMutation((req) => policyManager.archive(req.params.version)));
    app.get("/internal/gamification/operations/integrity", internalGuard, (req, res) => { const report = gamificationReadService.verify(); replayWorker.recordIntegrityResult(report.valid); return ok(res, req.requestId, report); });
    app.get("/internal/gamification/operations/metrics", internalGuard, (_req, res) => res.json({ ok: true, metrics: { ...replayWorker.metrics(), ...policyManager.metrics() } }));
    app.get("/internal/gamification/operations/readiness", internalGuard, (req, res) => {
      const auditIntegrity = auditLog.verifyFullChain(); const publishedPolicies = policyManager.allPublished(); const metrics = replayWorker.metrics();
      const preflight = gamificationPreflightService.check();
      const ready = metrics.workerActive && publishedPolicies.length > 0 && auditIntegrity.verified && preflight.ready;
      return ok(res.status(ready ? 200 : 503), req.requestId, { ready, worker: { active: metrics.workerActive, instanceId: metrics.workerInstanceId, activeLease: metrics.activeLease }, preflight, policies: { published: publishedPolicies.length }, audit: { verified: auditIntegrity.verified, issueCount: auditIntegrity.issueCount } });
    });
  }

  app.post(
    "/api/admin/diagnostics/report",
    requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.OPS_READ_OBSERVABILITY, trackAdminOpsAuthorizationDecision),
    asyncHandler(async (req, res) => {
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const routeCheck = await runRouteDiagnostics({
      baseUrl: resolveRequestOrigin(req) || process.env.BASE_URL || "http://127.0.0.1:3000",
      rootDir
    });
    const summaryResult = process.env.DIAGNOSTIC_SUMMARIZER_ENABLED === "true" ? await summarizeDiagnosticWithOpenAI({
      expectedSystems: [
        "deployment", "environment", "storage", "program", "workout", "exercise_intelligence",
        "yoga", "gamification", "notifications", "leaderboards", "ai_coach", "stripe"
      ],
      buildVersion: payload?.build?.appBuildVersion || APP_BUILD_VERSION,
      diagnosticReport: {
        avatarEnabled: payload?.features?.avatarEnabled === true,
        cameraStatus: ["ready", "unavailable", "denied", "unknown"].includes(payload?.runtime?.cameraStatus) ? payload.runtime.cameraStatus : "unknown",
        formEnginePresent: Boolean(payload?.runtime?.formEngineStatus),
        sessionSaveSuccess: payload?.runtime?.sessionSaveSuccess === true
      },
      routeCheckResults: { passCount: routeCheck.passCount, protectedCount: routeCheck.protectedCount, failCount: routeCheck.failCount },
      recentErrors: null
    }, { model:process.env.DIAGNOSTIC_SUMMARIZER_MODEL || process.env.OPENAI_DIAGNOSTIC_MODEL }) : { status:"disabled",aiSummaryStatus:"disabled",summary:null,errorType:null,errorMessage:null,httpStatus:null,model:process.env.DIAGNOSTIC_SUMMARIZER_MODEL || process.env.OPENAI_DIAGNOSTIC_MODEL || null,endpoint:null,rawResponsePreview:null,apiKeyPresent:Boolean(process.env.OPENAI_API_KEY),latencyMs:null,parseFailureCount:0,fallbackUsed:false };

    const pilotReadiness = evaluatePilotReadiness({
      payload,
      routeCheck,
      openAiSummaryStatus: summaryResult.status,
      openAiSummary: summaryResult.summary
    });
    latestLaunchHealth = buildLaunchHealth({ env: process.env, rootDir, dataDir: DATA_DIR, frontendBuild: payload?.build?.appBuildVersion || payload?.build?.frontendBuild, backendBuild: APP_BUILD_VERSION, assetCacheToken:payload?.build?.assetCacheToken || null, expectedAssetCacheToken:INDEX_CACHE_BUST_TOKEN, memberEvidence:memberJourneyService.inspect(), implementations:{notifications:notificationService?.health(),leaderboards:leaderboardService?.health(),clientEvidence:clientEvidenceService.latest(),externalChecks:latestExternalChecks} });

    const report = diagnosticStore.createReport({
      buildVersion: payload?.build?.appBuildVersion || APP_BUILD_VERSION,
      route: payload?.build?.url || req.originalUrl,
      source: payload?.source || "browser",
      payload,
      openAiSummaryStatus: summaryResult.status,
      openAiSummary: summaryResult.summary,
      openAiErrorType: summaryResult.errorType || null,
      openAiErrorMessage: summaryResult.errorMessage || null,
      openAiHttpStatus: Number.isInteger(summaryResult.httpStatus) ? summaryResult.httpStatus : null,
      openAiModel: summaryResult.model || null,
      openAiEndpoint: summaryResult.endpoint || null,
      openAiRawResponsePreview: summaryResult.rawResponsePreview || null,
      openAiApiKeyMissing: !summaryResult.apiKeyPresent,
      routeCheck,
      pilotReadiness
    });
    report.launchHealth = latestLaunchHealth;
    report.aiSummaryStatus = summaryResult.aiSummaryStatus || (summaryResult.status === "ok" ? "valid" : "fallback");
    report.aiProviderLatencyMs = summaryResult.latencyMs ?? null;
    report.aiParseFailureCount = summaryResult.parseFailureCount || 0;
    report.aiFallbackUsed = summaryResult.fallbackUsed === true;
    diagnosticStore.append(report);
    return ok(res, req.requestId, report, 201);
    })
  );

  const diagnosticGuard = requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.OPS_READ_OBSERVABILITY, trackAdminOpsAuthorizationDecision);
  function motionLabCookieOptions() {
    // Phase E retains its stable /motion asset contract, so / is the narrowest
    // cookie path that covers both the /dev shell and those protected files.
    return { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax", path: "/" };
  }
  const motionLabDiagnosticLog = details => (options.logger || console).info("[motion-lab-auth]", details);
  function diagnoseMotionLabSession(req) {
    const cookieHeader = String(req.get("cookie") || "");
    const pair = cookieHeader.split(";").map(value => value.trim()).find(value => value.startsWith(`${motionLabCookieName}=`));
    const sessionId = pair?.slice(motionLabCookieName.length + 1) || "";
    const idFormatValid = /^[A-Za-z0-9_-]{32,}$/.test(sessionId);
    const session = idFormatValid ? motionLabSessions.get(sessionId) : null;
    let state = "valid_session";
    if (!cookieHeader) state = "cookie_missing";
    else if (!pair) state = "cookie_missing";
    else if (!idFormatValid) state = "cookie_malformed";
    else if (!session) state = "session_not_found";
    else if (session.expiresAt <= Date.now()) state = "session_expired";
    if (state === "session_expired") motionLabSessions.delete(sessionId);
    return {
      state,
      session: state === "valid_session" ? { ...session, sessionId } : null,
      diagnostic: {
        requestId: req.requestId,
        cookieHeaderExists: Boolean(cookieHeader),
        cookieNamePresent: Boolean(pair),
        sessionIdPrefix: sessionId ? sessionId.slice(0, 8) : null,
        idFormatValid,
        sessionFound: Boolean(session),
        expired: Boolean(session && session.expiresAt <= Date.now()),
        state
      }
    };
  }
  function readMotionLabSession(req) {
    return diagnoseMotionLabSession(req).session;
  }
  const motionLabGate = (req, res, next) => {
    if (!motionLabEnabled) return res.status(404).type("text").send("Not Found");
    const session = readMotionLabSession(req);
    if (session) { req.motionLabSession = session; return next(); }
    return diagnosticGuard(req, res, next);
  };
  const sendMotionLabFile = filename => (_req, res) => {
    res.set(SHELL_NO_STORE_HEADERS);
    res.sendFile(path.join(rootDir, "motion-lab", filename));
  };
  app.get("/dev/motion-lab-launch", (req, res) => {
    if (!motionLabEnabled) return res.status(404).type("text").send("Not Found");
    res.set(SHELL_NO_STORE_HEADERS);
    return res.sendFile(path.join(rootDir, "motion-lab", "motion-lab-launch.html"));
  });
  app.get("/dev/motion-lab-launch.js", (req, res) => {
    if (!motionLabEnabled) return res.status(404).type("text").send("Not Found");
    res.set(SHELL_NO_STORE_HEADERS);
    return res.sendFile(path.join(rootDir, "motion-lab", "motion-lab-launch.js"));
  });
  app.get("/dev/motion-lab", motionLabGate, sendMotionLabFile("index.html"));
  app.get("/dev/motion-lab.css", motionLabGate, sendMotionLabFile("motion-lab.css"));
  app.get("/dev/motion-lab-bootstrap.js", motionLabGate, sendMotionLabFile("motion-lab-bootstrap.js"));
  app.get("/dev/motion-lab-runtime.js", motionLabGate, sendMotionLabFile("motion-lab-runtime.js"));
  app.get("/dev/live-avatar-mirror", motionLabGate, sendMotionLabFile("live-avatar-mirror.html"));
  app.get("/dev/live-avatar-mirror.css", motionLabGate, sendMotionLabFile("live-avatar-mirror.css"));
  app.get("/dev/live-avatar-mirror.js", motionLabGate, sendMotionLabFile("live-avatar-mirror.js"));
  app.get("/dev/motion-lab-assets/:filename", motionLabGate, (req, res, next) => {
    if (!/^[a-z0-9-]+\.js$/.test(req.params.filename)) return next();
    res.set(SHELL_NO_STORE_HEADERS);
    return res.sendFile(path.join(PUBLIC_DIR, "motion", req.params.filename));
  });
  app.get("/dev/motion-lab-assets/phase-e/:filename", motionLabGate, (req, res, next) => {
    if (!/^[a-z0-9-]+\.glb$/.test(req.params.filename)) return next();
    res.set(SHELL_NO_STORE_HEADERS);
    return res.sendFile(path.join(PUBLIC_DIR, "motion", "assets", "phase-e", req.params.filename));
  });
  app.get("/motion/assets/phase-e/:filename", motionLabGate, (req, res, next) => {
    if (!/^[a-z0-9-]+\.glb$/.test(req.params.filename)) return next();
    res.set(SHELL_NO_STORE_HEADERS);
    return res.sendFile(path.join(PUBLIC_DIR, "motion", "assets", "phase-e", req.params.filename));
  });
  // Product-safe member-gated route: serves the push-up avatar for authenticated members.
  // The push-up challenge page is public, but the 3D avatar preview requires auth.
  // Unauthenticated users fall back to the stick-figure instructional preview.
  app.get("/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb", requireAuth, createRateLimiter({ name: "push-up-avatar-asset", max: 30, windowMs: 60_000 }), (req, res) => {
    res.set(SHELL_NO_STORE_HEADERS);
    return res.sendFile(path.join(rootDir, "exercise-generation", "source-assets", "avaturn", "avaturn-push-up-source.glb"));
  });

  app.get("/dev/motion-lab-avatar-assets/:filename", motionLabGate, (req, res, next) => {
    if (!new Set(["avaturn-push-up-source.glb", "avaturn-push-up-animation.glb"]).has(req.params.filename)) return next();
    res.set(SHELL_NO_STORE_HEADERS);
    const file = req.params.filename === "avaturn-push-up-source.glb"
      ? path.join(rootDir, "exercise-generation", "source-assets", "avaturn", req.params.filename)
      : path.join(PUBLIC_DIR, "motion", "assets", "exercises", "push-up", req.params.filename);
    return res.sendFile(file);
  });
  app.post("/api/dev/motion-lab/session", (req, res, next) => {
    if (!motionLabEnabled) return res.status(404).type("text").send("Not Found");
    return diagnosticGuard(req, res, next);
  }, (req, res) => {
    const sessionId = crypto.randomBytes(32).toString("base64url");
    motionLabSessions.set(sessionId, { userId: req.auth.userId, tokenId: req.auth.jti || null, expiresAt: Date.now() + motionLabSessionTtlMs });
    const cookieOptions = motionLabCookieOptions();
    res.cookie(motionLabCookieName, sessionId, { ...cookieOptions, maxAge: motionLabSessionTtlMs });
    motionLabDiagnosticLog({
      event: "session_created", requestId: req.requestId, userId: req.auth.userId,
      sessionCreated: motionLabSessions.has(sessionId), sessionIdPrefix: sessionId.slice(0, 8),
      cookieName: motionLabCookieName, secure: cookieOptions.secure, sameSite: cookieOptions.sameSite,
      path: cookieOptions.path, nodeEnv: env.NODE_ENV || null,
      expirationSeconds: Math.floor(motionLabSessionTtlMs / 1000)
    });
    res.set("Cache-Control", "private, no-store");
    return ok(res, req.requestId, { navigateTo: "/dev/motion-lab", expiresInSeconds: Math.floor(motionLabSessionTtlMs / 1000) }, 201);
  });
  app.get("/api/dev/motion-lab/readiness", (req, res) => {
    if (!motionLabEnabled) return res.status(404).type("text").send("Not Found");
    const result = diagnoseMotionLabSession(req);
    motionLabDiagnosticLog({ event: "readiness_checked", ...result.diagnostic });
    if (!result.session) return fail(res, req.requestId, { code: result.state, message: "Motion Lab session is not ready", details: null }, 401);
    res.set("Cache-Control", "private, no-store");
    return ok(res, req.requestId, { ready: true });
  });
  const runClubDiagnosticsService = createRunClubDiagnosticsService({ rootDir, routeContract:routeAuthorizationContract });
  const frontendManifest = () => { try { return readJSON(path.join(PUBLIC_DIR, "__frontend-version.json")); } catch { return {}; } };
  const currentHealth = (req = null) => buildLaunchHealth({
    env: process.env, rootDir, dataDir: DATA_DIR,
    frontendBuild: req?.body?.frontendBuild || req?.query?.frontendBuild || frontendManifest().build,
    backendBuild: APP_BUILD_VERSION,
    frontendCommit: frontendManifest().commit || null,
    backendCommit: safeCommit(process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT),
    assetCacheToken: frontendManifest().assetCacheToken || null,
    expectedAssetCacheToken: INDEX_CACHE_BUST_TOKEN,
    memberEvidence: memberJourneyService.inspect(),
    implementations: { notifications: notificationService?.health(), leaderboards: leaderboardService?.health(), clientEvidence:clientEvidenceService.latest(), externalChecks:latestExternalChecks }
  });
  // Serve the authorization-aware shell so direct unauthenticated visits can show a
  // clean sign-in-required state. The diagnostic operation remains permission guarded.
  app.get("/admin-run-club-diagnostics.html", (_req,res)=>res.sendFile(path.join(PUBLIC_DIR,"admin-run-club-diagnostics.html")));
  app.post("/api/admin/diagnostics/run-club/run", diagnosticGuard, (req,res)=>ok(res,req.requestId,runClubDiagnosticsService.run(),201));
  // Authoritative, non-mutating gate used by the native bridge before any HealthKit read.
  app.get("/api/admin/diagnostics/healthkit/authorize", diagnosticGuard, (req,res)=>{
    res.set("Cache-Control", "private, no-store");
    return ok(res,req.requestId,{ authorized:true });
  });
  app.get("/api/admin/diagnostics/summary", diagnosticGuard, (req, res) => ok(res, req.requestId, latestLaunchHealth || currentHealth(req)));
  app.post("/api/admin/diagnostics/run", diagnosticGuard, (req, res) => { latestLaunchHealth = currentHealth(req); return ok(res, req.requestId, latestLaunchHealth, 201); });
  app.get("/api/admin/diagnostics/environment", diagnosticGuard, (req, res) => ok(res, req.requestId, (latestLaunchHealth || currentHealth(req)).environment));
  app.get("/api/admin/diagnostics/capabilities", diagnosticGuard, (req, res) => ok(res, req.requestId, { capabilities: publicCapabilityRegistry() }));
  app.get("/api/admin/diagnostics/member-journey", diagnosticGuard, (req, res) => ok(res, req.requestId, memberJourneyService.inspect()));
  app.put("/api/admin/diagnostics/member-journey/designation", diagnosticGuard, (req, res) => ok(res, req.requestId, memberJourneyService.designate(req.body?.memberId)));
  app.get("/api/admin/diagnostics/gamification", diagnosticGuard, (req, res) => { const health = latestLaunchHealth || currentHealth(req); return ok(res, req.requestId, { ...health.gamification, rewardSimulation: health.rewardSimulation, notifications: health.notifications, universalLeaderboard:health.leaderboards, pushupLeaderboard:health.pushupLeaderboard, restoredEvents:health.restoredEvents }); });
  app.get("/api/admin/diagnostics/billing", diagnosticGuard, (req, res) => ok(res, req.requestId, (latestLaunchHealth || currentHealth(req)).stripe));
  app.get("/api/admin/diagnostics/builds", diagnosticGuard, (req, res) => ok(res, req.requestId, currentHealth(req).builds));
  app.get("/api/admin/diagnostics/export", diagnosticGuard, (req, res) => { res.set("Content-Disposition", "attachment; filename=launch-health-redacted.json"); return ok(res, req.requestId, redactedExport(latestLaunchHealth || currentHealth(req))); });
  app.post("/api/admin/diagnostics/external-checks", diagnosticGuard, asyncHandler(async (req, res) => {
    const requested = req.body?.stripe === true;
    const aiRequested = ["aiCoach", "diagnosticSummarizer"].filter(name => req.body?.[name] === true);
    const aiResults = {};
    for (const name of aiRequested) {
      const prefix = name === "aiCoach" ? "AI_COACH" : "DIAGNOSTIC_SUMMARIZER", model = process.env[`${prefix}_MODEL`];
      if (process.env[`${prefix}_ENABLED`] !== "true" || !model || !process.env.OPENAI_API_KEY) { aiResults[name] = { performed: false, status: "CONFIGURATION_MISSING", latencyMs: null, checkedAt:new Date().toISOString() }; latestExternalChecks[name]=aiResults[name]; continue; }
      const started = Date.now();
      try { const response = await (options.fetch || global.fetch)(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, { headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }); aiResults[name] = { performed: true, status: response.ok ? "READY" : response.status === 401 ? "AUTHENTICATION_FAILED" : response.status === 429 ? "RATE_LIMITED" : response.status === 404 ? "MODEL_UNAVAILABLE" : "PROVIDER_UNREACHABLE", latencyMs: Date.now() - started, checkedAt: new Date().toISOString(), model, provider: "openai" }; }
      catch { aiResults[name] = { performed: true, status: "PROVIDER_UNREACHABLE", latencyMs: Date.now() - started, checkedAt: new Date().toISOString(), model, provider: "openai" }; }
      latestExternalChecks[name]=aiResults[name];
    }
    if (!requested) return ok(res, req.requestId, { ...aiResults, stripe: { performed: false, status: "opt_in_required" } });
    const staticHealth = currentHealth(req).stripe;
    if (staticHealth.status !== "READY") return ok(res, req.requestId, { stripe: { performed: false, status: "static_configuration_invalid" } }, 422);
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await (options.fetch || global.fetch)(`https://api.stripe.com/v1/prices/${encodeURIComponent(process.env.STRIPE_PRICE_ID)}`, { headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }, signal: controller.signal });
      return ok(res, req.requestId, { ...aiResults, stripe: { performed: true, status: response.ok ? "reachable" : "provider_error", httpStatus: response.status, priceExists: response.ok, mode: staticHealth.mode, resourcesModified: false } });
    } catch (error) { return ok(res, req.requestId, { ...aiResults, stripe: { performed: true, status: error?.name === "AbortError" ? "timeout" : "unreachable", priceExists: null, resourcesModified: false } }, 503); }
    finally { clearTimeout(timer); }
  }));

  app.get(
    "/api/admin/launch-health",
    requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.OPS_READ_OBSERVABILITY, trackAdminOpsAuthorizationDecision),
    (req, res) => {
      const manifest = frontendManifest();
      res.set(SHELL_NO_STORE_HEADERS);
      return ok(res, req.requestId, buildLaunchHealth({
        env: options.env || process.env,
        rootDir,
        dataDir: DATA_DIR, backendBuild: APP_BUILD_VERSION, frontendBuild: manifest.build,
        frontendCommit: safeCommit(manifest.commit), backendCommit: safeCommit(process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT),
        assetCacheToken: manifest.assetCacheToken || null, expectedAssetCacheToken:INDEX_CACHE_BUST_TOKEN, implementations: { notifications: notificationService?.health(), leaderboards: leaderboardService?.health(), clientEvidence:clientEvidenceService.latest(), externalChecks:latestExternalChecks }
      }));
    }
  );

  app.get(
    "/api/admin/diagnostics/recent",
    requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.OPS_READ_OBSERVABILITY, trackAdminOpsAuthorizationDecision),
    asyncHandler(async (req, res) => {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    const reports = diagnosticStore.recent(limit);
    return ok(res, req.requestId, { reports }, 200);
    })
  );

  app.get(
    "/api/ops/write-observability",
    requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.OPS_READ_OBSERVABILITY, trackAdminOpsAuthorizationDecision),
    (_req, res) => {
      return res.json({
        ok: true,
        service: "mufasa-fitness-node",
        authConfigured: !usingDefaultAuthSecret,
        legacyFallbackEnabled,
        trustPolicy,
        tokenRevocation: tokenDenylist.stats(),
        actionFallbackEnforcement: currentEnforcementView(),
        authorization: authorizationResolver.describe(),
        persistedOverrideRecovery: {
          found: persistedOverrideState.found,
          loaded: persistedOverrideState.loaded,
          version: Number.isInteger(persistedOverrideState.version) ? persistedOverrideState.version : 0,
          warnings: persistedOverrideState.warnings
        },
        strictStartup: {
          enabled: strictStartupEnabled,
          passed: strictStartupIssues.length === 0,
          issues: strictStartupIssues
        },
        preflight,
        adminAudit: auditLog.recentSummary(20),
        startupWarnings,
        legacyDependencyCatalog,
        writes: writeObservability.snapshot()
      });
    }
  );

  app.get(
    "/api/ops/enforcement-config",
    requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.OPS_READ_AUTHZ, trackAdminOpsAuthorizationDecision),
    (req, res) => {
      auditLog.appendEvent({
        category: "enforcement",
        action: "enforcement_config_read",
        status: "ok",
        actor: summarizeActor(req)
      });
      return res.json({
        ok: true,
        trustPolicy,
        tokenRevocation: tokenDenylist.stats(),
        actionFallbackEnforcement: currentEnforcementView(),
        authorization: authorizationResolver.describe(),
        persistedOverrideRecovery: {
          found: persistedOverrideState.found,
          loaded: persistedOverrideState.loaded,
          version: Number.isInteger(persistedOverrideState.version) ? persistedOverrideState.version : 0,
          warnings: persistedOverrideState.warnings
        },
        adminAudit: auditLog.recentSummary(10)
      });
    }
  );

  app.get(
    "/api/ops/admin-audit",
    requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.OPS_READ_AUTHZ, trackAdminOpsAuthorizationDecision),
    (req, res) => {
      const limit = Number.parseInt(String(req.query.limit ?? ""), 10);
      const before = Number.parseInt(String(req.query.before ?? ""), 10);
      const page = auditLog.readRecentPage({
        limit: Number.isFinite(limit) ? limit : 25,
        before: Number.isFinite(before) ? before : 0
      });
      if (page.integrity?.enabled && page.integrity.verified === false) {
        const alert = controlPlaneAlerts.emit(ALERT_TYPES.AUDIT_INTEGRITY_FAILURE, {
          severity: "critical",
          actor: summarizeActor(req),
          issues: page.integrity.issues
        });
        writeObservability.trackControlPlaneAlert(alert.type, { issueCount: page.integrity.issues.length });
      }
      return res.json({
        ok: true,
        audit: page
      });
    }
  );

  app.get(
    "/api/ops/admin-audit/verify",
    requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.OPS_READ_AUTHZ, trackAdminOpsAuthorizationDecision),
    (req, res) => {
      const verification = auditLog.verifyFullChain();
      if (!verification.verified) {
        const alert = controlPlaneAlerts.emit(ALERT_TYPES.AUDIT_INTEGRITY_FAILURE, {
          severity: "critical",
          actor: summarizeActor(req),
          issues: verification.issues
        });
        writeObservability.trackControlPlaneAlert(alert.type, { issueCount: verification.issueCount });
      }
      return res.json({
        ok: verification.verified,
        auditIntegrity: verification
      });
    }
  );

  app.put(
    "/api/ops/enforcement-config",
    requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.OPS_MANAGE_ENFORCEMENT, trackAdminOpsAuthorizationDecision),
    asyncHandler(async (req, res) => {
      const candidate = req.body?.enabledByAction;
      const ifVersion = req.body?.ifVersion;
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        throw new ApiError("VALIDATION_ERROR", "enabledByAction object is required", 400);
      }

      for (const [action, value] of Object.entries(candidate)) {
        if (!ENFORCEABLE_ACTIONS.includes(action)) {
          throw new ApiError("VALIDATION_ERROR", `Unknown enforceable action '${action}'`, 400);
        }
        if (typeof value !== "boolean") {
          throw new ApiError("VALIDATION_ERROR", `enabledByAction['${action}'] must be boolean`, 400);
        }
      }
      const proposedOverrides = { ...runtimeEnforcementOverrides, ...candidate };
      let saveResult;
      try {
        saveResult = enforcementOverrideStore.save(proposedOverrides, { ifVersion });
      } catch (error) {
        if (error.code === "VERSION_CONFLICT") {
          const alert = controlPlaneAlerts.emit(ALERT_TYPES.ENFORCEMENT_VERSION_CONFLICT, {
            severity: "warning",
            actor: summarizeActor(req),
            expectedVersion: error.details?.expectedVersion,
            currentVersion: error.details?.currentVersion
          });
          writeObservability.trackControlPlaneAlert(alert.type, {
            expectedVersion: error.details?.expectedVersion,
            currentVersion: error.details?.currentVersion
          });
          throw new ApiError("VERSION_CONFLICT", error.message, 409, error.details);
        }
        if (error.code === "INVALID_IF_VERSION") {
          throw new ApiError("VALIDATION_ERROR", error.message, 400);
        }
        throw error;
      }
      Object.assign(runtimeEnforcementOverrides, proposedOverrides);
      actionEnforcement = buildActionEnforcementState(baseActionEnforcement, runtimeEnforcementOverrides);
      writeObservability.setEnforcementState(actionEnforcement.enabledByAction);
      persistedOverrideState.loaded = true;
      persistedOverrideState.found = true;
      persistedOverrideState.overrides = { ...runtimeEnforcementOverrides };
      persistedOverrideState.version = saveResult.version;
      persistedOverrideState.warnings = [];

      auditLog.appendEvent({
        category: "enforcement",
        action: "enforcement_config_update",
        status: "ok",
        actor: summarizeActor(req),
        details: {
          updatedActions: Object.keys(candidate),
          ifVersion: ifVersion ?? null,
          newVersion: saveResult.version,
          effectiveEnabledByAction: actionEnforcement.enabledByAction
        }
      });

      return ok(res, req.requestId, {
        actionFallbackEnforcement: currentEnforcementView(),
        currentVersion: saveResult.version,
        updatedActions: Object.keys(candidate)
      }, 200);
    })
  );

  app.post(
    "/api/ops/auth/token-revocations",
    requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.OPS_MANAGE_ENFORCEMENT, trackAdminOpsAuthorizationDecision),
    asyncHandler(async (req, res) => {
      const { jti, expiresAt, reason } = req.body || {};
      const normalizedJti = String(jti || "").trim();
      const exp = Number(expiresAt);
      if (!normalizedJti) {
        throw new ApiError("VALIDATION_ERROR", "jti is required", 400);
      }
      if (!Number.isFinite(exp)) {
        throw new ApiError("VALIDATION_ERROR", "expiresAt must be epoch millis", 400);
      }

      const pruned = tokenDenylist.prune();
      const entry = tokenDenylist.revoke({
        jti: normalizedJti,
        expiresAt: exp,
        reason: String(reason || "manual_revocation")
      });
      auditLog.appendEvent({
        category: "auth",
        action: "token_revoked",
        status: "ok",
        actor: summarizeActor(req),
        details: {
          jti: entry.jti,
          expiresAt: entry.expiresAt,
          reason: entry.reason,
          pruned
        }
      });

      return ok(res, req.requestId, {
        revoked: entry,
        tokenRevocation: tokenDenylist.stats()
      }, 201);
    })
  );

  app.put(
    "/api/ops/enforcement-config/break-glass",
    requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.OPS_MANAGE_ENFORCEMENT, trackAdminOpsAuthorizationDecision),
    asyncHandler(async (req, res) => {
      requireSuperAdmin(req);
      const candidate = req.body?.enabledByAction;
      const reason = String(req.body?.reason || req.body?.reasonCode || "").trim();
      if (!reason) {
        throw new ApiError("VALIDATION_ERROR", "break-glass reason (reason or reasonCode) is required", 400);
      }
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        throw new ApiError("VALIDATION_ERROR", "enabledByAction object is required", 400);
      }
      for (const [action, value] of Object.entries(candidate)) {
        if (!ENFORCEABLE_ACTIONS.includes(action)) {
          throw new ApiError("VALIDATION_ERROR", `Unknown enforceable action '${action}'`, 400);
        }
        if (typeof value !== "boolean") {
          throw new ApiError("VALIDATION_ERROR", `enabledByAction['${action}'] must be boolean`, 400);
        }
      }

      const proposedOverrides = { ...runtimeEnforcementOverrides, ...candidate };
      const saveResult = enforcementOverrideStore.save(proposedOverrides, { force: true });
      Object.assign(runtimeEnforcementOverrides, proposedOverrides);
      actionEnforcement = buildActionEnforcementState(baseActionEnforcement, runtimeEnforcementOverrides);
      writeObservability.setEnforcementState(actionEnforcement.enabledByAction);
      persistedOverrideState.loaded = true;
      persistedOverrideState.found = true;
      persistedOverrideState.overrides = { ...runtimeEnforcementOverrides };
      persistedOverrideState.version = saveResult.version;
      persistedOverrideState.warnings = [];

      const alert = controlPlaneAlerts.emit(ALERT_TYPES.BREAK_GLASS_USED, {
        severity: "critical",
        actor: summarizeActor(req),
        reason,
        updatedActions: Object.keys(candidate),
        newVersion: saveResult.version
      });
      writeObservability.trackControlPlaneAlert(alert.type, {
        updatedActionCount: Object.keys(candidate).length
      });

      auditLog.appendEvent({
        category: "enforcement",
        action: "enforcement_config_break_glass_update",
        status: "override",
        actor: summarizeActor(req),
        annotations: {
          breakGlass: true,
          reason
        },
        details: {
          updatedActions: Object.keys(candidate),
          forced: true,
          newVersion: saveResult.version,
          effectiveEnabledByAction: actionEnforcement.enabledByAction
        }
      });

      return ok(res, req.requestId, {
        breakGlass: true,
        reason,
        actionFallbackEnforcement: currentEnforcementView(),
        currentVersion: saveResult.version,
        updatedActions: Object.keys(candidate)
      }, 200);
    })
  );

  app.post("/api/speak", requireCriticalRouteAuth, speakLimit, async (req, res) => {
    try {
      const incomingSpeakBody = req.body || {};
      console.info("[tts] incoming request", {
        requestId: req.requestId,
        userId: req.auth?.userId || null,
        operation: "synthesize_speech"
      });

      const {
        text,
        voice = "alloy",
        format = "mp3",
        speed,
        pitch
      } = incomingSpeakBody;
      if (!req.is("application/json")) return res.status(415).json({ ok:false, requestId:req.requestId, error:{ code:"UNSUPPORTED_MEDIA_TYPE", message:"application/json is required" } });
      const allowedSpeakFields = new Set(["text", "voice", "format", "speed", "pitch"]);
      if (Object.keys(incomingSpeakBody).some(field => !allowedSpeakFields.has(field))) return res.status(400).json({ ok:false, requestId:req.requestId, error:{code:"VALIDATION_ERROR",message:"Unsupported speech request field"} });
      if (typeof text !== "string" || !text.trim() || text.length > 1000) {
        return res.status(400).json({ ok: false, error: "text required" });
      }

      const rawVoiceUpstream =
        process.env.AIVOICE_URL ||
        process.env.OPENVOICE_UPSTREAM_URL ||
        "https://aivoice-wmrv.onrender.com";
      const normalizedVoiceUpstream = rawVoiceUpstream.replace(/\/+$/, "");
      const AIVOICE_URL = /\/speak$/i.test(normalizedVoiceUpstream)
        ? normalizedVoiceUpstream
        : `${normalizedVoiceUpstream}/speak`;
      const SKILL_WORLD_TTS_TOKEN = process.env.SKILL_WORLD_TTS_TOKEN || "";
      const AIVOICE_API_KEY = process.env.AIVOICE_API_KEY || "";

      if (!SKILL_WORLD_TTS_TOKEN) {
        console.warn("[tts] internal token missing", {
          requestId: req.requestId,
          url: AIVOICE_URL
        });
        return res.status(500).json({ ok: false, error: "TTS_INTERNAL_TOKEN_MISSING" });
      }

      const upstreamSpeakBody = { text, voice, format, speed, pitch };
      console.info("[tts] upstream request", {
        requestId: req.requestId,
        operation: "provider_request"
      });
      const r = await fetch(AIVOICE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-token": SKILL_WORLD_TTS_TOKEN,
          ...(AIVOICE_API_KEY ? { "X-AIVOICE-KEY": AIVOICE_API_KEY } : {})
        },
        body: JSON.stringify(upstreamSpeakBody)
      });

      if (!r.ok) {
        const msg = await r.text().catch(() => "");
        console.warn("[tts] upstream validation error", {
          requestId: req.requestId,
          status: r.status,
          operation: "provider_rejected"
        });
        if (r.status === 401) {
          return res.status(502).json({ ok: false, error: "TTS_PROVIDER_AUTH_FAILED" });
        }
        return res.status(502).json({ ok:false, requestId:req.requestId, error:{ code:"TTS_PROVIDER_ERROR", message:"Speech provider rejected the request" } });
      }

      res.setHeader("Content-Type", r.headers.get("content-type") || "audio/mpeg");
      res.setHeader("Cache-Control", "no-store");

      if (typeof r.body?.pipe === "function") {
        r.body.pipe(res);
      } else {
        const buf = Buffer.from(await r.arrayBuffer());
        res.send(buf);
      }
    } catch (e) {
      res.status(500).json({ ok: false, error: "proxy_failed", message: redactTtsSecrets(e) });
    }
  });

  const configuredSeedEmail = String(process.env.LOGIN_SEED_EMAIL || "").trim().toLowerCase()
    || String((authorizationConfig.adminEmails || [])[0] || "").trim().toLowerCase()
    || "rdhforeclosureconquer@gmail.com";
  console.info("[auth-login] seed email configured", { seedEmail: configuredSeedEmail });

  const AUTH_SEED_USER = Object.freeze({
    id: "pilot_admin",
    email: configuredSeedEmail,
    name: "Rashad Harbour",
    role: authorizationResolver.resolveRole({
      userId: "pilot_admin",
      email: configuredSeedEmail,
      providerSubject: configuredSeedEmail
    }).role
  });

  function authUserContract() {
    return {
      id: AUTH_SEED_USER.id,
      email: AUTH_SEED_USER.email,
      name: AUTH_SEED_USER.name,
      role: AUTH_SEED_USER.role
    };
  }

  function sanitizeRegisteredName(rawName, fallbackEmail) {
    const trimmed = String(rawName || "").trim();
    if (trimmed) return trimmed.slice(0, 120);
    const emailLeft = String(fallbackEmail || "").split("@")[0] || "Athlete";
    return emailLeft.slice(0, 120);
  }

  app.post("/api/auth/login", authAttemptLimit, asyncHandler(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const requestId = req.requestId || null;
    const emailNormalized = email || null;
    const hasPassword = Boolean(password);
    const expectedPassword = String(process.env.PILOT_LOGIN_PASSWORD || "");
    const fixtureEnabled = String(process.env.AUTH_TEST_LOGIN_FIXTURE_ENABLED || "").trim().toLowerCase() === "true";
    const isTestEnv = String(process.env.NODE_ENV || "").trim().toLowerCase() === "test";
    const hasFixtureFields = req.body?.testUserId != null || req.body?.testRole != null;
    const rememberMe = req.body?.rememberMe === true;
    const loginTtlMs = rememberMe ? authPersistentTtlMs : authSessionTtlMs;
    console.info("[auth-login] request received", { emailNormalized, hasPassword, requestId });

    const reject = (status, reason, error = "Invalid email or password") => {
      console.warn("[auth-login] rejected", { reason, emailNormalized, requestId });
      return res.status(status).json({ ok: false, error });
    };

    if (!email || !password) {
      return reject(400, "missing_email_or_password");
    }

    if (hasFixtureFields && (!isTestEnv || !fixtureEnabled)) {
      return reject(403, "test_login_fixture_disabled", "TEST_LOGIN_FIXTURE_DISABLED");
    }

    if (isTestEnv && fixtureEnabled && hasFixtureFields) {
      const requestedUserId = String(req.body?.testUserId || "").trim();
      const userId = requestedUserId || AUTH_SEED_USER.id;
      const role = String(req.body?.testRole || "user").trim().toLowerCase() || "user";

      if (!/^[a-zA-Z0-9_-]{3,128}$/.test(userId)) {
        return reject(400, "invalid_test_user_id", "Invalid testUserId");
      }

      const token = authTokenLib.issueUserToken({
        userId,
        email: email || AUTH_SEED_USER.email,
        provider: "password",
        providerSubject: email || AUTH_SEED_USER.email,
        providerVerified: true,
        identityClass: "provider_verified",
        ttlMs: loginTtlMs
      });
      traceIssuance(token, requestId);

      console.info("[auth-login] success", { userId, emailNormalized: email || AUTH_SEED_USER.email, requestId });
      return res.status(200).json({
        ok: true,
        token: token.token,
        authTrace: publicAuthTrace({ tokenFingerprint: token.fingerprint, issuerReceived: token.claims.iss, audienceReceived: token.claims.aud ?? null, signature: "PASS" }, requestId),
        jti: token.jti,
        expiresAt: token.expiresAt,
        user: {
          id: userId,
          email: email || AUTH_SEED_USER.email,
          name: AUTH_SEED_USER.name,
          role
        }
      });
    }

    const registeredUser = authCredentialStore.findByEmail(email);
    if (registeredUser) {
      if (!authCredentialStore.verify(registeredUser, password)) {
        return reject(401, "registered_password_mismatch");
      }
      const registeredToken = authTokenLib.issueUserToken({
        userId: registeredUser.id,
        email: registeredUser.email,
        provider: "password",
        providerSubject: registeredUser.email,
        providerVerified: true,
        identityClass: "provider_verified",
        ttlMs: loginTtlMs
      });
      traceIssuance(registeredToken, requestId);
      console.info("[auth-login] success", { userId: registeredUser.id, emailNormalized: registeredUser.email, requestId });
      return res.status(200).json({
        ok: true,
        token: registeredToken.token,
        authTrace: publicAuthTrace({ tokenFingerprint: registeredToken.fingerprint, issuerReceived: registeredToken.claims.iss, audienceReceived: registeredToken.claims.aud ?? null, signature: "PASS" }, requestId),
        jti: registeredToken.jti,
        expiresAt: registeredToken.expiresAt,
        user: {
          id: registeredUser.id,
          email: registeredUser.email,
          name: registeredUser.name,
          role: "user",
          accessTier: membershipService.getMembership(registeredUser.id).hasAccess ? "paid_member" : registeredUser.accessTier
        }
      });
    }

    if (!expectedPassword) {
      return reject(503, "pilot_login_password_not_configured", "PILOT_LOGIN_PASSWORD is not configured");
    }

    if (email !== AUTH_SEED_USER.email || password !== expectedPassword) {
      return reject(401, "seed_credentials_mismatch");
    }

    const token = authTokenLib.issueUserToken({
      userId: AUTH_SEED_USER.id,
      email: AUTH_SEED_USER.email,
      provider: "password",
      providerSubject: AUTH_SEED_USER.email,
      providerVerified: true,
      identityClass: "provider_verified",
      ttlMs: loginTtlMs
    });
    traceIssuance(token, requestId);

    console.info("[auth-login] success", { userId: AUTH_SEED_USER.id, emailNormalized: AUTH_SEED_USER.email, requestId });
    return res.status(200).json({
      ok: true,
      token: token.token,
      authTrace: publicAuthTrace({ tokenFingerprint: token.fingerprint, issuerReceived: token.claims.iss, audienceReceived: token.claims.aud ?? null, signature: "PASS" }, requestId),
      jti: token.jti,
      expiresAt: token.expiresAt,
      user: authUserContract()
    });
  }));

  app.post("/api/auth/register", authAttemptLimit, asyncHandler(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const name = sanitizeRegisteredName(req.body?.name, email);

    if (!email || !password || !name) {
      return res.status(400).json({ ok: false, error: "name, email, and password are required" });
    }
    if (!email.includes("@")) {
      return res.status(400).json({ ok: false, error: "Invalid email format" });
    }
    if (password.length < 8) {
      return res.status(400).json({ ok: false, error: "Password must be at least 8 characters" });
    }
    if (email === AUTH_SEED_USER.email || authCredentialStore.findByEmail(email)) {
      return res.status(409).json({ ok: false, error: "Account already exists. Sign in to continue.", code: "ACCOUNT_EXISTS", nextAction: "sign_in" });
    }

    const requestedContext = String(req.body?.entryContext || "").trim().toLowerCase();
    const accessTier = requestedContext === "run_club" ? "free_run_club" : "free";
    const record = authCredentialStore.create({ email, name, password, accessTier });
    if (!record) return res.status(409).json({ ok: false, error: "Account already exists. Sign in to continue.", code: "ACCOUNT_EXISTS", nextAction: "sign_in" });
    const userId = record.id;
    userStore.updateUser(userId, user => Object.assign(user, { identity: { email, name, accessTier } }));

    const token = authTokenLib.issueUserToken({
      userId,
      email,
      provider: "password",
      providerSubject: email,
      providerVerified: true,
      identityClass: "provider_verified",
      ttlMs: authSessionTtlMs
    });
    traceIssuance(token, req.requestId, "/api/auth/register");

    return res.status(200).json({
      ok: true,
      token: token.token,
      authTrace: publicAuthTrace({ tokenFingerprint: token.fingerprint, issuerReceived: token.claims.iss, audienceReceived: token.claims.aud ?? null, signature: "PASS" }, req.requestId),
      jti: token.jti,
      expiresAt: token.expiresAt,
      user: { id: userId, email, name, role: "user", accessTier }
    });
  }));

  app.get("/api/auth/me", requireAuth, asyncHandler(async (req, res) => {
    console.info("[auth-me]", { requestId: req.requestId, userId: req.auth?.userId || null });
    const role = req.auth.userId === AUTH_SEED_USER.id
      ? AUTH_SEED_USER.role
      : (req.authz?.role || "user");
    const registeredIdentity = authCredentialStore.findByEmail(req.auth.email);
    const memberFound = Boolean(req.auth.userId);
    authTrace({ event: "member_lookup", requestId: req.requestId, tokenFingerprint: authTokenLib.fingerprintToken(req.get("authorization").replace(/^Bearer\s+/i, "")), subjectPresent: memberFound, memberLookup: memberFound ? "PASS" : "FAIL", memberDisabled: false, reason: memberFound ? null : "subject_missing", httpStatus: memberFound ? 200 : 401, serverTimestamp: new Date().toISOString() });
    const email = req.auth.email || AUTH_SEED_USER.email;
    const name = String(req.auth?.name || "").trim() || (email.includes("@") ? email.split("@")[0] : AUTH_SEED_USER.name);
    const roles = Array.from(new Set([role, ...(role === "super_admin" ? ["admin", "operator"] : []), ...(role === "admin" ? ["operator"] : [])]));
    return res.status(200).json({
      ok: true,
      authTrace: publicAuthTrace({ ...req.authTrace, subjectLookup: memberFound ? "PASS" : "FAIL" }, req.requestId),
      user: {
        id: req.auth.userId,
        email,
        name,
        role,
        roles,
        accessTier: membershipService.getMembership(req.auth.userId).hasAccess
          ? "paid_member"
          : (registeredIdentity?.accessTier || (req.auth.userId === AUTH_SEED_USER.id ? "paid_member" : "free"))
      }
    });
  }));

  app.post("/api/auth/logout", requireAuth, asyncHandler(async (req, res) => {
    if (req.auth?.jti && Number.isFinite(req.auth?.expiresAt)) tokenDenylist.revoke({ jti: req.auth.jti, expiresAt: req.auth.expiresAt, reason: "user_logout" });
    if (req.auth?.userId) for (const [sessionId, session] of motionLabSessions) if (session.userId === req.auth.userId) motionLabSessions.delete(sessionId);
    const browserSession = readMotionLabSession(req);
    if (browserSession) motionLabSessions.delete(browserSession.sessionId);
    res.clearCookie(motionLabCookieName, motionLabCookieOptions());
    return res.status(200).json({ ok: true });
  }));


  // ---- Auth bridge (legacy compatibility foundation) ----
  app.post("/api/auth/bridge", asyncHandler(async (req, res) => {
    const rawTrustMode = String(req.body?.trustMode || "").trim().toLowerCase();
    const requestedTrustMode = normalizeAuthBridgeTrustMode(req.body?.trustMode);
    const requestOrigin = String(req.get("origin") || "");
    const requestProvider = String(req.body?.provider || "").trim().toLowerCase() || null;
    const hasGoogleEmail = Boolean(req.body?.googleEmail);
    const hasIdToken = Boolean(req.body?.googleIdToken);
    const requestEmail = req.body?.googleEmail || null;
    if (rawTrustMode && !requestedTrustMode) {
      console.warn("[auth-bridge] rejected", {
        origin: requestOrigin || null,
        trustMode: rawTrustMode,
        provider: requestProvider,
        hasGoogleEmail,
        hasIdToken,
        email: requestEmail,
        reason: "invalid_trust_mode"
      });
      throw new ApiError("FORBIDDEN", "Unsupported auth bridge trustMode", 403, { reason: "invalid_trust_mode" });
    }
    let claims;
    try {
      claims = validateAuthBridge(req.body, { requestedTrustMode });
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        console.warn("[auth-bridge] rejected", {
          origin: requestOrigin || null,
          trustMode: requestedTrustMode,
          provider: requestProvider,
          hasGoogleEmail,
          hasIdToken,
          email: requestEmail,
          reason: deriveAuthBridgeRejectionReason(error)
        });
      }
      throw error;
    }
    const payloadKeys = Object.keys(req.body || {}).filter((key) => ["googleIdToken", "googleSub", "googleEmail", "userId", "manualUserId", "trustMode", "provider"].includes(key));
    const effectiveRequestProvider = String(req.body?.provider || claims.provider || "").trim().toLowerCase() || null;
    const bridgeDiagnostics = {
      requestReceived: true,
      payloadKeys,
      claimPath: claims.googleIdToken
        ? "googleIdToken"
        : (claims.googleSub ? "googleSub" : (claims.googleEmail ? "googleEmail" : "manualUserId")),
      googleIdTokenPresent: Boolean(claims.googleIdToken),
      verificationAttempted: Boolean(claims.googleIdToken),
      verificationSucceeded: false,
      effectiveTrustMode: claims.trustMode,
      rejectionReason: null,
      tokenIssued: false
    };
    console.info("[auth-bridge] request received", {
      requestId: req.requestId,
      origin: requestOrigin || null,
      trustMode: claims.trustMode,
      provider: effectiveRequestProvider,
      payloadKeys: bridgeDiagnostics.payloadKeys,
      claimPath: bridgeDiagnostics.claimPath,
      googleIdTokenPresent: bridgeDiagnostics.googleIdTokenPresent,
      hasGoogleEmail: Boolean(claims.googleEmail),
      hasIdToken: Boolean(claims.googleIdToken),
      email: claims.googleEmail || null
    });
    let resolvedIdentity;
    try {
      resolvedIdentity = await resolveAuthBridgeIdentity(claims, {
        env: process.env,
        googleIdentityVerifier: options.googleIdentityVerifier
      });
    } catch (error) {
      const rejectionReason = deriveAuthBridgeRejectionReason(error);
      console.warn("[auth-bridge] identity resolution failed", {
        origin: requestOrigin || null,
        trustMode: claims.trustMode,
        provider: effectiveRequestProvider,
        hasGoogleEmail: Boolean(claims.googleEmail),
        hasIdToken: Boolean(claims.googleIdToken),
        email: claims.googleEmail || null,
        claimPath: bridgeDiagnostics.claimPath,
        payloadKeys: bridgeDiagnostics.payloadKeys,
        googleIdTokenPresent: bridgeDiagnostics.googleIdTokenPresent,
        verificationAttempted: bridgeDiagnostics.verificationAttempted,
        verificationSuccess: false,
        effectiveTrustMode: claims.trustMode,
        tokenIssued: false,
        rejectionReason
      });
      if (error instanceof ApiError) {
        throw new ApiError(error.code, error.message, error.status, {
          ...(error.details || {}),
          diagnostics: {
            claimPath: bridgeDiagnostics.claimPath,
            effectiveTrustMode: claims.trustMode,
            verificationAttempted: bridgeDiagnostics.verificationAttempted,
            verificationSucceeded: false,
            rejectionReason
          }
        });
      }
      throw error;
    }
    bridgeDiagnostics.verificationSucceeded = Boolean(resolvedIdentity.providerVerified);
    bridgeDiagnostics.effectiveTrustMode = resolvedIdentity.providerVerified
      ? "provider_verified"
      : claims.trustMode;
    const effectiveTrustMode = resolvedIdentity.providerVerified
      ? "provider_verified"
      : claims.trustMode;
    console.info("[auth-bridge]", {
      claimPath: bridgeDiagnostics.claimPath,
      payloadKeys: bridgeDiagnostics.payloadKeys,
      googleIdTokenPresent: bridgeDiagnostics.googleIdTokenPresent,
      verificationAttempted: bridgeDiagnostics.verificationAttempted,
      verificationSucceeded: bridgeDiagnostics.verificationSucceeded,
      effectiveTrustMode
    });
    if (!resolvedIdentity.providerVerified && !trustPolicy.allowedTrustModes.includes(effectiveTrustMode)) {
      const rejectionReason = "trust_mode_disabled";
      console.warn("[auth-bridge] rejected", {
        origin: requestOrigin || null,
        trustMode: effectiveTrustMode,
        provider: effectiveRequestProvider,
        hasGoogleEmail: Boolean(claims.googleEmail),
        hasIdToken: Boolean(claims.googleIdToken),
        email: claims.googleEmail || null,
        reason: rejectionReason
      });
      throw new ApiError(
        "TRUST_MODE_DISABLED",
        `Trust mode '${effectiveTrustMode}' is disabled by AUTH_BRIDGE_ALLOWED_TRUST_MODES`,
        403,
        {
          diagnostics: bridgeDiagnostics,
          reason: rejectionReason,
          trustMode: effectiveTrustMode,
          allowedTrustModes: trustPolicy.allowedTrustModes
        }
      );
    }
    const token = authTokenLib.issueUserToken({
      userId: resolvedIdentity.userId,
      email: resolvedIdentity.providerEmail || claims.googleEmail || null,
      provider: resolvedIdentity.provider,
      providerSubject: resolvedIdentity.providerSubject,
      providerVerified: resolvedIdentity.providerVerified,
      identityClass: resolvedIdentity.identityClass
    });
    bridgeDiagnostics.tokenIssued = Boolean(token);
    console.info("[auth-bridge] token issued", {
      requestId: req.requestId,
      claimPath: bridgeDiagnostics.claimPath,
      effectiveTrustMode,
      tokenIssued: bridgeDiagnostics.tokenIssued
    });

    return ok(res, req.requestId, {
      auth: token,
      diagnostics: {
        claimPath: bridgeDiagnostics.claimPath,
        effectiveTrustMode,
        verificationAttempted: bridgeDiagnostics.verificationAttempted,
        verificationSucceeded: bridgeDiagnostics.verificationSucceeded,
        rejectionReason: null
      },
      identity: {
        userId: resolvedIdentity.userId,
        provider: resolvedIdentity.provider,
        providerVerified: resolvedIdentity.providerVerified,
        identityClass: resolvedIdentity.identityClass,
        trustNotes: resolvedIdentity.providerVerified
          ? []
          : ["Identity is not provider-verified; keep scoped to low-trust pilot usage."]
      }
    }, 201);
  }));

  app.get("/api/me", requireAuth, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, {
      userId: req.auth.userId,
      provider: req.auth.provider,
      providerSubject: req.auth.providerSubject,
      issuedAt: req.auth.issuedAt,
      expiresAt: req.auth.expiresAt,
      jti: req.auth.jti,
      role: req.authz?.role || "user",
      isBootstrapSuperAdmin: Boolean(req.authz?.isBootstrapSuperAdmin),
      providerVerified: Boolean(req.auth.providerVerified),
      identityClass: req.auth.identityClass || "manual_unverified"
    });
  }));

  app.get("/api/me/greatness/journey", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, steppingService.journey(req.auth.userId))));
  app.get("/stepping-into-greatness", (_req, res) => res.redirect(308, "/greatness.html"));
  app.get("/greatness", (_req, res) => res.redirect(308, "/greatness.html"));
  app.get("/push-up-challenge", (_req, res) => res.redirect(308, "/push-up-challenge.html"));
  app.get("/pushup-challenge", (_req, res) => res.redirect(308, "/push-up-challenge.html"));
  app.get("/api/me/challenges/pushup", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, challengeService.getMemberPushupSummary(req.auth.userId))));

  // Reusable, server-authoritative challenge engine.
  app.get("/challenges", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "challenges.html")));
  app.get("/challenges/:slug", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "challenge.html")));
  app.get("/api/challenges", asyncHandler(async (req, res) => ok(res, req.requestId, { challenges: challengeEngineService.library({ category:req.query.category }) })));
  app.get("/api/challenges/:slug", asyncHandler(async (req, res) => ok(res, req.requestId, challengeEngineService.detail(req.params.slug))));
  app.get("/api/challenge-exercises/:exerciseId", asyncHandler(async(req,res)=>{const exercise=Object.values(EXERCISES).find(item=>item.id===req.params.exerciseId);if(!exercise)throw new ApiError("EXERCISE_NOT_FOUND","Challenge exercise not found",404);return ok(res,req.requestId,getKettlebellEducation({exerciseId:exercise.id,name:exercise.name,exerciseType:exercise.type}));}));
  app.get("/exercise-media/kettlebell/:exerciseId",(req,res)=>{const media=kettlebellMedia[req.params.exerciseId];if(!media)return res.status(404).end();const source=path.resolve(__dirname,media.sourcePath),root=path.resolve(__dirname,"exercise-generation/kettlebellchallenge");if(path.dirname(source)!==root)return res.status(404).end();res.set({"Content-Type":"image/jpeg","Cache-Control":"public, max-age=86400, immutable","X-Content-Type-Options":"nosniff"});return res.sendFile(source);});
  app.post("/api/me/challenges/:slug/join", requireAuth, challengeLimit, asyncHandler(async (req, res) => { const result=challengeEngineService.joinChallenge(req.auth.userId,req.params.slug,req.body||{}); return ok(res,req.requestId,result,result.created?201:200); }));
  app.get("/api/me/challenges/active/current", requireAuth, asyncHandler(async (req,res)=>{res.set("Cache-Control","private, no-store");return ok(res,req.requestId,challengeEngineService.active(req.auth.userId));}));
  app.get("/api/me/challenges/:slug/current", requireAuth, asyncHandler(async (req,res)=>{res.set("Cache-Control","private, no-store");return ok(res,req.requestId,challengeEngineService.current(req.auth.userId,req.params.slug));}));
  app.patch("/api/me/challenges/:userChallengeId/commitment-sessions/:sessionId/reschedule", requireAuth, challengeLimit, asyncHandler(async(req,res)=>ok(res,req.requestId,challengeEngineService.rescheduleCommitment(req.auth.userId,req.params.userChallengeId,req.params.sessionId,req.body||{}))));
  app.post("/api/me/challenges/:userChallengeId/commitment-sessions/:sessionId/start-workout", requireAuth, challengeLimit, asyncHandler(async(req,res)=>{const resolved=challengeEngineService.resolveCommitmentWorkout(req.auth.userId,req.params.userChallengeId,req.params.sessionId);const workoutSessionId=`kb_${resolved.joined.id}_${resolved.session.scheduleSessionId}`;let runtime,resumed=false;try{runtime=sessionService.getSession({userId:req.auth.userId,sessionId:workoutSessionId});if(runtime.endedAt)throw new ApiError("SESSION_ALREADY_COMPLETED","Completed workouts cannot be resumed",409);resumed=true;}catch(error){if(error.code!=="SESSION_NOT_FOUND")throw error;runtime=sessionService.startSession({userId:req.auth.userId,sessionId:workoutSessionId,programId:resolved.challenge.id,exerciseId:resolved.canonical.activities[0]?.exerciseId,payload:{sourceMetadata:resolved.source,canonicalWorkout:resolved.canonical}}).session;}challengeEngineService.markCommitmentStarted(req.auth.userId,req.params.userChallengeId,req.params.sessionId,workoutSessionId);return ok(res,req.requestId,{workoutSessionId,workout:runtime.canonicalWorkout,source:runtime.sourceMetadata,runtimeUrl:`/workout.html?sessionId=${encodeURIComponent(workoutSessionId)}`,resumed},resumed?200:201);}));
  app.put("/api/me/challenges/:userChallengeId/activities/:activityId", requireAuth, challengeLimit, asyncHandler(async(req,res)=>ok(res,req.requestId,challengeEngineService.logActivity(req.auth.userId,req.params.userChallengeId,req.params.activityId,req.body||{}))));
  app.post("/api/me/challenges/:userChallengeId/days/:dayId/complete", requireAuth, challengeLimit, asyncHandler(async(req,res)=>ok(res,req.requestId,challengeEngineService.completeDay(req.auth.userId,req.params.userChallengeId,req.params.dayId,req.body||{}))));
  app.patch("/api/me/challenges/:userChallengeId/status", requireAuth, challengeLimit, asyncHandler(async(req,res)=>ok(res,req.requestId,challengeEngineService.setStatus(req.auth.userId,req.params.userChallengeId,req.body?.status))));

  app.get("/api/me/experience-capabilities", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, memberExperienceCapabilityService.get(req.auth.userId))));
  app.post("/api/me/greatness/activities", requireAuth, createRateLimiter({ windowMs: 60_000, max: 20 }), asyncHandler(async (req, res) => {
    const before = new Map(steppingService.challengeList(req.auth.userId).map(item => [item.challengeId, item.completed]));
    const activity = steppingService.complete(req.auth.userId, req.body);
    if (activity.status === "completed" && activity.validation?.state === "valid" && gamificationEventService) {
      try {
        gamificationEventService.recordGreatnessActivity({ userId:req.auth.userId,activity });
        for (const challenge of steppingService.challengeList(req.auth.userId)) if (challenge.completed && !before.get(challenge.challengeId)) gamificationEventService.recordGreatnessChallenge({ userId:req.auth.userId,activity,challengeId:challenge.challengeId });
        achievementService?.replay();
      } catch (error) { console.error("Greatness gamification capture failed", { errorCode:"GREATNESS_EVENT_CAPTURE_FAILED",requestId:req.requestId }); }
    }
    return ok(res, req.requestId, activity, 201);
  }));
  app.post("/api/me/greatness/activities/start-with-route", requireAuth, createRateLimiter({ windowMs:60_000,max:20 }), asyncHandler(async(req,res)=>
    ok(res,req.requestId,steppingService.start(req.auth.userId,req.body),201)));
  // Private, additive evidence only: this route never creates an activity or emits rewards.
  app.post("/api/me/greatness/healthkit/evidence", requireAuth, createRateLimiter({ name:"healthkit-evidence",windowMs:60_000,max:30 }), asyncHandler(async(req,res)=>{
    res.set("Cache-Control","private, no-store");
    return ok(res,req.requestId,healthKitEvidenceService.ingest(req.auth.userId,req.body),202);
  }));
  app.get("/api/me/greatness/healthkit/diagnostic", requireAuth, asyncHandler(async(req,res)=>{
    res.set("Cache-Control","private, no-store");
    return ok(res,req.requestId,healthKitEvidenceService.diagnostic(req.auth.userId));
  }));
  app.post("/api/me/greatness/nearby-trails/search", requireAuth, createRateLimiter({ windowMs: 60_000, max: 10 }), asyncHandler(async (req, res) =>
    ok(res, req.requestId, await nearbyTrailService.search(req.auth.userId, req.body))));
  app.post("/api/me/greatness/trails/text-search", requireAuth, createRateLimiter({ windowMs: 60_000, max: 10 }), asyncHandler(async (req, res) =>
    ok(res, req.requestId, await nearbyTrailService.textSearch(req.auth.userId, req.body))));
  app.get("/api/me/greatness/nearby-trails/provider-health", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, nearbyTrailService.health())));
  app.get("/api/browser-config", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    const applicationCommit = String(env.RENDER_GIT_COMMIT || env.APPLICATION_COMMIT || "");
    return ok(res, req.requestId, {
      googleMapsBrowserApiKey: env.VITE_GOOGLE_MAPS_BROWSER_API_KEY || null,
      debugMapEnabled: String(env.DEBUG_MAP || "").toLowerCase() === "true",
      motion3dProduction: String(env.MOTION_3D_PRODUCTION || "").toLowerCase() === "true",
      applicationCommit: /^[0-9a-f]{7,64}$/i.test(applicationCommit) ? applicationCommit : "unknown"
    });
  });
  app.get("/api/me/greatness/trails/:trailId", requireAuth, asyncHandler(async (req, res) => { const route = trailRouteStore.get(req.params.trailId); if (!route) throw new ApiError("TRAIL_ROUTE_NOT_FOUND", "Trail route not found", 404); return ok(res, req.requestId, route); }));
  const goalRouteLimit=createRateLimiter({name:"walking-routes",windowMs:60_000,max:routePlanningConfig.GOOGLE_WALKING_ROUTE_RATE_LIMIT_PER_MINUTE});
  const goalRouteResponse=async(req)=>{const requestedTargetDistanceMeters=Number(req.body?.targetDistanceMeters),goalRevision=Number(req.body?.goalRevision)||0;const planned=await walkingRouteService.generate({...req.body,trailId:req.params.trailId});return{...planned,requestedTargetDistanceMeters,goalRevision};};
  app.post("/api/me/greatness/trails/:trailId/goal-routes", requireAuth, goalRouteLimit, asyncHandler(async (req, res) => ok(res,req.requestId,await goalRouteResponse(req))));
  app.post("/api/me/greatness/trails/:trailId/goal-routes/alternatives", requireAuth, goalRouteLimit, asyncHandler(async (req,res)=>{req.body={...req.body,routeType:req.body?.routeType||"loop"};return ok(res,req.requestId,await goalRouteResponse(req));}));
  app.post("/api/me/greatness/challenges/:challengeId/route-suggestions", requireAuth, goalRouteLimit, asyncHandler(async(req,res)=>{const discovery=await nearbyTrailService.search(req.auth.userId,req.body),suggestions=[];for(const place of discovery.trails.slice(0,4)){const planned=await walkingRouteService.generate({trailId:place.trailRouteId||place.id,place,startPoint:req.body?.startPoint,targetDistanceMeters:req.body?.targetDistanceMeters,routeType:req.body?.routeType});suggestions.push({...place,routeOption:planned.options[0],routeAttemptCount:planned.attemptCount});}suggestions.sort((a,b)=>(a.routeOption.routeSource==="verified_geometry"?-1:0)-(b.routeOption.routeSource==="verified_geometry"?-1:0)||(a.routeOption.distanceErrorPercent??Infinity)-(b.routeOption.distanceErrorPercent??Infinity)||(a.distanceFromUserMeters??Infinity)-(b.distanceFromUserMeters??Infinity));return ok(res,req.requestId,{challengeId:req.params.challengeId,targetDistanceMeters:Number(req.body?.targetDistanceMeters),suggestions});}));
  app.post("/api/me/greatness/trails/:trailId/contributions", requireAuth, createRateLimiter({name:"trail-contribution-upload",windowMs:3600000,max:10}), asyncHandler(async(req,res)=>ok(res,req.requestId,trailContributionService.create(req.auth.userId,req.params.trailId,req.body),201)));
  app.delete("/api/me/greatness/trail-contributions/:contributionId", requireAuth, asyncHandler(async(req,res)=>ok(res,req.requestId,trailContributionService.remove(req.auth.userId,req.params.contributionId))));
  app.post("/api/me/greatness/trail-contributions/:contributionId/reports", requireAuth, createRateLimiter({name:"trail-contribution-report",windowMs:3600000,max:20}), asyncHandler(async(req,res)=>ok(res,req.requestId,trailContributionService.report(req.auth.userId,req.params.contributionId,req.body?.reason),201)));
  app.get("/api/greatness/trails/:trailId/gallery", asyncHandler(async(req,res)=>ok(res,req.requestId,trailContributionService.gallery(req.params.trailId,req.query.sort))));
  const requireTrailAdmin = (req, _res, next) => ["super_admin", "admin"].includes(req.authz?.role || req.auth?.role) ? next() : next(new ApiError("FORBIDDEN", "Trail route management requires an admin role", 403));
  app.get("/api/admin/diagnostics/greatness/most-recent-completed", requireAuth, requireTrailAdmin, asyncHandler(async(req,res)=>{
    res.set("Cache-Control","private, no-store");
    return ok(res,req.requestId,steppingService.mostRecentCompletedDiagnostic());
  }));
  app.patch("/api/admin/trail-contributions/:contributionId/moderation", requireAuth, requireTrailAdmin, asyncHandler(async(req,res)=>ok(res,req.requestId,trailContributionService.moderate(req.auth.userId,req.params.contributionId,req.body?.status))));
  app.get("/api/admin/trail-routes", requireAuth, requireTrailAdmin, asyncHandler(async (req, res) => ok(res, req.requestId, { routes: trailRouteStore.list() })));
  app.post("/api/admin/trail-routes", requireAuth, requireTrailAdmin, asyncHandler(async (req, res) => { const geometry = req.body?.importFormat === "gpx" ? parseGpx(req.body.importData) : req.body?.importFormat === "geojson" ? parseGeoJSON(req.body.importData) : req.body?.geometry; return ok(res, req.requestId, trailRouteStore.save({ ...req.body, geometry }), 201); }));
  app.patch("/api/admin/trail-routes/:trailId/disable", requireAuth, requireTrailAdmin, asyncHandler(async (req, res) => { const route = trailRouteStore.disable(req.params.trailId); if (!route) throw new ApiError("TRAIL_ROUTE_NOT_FOUND", "Trail route not found", 404); return ok(res, req.requestId, route); }));
  app.get("/admin-trail-routes.html", requireAuth, requireTrailAdmin, (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "admin-trail-routes.html")));
  app.post("/api/me/greatness/operational-events", requireAuth, createRateLimiter({ windowMs: 60_000, max: 120 }), asyncHandler(async (req, res) =>
    ok(res, req.requestId, steppingService.recordOperationalEvent(req.auth.userId, req.body?.eventName), 202)));
  app.get("/api/me/greatness/activities/:activityId", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, steppingService.activity(req.auth.userId, req.params.activityId))));
  app.get("/api/me/greatness/activities/:activityId/verification-diagnostic", requireAuth, asyncHandler(async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    return ok(res, req.requestId, steppingService.diagnostic(req.auth.userId, req.params.activityId));
  }));
  app.get("/api/me/greatness/activities/:activityId/route", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, steppingService.route(req.auth.userId, req.params.activityId))));
  app.delete("/api/me/greatness/activities/:activityId", requireAuth, createRateLimiter({ windowMs: 60_000, max: 20 }), asyncHandler(async (req, res) =>
    ok(res, req.requestId, steppingService.remove(req.auth.userId, req.params.activityId))));
  app.post("/api/me/greatness/membership", requireAuth, createRateLimiter({ windowMs: 60_000, max: 20 }), asyncHandler(async (req, res) =>
    ok(res, req.requestId, steppingService.join(req.auth.userId, req.body?.visibilityPreferences), 201)));
  app.delete("/api/me/greatness/membership", requireAuth, createRateLimiter({ windowMs: 60_000, max: 20 }), asyncHandler(async (req, res) =>
    ok(res, req.requestId, steppingService.leave(req.auth.userId))));
  app.patch("/api/me/greatness/membership/settings", requireAuth, createRateLimiter({ windowMs: 60_000, max: 20 }), asyncHandler(async (req, res) =>
    ok(res, req.requestId, steppingService.updateSettings(req.auth.userId, req.body?.visibilityPreferences))));
  app.get("/api/me/greatness/movement-feed", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, { events: steppingService.feed(req.auth.userId) })));
  app.get("/api/me/greatness/community-summary", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, steppingService.weeklySummary(req.auth.userId))));
  app.get("/api/me/greatness/challenges", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, { challenges: steppingService.challengeList(req.auth.userId) })));
  app.post("/api/me/greatness/challenges/:challengeId/enrollment", requireAuth, createRateLimiter({ windowMs: 60_000, max: 20 }), asyncHandler(async (req, res) =>
    ok(res, req.requestId, steppingService.enroll(req.auth.userId, req.params.challengeId), 201)));

  app.get("/api/me/membership", requireAuth, asyncHandler(async (req, res) => {
    const membership = membershipService.getMembership(req.auth.userId);
    return ok(res, req.requestId, {
      ...membership,
      billingBypass: hasOperatorBillingBypass(req) ? { hasAccess: true, reason: "admin_operator_bypass" } : null
    });
  }));

  app.get("/api/me/onboarding-status", requireAuth, asyncHandler(async (req, res) => {
    const result = userDataService.getOnboardingStatus(req.auth.userId);
    return ok(res, req.requestId, result, 200);
  }));

  app.get("/api/me/retention/intake", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, journeyIntakeService.get(req.auth.userId), 200)));
  app.patch("/api/me/retention/intake", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, journeyIntakeService.patch(req.auth.userId, req.body), 200)));
  app.post("/api/me/retention/intake/submit", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, journeyIntakeService.submit(req.auth.userId), 200)));
  app.get("/api/me/retention/intake/progress", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, journeyIntakeService.progress(req.auth.userId), 200)));
  app.get("/api/me/journey-profile", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, journeyIntakeService.get(req.auth.userId).journeyProfile, 200)));
  app.get("/api/me/personalization", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, personalizationService.getPersonalization(req.auth.userId), 200)));
  app.get("/api/me/member-home", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, memberHomeService.read(req.auth.userId), 200)));

  const permission = (name) => requirePermission(authorizationResolver, name);
  const crmActor = req => ({ userId:req.auth.userId, role:req.authz.role });
  app.get("/admin/members.html", (_req,res)=>res.sendFile(path.join(PUBLIC_DIR,"admin-members.html")));
  app.get("/admin/client.html", (_req,res)=>res.sendFile(path.join(PUBLIC_DIR,"admin-client.html")));
  app.get("/inbox.html", (_req,res)=>res.sendFile(path.join(PUBLIC_DIR,"inbox.html")));
  app.get("/api/admin/members", requireAuth, permission(authorizationResolver.PERMISSIONS.CLIENT_CRM_READ), asyncHandler(async(req,res)=>ok(res,req.requestId,clientCrmService.directory(crmActor(req),req.query))));
  app.get("/api/admin/clients/:clientUserId/overview", requireAuth, permission(authorizationResolver.PERMISSIONS.CLIENT_CRM_READ), asyncHandler(async(req,res)=>ok(res,req.requestId,clientCrmService.overview(crmActor(req),req.params.clientUserId))));
  app.get("/api/admin/clients/:clientUserId/intake", requireAuth, permission(authorizationResolver.PERMISSIONS.CLIENT_CRM_READ), asyncHandler(async(req,res)=>ok(res,req.requestId,clientCrmService.intake(crmActor(req),req.params.clientUserId))));
  app.get("/api/admin/clients/:clientUserId/assessments", requireAuth, permission(authorizationResolver.PERMISSIONS.CLIENT_CRM_READ), asyncHandler(async(req,res)=>ok(res,req.requestId,clientCrmService.assessments(crmActor(req),req.params.clientUserId))));
  app.post("/api/admin/clients/:clientUserId/conversation", trainerWriteLimit, requireAuth, permission(authorizationResolver.PERMISSIONS.CLIENT_MESSAGES_WRITE), asyncHandler(async(req,res)=>ok(res,req.requestId,clientCrmService.conversation(crmActor(req),req.params.clientUserId,true),201)));
  app.get("/api/me/conversations", requireAuth, asyncHandler(async(req,res)=>ok(res,req.requestId,{conversations:clientMessagingStore.listForUser(req.auth.userId)})));
  app.get("/api/me/conversations/:conversationId/messages", requireAuth, asyncHandler(async(req,res)=>ok(res,req.requestId,clientCrmService.viewMessages(crmActor(req),req.params.conversationId))));
  app.post("/api/me/conversations/:conversationId/messages", trainerWriteLimit, requireAuth, asyncHandler(async(req,res)=>ok(res,req.requestId,clientCrmService.send(crmActor(req),req.params.conversationId,req.body?.body),201)));
  const trainerClientGuard = (name) => [requireAuth, permission(name)];
  app.get("/api/trainer/workspace", ...trainerClientGuard(authorizationResolver.PERMISSIONS.TRAINER_WORKSPACE_READ), asyncHandler(async (req, res) =>
    ok(res, req.requestId, { trainer: { userId: req.auth.userId }, clientCount: trainerWorkspaceService.listClients(req.auth.userId).length, memberExperienceUrl: "/dashboard.html" })));
  app.get("/api/trainer/clients", ...trainerClientGuard(authorizationResolver.PERMISSIONS.TRAINER_CLIENTS_READ), asyncHandler(async (req, res) =>
    ok(res, req.requestId, { clients: trainerWorkspaceService.listClients(req.auth.userId, req.query) })));
  app.get("/api/trainer/clients/:clientUserId", ...trainerClientGuard(authorizationResolver.PERMISSIONS.TRAINER_CLIENTS_READ), asyncHandler(async (req, res) =>
    ok(res, req.requestId, trainerWorkspaceService.detail(req.auth.userId, req.params.clientUserId))));
  app.get("/api/trainer/clients/:clientUserId/program", ...trainerClientGuard(authorizationResolver.PERMISSIONS.TRAINER_CLIENTS_READ), asyncHandler(async (req, res) =>
    ok(res, req.requestId, trainerWorkspaceService.program(req.auth.userId, req.params.clientUserId))));
  app.put("/api/trainer/clients/:clientUserId/program", trainerWriteLimit, ...trainerClientGuard(authorizationResolver.PERMISSIONS.TRAINER_CLIENT_PROGRAMS_WRITE), asyncHandler(async (req, res) =>
    ok(res, req.requestId, trainerWorkspaceService.assignProgram(req.auth.userId, req.params.clientUserId, req.body))));
  app.get("/api/trainer/clients/:clientUserId/notes", ...trainerClientGuard(authorizationResolver.PERMISSIONS.TRAINER_CLIENT_NOTES_READ), asyncHandler(async (req, res) =>
    ok(res, req.requestId, { notes: trainerWorkspaceService.notes(req.auth.userId, req.params.clientUserId) })));
  app.post("/api/trainer/clients/:clientUserId/notes", trainerWriteLimit, ...trainerClientGuard(authorizationResolver.PERMISSIONS.TRAINER_CLIENT_NOTES_WRITE), asyncHandler(async (req, res) =>
    ok(res, req.requestId, trainerWorkspaceService.addNote(req.auth.userId, req.params.clientUserId, req.body), 201)));

  app.get("/api/admin/trainer-assignments", requireAuth, permission(authorizationResolver.PERMISSIONS.ADMIN_TRAINER_ASSIGNMENTS_MANAGE), asyncHandler(async (req, res) =>
    ok(res, req.requestId, { assignments: trainerWorkspaceStore.listAssignments() })));
  app.post("/api/admin/trainer-assignments", trainerWriteLimit, requireAuth, permission(authorizationResolver.PERMISSIONS.ADMIN_TRAINER_ASSIGNMENTS_MANAGE), asyncHandler(async (req, res) => {
    const trainerUserId = String(req.body?.trainerUserId || ""), clientUserId = String(req.body?.clientUserId || "");
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(trainerUserId) || !/^[A-Za-z0-9._-]{1,128}$/.test(clientUserId)) throw new ApiError("INVALID_ASSIGNMENT", "Valid trainerUserId and clientUserId are required", 422);
    if (trainerUserId === clientUserId) throw new ApiError("INVALID_ASSIGNMENT", "Trainer and client must be different users", 422);
    if (authorizationResolver.resolveRole({ userId: trainerUserId }).role !== authorizationResolver.ROLES.TRAINER) throw new ApiError("INVALID_TRAINER", "Trainer is not eligible", 422);
    if (!userStore.listUsers().some((u) => u.userId === clientUserId)) throw new ApiError("INVALID_CLIENT", "Client is not eligible", 422);
    const result = trainerWorkspaceStore.createAssignment({ trainerUserId, clientUserId, assignedByUserId: req.auth.userId });
    return ok(res, req.requestId, result.assignment, result.created ? 201 : 200);
  }));
  app.delete("/api/admin/trainer-assignments/:assignmentId", trainerWriteLimit, requireAuth, permission(authorizationResolver.PERMISSIONS.ADMIN_TRAINER_ASSIGNMENTS_MANAGE), asyncHandler(async (req, res) =>
    ok(res, req.requestId, trainerWorkspaceStore.deactivateAssignment(req.params.assignmentId, req.auth.userId))));

  app.get("/trainer.html", requireAuth, permission(authorizationResolver.PERMISSIONS.TRAINER_WORKSPACE_READ), (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "trainer.html")));
  app.get("/admin-trainer-assignments.html", requireAuth, permission(authorizationResolver.PERMISSIONS.ADMIN_TRAINER_ASSIGNMENTS_MANAGE), (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "admin-trainer-assignments.html")));

  app.get("/api/billing/plan", asyncHandler(async (req, res) => {
    return ok(res, req.requestId, getPublicBillingPlan(process.env));
  }));

  app.post("/api/billing/checkout-session", requireAuth, asyncHandler(async (req, res) => {
    rejectRawPaymentCredentialFields(req.body);
    const checkoutConfig = validateCheckoutConfig(process.env);
    const returnUrl = resolveMembershipReturnUrl({ env: process.env, req });
    const checkout = await membershipService.createCheckoutSession({
      userId: req.auth.userId,
      email: req.auth.email,
      secretKey: checkoutConfig.secretKey,
      priceId: checkoutConfig.priceId,
      returnUrl
    });
    const status = checkout.duplicateProtected ? 200 : 201;
    return ok(res, req.requestId, checkout, status);
  }));

  app.post("/api/billing/create-checkout-session", requireAuth, asyncHandler(async (req, res) => {
    rejectRawPaymentCredentialFields(req.body);
    const checkoutConfig = validateCheckoutConfig(process.env);
    const returnUrl = resolveMembershipReturnUrl({ env: process.env, req });
    const checkout = await membershipService.createCheckoutSession({
      userId: req.auth.userId,
      email: req.auth.email,
      secretKey: checkoutConfig.secretKey,
      priceId: checkoutConfig.priceId,
      returnUrl
    });
    const status = checkout.duplicateProtected ? 200 : 201;
    return ok(res, req.requestId, checkout, status);
  }));

  app.post("/api/billing/portal-session", requireAuth, asyncHandler(async (req, res) => {
    const portalConfig = validatePortalConfig(process.env);
    const portal = await membershipService.createPortalSession({
      userId: req.auth.userId,
      secretKey: portalConfig.secretKey,
      returnUrl: resolveMembershipReturnUrl({ env: process.env, req })
    });
    return ok(res, req.requestId, portal, 201);
  }));

  app.post("/api/billing/webhook", asyncHandler(async (req, res) => {
    const webhookConfig = validateWebhookConfig(process.env);
    const event = membershipService.verifyStripeWebhookSignature({
      rawBody: req.rawBody,
      signatureHeader: req.get("stripe-signature"),
      webhookSecret: webhookConfig.webhookSecret
    });
    const result = membershipService.handleStripeEvent(event);
    return ok(res, req.requestId, { received: true, ...result });
  }));

  // ---- Public event challenge endpoints (Phase 26 push-up pilot) ----
  app.post("/api/challenges/pushup/results", requireCriticalRouteAuth, challengeLimit, asyncHandler(async (req, res) => {
    if (!insecureTestCompatibility && (typeof req.body?.submissionId !== "string" || !/^[a-zA-Z0-9._:-]{8,128}$/.test(req.body.submissionId))) throw new ApiError("VALIDATION_ERROR","submissionId is required",400,{field:"submissionId"});
    const memberId=req.auth?.userId || "test-compatibility-user", firstVerifiedSession=challengeService.getMemberPushupSummary(memberId).completedSessions===0;
    const result = challengeService.savePushupResult({ ...(req.body || {}), userId:memberId });
    if (gamificationEventService) try { gamificationEventService.recordPushupSession({userId:memberId,result,firstVerifiedSession}); achievementService?.replay(); } catch (error) { console.error("Push-Up gamification capture failed", {errorCode:"PUSHUP_EVENT_CAPTURE_FAILED",requestId:req.requestId}); }
    return ok(res, req.requestId, { result }, 201);
  }));

  app.get("/api/challenges/pushup/leaderboard", asyncHandler(async (req, res) => {
    const leaderboard = challengeService.getPushupLeaderboard({ limit: req.query?.limit });
    return ok(res, req.requestId, leaderboard, 200);
  }));

  app.post("/api/pilot/events", requireCriticalRouteAuth, telemetryLimit, asyncHandler(async (req, res) => {
    const eventName = String(req.body?.event || "").trim();
    const allowedEvents = new Set(["workout_opened","workout_started","workout_completed","challenge_started","challenge_completed","client_error"]);
    if (!allowedEvents.has(eventName)) {
      throw new ApiError("VALIDATION_ERROR", "Pilot event name is required", 400);
    }
    const candidate=req.body?.payload;
    if (!candidate || typeof candidate!=="object" || Array.isArray(candidate) || Object.getPrototypeOf(candidate)!==Object.prototype) throw new ApiError("VALIDATION_ERROR","Pilot event payload must be an object",400);
    const allowedPayloadFields=new Set(["route","status","durationMs","label","code"]);
    if (Object.keys(candidate).some(k=>!allowedPayloadFields.has(k)||["__proto__","constructor","prototype"].includes(k))) throw new ApiError("VALIDATION_ERROR","Pilot event payload contains unsupported fields",400);
    const payload={};
    for(const [key,value] of Object.entries(candidate)){if(!["string","number","boolean"].includes(typeof value)||typeof value==="string"&&value.length>120)throw new ApiError("VALIDATION_ERROR","Pilot event payload value is invalid",400);payload[key]=value;}
    const record = {
      at: new Date().toISOString(),
      requestId: req.requestId,
      event: eventName,
      userId: req.auth?.userId || "test-compatibility-user",
      route: req.path,
      payload
    };
    appendPilotEvent(record);
    return ok(res, req.requestId, { accepted: true }, 202);
  }));


  function requireTemplateBuilderRole(req, _res, next) {
    if (!req.auth?.userId) throw new ApiError("UNAUTHENTICATED", "Authentication required", 401);
    const role = String(req.authz?.role || req.auth?.role || "user").toLowerCase();
    if (!["super_admin", "admin", "trainer"].includes(role)) {
      throw new ApiError("FORBIDDEN", "Exercise template builder requires admin or trainer role", 403);
    }
    return next();
  }

  function templateActor(req) {
    return {
      userId: req.auth?.userId || null,
      email: req.auth?.email || null,
      role: req.authz?.role || req.auth?.role || "user"
    };
  }

  // ---- Phase 29 coach/admin custom exercise template draft endpoints ----
  app.post("/api/exercise-templates", requireAuth, requireTemplateBuilderRole, asyncHandler(async (req, res) => {
    const template = exerciseTemplateService.createDraft(req.body || {}, templateActor(req));
    return ok(res, req.requestId, { template }, 201);
  }));

  app.get("/api/exercise-templates", requireAuth, requireTemplateBuilderRole, asyncHandler(async (req, res) => {
    const templates = exerciseTemplateService.listTemplates();
    return ok(res, req.requestId, { templates, count: templates.length });
  }));

  app.get("/api/exercise-templates/active/scoring", requireAuth, asyncHandler(async (req, res) => {
    const templates = exerciseTemplateService.getActiveScoringTemplates().map((template) => ({
      id: template.id,
      exerciseName: template.exerciseName,
      movementPattern: template.movementPattern,
      status: template.status,
      phases: template.phases,
      requiredKeypoints: template.requiredKeypoints,
      measurementRules: template.measurementRules,
      repCycle: template.repCycle,
      feedbackRules: template.feedbackRules
    }));
    return ok(res, req.requestId, { templates, count: templates.length });
  }));

  app.get("/api/exercise-templates/:id", requireAuth, requireTemplateBuilderRole, asyncHandler(async (req, res) => {
    const template = exerciseTemplateService.getTemplate(req.params.id);
    return ok(res, req.requestId, { template });
  }));

  app.put("/api/exercise-templates/:id", requireAuth, requireTemplateBuilderRole, asyncHandler(async (req, res) => {
    if (["approved", "active"].includes(String(req.body?.status || ""))) {
      throw new ApiError("VALIDATION_ERROR", "Use the approval route to approve or activate templates", 400);
    }
    const template = exerciseTemplateService.updateTemplate(req.params.id, req.body || {});
    return ok(res, req.requestId, { template });
  }));

  app.post("/api/exercise-templates/:id/demo-captures", requireAuth, requireTemplateBuilderRole, asyncHandler(async (req, res) => {
    if (req.body?.rawVideo || req.body?.video || req.body?.videoBlob || req.body?.videoData) {
      throw new ApiError("VALIDATION_ERROR", "Raw video storage is not enabled for exercise template demos", 400);
    }
    const result = exerciseTemplateService.addDemoCapture(req.params.id, req.body || {});
    return ok(res, req.requestId, result, 201);
  }));

  app.post("/api/exercise-templates/:id/test-runs", requireAuth, requireTemplateBuilderRole, asyncHandler(async (req, res) => {
    if (req.body?.rawVideo || req.body?.video || req.body?.videoBlob || req.body?.videoData) {
      throw new ApiError("VALIDATION_ERROR", "Raw video storage is not enabled for exercise template test runs", 400);
    }
    const result = exerciseTemplateService.addTestRun(req.params.id, req.body || {});
    return ok(res, req.requestId, result, 201);
  }));

  app.post("/api/exercise-templates/:id/approve", requireAuth, requireTemplateBuilderRole, asyncHandler(async (req, res) => {
    const template = exerciseTemplateService.approveTemplate(req.params.id, templateActor(req), { activate: req.body?.activate === true });
    return ok(res, req.requestId, { template });
  }));

  // ---- Exercise DB endpoints ----
  app.get("/api/exercises/index", (_req, res) => {
    const idx = loadExerciseIndex();
    if (!idx) {
      return res.status(404).json({
        ok: false,
        error: "Missing exercise index.json. Run: npm run build:exercise-index and commit it."
      });
    }
    const exercises = normalizeExerciseIndexList(idx);
    console.info("[EXERCISE_LIBRARY] index", { count: exercises.length, shape: Array.isArray(idx) ? "array" : "object" });
    res.json({ ok: true, exercises, count: exercises.length });
  });

  app.get("/api/exercises/search", (req, res) => {
    const q = String(req.query.q || "").trim().toLowerCase();
    const idx = loadExerciseIndex();
    if (!idx) return res.status(404).json({ ok: false, error: "Missing exercise index.json" });

    const list = normalizeExerciseIndexList(idx);
    const results = (!q ? list : list.filter(x => exerciseSearchText(x).includes(q))).slice(0, q ? 100 : 50);

    console.info("[EXERCISE_LIBRARY] search", { q, total: list.length, results: results.length });
    res.json({ ok: true, q, results, count: results.length });
  });

  app.get("/api/exercises/:slug", (req, res) => {
    const slug = req.params.slug;
    const idx = loadExerciseIndex();
    if (!idx) return res.status(404).json({ ok: false, error: "Missing exercise index.json" });

    const item = findExerciseBySlug(idx, slug);
    if (!item) return res.status(404).json({ ok: false, error: "Unknown exercise slug", slug });

    if (!item.json) {
      return res.status(404).json({ ok: false, error: "Exercise folder has no JSON file", item });
    }

    const jsonPath = path.join(PUBLIC_DIR, item.json);
    if (!fs.existsSync(jsonPath)) {
      return res.status(404).json({ ok: false, error: "JSON path missing on disk", jsonPath, item });
    }

    try {
      const data = readJSON(jsonPath);
      res.json({ ok: true, meta: item, data });
    } catch (e) {
      res.status(500).json({ ok: false, error: "Failed to parse JSON", message: e.message, meta: item });
    }
  });

  // ---- Authenticated Exercise Hub (canonical, member-safe projections) ----
  app.get("/api/me/exercises", requireAuth, asyncHandler(async (req,res)=>ok(res,req.requestId,memberExerciseService.catalog(req.query))));
  app.get("/api/me/exercises/preferences", requireAuth, asyncHandler(async (req,res)=>ok(res,req.requestId,memberExerciseService.preferences(req.auth.userId))));
  app.delete("/api/me/exercises/recent", requireAuth, asyncHandler(async (req,res)=>ok(res,req.requestId,memberExerciseService.clearRecent(req.auth.userId))));
  app.get("/api/me/exercises/:exerciseId", requireAuth, asyncHandler(async (req,res)=>{const value=memberExerciseService.get(req.params.exerciseId);memberExerciseService.recordView(req.auth.userId,value.exerciseId);return ok(res,req.requestId,value);}));
  app.get("/api/me/exercises/:exerciseId/relationships", requireAuth, asyncHandler(async (req,res)=>ok(res,req.requestId,memberExerciseService.relationships(req.params.exerciseId))));
  app.get("/api/me/exercises/:exerciseId/program-context", requireAuth, asyncHandler(async (req,res)=>ok(res,req.requestId,memberExerciseService.programContext(req.auth.userId,req.params.exerciseId))));
  app.put("/api/me/exercises/:exerciseId/favorite", requireAuth, asyncHandler(async (req,res)=>ok(res,req.requestId,memberExerciseService.favorite(req.auth.userId,req.params.exerciseId,true))));
  app.delete("/api/me/exercises/:exerciseId/favorite", requireAuth, asyncHandler(async (req,res)=>ok(res,req.requestId,memberExerciseService.favorite(req.auth.userId,req.params.exerciseId,false))));

  // Bearer-authenticated internal APIs are not cookie-authenticated and therefore
  // do not accept ambient browser authority. Explicit content permissions are
  // independently checked for read, author, review, and publish operations.
  const exerciseRead=permission(authorizationResolver.PERMISSIONS.EXERCISE_CONTENT_READ);
  const exerciseManage=permission(authorizationResolver.PERMISSIONS.EXERCISE_CONTENT_MANAGE);
  const exerciseReview=permission(authorizationResolver.PERMISSIONS.EXERCISE_CONTENT_REVIEW);
  const exercisePublish=permission(authorizationResolver.PERMISSIONS.EXERCISE_CONTENT_PUBLISH);
  app.get("/internal/exercises",requireAuth,exerciseRead,(req,res)=>ok(res,req.requestId,{exercises:exerciseCurationService.list()}));
  app.get("/internal/exercises/validation-report",requireAuth,exerciseRead,(req,res)=>ok(res,req.requestId,{drafts:exerciseCurationService.validationReport()}));
  app.get("/internal/exercises/content-quality",requireAuth,exerciseRead,(req,res)=>ok(res,req.requestId,{exercises:exerciseCurationService.quality()}));
  app.get("/internal/exercises/:exerciseId",requireAuth,exerciseRead,(req,res)=>ok(res,req.requestId,exerciseCurationService.get(req.params.exerciseId)));
  app.post("/internal/exercises/:exerciseId/drafts",requireAuth,exerciseManage,(req,res)=>ok(res,req.requestId,exerciseCurationService.create(req.params.exerciseId,req.body,req.auth.userId),201));
  app.put("/internal/exercises/:exerciseId/drafts/:draftId",requireAuth,exerciseManage,(req,res)=>ok(res,req.requestId,exerciseCurationService.update(req.params.exerciseId,req.params.draftId,req.body,req.auth.userId)));
  app.post("/internal/exercises/:exerciseId/drafts/:draftId/validate",requireAuth,exerciseManage,(req,res)=>ok(res,req.requestId,exerciseCurationService.validate(req.params.exerciseId,req.params.draftId,req.auth.userId)));
  app.post("/internal/exercises/:exerciseId/drafts/:draftId/review",requireAuth,exerciseReview,(req,res)=>ok(res,req.requestId,exerciseCurationService.review(req.params.exerciseId,req.params.draftId,req.body||{},req.auth.userId)));
  app.post("/internal/exercises/:exerciseId/drafts/:draftId/publish",requireAuth,exercisePublish,(req,res)=>ok(res,req.requestId,exerciseCurationService.publish(req.params.exerciseId,req.params.draftId,req.auth.userId),201));
  app.post("/internal/exercises/releases/:releaseId/rollback",requireAuth,exercisePublish,(req,res)=>ok(res,req.requestId,exerciseCurationService.rollback(req.params.releaseId,req.auth.userId),201));

  // ---- Structured Session API (pilot hardening) ----
  app.get("/api/yoga/catalogue", requireAuth, requireMembershipEntitlement, asyncHandler(async (req,res)=>ok(res,req.requestId,yogaService.catalogue(),200)));
  app.get("/api/yoga/sessions/:sessionId", requireAuth, requireMembershipEntitlement, asyncHandler(async (req,res)=>ok(res,req.requestId,yogaService.sessionDetail(req.params.sessionId),200)));
  app.get("/api/yoga/history", requireAuth, requireMembershipEntitlement, asyncHandler(async (req,res)=>ok(res,req.requestId,{sessions:yogaService.history(req.auth.userId)},200)));
  app.post("/api/yoga/sessions/complete", requireAuth, requireMembershipEntitlement, asyncHandler(async (req,res)=>{ensureUserScopedAccess(req,req.body?.userId);return ok(res,req.requestId,yogaService.complete(req.auth.userId,req.body),201);}));
  app.post("/api/sessions", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    ensureUserScopedAccess(req, req.body?.userId);
    const parsed = validateSessionCreate({
      ...(req.body || {}),
      userId: req.auth?.userId || req.body?.userId
    });
    const result = sessionService.startSession(parsed);
    return ok(res, req.requestId, result, 201);
  }));

  app.get("/api/sessions/:id", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) =>
    ok(res, req.requestId, sessionService.getSession({ userId: req.auth.userId, sessionId: req.params.id }), 200)));

  app.patch("/api/sessions/:id/runtime-progress", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    ensureUserScopedAccess(req, req.body?.userId);
    return ok(res, req.requestId, sessionService.updateRuntimeProgress({ userId: req.auth.userId, sessionId: req.params.id, ...(req.body || {}) }), 200);
  }));

  app.post("/api/sessions/:id/reps", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    ensureUserScopedAccess(req, req.body?.userId);
    const parsed = validateRepUpdate({
      ...(req.body || {}),
      userId: req.auth?.userId || req.body?.userId
    }, req.params.id);
    const result = sessionService.appendRepUpdate(parsed);
    return ok(res, req.requestId, result, 200);
  }));

  app.post("/api/sessions/:id/complete", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    ensureUserScopedAccess(req, req.body?.userId);
    const parsed = validateSessionComplete({
      ...(req.body || {}),
      userId: req.auth?.userId || req.body?.userId
    }, req.params.id);
    parsed.correlationId = req.requestId;
    const result = sessionService.completeSession(parsed);
    return ok(res, req.requestId, result, 200);
  }));


  // ---- Phase 32 Nutrition Journal APIs ----
  app.get("/api/nutrition/barcodes/:barcode", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    const result = await nutritionProviderClient.lookupBarcode(req.params.barcode);
    return ok(res, req.requestId, result, 200);
  }));

  app.get("/api/nutrition/foods/search", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    const result = await nutritionProviderClient.searchUsda(req.query.q, req.query.limit);
    return ok(res, req.requestId, result, 200);
  }));

  app.get("/api/nutrition/foods/:fdcId", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    const result = await nutritionProviderClient.getUsdaFood(req.params.fdcId);
    return ok(res, req.requestId, result, 200);
  }));

  app.post("/api/nutrition/drafts/natural-language", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    const result = nutritionService.naturalLanguageDraft(req.auth.userId, req.body?.text || req.body?.description || "");
    return ok(res, req.requestId, result, 201);
  }));

  app.get("/api/me/nutrition/entries", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    const result = nutritionService.listEntries(req.auth.userId, req.query.date);
    return ok(res, req.requestId, result, 200);
  }));

  app.post("/api/me/nutrition/entries", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    const result = nutritionService.createEntry(req.auth.userId, req.body || {});
    return ok(res, req.requestId, result, 201);
  }));

  app.put("/api/me/nutrition/entries/:entryId", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    const result = nutritionService.updateEntry(req.auth.userId, req.params.entryId, req.body || {});
    return ok(res, req.requestId, result, 200);
  }));

  app.delete("/api/me/nutrition/entries/:entryId", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    const result = nutritionService.deleteEntry(req.auth.userId, req.params.entryId);
    return ok(res, req.requestId, result, 200);
  }));

  app.get("/api/me/nutrition/summary", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    const result = nutritionService.summarize(req.auth.userId, req.query.date);
    return ok(res, req.requestId, result, 200);
  }));

  app.get("/api/me/nutrition/recent", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    const result = nutritionService.recent(req.auth.userId, req.query.limit);
    return ok(res, req.requestId, result, 200);
  }));

  app.post("/api/me/nutrition/meals", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    const result = nutritionService.createMeal(req.auth.userId, req.body || {});
    return ok(res, req.requestId, result, 201);
  }));

  app.get("/api/me/nutrition/meals", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    const result = nutritionService.listMeals(req.auth.userId);
    return ok(res, req.requestId, result, 200);
  }));

  app.post("/api/me/nutrition/meals/:mealId/log", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    const result = nutritionService.logMeal(req.auth.userId, req.params.mealId, req.body || {});
    return ok(res, req.requestId, result, 201);
  }));


  app.get("/api/me/nutrition/grocery-options", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, nutritionService.getGroceryOptions(req.query || {}), 200);
  }));

  app.get("/api/me/nutrition/weekly-plan/current", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, nutritionService.currentWeeklyPlan(req.auth.userId, req.query.date), 200);
  }));

  app.post("/api/me/nutrition/weekly-plans", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, nutritionService.createWeeklyPlan(req.auth.userId, req.body || {}), 201);
  }));

  app.patch("/api/me/nutrition/weekly-plans/:planId", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, nutritionService.updateWeeklyPlan(req.auth.userId, req.params.planId, req.body || {}), 200);
  }));

  app.post("/api/me/nutrition/weekly-plans/:planId/grocery-items", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, nutritionService.upsertGroceryItem(req.auth.userId, req.params.planId, req.body || {}), 201);
  }));

  app.patch("/api/me/nutrition/weekly-plans/:planId/grocery-items/:itemId", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, nutritionService.upsertGroceryItem(req.auth.userId, req.params.planId, req.body || {}, req.params.itemId), 200);
  }));

  app.post("/api/me/nutrition/weekly-plans/:planId/generate-missions", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, nutritionService.generateMissions(req.auth.userId, req.params.planId, req.body || {}), 201);
  }));

  app.get("/api/me/nutrition/weekly-plans/:planId/missions", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, nutritionService.listMissions(req.auth.userId, req.params.planId, req.query.date), 200);
  }));

  app.patch("/api/me/nutrition/missions/:missionId", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, nutritionService.updateMission(req.auth.userId, req.params.missionId, req.body || {}), 200);
  }));

  app.post("/api/me/nutrition/missions/:missionId/manual-progress", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, nutritionService.manualProgress(req.auth.userId, req.params.missionId, req.body || {}), 201);
  }));

  app.get("/api/me/nutrition/weekly-plans/:planId/review", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, nutritionService.weeklyReview(req.auth.userId, req.params.planId), 200);
  }));

  app.post("/api/me/nutrition/weekly-plans/ai-draft/validate", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, nutritionService.validateAiDraft(req.body || {}), 200);
  }));

  app.get("/api/me/nutrition/education", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    const result = nutritionService.educationSummary(req.auth.userId, req.query.date);
    return ok(res, req.requestId, { ...result, nutritionPriorities: personalizationService.getNutritionPriorities(req.auth.userId) }, 200);
  }));

  // ---- Explicit profile / OHSA / history endpoints ----
  app.get("/api/me/profile", requireAuth, asyncHandler(async (req, res) => {
    console.info("[me-profile]", { requestId: req.requestId, userId: req.auth?.userId || null });
    const result = userDataService.getProfile(req.auth.userId);
    return ok(res, req.requestId, result, 200);
  }));

  app.put("/api/me/profile", requireAuth, asyncHandler(async (req, res) => {
    console.info("[profile] incoming payload", {
      requestId: req.requestId,
      userId: req.auth?.userId || null,
      payload: req.body
    });

    let profilePayload;
    try {
      profilePayload = validateProfileUpsert(req.body);
    } catch (error) {
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        console.warn("[profile] validation failed", {
          requestId: req.requestId,
          userId: req.auth?.userId || null,
          message: error.message,
          field: error.message?.split(" ")[0] || null,
          payload: req.body
        });
      }
      throw error;
    }

    const result = userDataService.upsertProfile({
      userId: req.auth.userId,
      profilePayload,
      source: "api"
    });
    return ok(res, req.requestId, result, 200);
  }));

  app.post("/api/ohsa", requireAuth, asyncHandler(async (req, res) => {
    const parsed = validateOhsaSubmission(req.body);
    const result = userDataService.submitOhsa({
      userId: req.auth.userId,
      summary: parsed.summary,
      source: parsed.source || "api"
    });
    return ok(res, req.requestId, result, 201);
  }));

  app.get("/api/me/ohsa", requireAuth, asyncHandler(async (req, res) => {
    const result = userDataService.getOhsaHistory(req.auth.userId);
    return ok(res, req.requestId, { ...result, recommendedAssessments: personalizationService.getAssessmentRecommendations(req.auth.userId) }, 200);
  }));

  app.get("/api/me/history", requireAuth, asyncHandler(async (req, res) => {
    const rawLimit = Number.parseInt(String(req.query.limit ?? ""), 10);
    const limit = Number.isFinite(rawLimit) ? rawLimit : 10;
    const result = userDataService.getHistory(req.auth.userId, { limit });
    return ok(res, req.requestId, result, 200);
  }));

  app.get("/api/client-intake", requireAuth, asyncHandler(async (req, res) => {
    const result = userDataService.getClientIntake(req.auth.userId);
    return ok(res, req.requestId, result, 200);
  }));

  app.post("/api/client-intake", requireAuth, asyncHandler(async (req, res) => {
    const intake = validateClientIntake(req.body);
    const result = userDataService.upsertClientIntake({
      userId: req.auth.userId,
      intake,
      source: "api"
    });
    return ok(res, req.requestId, result, 201);
  }));

  app.get("/api/goals-baseline", requireAuth, asyncHandler(async (req, res) => {
    const result = userDataService.getGoalsBaseline(req.auth.userId);
    return ok(res, req.requestId, result, 200);
  }));

  app.post("/api/goals-baseline", requireAuth, asyncHandler(async (req, res) => {
    const goalsBaseline = validateGoalsBaseline(req.body);
    const result = userDataService.upsertGoalsBaseline({
      userId: req.auth.userId,
      payload: goalsBaseline,
      source: "api"
    });
    return ok(res, req.requestId, result, 201);
  }));

  app.get("/api/programs/current", requireAuth, asyncHandler(async (req, res) => {
    const authoritative = programService.view(req.auth.userId);
    if (authoritative.available) return ok(res, req.requestId, authoritative, 200);
    const result = userDataService.getProgram(req.auth.userId);
    return ok(res, req.requestId, { ...result, authoritative, workoutRecommendation: personalizationService.getWorkoutRecommendation(req.auth.userId) }, 200);
  }));

  app.post("/api/programs/authoritative", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, programService.assign(req.auth.userId, req.body), 201)));

  app.patch("/api/programs/authoritative/sessions/:sessionId", requireAuth, asyncHandler(async (req, res) =>
    ok(res, req.requestId, programService.updateSession(req.auth.userId, req.params.sessionId, req.body), 200)));

  app.get("/api/me/generated-workout-plan", requireAuth, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, generatedWorkoutService.readModel(req.auth.userId), 200);
  }));

  app.get("/api/me/generated-workout-progression", requireAuth, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, generatedWorkoutProgressionService.state(req.auth.userId), 200);
  }));

  app.get("/api/me/training-adaptation", requireAuth, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, trainingAdaptationService.read(req.auth.userId), 200);
  }));

  app.post("/api/me/generated-workout-progression/evaluate", requireAuth, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, generatedWorkoutProgressionService.evaluate(req.auth.userId), 200);
  }));

  app.post("/api/me/generated-workout-progression/accept", requireAuth, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, generatedWorkoutProgressionService.accept(req.auth.userId), 200);
  }));

  app.post("/api/me/generated-workout-executions", requireAuth, asyncHandler(async (req, res) => {
    const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
    if (!sessionId || sessionId.length > 128) throw new ApiError("VALIDATION_ERROR", "sessionId is required", 400, { field: "sessionId" });
    return ok(res, req.requestId, generatedWorkoutService.start(req.auth.userId, sessionId), 201);
  }));

  app.patch("/api/me/generated-workout-executions/:executionId", requireAuth, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, generatedWorkoutService.update(req.auth.userId, req.params.executionId, req.body), 200);
  }));

  app.post("/api/me/generated-workout-executions/:executionId/complete", requireAuth, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, generatedWorkoutService.complete(req.auth.userId, req.params.executionId), 200);
  }));

  app.post("/api/programs", requireAuth, asyncHandler(async (req, res) => {
    const program = validateProgramAssignment(req.body);
    const targetUserId = program.clientId;
    ensureUserScopedAccess(req, targetUserId);
    const result = userDataService.assignProgram({
      userId: targetUserId,
      program,
      actorUserId: req.auth.userId,
      source: "api"
    });
    return ok(res, req.requestId, result, 201);
  }));

  app.post("/api/workouts/track", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    const tracking = validateWorkoutTracking(req.body);
    const result = userDataService.appendWorkoutTracking({
      userId: req.auth.userId,
      tracking,
      source: "api"
    });
    return ok(res, req.requestId, result, 201);
  }));

  app.get("/api/workouts/reward/latest", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    const dashboard = userDataService.getProgressDashboard(req.auth.userId);
    return ok(res, req.requestId, {
      userId: req.auth.userId,
      rewardSummary: dashboard.rewardSummary || null
    }, 200);
  }));

  app.get("/api/check-ins", requireAuth, asyncHandler(async (req, res) => {
    const rawLimit = Number.parseInt(String(req.query.limit ?? ""), 10);
    const limit = Number.isFinite(rawLimit) ? rawLimit : 12;
    const result = userDataService.getCheckIns(req.auth.userId, { limit });
    return ok(res, req.requestId, result, 200);
  }));

  app.post("/api/check-ins", requireAuth, asyncHandler(async (req, res) => {
    const checkIn = validateWeeklyCheckIn(req.body);
    const result = userDataService.upsertWeeklyCheckIn({
      userId: req.auth.userId,
      checkIn,
      source: "api"
    });
    return ok(res, req.requestId, result, 201);
  }));

  app.get("/api/progress/dashboard", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    const result = userDataService.getProgressDashboard(req.auth.userId);
    return ok(res, req.requestId, { ...result, dashboardConfiguration: personalizationService.getDashboardConfiguration(req.auth.userId) }, 200);
  }));

  // The coach reads the same member-scoped authoritative stores as the rest of
  // the platform. Client-supplied context and user IDs are never accepted.
  app.get("/api/me/ai-coach", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, aiCoachService.overview(req.auth.userId), 200);
  }));

  app.post("/api/me/ai-coach/messages", requireAuth, requireMembershipEntitlement,
    createRateLimiter({ name: "ai-coach", max: aiCoachConfig.requestsPerMinute, windowMs: 60_000 }), asyncHandler(async (req, res) => {
      return ok(res, req.requestId, await aiCoachService.ask(req.auth.userId, req.body?.message), 200);
    }));

  app.post("/api/me/ai-coach/stream", requireAuth, requireMembershipEntitlement,
    createRateLimiter({ name: "ai-coach-stream", max: aiCoachConfig.requestsPerMinute, windowMs: 60_000 }), asyncHandler(async (req, res) => {
      const controller = new AbortController(); req.once("close", () => { if (!res.writableEnded) controller.abort(); });
      res.status(200).set({ "content-type":"application/x-ndjson; charset=utf-8", "cache-control":"no-cache, no-store", "x-accel-buffering":"no" });
      for await (const event of aiCoachService.generate(req.auth.userId, req.body?.message, { signal: controller.signal })) { if (res.destroyed) break; res.write(`${JSON.stringify(event)}\n`); }
      if (!res.writableEnded) res.end();
    }));

  app.delete("/api/me/ai-coach/generation", requireAuth, requireMembershipEntitlement, (req, res) => ok(res, req.requestId, { cancelled: aiCoachService.cancel(req.auth.userId) }, 200));

  app.delete("/api/me/ai-coach/history", requireAuth, requireMembershipEntitlement, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, aiCoachService.clear(req.auth.userId), 200);
  }));

  app.get("/api/visual-progress-scans", requireAuth, asyncHandler(async (req, res) => {
    if (!visualProgressScanEnabled) {
      throw new ApiError("FEATURE_DISABLED", "Visual progress scan is disabled", 404);
    }
    const { firstScanId = null, secondScanId = null } = req.query || {};
    const result = firstScanId && secondScanId
      ? userDataService.getVisualProgressScanComparison(req.auth.userId, String(firstScanId), String(secondScanId))
      : userDataService.getVisualProgressScans(req.auth.userId);
    return ok(res, req.requestId, result, 200);
  }));

  app.post("/api/visual-progress-scans", requireAuth, asyncHandler(async (req, res) => {
    if (!visualProgressScanEnabled) {
      throw new ApiError("FEATURE_DISABLED", "Visual progress scan is disabled", 404);
    }
    const scan = validateVisualProgressScan(req.body);
    const result = userDataService.saveVisualProgressScan({
      userId: req.auth.userId,
      scan,
      source: "api"
    });
    return ok(res, req.requestId, result, 201);
  }));

  app.get("/api/me/avatar/assets/:assetId", requireAuth, asyncHandler(async (req, res) => {
    if (!avatarFeatureEnabled) throw new ApiError("FEATURE_DISABLED", AVATAR_FEATURE_DISABLED_MESSAGE, 404);
    const asset = requireOwnedAvatarAsset(req); res.set("Cache-Control", "private, no-store"); res.type("model/gltf-binary"); return res.sendFile(asset.glb);
  }));
  app.get("/uploads/avatars/:fileName", requireAuth, asyncHandler(async (req, res) => {
    if (!avatarFeatureEnabled) throw new ApiError("FEATURE_DISABLED", AVATAR_FEATURE_DISABLED_MESSAGE, 404);
    const asset = requireOwnedAvatarAsset(req); res.set("Cache-Control", "private, no-store"); res.type("model/gltf-binary"); return res.sendFile(asset.glb);
  }));
  // Keep the literal registration visible to the repository's authorization inventory;
  // the assertion below makes drift from the browser contract a boot-time failure.
  if (avatarUploadContract.method !== "POST" || avatarUploadContract.path !== "/api/avatar/upload") throw new Error("Avatar upload contract drift");
  app.get("/api/avatar/upload-contract", (_req, res) => ok(res, _req.requestId, {
    ...avatarUploadContract,
    enabled: avatarFeatureEnabled,
    maxBytes: Number(env.AVATAR_UPLOAD_MAX_BYTES || 15 * 1024 * 1024),
    backendBuild: APP_BUILD_VERSION
  }));
  app.post("/api/avatar/upload", requireAuth, asyncHandler(async (req, res) => {
    if (!avatarFeatureEnabled) {
      throw new ApiError("FEATURE_DISABLED", AVATAR_FEATURE_DISABLED_MESSAGE, 404);
    }
    const maxBytes = Number(env.AVATAR_UPLOAD_MAX_BYTES || 15 * 1024 * 1024);
    let upload;
    try {
      upload = await parseAvatarMultipartUpload(req, maxBytes);
    } catch (error) {
      console.warn("[avatar-upload] rejected", {
        requestId: req.requestId,
        userId: req.auth?.userId || null,
        reason: error?.code || "UPLOAD_PARSE_ERROR",
        message: error?.message || String(error)
      });
      throw error;
    }
    const { fileBuffer, originalName } = upload;
    if (fileBuffer.length > maxBytes) {
      console.warn("[avatar-upload] rejected", { requestId: req.requestId, userId: req.auth?.userId || null, reason: "file_too_large" });
      throw new ApiError("VALIDATION_ERROR", "Avatar file exceeds size limit", 400);
    }
    if (fileBuffer.length === 0) {
      console.warn("[avatar-upload] rejected", { requestId: req.requestId, userId: req.auth?.userId || null, reason: "empty_file" });
      throw new ApiError("VALIDATION_ERROR", "Avatar upload is empty", 400);
    }
    const ext = path.extname(originalName || "").toLowerCase();
    if (ext !== ".glb") {
      console.warn("[avatar-upload] rejected", { requestId: req.requestId, userId: req.auth?.userId || null, reason: "invalid_extension" });
      throw new ApiError("VALIDATION_ERROR", "Only .glb avatar files are allowed", 400);
    }
    const glbMagic = fileBuffer.slice(0, 4).toString("ascii");
    if (glbMagic !== "glTF") {
      console.warn("[avatar-upload] rejected", { requestId: req.requestId, userId: req.auth?.userId || null, reason: "invalid_glb_header" });
      throw new ApiError("VALIDATION_ERROR", "Invalid .glb file header", 400);
    }
    const compatibility = validateAvatarGlb(fileBuffer);
    const unique = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const fileName = `${unique}.glb`;
    const destinationPath = path.join(AVATAR_UPLOAD_DIR, fileName);
    fs.writeFileSync(destinationPath, fileBuffer);
    writeJSON(path.join(AVATAR_UPLOAD_DIR, `${unique}.json`), { assetId: unique, ownerUserId: req.auth.userId, originalName: path.basename(originalName), sizeBytes: fileBuffer.length, compatibility, createdAt: new Date().toISOString() });
    const avatarModelUrl = `/api/me/avatar/assets/${unique}`;
    try {
      userStore.updateUser(req.auth.userId, user => {
        user.profile = user.profile || {};
        user.profile.avatar = { avatarProvider: "avaturn", avatarModelUrl, avatarThumbnailUrl: null, avatarUpdatedAt: Date.now() };
        return user;
      });
    } catch (error) {
      for (const candidate of [destinationPath, path.join(AVATAR_UPLOAD_DIR, `${unique}.json`)]) try { fs.unlinkSync(candidate); } catch (_) {}
      throw error;
    }
    return ok(res, req.requestId, { assetId: unique, avatarModelUrl, compatibility, profileSaved: true, uploadStages: ["SERVER_RECEIVED_FILE", "VALIDATING_GLB", "PERSISTING_ASSET", "SAVING_PROFILE"] }, 201);
  }));

  // ---- COMMAND endpoint (legacy compatibility adapter for session lifecycle) ----
  app.post("/command", requireCriticalRouteAuth, legacyLimit, asyncHandler(async (req, res) => {
    if (!legacyFallbackEnabled) {
      throw new ApiError("LEGACY_FALLBACK_DISABLED", "Legacy /command fallback is disabled by server configuration", 503);
    }

    const { domain, command, userId, payload } = req.body || {};
    const action = mapRouteAction(req);
    if (action && actionEnforcement.enabledByAction[action]) {
      req.legacyFallbackBlockedAction = action;
      req.legacyFallbackBlockedReason = "fallback_blocked_by_action_policy";
      throw new ApiError(
        "LEGACY_FALLBACK_BLOCKED",
        `Legacy /command fallback blocked for action '${action}'; use explicit API route`,
        409,
        {
          action,
          explicitApiRequired: true
        }
      );
    }

    const isSessionCommand = domain === "fitness" && [
      "fitness.startSession",
      "fitness.repUpdate",
      "fitness.endSession"
    ].includes(command);

    const authUserId = req.auth?.userId || null;

    if (isSessionCommand) {
      const { parsed } = validateLegacySessionCommand(req.body);
      if (authUserId) {
        if (userId && userId !== authUserId) {
          throw new ApiError("FORBIDDEN", "Authenticated user does not match requested userId", 403);
        }
        parsed.userId = authUserId;
      }
      let result;

      if (command === "fitness.startSession") {
        result = sessionService.startSession(parsed);
      } else if (command === "fitness.repUpdate") {
        result = sessionService.appendRepUpdate(parsed);
      } else {
        parsed.correlationId = req.requestId;
        result = sessionService.completeSession(parsed);
      }

      res.setHeader("x-legacy-command", "true");
      res.setHeader("x-api-deprecated", "true");
      res.setHeader("warning", '299 - "Legacy /command session actions are deprecated; use /api/sessions endpoints"');
      const fallbackReason = payload?._fallback?.reason || req.get("x-fallback-reason") || "legacy_direct";
      const warningMsg = `Explicit API route failed; fallback command '${command}' used for action '${action || "unknown"}'`;
      console.warn("[legacy-fallback-used]", {
        requestId: req.requestId,
        action: action || "unknown",
        route: req.path,
        userId: parsed.userId || userId || authUserId || null,
        reason: fallbackReason,
        warning: warningMsg
      });

      return ok(res, req.requestId, {
        legacy: true,
        deprecated: true,
        command,
        userId: parsed.userId,
        result
      });
    }

    // Existing behavior (kept for non-session commands)
    if (!domain || !command || !userId) {
      return res.status(400).json({ ok: false, error: "Missing domain/command/userId" });
    }

    if (domain !== "fitness") {
      return res.status(400).json({ ok: false, error: "Unknown domain", domain });
    }

    try {
      if (authUserId && userId !== authUserId) {
        throw new ApiError("FORBIDDEN", "Authenticated user does not match requested userId", 403);
      }

      if (command === "fitness.saveProfile") {
        const profilePayload = validateProfileUpsert(payload?.profile || {});
        const result = userDataService.upsertProfile({
          userId,
          profilePayload,
          source: "legacy-command"
        });
        return res.json({ ok: true, saved: true, domain, command, userId: result.userId });
      }
      if (command === "fitness.startSession") {
        sessionService.startSession({
          userId,
          sessionId: payload?.sessionId,
          programId: payload?.programId ?? null,
          exerciseId: payload?.exerciseId ?? null,
          payload: payload || {}
        });
        return res.json({ ok: true, saved: true, domain, command, userId });
      }
      if (command === "fitness.repUpdate") {
        const sid = payload?.sessionId;
        if (sid) {
          sessionService.appendRepUpdate({
            userId,
            sessionId: sid,
            exerciseId: payload?.exerciseId ?? null,
            repsThisSet: payload?.repsThisSet ?? null,
            totalReps: payload?.totalReps ?? null,
            depthScore: payload?.depthScore ?? null,
            goodForm: payload?.goodForm ?? null,
            payload: payload || {}
          });
        }
        return res.json({ ok: true, saved: true, domain, command, userId });
      }
      if (command === "fitness.endSession") {
        const sid = payload?.sessionId;
        if (sid) {
          sessionService.completeSession({
            userId,
            sessionId: sid,
            repsCompleted: payload?.repsCompleted ?? 0,
            exerciseId: payload?.exerciseId ?? null,
            payload: payload || {}
          });
        }
        return res.json({ ok: true, saved: true, domain, command, userId });
      }
      if (command === "fitness.ohsaResult") {
        const parsed = validateOhsaSubmission(payload || {});
        const result = userDataService.submitOhsa({
          userId,
          summary: parsed.summary,
          source: "legacy-command"
        });
        return res.json({ ok: true, saved: true, domain, command, userId: result.userId });
      }

      throw new ApiError("UNKNOWN_LEGACY_COMMAND", "Unknown legacy command", 400);
    } catch (e) {
      if (e instanceof ApiError) {
        throw e;
      }
      return res.status(500).json({ ok: false, error: "Command handler failed", message: e.message });
    }
  }));


  // ---- Static assets ----
  app.use(express.static(PUBLIC_DIR, { setHeaders(res, filePath) { if (filePath.endsWith(".html") || filePath.endsWith(".js")) res.set(SHELL_NO_STORE_HEADERS); } }));

  // ---- central error handler ----
  app.use((err, req, res, _next) => {
    logTrailResponseException(req, res, err, options.logger || console);
    const requestId = req.requestId || "unknown";
    if (err instanceof ApiError) {
      if (err.status === 401) {
        res.setHeader("WWW-Authenticate", "Bearer realm=\"mufasa\", error=\"invalid_token\"");
      }
      return fail(res, requestId, {
        code: err.code,
        message: err.message,
        details: err.details || null
      }, err.status);
    }

    console.error("Unhandled error", { requestId, error: err?.message || String(err) });
    return fail(res, requestId, {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred"
    }, 500);
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ mufasa-fitness-node listening on :${PORT}`);
  });
}

module.exports = {
  ENFORCEABLE_ACTIONS,
  parseActionEnforcementFromEnv,
  createApp,
  assertProductionPersistenceConfig,
  isAvatarFeatureEnabled
};
