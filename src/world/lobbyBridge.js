"use strict";

const crypto = require("node:crypto");
const { WebSocket, WebSocketServer } = require("ws");
const { createAvatarBridge } = require("./avatarBridge");

const LOBBY_PROTOCOL_VERSION = 1;
const LOBBY_PATH = "/api/game/lobby/ws";
const ROOM_ID = "lions_den";
const MAX_PAYLOAD_BYTES = 4096;
const DEFAULT_HEARTBEAT_MS = 15000;
const MAX_STATE_MESSAGES_PER_SECOND = 30;
const VALID_LOCOMOTION = new Set(["IDLE", "WALK", "RUN", "STOP", "ACTION_OVERRIDE"]);

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validPosition(value) {
  return Array.isArray(value) && value.length === 3
    && value.every((entry) => finiteNumber(entry) && Math.abs(entry) <= 10000);
}

function createLobbyBridge(options = {}) {
  const worldBridge = options.worldBridge;
  if (!worldBridge?.readSession || !worldBridge?.bootstrap || !worldBridge?.constants?.ARENA_COOKIE) {
    throw new Error("Lobby bridge requires world bridge session capabilities");
  }

  const avatarBridge = createAvatarBridge({
    assets: options.avatarAssets,
    publicOrigins: Array.isArray(options.publicOrigins) ? options.publicOrigins : []
  });
  const now = options.now || (() => Date.now());
  const heartbeatMs = Number(options.heartbeatMs || DEFAULT_HEARTBEAT_MS);
  const presencesById = new Map();
  const presenceIdByUserId = new Map();
  const presenceIdBySessionId = new Map();
  let wss = null;
  let heartbeatTimer = null;
  let attachedServer = null;

  function avatarForPresence(presence) {
    if (!presence.avatar) return null;
    return {
      avatarId: presence.avatar.avatarId,
      profileVersion: presence.avatar.profileVersion,
      format: presence.avatar.format,
      assetUrl: `/api/game/lobby/players/${encodeURIComponent(presence.presenceId)}/avatar?version=${encodeURIComponent(presence.avatar.profileVersion)}`
    };
  }

  function publicPlayer(presence) {
    return {
      presenceId: presence.presenceId,
      member: { id: presence.userId, displayName: presence.displayName },
      avatar: avatarForPresence(presence),
      state: {
        position: [...presence.state.position],
        yaw: presence.state.yaw,
        locomotion: presence.state.locomotion,
        seq: presence.state.seq
      }
    };
  }

  function send(ws, payload) {
    if (ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(payload));
    return true;
  }

  function broadcast(payload, exceptPresenceId = null) {
    const encoded = JSON.stringify(payload);
    for (const presence of presencesById.values()) {
      if (presence.presenceId === exceptPresenceId) continue;
      if (presence.ws.readyState === WebSocket.OPEN) presence.ws.send(encoded);
    }
  }

  function removePresence(presenceId, reason = "DISCONNECTED") {
    const presence = presencesById.get(presenceId);
    if (!presence) return false;
    presencesById.delete(presenceId);
    if (presenceIdByUserId.get(presence.userId) === presenceId) presenceIdByUserId.delete(presence.userId);
    if (presenceIdBySessionId.get(presence.sessionId) === presenceId) presenceIdBySessionId.delete(presence.sessionId);
    broadcast({ type: "PLAYER_LEFT", protocolVersion: LOBBY_PROTOCOL_VERSION, roomId: ROOM_ID, presenceId, reason }, presenceId);
    return true;
  }

  function sessionExpired(presence) {
    return !Number.isFinite(presence.expiresAt) || presence.expiresAt <= now();
  }

  function sessionRequestForCredential(credential) {
    const cookie = `${worldBridge.constants.ARENA_COOKIE}=${encodeURIComponent(String(credential || ""))}`;
    return {
      headers: { cookie },
      get(name) { return String(name).toLowerCase() === "cookie" ? cookie : null; }
    };
  }

  function backingSessionActive(presence) {
    if (!presence.arenaCredential) return false;
    const resolved = worldBridge.readSession(sessionRequestForCredential(presence.arenaCredential));
    return Boolean(
      resolved
      && resolved.credential === presence.arenaCredential
      && resolved.session?.sessionId === presence.sessionId
      && resolved.session?.userId === presence.userId
    );
  }

  function expirePresence(presence) {
    if (presencesById.get(presence.presenceId)?.ws !== presence.ws) return false;
    send(presence.ws, {
      type: "ERROR",
      protocolVersion: LOBBY_PROTOCOL_VERSION,
      roomId: ROOM_ID,
      code: "ARENA_SESSION_EXPIRED",
      message: "Arena session expired; reconnect through the authenticated arena flow"
    });
    removePresence(presence.presenceId, "SESSION_EXPIRED");
    try { presence.ws.close(4003, "Arena session expired"); } catch (_) {}
    return true;
  }

  function revokePresence(presence) {
    if (presencesById.get(presence.presenceId)?.ws !== presence.ws) return false;
    send(presence.ws, {
      type: "ERROR",
      protocolVersion: LOBBY_PROTOCOL_VERSION,
      roomId: ROOM_ID,
      code: "ARENA_SESSION_INVALID",
      message: "Arena session is no longer active; reconnect through the authenticated arena flow"
    });
    removePresence(presence.presenceId, "SESSION_REVOKED");
    try { presence.ws.close(4004, "Arena session revoked"); } catch (_) {}
    return true;
  }

  function ensureSessionAuthority(presence) {
    if (sessionExpired(presence)) {
      expirePresence(presence);
      return false;
    }
    if (!backingSessionActive(presence)) {
      revokePresence(presence);
      return false;
    }
    return true;
  }

  function replaceExistingPresence(userId) {
    const existingId = presenceIdByUserId.get(userId);
    if (!existingId) return;
    const existing = presencesById.get(existingId);
    removePresence(existingId, "REPLACED");
    if (existing?.ws.readyState === WebSocket.OPEN) {
      send(existing.ws, { type: "SESSION_REPLACED", protocolVersion: LOBBY_PROTOCOL_VERSION, roomId: ROOM_ID });
      existing.ws.close(4001, "Newer lobby connection");
    }
  }

  function rateLimitAllows(presence) {
    const timestamp = now();
    if (timestamp - presence.rateWindowStartedAt >= 1000) {
      presence.rateWindowStartedAt = timestamp;
      presence.rateWindowCount = 0;
    }
    presence.rateWindowCount += 1;
    return presence.rateWindowCount <= MAX_STATE_MESSAGES_PER_SECOND;
  }

  function parseStateMessage(raw) {
    let message;
    try { message = JSON.parse(String(raw)); } catch (_) { return { error: "INVALID_JSON" }; }
    if (!message || message.type !== "PLAYER_STATE") return { error: "UNSUPPORTED_MESSAGE" };
    if (!Number.isSafeInteger(message.seq) || message.seq < 0) return { error: "INVALID_SEQUENCE" };
    if (!validPosition(message.position)) return { error: "INVALID_POSITION" };
    if (!finiteNumber(message.yaw) || Math.abs(message.yaw) > 1000000) return { error: "INVALID_YAW" };
    const locomotion = String(message.locomotion || "").toUpperCase();
    if (!VALID_LOCOMOTION.has(locomotion)) return { error: "INVALID_LOCOMOTION" };
    return { state: { seq: message.seq, position: message.position.map(Number), yaw: Number(message.yaw), locomotion } };
  }

  function join(ws, resolved) {
    const session = resolved.session;
    replaceExistingPresence(session.userId);

    let bootstrap;
    try { bootstrap = worldBridge.bootstrap(session); }
    catch (_) { ws.close(1011, "Lobby bootstrap failed"); return; }

    const presenceId = crypto.randomUUID();
    const presence = {
      presenceId,
      roomId: ROOM_ID,
      sessionId: session.sessionId,
      userId: session.userId,
      displayName: session.displayName,
      expiresAt: Number(session.expiresAt),
      arenaCredential: resolved.credential,
      avatar: bootstrap.avatar ? {
        avatarId: bootstrap.avatar.avatarId,
        profileVersion: bootstrap.avatar.profileVersion,
        format: bootstrap.avatar.format || "glb"
      } : null,
      state: { seq: 0, position: [0, 0, 0], yaw: 0, locomotion: "IDLE" },
      ws,
      isAlive: true,
      connectedAt: now(),
      lastSeenAt: now(),
      rateWindowStartedAt: now(),
      rateWindowCount: 0
    };

    presencesById.set(presenceId, presence);
    presenceIdByUserId.set(presence.userId, presenceId);
    presenceIdBySessionId.set(presence.sessionId, presenceId);

    send(ws, {
      type: "ROOM_SNAPSHOT",
      protocolVersion: LOBBY_PROTOCOL_VERSION,
      roomId: ROOM_ID,
      selfPresenceId: presenceId,
      players: [...presencesById.values()].map(publicPlayer)
    });
    broadcast({ type: "PLAYER_JOINED", protocolVersion: LOBBY_PROTOCOL_VERSION, roomId: ROOM_ID, player: publicPlayer(presence) }, presenceId);

    ws.on("pong", () => { presence.isAlive = true; presence.lastSeenAt = now(); });
    ws.on("message", (raw) => {
      if (presencesById.get(presenceId)?.ws !== ws) return;
      if (!ensureSessionAuthority(presence)) return;
      if (!rateLimitAllows(presence)) {
        send(ws, { type: "ERROR", code: "STATE_RATE_LIMIT", message: "Player state updates are limited to 30 per second" });
        return;
      }
      const parsed = parseStateMessage(raw);
      if (parsed.error) {
        send(ws, { type: "ERROR", code: parsed.error, message: "Invalid lobby message" });
        return;
      }
      if (parsed.state.seq <= presence.state.seq) return;
      presence.state = parsed.state;
      presence.lastSeenAt = now();
      broadcast({
        type: "PLAYER_STATE",
        protocolVersion: LOBBY_PROTOCOL_VERSION,
        roomId: ROOM_ID,
        presenceId,
        memberId: presence.userId,
        state: { ...presence.state, position: [...presence.state.position] }
      }, presenceId);
    });
    ws.on("close", () => {
      if (presencesById.get(presenceId)?.ws === ws) removePresence(presenceId, "DISCONNECTED");
    });
    ws.on("error", () => {});
  }

  function attach(server) {
    if (!server?.on) throw new Error("Lobby bridge requires a Node HTTP server");
    if (attachedServer) {
      if (attachedServer !== server) throw new Error("Lobby bridge is already attached to another HTTP server");
      return server;
    }
    attachedServer = server;
    wss = new WebSocketServer({
      server,
      path: LOBBY_PATH,
      maxPayload: MAX_PAYLOAD_BYTES,
      verifyClient(info, done) {
        const resolved = worldBridge.readSession(info.req);
        info.req.pocketPTLobbySession = resolved;
        done(Boolean(resolved), resolved ? 101 : 401, resolved ? undefined : "Arena session invalid");
      }
    });
    wss.on("connection", (ws, request) => join(ws, request.pocketPTLobbySession));

    heartbeatTimer = setInterval(() => {
      for (const presence of presencesById.values()) {
        if (!ensureSessionAuthority(presence)) continue;
        if (!presence.isAlive) { presence.ws.terminate(); continue; }
        presence.isAlive = false;
        if (presence.ws.readyState === WebSocket.OPEN) presence.ws.ping();
      }
    }, heartbeatMs);
    heartbeatTimer.unref?.();
    return server;
  }

  function avatarHttpError(res, error) {
    const rawCode = String(error?.code || "ARENA_AVATAR_READ_FAILED");
    const status = Number.isInteger(error?.status) ? error.status : rawCode === "ENOENT" ? 404 : 503;
    const code = rawCode === "ENOENT" ? "ARENA_AVATAR_UNAVAILABLE" : rawCode;
    res.set("Cache-Control", "private, no-store");
    return res.status(status).json({ ok: false, error: { code, message: status === 404 ? "Lobby avatar is unavailable" : "Lobby avatar could not be read" } });
  }

  function registerHttp(app) {
    app.get("/api/game/lobby/config", (req, res) => {
      res.set("Cache-Control", "private, no-store");
      const resolved = worldBridge.readSession(req);
      if (!resolved) return res.status(401).json({ ok: false, error: { code: "ARENA_SESSION_INVALID", message: "Arena session is invalid or expired" } });
      return res.status(200).json({
        ok: true,
        data: {
          protocolVersion: LOBBY_PROTOCOL_VERSION,
          roomId: ROOM_ID,
          websocketPath: LOBBY_PATH,
          maxStateMessagesPerSecond: MAX_STATE_MESSAGES_PER_SECOND,
          playerCollision: false
        }
      });
    });

    app.get("/api/game/lobby/players/:presenceId/avatar", (req, res, next) => {
      res.set("Cache-Control", "private, no-store");
      res.vary("Cookie");
      const resolved = worldBridge.readSession(req);
      if (!resolved) return res.status(401).json({ ok: false, error: { code: "ARENA_SESSION_INVALID", message: "Arena session is invalid or expired" } });

      const requesterPresenceId = presenceIdBySessionId.get(resolved.session.sessionId);
      const requester = requesterPresenceId ? presencesById.get(requesterPresenceId) : null;
      const target = presencesById.get(String(req.params.presenceId || ""));
      if (!requester || !target || requester.roomId !== target.roomId) {
        return res.status(403).json({ ok: false, error: { code: "LOBBY_AVATAR_NOT_AUTHORIZED", message: "Both members must be present in the same lobby" } });
      }
      if (!target.avatar) {
        return res.status(404).json({ ok: false, error: { code: "LOBBY_AVATAR_UNAVAILABLE", message: "Lobby member has no active personalized avatar" } });
      }
      const version = String(req.query.version || "");
      if (version !== target.avatar.profileVersion) {
        return res.status(409).json({ ok: false, error: { code: "LOBBY_AVATAR_VERSION_CHANGED", message: "Lobby avatar version changed; refresh room presence" } });
      }

      try {
        const asset = avatarBridge.read(target.userId, version);
        res.type("model/gltf-binary");
        res.set("X-PocketPT-Avatar-Version", asset.profileVersion);
        return res.sendFile(asset.path, { cacheControl: false, lastModified: false }, (error) => {
          if (!error) return;
          if (res.headersSent) return next(error);
          return avatarHttpError(res, error);
        });
      } catch (error) {
        return avatarHttpError(res, error);
      }
    });
  }

  function close() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    for (const presence of [...presencesById.values()]) {
      try { presence.ws.close(1001, "Lobby shutting down"); } catch (_) {}
      removePresence(presence.presenceId, "SERVER_SHUTDOWN");
    }
    if (wss) wss.close();
  }

  function diagnostics() {
    return {
      protocolVersion: LOBBY_PROTOCOL_VERSION,
      roomId: ROOM_ID,
      playerCount: presencesById.size,
      players: [...presencesById.values()].map((presence) => ({
        presenceId: presence.presenceId,
        userId: presence.userId,
        sessionId: presence.sessionId,
        expiresAt: presence.expiresAt,
        lastSeenAt: presence.lastSeenAt,
        state: { ...presence.state, position: [...presence.state.position] }
      }))
    };
  }

  return {
    attach,
    registerHttp,
    close,
    diagnostics,
    constants: { LOBBY_PROTOCOL_VERSION, LOBBY_PATH, ROOM_ID, MAX_PAYLOAD_BYTES, MAX_STATE_MESSAGES_PER_SECOND }
  };
}

module.exports = { createLobbyBridge, LOBBY_PROTOCOL_VERSION, LOBBY_PATH, ROOM_ID };
