// server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const { requestContext, asyncHandler } = require("./src/middleware/requestContext");
const { ApiError, ok, fail } = require("./src/lib/apiResponse");
const { createAuthTokenLib } = require("./src/lib/authToken");
const { authContext, requireAuth } = require("./src/middleware/auth");
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

function createApp(options = {}) {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use(requestContext);

  const rootDir = options.rootDir || process.cwd();

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

  app.use(authContext(authTokenLib));

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
      time: new Date().toISOString()
    });
  });

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
      expiresAt: req.auth.expiresAt
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
    const parsed = validateSessionCreate(req.body);
    if (req.auth?.userId) {
      parsed.userId = req.auth.userId;
    }
    const result = sessionService.startSession(parsed);
    return ok(res, req.requestId, result, 201);
  }));

  app.post("/api/sessions/:id/reps", asyncHandler(async (req, res) => {
    const parsed = validateRepUpdate(req.body, req.params.id);
    if (req.auth?.userId) {
      parsed.userId = req.auth.userId;
    }
    const result = sessionService.appendRepUpdate(parsed);
    return ok(res, req.requestId, result, 200);
  }));

  app.post("/api/sessions/:id/complete", asyncHandler(async (req, res) => {
    const parsed = validateSessionComplete(req.body, req.params.id);
    if (req.auth?.userId) {
      parsed.userId = req.auth.userId;
    }
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
    const { domain, command, userId, payload } = req.body || {};

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
  createApp
};
