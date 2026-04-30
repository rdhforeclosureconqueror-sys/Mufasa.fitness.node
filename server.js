// server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { requestContext, asyncHandler } = require("./src/middleware/requestContext");
const { ApiError, ok, fail } = require("./src/lib/apiResponse");
const { createAuthTokenLib } = require("./src/lib/authToken");
const { authContext, requireAuth, ensureUserScopedAccess, requirePermission } = require("./src/middleware/auth");
const { createUserStore } = require("./src/repositories/userStore");
const { createSessionService } = require("./src/services/sessionService");
const { createUserDataService } = require("./src/services/userDataService");
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

const ENFORCEABLE_ACTIONS = Object.freeze([
  "profile",
  "session_start",
  "session_complete",
  "ohsa",
  "rep_update"
]);
const APP_BUILD_VERSION = "2026-04-27T00:00:00Z-client-workout-hud";
const INDEX_CACHE_BUST_TOKEN = "20260427";

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
  } else {
    enabledByAction.session_complete = true;
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

function createApp(options = {}) {
  const app = express();
  app.use(requestContext);
  const visualProgressScanEnabled = process.env.ENABLE_VISUAL_PROGRESS_SCAN === "true";
  const disableLoginForPilot = false;

  const rootDir = options.rootDir || process.cwd();
  const writeObservability = createWriteObservability();
  const auditLog = createAdminAuditLog({
    filePath: path.join(rootDir, "data", "ops", "admin-audit.ndjson"),
    maxBytes: Number(process.env.ADMIN_AUDIT_MAX_BYTES || 512 * 1024),
    maxArchives: Number(process.env.ADMIN_AUDIT_MAX_ARCHIVES || 4),
    hashChain: process.env.ADMIN_AUDIT_HASH_CHAIN !== "false",
    checkpointFilePath: process.env.ADMIN_AUDIT_CHECKPOINT_FILE_PATH || path.join(rootDir, "data", "ops", "admin-audit.checkpoints.ndjson"),
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
    filePath: path.join(rootDir, "data", "ops", "enforcement-overrides.json"),
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

  const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const corsOptions = {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.length === 0) return cb(null, true);
      return cb(null, ALLOWED_ORIGINS.includes(origin));
    },
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 200
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(express.json({ limit: "2mb" }));

  // ---- Paths ----
  const PUBLIC_DIR = path.join(rootDir, "public");
  const AVATAR_UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads", "avatars");
  const EX_DB_DIR = path.join(PUBLIC_DIR, "exercise-db");
  const EX_INDEX_PATH = path.join(EX_DB_DIR, "index.json");
  const DATA_DIR = path.join(rootDir, "data");
  const OPS_DIR = path.join(DATA_DIR, "ops");
  const USER_DIR = path.join(DATA_DIR, "users");
  const PILOT_EVENT_LOG_PATH = path.join(OPS_DIR, "pilot-events.ndjson");
  const DIAGNOSTIC_REPORT_PATH = path.join(OPS_DIR, "diagnostic-reports.ndjson");

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(OPS_DIR)) fs.mkdirSync(OPS_DIR, { recursive: true });
  if (!fs.existsSync(AVATAR_UPLOAD_DIR)) fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
  const diagnosticStore = createDiagnosticStore({ filePath: DIAGNOSTIC_REPORT_PATH });

  const userStore = createUserStore({ userDir: USER_DIR });
  userStore.ensureDirs();
  const sessionService = createSessionService({ userStore });
  const userDataService = createUserDataService({ userStore });
  const tokenDenylist = createTokenDenylistStore({
    filePath: path.join(rootDir, "data", "ops", "token-denylist.json"),
    retentionMs: Number(process.env.AUTH_TOKEN_DENYLIST_RETENTION_MS || 1000 * 60 * 60 * 24 * 14)
  });
  const trustPolicyConfig = parseTrustPolicyConfig(process.env);
  const trustPolicy = summarizeTrustPolicy(trustPolicyConfig);
  const authTokenLib = createAuthTokenLib({
    secret: process.env.AUTH_TOKEN_SECRET || "dev-only-secret-change-me",
    isRevokedJti: (jti) => tokenDenylist.isRevoked(jti),
    minSecretLength: Number(process.env.AUTH_TOKEN_MIN_SECRET_LENGTH || 16),
    maxTtlMs: Number(process.env.AUTH_TOKEN_MAX_TTL_MS || 1000 * 60 * 60 * 24 * 14),
    clockSkewMs: Number(process.env.AUTH_TOKEN_CLOCK_SKEW_MS || 5000)
  });

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
  if (actionEnforcement.enforcedActions.length > 0) {
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

  app.use(authContext(authTokenLib, authorizationResolver, {
    pilotBypass: disableLoginForPilot
      ? {
        enabled: true,
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
    res.sendFile(CANONICAL_SHELL_PATH);
  });
  app.get("/dashboard.html", (_req, res) => {
    res.set(SHELL_NO_STORE_HEADERS);
    res.sendFile(path.join(PUBLIC_DIR, "dashboard.html"));
  });
  app.get("/exercise-library.html", (_req, res) => {
    res.set(SHELL_NO_STORE_HEADERS);
    res.sendFile(path.join(PUBLIC_DIR, "exercise-library.html"));
  });
  app.get("/__version", (_req, res) => {
    res.set(SHELL_NO_STORE_HEADERS);
    return res.json({
      build: APP_BUILD_VERSION,
      loginDisabledForPilot: disableLoginForPilot,
      loginRemovedForPilot: disableLoginForPilot,
      pilotSuperAdminActive: disableLoginForPilot,
      authGateDisabled: disableLoginForPilot,
      superAdminActive: disableLoginForPilot,
      allFeatureGatesBypassed: disableLoginForPilot
    });
  });
  app.get("/__diagnostic-smoke", (_req, res) => {
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
      allFeatureGatesBypassed: disableLoginForPilot
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
    const nameMarker = 'name="avatar"';
    const fieldIndex = body.indexOf(nameMarker);
    if (fieldIndex === -1) {
      throw new ApiError("VALIDATION_ERROR", "Missing avatar file upload", 400);
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

  function loadExerciseIndex() {
    if (!fs.existsSync(EX_INDEX_PATH)) return null;
    try {
      return readJSON(EX_INDEX_PATH);
    } catch {
      return null;
    }
  }

  function findExerciseBySlug(index, slug) {
    const list = index?.exercises || [];
    return list.find(x => x.slug === slug) || null;
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

  app.post(
    "/api/admin/diagnostics/report",
    requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.OPS_READ_OBSERVABILITY, trackAdminOpsAuthorizationDecision),
    asyncHandler(async (req, res) => {
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const routeCheck = await runRouteDiagnostics({
      baseUrl: resolveRequestOrigin(req) || process.env.BASE_URL || "http://127.0.0.1:3000",
      rootDir
    });
    const summaryResult = await summarizeDiagnosticWithOpenAI({
      expectedSystems: [
        "pose_tracking",
        "avatar_runtime",
        "form_engine",
        "session_save",
        "route_health"
      ],
      buildVersion: payload?.build?.appBuildVersion || APP_BUILD_VERSION,
      diagnosticReport: payload,
      routeCheckResults: routeCheck,
      recentErrors: payload?.errors || null
    });

    const pilotReadiness = evaluatePilotReadiness({
      payload,
      routeCheck,
      openAiSummaryStatus: summaryResult.status,
      openAiSummary: summaryResult.summary
    });

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
    diagnosticStore.append(report);
    return ok(res, req.requestId, report, 201);
    })
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

  app.post("/api/speak", async (req, res) => {
    try {
      const allowTtsNoAuth = process.env.ENABLE_TTS_NO_AUTH !== "false";
      if (!allowTtsNoAuth && !req.auth?.userId) {
        return res.status(401).json({ ok: false, error: "auth_required" });
      }

      console.info("[tts] incoming request", {
        requestId: req.requestId,
        userId: req.auth?.userId || null,
        allowTtsNoAuth,
        headers: sanitizeSpeakHeaders(req)
      });

      const {
        text,
        voice = "alloy",
        format = "mp3",
        speed,
        pitch
      } = req.body || {};
      if (!text || !String(text).trim()) {
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
      const AIVOICE_API_KEY = process.env.AIVOICE_API_KEY || "";

      const r = await fetch(AIVOICE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(AIVOICE_API_KEY ? { "X-AIVOICE-KEY": AIVOICE_API_KEY } : {})
        },
        body: JSON.stringify({ text, voice, format, speed, pitch })
      });

      if (!r.ok) {
        const msg = await r.text().catch(() => "");
        return res.status(r.status).send(msg || "aivoice error");
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
      res.status(500).json({ ok: false, error: "proxy_failed", message: String(e) });
    }
  });

  const AUTH_SEED_USER = Object.freeze({
    id: "pilot_admin",
    email: "rdhforeclosureconquer@gmail.com",
    name: "Rashad Harbour",
    role: "admin"
  });

  function authUserContract() {
    return {
      id: AUTH_SEED_USER.id,
      email: AUTH_SEED_USER.email,
      name: AUTH_SEED_USER.name,
      role: AUTH_SEED_USER.role
    };
  }

  app.post("/api/auth/login", asyncHandler(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const expectedPassword = String(process.env.PILOT_LOGIN_PASSWORD || "");
    const fixtureEnabled = String(process.env.AUTH_TEST_LOGIN_FIXTURE_ENABLED || "").trim().toLowerCase() === "true";
    const isTestEnv = String(process.env.NODE_ENV || "").trim().toLowerCase() === "test";
    const hasFixtureFields = req.body?.testUserId != null || req.body?.testRole != null;

    if (!expectedPassword) {
      return res.status(503).json({
        ok: false,
        error: "PILOT_LOGIN_PASSWORD is not configured"
      });
    }

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: "Invalid email or password"
      });
    }

    if (hasFixtureFields && (!isTestEnv || !fixtureEnabled)) {
      return res.status(403).json({
        ok: false,
        error: "TEST_LOGIN_FIXTURE_DISABLED"
      });
    }

    if (isTestEnv && fixtureEnabled && hasFixtureFields) {
      const requestedUserId = String(req.body?.testUserId || "").trim();
      const userId = requestedUserId || AUTH_SEED_USER.id;
      const role = String(req.body?.testRole || "user").trim().toLowerCase() || "user";

      if (!/^[a-zA-Z0-9_-]{3,128}$/.test(userId)) {
        return res.status(400).json({
          ok: false,
          error: "Invalid testUserId"
        });
      }

      const token = authTokenLib.issueUserToken({
        userId,
        email: email || AUTH_SEED_USER.email,
        provider: "password",
        providerSubject: email || AUTH_SEED_USER.email,
        providerVerified: true,
        identityClass: "provider_verified"
      });

      return res.status(200).json({
        ok: true,
        token: token.token,
        user: {
          id: userId,
          email: email || AUTH_SEED_USER.email,
          name: AUTH_SEED_USER.name,
          role
        }
      });
    }

    if (email !== AUTH_SEED_USER.email || password !== expectedPassword) {
      return res.status(401).json({
        ok: false,
        error: "Invalid email or password"
      });
    }

    const token = authTokenLib.issueUserToken({
      userId: AUTH_SEED_USER.id,
      email: AUTH_SEED_USER.email,
      provider: "password",
      providerSubject: AUTH_SEED_USER.email,
      providerVerified: true,
      identityClass: "provider_verified"
    });

    return res.status(200).json({
      ok: true,
      token: token.token,
      user: authUserContract()
    });
  }));

  app.get("/api/auth/me", requireAuth, asyncHandler(async (req, res) => {
    const role = req.auth.userId === AUTH_SEED_USER.id
      ? AUTH_SEED_USER.role
      : (req.authz?.role || "user");
    return res.status(200).json({
      ok: true,
      user: {
        id: req.auth.userId,
        email: req.auth.email || AUTH_SEED_USER.email,
        name: AUTH_SEED_USER.name,
        role
      }
    });
  }));

  app.post("/api/auth/logout", asyncHandler(async (_req, res) => {
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

  app.post("/api/pilot/events", asyncHandler(async (req, res) => {
    const eventName = String(req.body?.event || "").trim();
    if (!eventName) {
      throw new ApiError("VALIDATION_ERROR", "Pilot event name is required", 400);
    }
    const payload = req.body?.payload && typeof req.body.payload === "object" ? req.body.payload : {};
    const record = {
      at: new Date().toISOString(),
      requestId: req.requestId,
      event: eventName,
      userId: req.auth?.userId || payload.userId || null,
      route: req.path,
      payload
    };
    appendPilotEvent(record);
    return ok(res, req.requestId, { accepted: true }, 202);
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
    res.json({ ok: true, ...idx });
  });

  app.get("/api/exercises/search", (req, res) => {
    const q = String(req.query.q || "").trim().toLowerCase();
    const idx = loadExerciseIndex();
    if (!idx) return res.status(404).json({ ok: false, error: "Missing exercise index.json" });

    const list = idx.exercises || [];
    if (!q) return res.json({ ok: true, q, results: list.slice(0, 50) });

    const results = list
      .filter(x =>
        String(x.name || "").toLowerCase().includes(q) ||
        String(x.category || "").toLowerCase().includes(q) ||
        String(x.equipment || "").toLowerCase().includes(q) ||
        String(x.target || "").toLowerCase().includes(q)
      )
      .slice(0, 100);

    res.json({ ok: true, q, results });
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

  // ---- Structured Session API (pilot hardening) ----
  app.post("/api/sessions", asyncHandler(async (req, res) => {
    ensureUserScopedAccess(req, req.body?.userId);
    const parsed = validateSessionCreate({
      ...(req.body || {}),
      userId: req.auth?.userId || req.body?.userId
    });
    const result = sessionService.startSession(parsed);
    return ok(res, req.requestId, result, 201);
  }));

  app.post("/api/sessions/:id/reps", asyncHandler(async (req, res) => {
    ensureUserScopedAccess(req, req.body?.userId);
    const parsed = validateRepUpdate({
      ...(req.body || {}),
      userId: req.auth?.userId || req.body?.userId
    }, req.params.id);
    const result = sessionService.appendRepUpdate(parsed);
    return ok(res, req.requestId, result, 200);
  }));

  app.post("/api/sessions/:id/complete", asyncHandler(async (req, res) => {
    ensureUserScopedAccess(req, req.body?.userId);
    const parsed = validateSessionComplete({
      ...(req.body || {}),
      userId: req.auth?.userId || req.body?.userId
    }, req.params.id);
    const result = sessionService.completeSession(parsed);
    return ok(res, req.requestId, result, 200);
  }));

  // ---- Explicit profile / OHSA / history endpoints ----
  app.get("/api/me/profile", requireAuth, asyncHandler(async (req, res) => {
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
    return ok(res, req.requestId, result, 200);
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
    const result = userDataService.getProgram(req.auth.userId);
    return ok(res, req.requestId, result, 200);
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

  app.post("/api/workouts/track", requireAuth, asyncHandler(async (req, res) => {
    const tracking = validateWorkoutTracking(req.body);
    const result = userDataService.appendWorkoutTracking({
      userId: req.auth.userId,
      tracking,
      source: "api"
    });
    return ok(res, req.requestId, result, 201);
  }));

  app.get("/api/workouts/reward/latest", requireAuth, asyncHandler(async (req, res) => {
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

  app.get("/api/progress/dashboard", requireAuth, asyncHandler(async (req, res) => {
    const result = userDataService.getProgressDashboard(req.auth.userId);
    return ok(res, req.requestId, result, 200);
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

  app.post("/api/avatar/upload", requireAuth, asyncHandler(async (req, res) => {
    const maxBytes = Number(process.env.AVATAR_UPLOAD_MAX_BYTES || 15 * 1024 * 1024);
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
    const unique = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const fileName = `${unique}.glb`;
    const destinationPath = path.join(AVATAR_UPLOAD_DIR, fileName);
    fs.writeFileSync(destinationPath, fileBuffer);
    const avatarModelPath = `/uploads/avatars/${fileName}`;
    const configuredAssetOrigin = String(
      process.env.AVATAR_ASSET_ORIGIN ||
      process.env.ASSET_ORIGIN ||
      process.env.PUBLIC_BASE_URL ||
      ""
    ).trim().replace(/\/+$/g, "");
    const requestOrigin = resolveRequestOrigin(req);
    const assetOrigin = configuredAssetOrigin || requestOrigin || "";
    const avatarModelUrl = assetOrigin
      ? `${assetOrigin}${avatarModelPath}`
      : avatarModelPath;
    return ok(res, req.requestId, { avatarModelUrl }, 201);
  }));

  // ---- COMMAND endpoint (legacy compatibility adapter for session lifecycle) ----
  app.post("/command", asyncHandler(async (req, res) => {
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

      userStore.updateUser(userId, (user) => {
        user.events = user.events || [];
        user.events.push({ command, ts: Date.now(), payload });
        return user;
      });
      return res.json({ ok: true, saved: true, domain, command, userId });
    } catch (e) {
      if (e instanceof ApiError) {
        throw e;
      }
      return res.status(500).json({ ok: false, error: "Command handler failed", message: e.message });
    }
  }));


  // ---- Static assets ----
  app.use(express.static(PUBLIC_DIR));

  // ---- central error handler ----
  app.use((err, req, res, _next) => {
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
  createApp
};
