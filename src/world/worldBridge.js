"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PROTOCOL_VERSION = 1;
const EXPERIENCE = Object.freeze({ type: "PUSH_UP_ARENA", challengeId: "push_up" });
const ARENA_COOKIE = "PocketPTArenaSession";
const DEFAULT_TTL_MS = 10 * 60 * 1000;

function parseCookies(header = "") {
  const result = {};
  for (const pair of String(header).split(";")) {
    const index = pair.indexOf("=");
    if (index <= 0) continue;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (key) result[key] = decodeURIComponent(value);
  }
  return result;
}

function safeDisplayName(auth = {}) {
  const explicit = String(auth.name || "").trim();
  if (explicit) return explicit.slice(0, 120);
  return "Member";
}

function createWorldBridge(options = {}) {
  const now = options.now || (() => Date.now());
  const ttlMs = Number(options.ttlMs || process.env.POCKET_PT_ARENA_SESSION_TTL_MS || DEFAULT_TTL_MS);
  const launchTickets = new Map();
  const arenaSessions = new Map();
  const rootDir = options.rootDir || process.cwd();
  const godotEntryPath = path.join(rootDir, "public", "game", "push-up-arena", "index.html");
  const backendPublicUrl = String(options.backendPublicUrl || process.env.BACKEND_PUBLIC_URL || "").replace(/\/$/, "");
  const frontendPublicUrl = String(options.frontendPublicUrl || process.env.FRONTEND_PUBLIC_URL || "").replace(/\/$/, "");
  const secureCookie = options.secureCookie == null ? process.env.NODE_ENV === "production" : Boolean(options.secureCookie);

  function prune() {
    const timestamp = now();
    for (const [key, value] of launchTickets) if (value.expiresAt <= timestamp) launchTickets.delete(key);
    for (const [key, value] of arenaSessions) if (value.expiresAt <= timestamp) arenaSessions.delete(key);
  }

  function createTicket(auth) {
    prune();
    const ticket = crypto.randomBytes(32).toString("base64url");
    const sessionId = crypto.randomUUID();
    const expiresAt = now() + ttlMs;
    launchTickets.set(ticket, {
      sessionId,
      userId: auth.userId,
      displayName: safeDisplayName(auth),
      sourceTokenId: auth.jti || null,
      experience: EXPERIENCE,
      expiresAt
    });
    return { ticket, sessionId, expiresAt };
  }

  function exchangeTicket(ticket) {
    prune();
    const normalized = String(ticket || "");
    if (!/^[A-Za-z0-9_-]{40,128}$/.test(normalized)) return null;
    const pending = launchTickets.get(normalized);
    if (!pending || pending.expiresAt <= now()) {
      launchTickets.delete(normalized);
      return null;
    }
    launchTickets.delete(normalized);
    const credential = crypto.randomBytes(32).toString("base64url");
    arenaSessions.set(credential, { ...pending, credentialIssuedAt: now() });
    return { credential, session: pending };
  }

  function readSession(req) {
    prune();
    const credential = parseCookies(req.get?.("cookie") || req.headers?.cookie || "")[ARENA_COOKIE];
    if (!credential) return null;
    const session = arenaSessions.get(credential);
    if (!session || session.expiresAt <= now()) {
      arenaSessions.delete(credential);
      return null;
    }
    return { credential, session };
  }

  function cookieOptions(maxAge = ttlMs) {
    return { httpOnly: true, secure: secureCookie, sameSite: "lax", path: "/api/game", maxAge };
  }

  function bootstrap(session) {
    return {
      protocolVersion: PROTOCOL_VERSION,
      session: {
        id: session.sessionId,
        expiresAt: new Date(session.expiresAt).toISOString()
      },
      member: {
        id: session.userId,
        displayName: session.displayName
      },
      avatar: null,
      experience: { ...session.experience },
      api: { baseUrl: "/api/game" }
    };
  }

  function canonicalReturnUrl() {
    return frontendPublicUrl ? `${frontendPublicUrl}/push-up-challenge.html` : "/push-up-challenge.html";
  }

  function register(app) {
    app.post("/api/game/sessions", (req, res) => {
      if (!req.auth?.userId) return res.status(401).json({ ok: false, error: { code: "UNAUTHENTICATED", message: "Authentication required" } });
      const requestedType = String(req.body?.experienceType || EXPERIENCE.type);
      const requestedChallengeId = String(req.body?.challengeId || EXPERIENCE.challengeId);
      if (requestedType !== EXPERIENCE.type || requestedChallengeId !== EXPERIENCE.challengeId) {
        return res.status(422).json({ ok: false, error: { code: "UNSUPPORTED_WORLD_EXPERIENCE", message: "Unsupported world experience" } });
      }
      const created = createTicket(req.auth);
      const launchBase = backendPublicUrl || `${req.protocol}://${req.get("host")}`;
      res.set("Cache-Control", "private, no-store");
      return res.status(201).json({
        ok: true,
        data: {
          protocolVersion: PROTOCOL_VERSION,
          session: { id: created.sessionId, expiresAt: new Date(created.expiresAt).toISOString() },
          experience: { ...EXPERIENCE },
          launchUrl: `${launchBase}/arena/push-up#ticket=${created.ticket}`
        }
      });
    });

    app.get("/api/game/config", (_req, res) => {
      res.set("Cache-Control", "no-store");
      return res.status(200).json({
        ok: true,
        data: {
          protocolVersion: PROTOCOL_VERSION,
          experience: { ...EXPERIENCE },
          returnUrl: canonicalReturnUrl()
        }
      });
    });

    app.post("/api/game/session-exchange", (req, res) => {
      const exchanged = exchangeTicket(req.body?.ticket);
      if (!exchanged) return res.status(401).json({ ok: false, error: { code: "ARENA_SESSION_INVALID", message: "Arena launch session is invalid or expired" } });
      res.cookie(ARENA_COOKIE, exchanged.credential, cookieOptions(Math.max(1, exchanged.session.expiresAt - now())));
      res.set("Cache-Control", "private, no-store");
      return res.status(200).json({
        ok: true,
        data: {
          ready: true,
          session: { id: exchanged.session.sessionId, expiresAt: new Date(exchanged.session.expiresAt).toISOString() },
          experience: { ...EXPERIENCE }
        }
      });
    });

    app.get("/api/game/bootstrap", (req, res) => {
      const resolved = readSession(req);
      if (!resolved) return res.status(401).json({ ok: false, error: { code: "ARENA_SESSION_INVALID", message: "Arena session is invalid or expired" } });
      res.set("Cache-Control", "private, no-store");
      return res.status(200).json({ ok: true, data: bootstrap(resolved.session) });
    });

    app.delete("/api/game/session", (req, res) => {
      const resolved = readSession(req);
      if (resolved) arenaSessions.delete(resolved.credential);
      res.clearCookie(ARENA_COOKIE, cookieOptions(0));
      res.set("Cache-Control", "private, no-store");
      return res.status(200).json({ ok: true, data: { ended: true } });
    });

    app.get("/api/game/build", (_req, res) => {
      const available = fs.existsSync(godotEntryPath);
      res.set("Cache-Control", "no-store");
      return res.status(available ? 200 : 503).json({
        ok: available,
        data: {
          protocolVersion: PROTOCOL_VERSION,
          experience: { ...EXPERIENCE },
          entryPath: "/game/push-up-arena/index.html",
          available
        }
      });
    });

    app.get("/arena/push-up", (_req, res) => {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate");
      return res.sendFile(path.join(rootDir, "public", "arena-push-up.html"));
    });
  }

  return {
    register,
    createTicket,
    exchangeTicket,
    bootstrap,
    canonicalReturnUrl,
    parseCookies,
    readSession,
    prune,
    constants: { PROTOCOL_VERSION, EXPERIENCE, ARENA_COOKIE, ttlMs, godotEntryPath, frontendPublicUrl }
  };
}

module.exports = { createWorldBridge, PROTOCOL_VERSION, EXPERIENCE, ARENA_COOKIE };
