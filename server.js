// server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

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
const { createWriteObservability, mapRouteAction } = require("./src/lib/writeObservability");
const { createAuthorizationResolver, parseAuthorizationConfig } = require("./src/lib/authorization");

const ENFORCEABLE_ACTIONS = Object.freeze([
  "profile",
  "session_start",
  "session_complete",
  "ohsa",
  "rep_update"
]);

function parseActionEnforcementFromEnv(env = process.env) {
  const enabledByAction = Object.fromEntries(ENFORCEABLE_ACTIONS.map((action) => [action, false]));
  enabledByAction.session_complete = true;

  const list = String(env.LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  for (const action of list) {
    if (action in enabledByAction) enabledByAction[action] = true;
  }

  for (const action of ENFORCEABLE_ACTIONS) {
    const envKey = `LEGACY_FALLBACK_REQUIRE_EXPLICIT_${action.toUpperCase()}`;
    if (env[envKey] === "true") enabledByAction[action] = true;
    if (env[envKey] === "false") enabledByAction[action] = false;
  }

  return {
    enabledByAction,
    enforcedActions: ENFORCEABLE_ACTIONS.filter((action) => enabledByAction[action])
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

function createApp(options = {}) {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use(requestContext);

  const rootDir = options.rootDir || process.cwd();
  const writeObservability = createWriteObservability();
  const legacyDependencyCatalog = {
    profile: ["fitness.saveProfile"],
    session_start: ["fitness.startSession"],
    rep_update: ["fitness.repUpdate"],
    session_complete: ["fitness.endSession"],
    ohsa: ["fitness.ohsaResult"]
  };
  const baseActionEnforcement = parseActionEnforcementFromEnv(process.env);
  const runtimeEnforcementOverrides = {};
  let actionEnforcement = buildActionEnforcementState(baseActionEnforcement, runtimeEnforcementOverrides);
  writeObservability.setEnforcementState(actionEnforcement.enabledByAction);

  const authorizationResolver = createAuthorizationResolver(parseAuthorizationConfig(process.env));
  writeObservability.setAuthorizationState(authorizationResolver.describe());

  const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.length === 0) return cb(null, true);
      return cb(null, ALLOWED_ORIGINS.includes(origin));
    },
    credentials: false
  }));

  // ---- Paths ----
  const PUBLIC_DIR = path.join(rootDir, "public");
  const EX_DB_DIR = path.join(PUBLIC_DIR, "exercise-db");
  const EX_INDEX_PATH = path.join(EX_DB_DIR, "index.json");
  const DATA_DIR = path.join(rootDir, "data");
  const USER_DIR = path.join(DATA_DIR, "users");

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const userStore = createUserStore({ userDir: USER_DIR });
  userStore.ensureDirs();
  const sessionService = createSessionService({ userStore });
  const userDataService = createUserDataService({ userStore });
  const authTokenLib = createAuthTokenLib({
    secret: process.env.AUTH_TOKEN_SECRET || "dev-only-secret-change-me"
  });

  const startupWarnings = [];
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
  if (startupWarnings.length) {
    for (const warning of startupWarnings) {
      console.warn("[startup-warning]", warning);
    }
  }

  app.use(authContext(authTokenLib, authorizationResolver));
  const trackAdminOpsAuthorizationDecision = ({ req, permission, allowed, reason }) => {
    writeObservability.trackAdminOpsAuthorization({
      permission,
      allowed,
      role: req.authz?.role || "user",
      isBootstrapSuperAdmin: Boolean(req.authz?.isBootstrapSuperAdmin),
      reason
    });
  };

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
  app.use(express.static(PUBLIC_DIR));

  // ---- Helpers ----
  function readJSON(p) {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  }

  function writeJSON(p, obj) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(obj, null, 2));
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
      actionFallbackEnforcement: actionEnforcement,
      authorization: authorizationResolver.describe(),
      degraded: startupWarnings.length > 0,
      startupWarnings,
      time: new Date().toISOString()
    });
  });

  app.get(
    "/api/ops/write-observability",
    requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.OPS_READ_OBSERVABILITY, trackAdminOpsAuthorizationDecision),
    (_req, res) => {
      return res.json({
        ok: true,
        service: "mufasa-fitness-node",
        authConfigured: !usingDefaultAuthSecret,
        legacyFallbackEnabled,
        actionFallbackEnforcement: actionEnforcement,
        authorization: authorizationResolver.describe(),
        startupWarnings,
        legacyDependencyCatalog,
        writes: writeObservability.snapshot()
      });
    }
  );

  app.get(
    "/api/ops/enforcement-config",
    requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.OPS_READ_AUTHZ, trackAdminOpsAuthorizationDecision),
    (_req, res) => {
      return res.json({
        ok: true,
        actionFallbackEnforcement: actionEnforcement,
        authorization: authorizationResolver.describe()
      });
    }
  );

  app.put(
    "/api/ops/enforcement-config",
    requirePermission(authorizationResolver, authorizationResolver.PERMISSIONS.OPS_MANAGE_ENFORCEMENT, trackAdminOpsAuthorizationDecision),
    asyncHandler(async (req, res) => {
      const candidate = req.body?.enabledByAction;
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        throw new ApiError("VALIDATION_ERROR", "enabledByAction object is required", 400);
      }

      for (const [action, value] of Object.entries(candidate)) {
        if (!ENFORCEABLE_ACTIONS.includes(action)) {
          throw new ApiError("VALIDATION_ERROR", `Unknown enforceable action '${action}'`, 400);
        }
        runtimeEnforcementOverrides[action] = Boolean(value);
      }

      actionEnforcement = buildActionEnforcementState(baseActionEnforcement, runtimeEnforcementOverrides);
      writeObservability.setEnforcementState(actionEnforcement.enabledByAction);

      return ok(res, req.requestId, {
        actionFallbackEnforcement: actionEnforcement,
        updatedActions: Object.keys(candidate)
      }, 200);
    })
  );

  app.post("/api/speak", async (req, res) => {
    try {
      const { text, voice = "alloy", format = "mp3" } = req.body || {};
      if (!text || !String(text).trim()) {
        return res.status(400).json({ ok: false, error: "text required" });
      }

      const AIVOICE_URL = process.env.AIVOICE_URL || "https://aivoice-wmrv.onrender.com/speak";
      const AIVOICE_API_KEY = process.env.AIVOICE_API_KEY || "";

      const r = await fetch(AIVOICE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(AIVOICE_API_KEY ? { "X-AIVOICE-KEY": AIVOICE_API_KEY } : {})
        },
        body: JSON.stringify({ text, voice, format })
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

  // ---- Auth bridge (pilot minimal auth foundation) ----
  app.post("/api/auth/bridge", asyncHandler(async (req, res) => {
    const claims = validateAuthBridge(req.body);
    const token = authTokenLib.issueUserToken({
      userId: claims.userId,
      provider: claims.provider,
      providerSubject: claims.providerSubject
    });

    return ok(res, req.requestId, {
      auth: token
    }, 201);
  }));

  app.get("/api/me", requireAuth, asyncHandler(async (req, res) => {
    return ok(res, req.requestId, {
      userId: req.auth.userId,
      provider: req.auth.provider,
      providerSubject: req.auth.providerSubject,
      issuedAt: req.auth.issuedAt,
      expiresAt: req.auth.expiresAt,
      role: req.authz?.role || "user",
      isBootstrapSuperAdmin: Boolean(req.authz?.isBootstrapSuperAdmin)
    });
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
    const profilePayload = validateProfileUpsert(req.body);
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

  // ---- central error handler ----
  app.use((err, req, res, _next) => {
    const requestId = req.requestId || "unknown";
    if (err instanceof ApiError) {
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
