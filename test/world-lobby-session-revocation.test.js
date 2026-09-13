"use strict";

const http = require("node:http");
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { WebSocket } = require("ws");
const { createWorldBridge } = require("../src/world/worldBridge");
const { createLobbyBridge } = require("../src/world/lobbyBridge");

function createArenaCookie(bridge, userId, displayName) {
  const ticket = bridge.createTicket({ userId, name: displayName });
  const exchanged = bridge.exchangeTicket(ticket.ticket);
  return `${bridge.constants.ARENA_COOKIE}=${exchanged.credential}`;
}

function connectClient(url, cookie) {
  const ws = new WebSocket(url, { headers: { Cookie: cookie } });
  const queue = [];
  const waiters = [];

  ws.on("message", (raw) => {
    const message = JSON.parse(String(raw));
    const index = waiters.findIndex((waiter) => waiter.type === message.type);
    if (index >= 0) {
      const [waiter] = waiters.splice(index, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(message);
      return;
    }
    queue.push(message);
  });

  const opened = new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });

  function next(type, timeoutMs = 1000) {
    const existing = queue.findIndex((message) => message.type === type);
    if (existing >= 0) return Promise.resolve(queue.splice(existing, 1)[0]);
    return new Promise((resolve, reject) => {
      const waiter = { type, resolve, reject, timer: null };
      waiter.timer = setTimeout(() => {
        const index = waiters.indexOf(waiter);
        if (index >= 0) waiters.splice(index, 1);
        reject(new Error(`Timed out waiting for ${type}`));
      }, timeoutMs);
      waiters.push(waiter);
    });
  }

  return { ws, opened, next };
}

async function startFixture({ heartbeatMs = 60000 } = {}) {
  const bridge = createWorldBridge({ secureCookie: false, ttlMs: 60000 });
  const lobby = createLobbyBridge({ worldBridge: bridge, heartbeatMs });
  const app = express();
  lobby.registerHttp(app);
  bridge.register(app);
  const server = http.createServer(app);
  lobby.attach(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  return {
    bridge,
    lobby,
    server,
    baseUrl: `http://127.0.0.1:${port}`,
    wsUrl: `ws://127.0.0.1:${port}${lobby.constants.LOBBY_PATH}`
  };
}

async function stopFixture(fixture, clients = []) {
  for (const client of clients) {
    try { client.ws.close(); } catch (_) {}
  }
  fixture.lobby.close();
  await new Promise((resolve) => fixture.server.close(resolve));
}

async function revokeSession(fixture, cookie) {
  const response = await fetch(`${fixture.baseUrl}/api/game/session`, {
    method: "DELETE",
    headers: { Cookie: cookie }
  });
  assert.equal(response.status, 200);
}

test("explicit arena session revocation removes movement authority before the next state update", async () => {
  const fixture = await startFixture();
  const clients = [];
  try {
    const cookieA = createArenaCookie(fixture.bridge, "member_a", "Rashad");
    const cookieB = createArenaCookie(fixture.bridge, "member_b", "Observer");
    const a = connectClient(fixture.wsUrl, cookieA);
    const b = connectClient(fixture.wsUrl, cookieB);
    clients.push(a, b);

    await a.opened;
    const snapshotA = await a.next("ROOM_SNAPSHOT");
    await b.opened;
    await b.next("ROOM_SNAPSHOT");
    await a.next("PLAYER_JOINED");

    await revokeSession(fixture, cookieA);

    a.ws.send(JSON.stringify({
      type: "PLAYER_STATE",
      seq: 1,
      position: [7, 0, 7],
      yaw: 0.75,
      locomotion: "RUN"
    }));

    const error = await a.next("ERROR");
    assert.equal(error.code, "ARENA_SESSION_INVALID");
    const left = await b.next("PLAYER_LEFT");
    assert.equal(left.presenceId, snapshotA.selfPresenceId);
    assert.equal(left.reason, "SESSION_REVOKED");
    await assert.rejects(() => b.next("PLAYER_STATE", 120), /Timed out waiting for PLAYER_STATE/);

    const diagnostics = fixture.lobby.diagnostics();
    assert.equal(diagnostics.playerCount, 1);
    assert.equal(diagnostics.players[0].userId, "member_b");
    assert.equal(JSON.stringify(diagnostics).includes("PocketPTArenaSession"), false);
  } finally {
    await stopFixture(fixture, clients);
  }
});

test("heartbeat sweep removes an explicitly revoked idle presence without waiting for TTL", async () => {
  const fixture = await startFixture({ heartbeatMs: 20 });
  const clients = [];
  try {
    const cookieA = createArenaCookie(fixture.bridge, "member_a", "Rashad");
    const cookieB = createArenaCookie(fixture.bridge, "member_b", "Observer");
    const a = connectClient(fixture.wsUrl, cookieA);
    const b = connectClient(fixture.wsUrl, cookieB);
    clients.push(a, b);

    await a.opened;
    const snapshotA = await a.next("ROOM_SNAPSHOT");
    await b.opened;
    await b.next("ROOM_SNAPSHOT");
    await a.next("PLAYER_JOINED");

    await revokeSession(fixture, cookieA);

    const left = await b.next("PLAYER_LEFT", 750);
    assert.equal(left.presenceId, snapshotA.selfPresenceId);
    assert.equal(left.reason, "SESSION_REVOKED");
    assert.equal(fixture.lobby.diagnostics().playerCount, 1);
    assert.equal(fixture.lobby.diagnostics().players[0].userId, "member_b");
  } finally {
    await stopFixture(fixture, clients);
  }
});

test("late join snapshot does not include a presence whose arena session was revoked", async () => {
  const fixture = await startFixture({ heartbeatMs: 60000 });
  const clients = [];
  try {
    const cookieA = createArenaCookie(fixture.bridge, "member_a", "Rashad");
    const a = connectClient(fixture.wsUrl, cookieA);
    clients.push(a);
    await a.opened;
    await a.next("ROOM_SNAPSHOT");

    await revokeSession(fixture, cookieA);

    const cookieB = createArenaCookie(fixture.bridge, "member_b", "Late Joiner");
    const b = connectClient(fixture.wsUrl, cookieB);
    clients.push(b);
    await b.opened;
    const snapshotB = await b.next("ROOM_SNAPSHOT");

    assert.equal(snapshotB.players.length, 1);
    assert.equal(snapshotB.players[0].member.id, "member_b");
    assert.equal(snapshotB.selfPresenceId, snapshotB.players[0].presenceId);
    assert.equal(fixture.lobby.diagnostics().playerCount, 1);
  } finally {
    await stopFixture(fixture, clients);
  }
});

test("same-room avatar authorization removes a revoked target before serving it", async () => {
  const fixture = await startFixture({ heartbeatMs: 60000 });
  const clients = [];
  try {
    const cookieA = createArenaCookie(fixture.bridge, "member_a", "Rashad");
    const cookieB = createArenaCookie(fixture.bridge, "member_b", "Observer");
    const a = connectClient(fixture.wsUrl, cookieA);
    const b = connectClient(fixture.wsUrl, cookieB);
    clients.push(a, b);

    await a.opened;
    const snapshotA = await a.next("ROOM_SNAPSHOT");
    await b.opened;
    await b.next("ROOM_SNAPSHOT");
    await a.next("PLAYER_JOINED");

    await revokeSession(fixture, cookieA);

    const response = await fetch(
      `${fixture.baseUrl}/api/game/lobby/players/${encodeURIComponent(snapshotA.selfPresenceId)}/avatar?version=${"a".repeat(32)}`,
      { headers: { Cookie: cookieB } }
    );
    assert.equal(response.status, 403);

    const left = await b.next("PLAYER_LEFT");
    assert.equal(left.presenceId, snapshotA.selfPresenceId);
    assert.equal(left.reason, "SESSION_REVOKED");
    assert.equal(fixture.lobby.diagnostics().playerCount, 1);
    assert.equal(fixture.lobby.diagnostics().players[0].userId, "member_b");
  } finally {
    await stopFixture(fixture, clients);
  }
});
