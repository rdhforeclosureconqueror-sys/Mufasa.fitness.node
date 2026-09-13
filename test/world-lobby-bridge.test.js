"use strict";

const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
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

  async function next(type, timeoutMs = 1500) {
    const existing = queue.findIndex((message) => message.type === type);
    if (existing >= 0) return queue.splice(existing, 1)[0];
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

function rejectedClient(url, cookie = "") {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers: cookie ? { Cookie: cookie } : {} });
    ws.once("unexpected-response", (_request, response) => resolve(response.statusCode));
    ws.once("open", () => reject(new Error("unauthorized websocket opened")));
    ws.once("error", (error) => {
      if (!String(error.message).includes("Unexpected server response")) reject(error);
    });
  });
}

async function startFixture(options = {}) {
  const now = options.now || (() => Date.now());
  const bridge = createWorldBridge({
    secureCookie: false,
    ttlMs: options.ttlMs || 60000,
    avatarAssets: options.avatarAssets,
    now
  });
  const lobby = createLobbyBridge({
    worldBridge: bridge,
    avatarAssets: options.avatarAssets,
    heartbeatMs: options.heartbeatMs || 60000,
    now
  });
  const app = express();
  lobby.registerHttp(app);
  bridge.register(app);
  const server = http.createServer(app);
  lobby.attach(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    bridge,
    lobby,
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
    url: `ws://127.0.0.1:${address.port}${lobby.constants.LOBBY_PATH}`
  };
}

test("lobby websocket and config reject missing or invalid arena authentication", async () => {
  const fixture = await startFixture();
  try {
    assert.equal(await rejectedClient(fixture.url), 401);
    assert.equal(await rejectedClient(fixture.url, "PocketPTArenaSession=not-valid"), 401);
    const config = await fetch(`${fixture.baseUrl}/api/game/lobby/config`);
    assert.equal(config.status, 401);
    assert.equal(fixture.lobby.diagnostics().playerCount, 0);
  } finally {
    await stopFixture(fixture);
  }
});

async function stopFixture(fixture, clients = []) {
  for (const client of clients) {
    try { client.ws.close(); } catch (_) {}
  }
  fixture.lobby.close();
  await new Promise((resolve) => fixture.server.close(resolve));
}

test("two authenticated members share one room and receive server-stamped movement", async () => {
  const fixture = await startFixture();
  const clients = [];
  try {
    const a = connectClient(fixture.url, createArenaCookie(fixture.bridge, "member_a", "Rashad"));
    clients.push(a);
    await a.opened;
    const snapshotA = await a.next("ROOM_SNAPSHOT");
    assert.equal(snapshotA.roomId, "lions_den");
    assert.equal(snapshotA.players.length, 1);
    const presenceA = snapshotA.selfPresenceId;

    const b = connectClient(fixture.url, createArenaCookie(fixture.bridge, "member_b", "Daughter A"));
    clients.push(b);
    await b.opened;
    const snapshotB = await b.next("ROOM_SNAPSHOT");
    assert.equal(snapshotB.players.length, 2);
    const joined = await a.next("PLAYER_JOINED");
    assert.equal(joined.player.member.id, "member_b");

    a.ws.send(JSON.stringify({
      type: "PLAYER_STATE",
      seq: 1,
      position: [1.5, 0, -2.25],
      yaw: 1.2,
      locomotion: "WALK",
      presenceId: "spoofed-presence",
      memberId: "member_b"
    }));

    const state = await b.next("PLAYER_STATE");
    assert.equal(state.presenceId, presenceA, "server owns the sender presence id");
    assert.equal(state.memberId, "member_a", "server owns the sender member id");
    assert.deepEqual(state.state.position, [1.5, 0, -2.25]);
    assert.equal(state.state.locomotion, "WALK");

    a.ws.close();
    const left = await b.next("PLAYER_LEFT");
    assert.equal(left.presenceId, presenceA);
    assert.equal(fixture.lobby.diagnostics().playerCount, 1);
  } finally {
    await stopFixture(fixture, clients);
  }
});

test("reconnecting the same member replaces the old presence instead of creating a ghost", async () => {
  const fixture = await startFixture();
  const clients = [];
  try {
    const first = connectClient(fixture.url, createArenaCookie(fixture.bridge, "member_a", "Rashad"));
    clients.push(first);
    await first.opened;
    const firstSnapshot = await first.next("ROOM_SNAPSHOT");
    const firstPresence = firstSnapshot.selfPresenceId;

    const second = connectClient(fixture.url, createArenaCookie(fixture.bridge, "member_a", "Rashad"));
    clients.push(second);
    await second.opened;
    const secondSnapshot = await second.next("ROOM_SNAPSHOT");
    assert.equal(secondSnapshot.players.length, 1);
    assert.notEqual(secondSnapshot.selfPresenceId, firstPresence);
    assert.equal(fixture.lobby.diagnostics().playerCount, 1);

    const replaced = await first.next("SESSION_REPLACED");
    assert.equal(replaced.roomId, "lions_den");
  } finally {
    await stopFixture(fixture, clients);
  }
});

test("stale movement sequence numbers cannot roll a player backward", async () => {
  const fixture = await startFixture();
  const clients = [];
  try {
    const a = connectClient(fixture.url, createArenaCookie(fixture.bridge, "member_a", "Rashad"));
    clients.push(a);
    await a.opened;
    await a.next("ROOM_SNAPSHOT");

    a.ws.send(JSON.stringify({ type: "PLAYER_STATE", seq: 4, position: [4, 0, 1], yaw: 0.5, locomotion: "RUN" }));
    await new Promise((resolve) => setTimeout(resolve, 25));
    a.ws.send(JSON.stringify({ type: "PLAYER_STATE", seq: 3, position: [99, 0, 99], yaw: 9, locomotion: "WALK" }));
    await new Promise((resolve) => setTimeout(resolve, 25));

    const state = fixture.lobby.diagnostics().players[0].state;
    assert.equal(state.seq, 4);
    assert.deepEqual(state.position, [4, 0, 1]);
    assert.equal(state.locomotion, "RUN");
  } finally {
    await stopFixture(fixture, clients);
  }
});

test("malformed movement is rejected without changing state or disconnecting the member", async () => {
  const fixture = await startFixture();
  const clients = [];
  try {
    const a = connectClient(fixture.url, createArenaCookie(fixture.bridge, "member_a", "Rashad"));
    clients.push(a);
    await a.opened;
    await a.next("ROOM_SNAPSHOT");

    for (const [payload, code] of [
      ["not json", "INVALID_JSON"],
      [JSON.stringify({ type: "OTHER" }), "UNSUPPORTED_MESSAGE"],
      [JSON.stringify({ type: "PLAYER_STATE", seq: -1, position: [0, 0, 0], yaw: 0, locomotion: "IDLE" }), "INVALID_SEQUENCE"],
      [JSON.stringify({ type: "PLAYER_STATE", seq: 1, position: [Infinity, 0, 0], yaw: 0, locomotion: "IDLE" }), "INVALID_POSITION"],
      [JSON.stringify({ type: "PLAYER_STATE", seq: 1, position: [0, 0, 0], yaw: "left", locomotion: "IDLE" }), "INVALID_YAW"],
      [JSON.stringify({ type: "PLAYER_STATE", seq: 1, position: [0, 0, 0], yaw: 0, locomotion: "FLY" }), "INVALID_LOCOMOTION"]
    ]) {
      a.ws.send(payload);
      assert.equal((await a.next("ERROR")).code, code);
    }
    assert.deepEqual(fixture.lobby.diagnostics().players[0].state, {
      seq: 0, position: [0, 0, 0], yaw: 0, locomotion: "IDLE"
    });
    assert.equal(a.ws.readyState, WebSocket.OPEN);
  } finally {
    await stopFixture(fixture, clients);
  }
});

test("state rate limiting accepts 30 updates and rejects the 31st in one window", async () => {
  let timestamp = 1000;
  const fixture = await startFixture({ now: () => timestamp });
  const clients = [];
  try {
    const a = connectClient(fixture.url, createArenaCookie(fixture.bridge, "member_a", "Rashad"));
    clients.push(a);
    await a.opened;
    await a.next("ROOM_SNAPSHOT");
    for (let seq = 1; seq <= 31; seq += 1) {
      a.ws.send(JSON.stringify({ type: "PLAYER_STATE", seq, position: [seq, 0, 0], yaw: 0, locomotion: "WALK" }));
    }
    assert.equal((await a.next("ERROR")).code, "STATE_RATE_LIMIT");
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(fixture.lobby.diagnostics().players[0].state.seq, 30);

    timestamp += 1000;
    a.ws.send(JSON.stringify({ type: "PLAYER_STATE", seq: 32, position: [32, 0, 0], yaw: 0, locomotion: "RUN" }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(fixture.lobby.diagnostics().players[0].state.seq, 32, "a new rate window accepts state again");
  } finally {
    await stopFixture(fixture, clients);
  }
});

test("a late join snapshot contains the latest authoritative state", async () => {
  const fixture = await startFixture();
  const clients = [];
  try {
    const a = connectClient(fixture.url, createArenaCookie(fixture.bridge, "member_a", "Rashad"));
    clients.push(a);
    await a.opened;
    const snapshotA = await a.next("ROOM_SNAPSHOT");
    a.ws.send(JSON.stringify({ type: "PLAYER_STATE", seq: 9, position: [2, 3, 4], yaw: 1.5, locomotion: "RUN" }));
    await new Promise((resolve) => setTimeout(resolve, 20));

    const b = connectClient(fixture.url, createArenaCookie(fixture.bridge, "member_b", "B"));
    clients.push(b);
    await b.opened;
    const snapshotB = await b.next("ROOM_SNAPSHOT");
    const existing = snapshotB.players.find((player) => player.presenceId === snapshotA.selfPresenceId);
    assert.deepEqual(existing.state, { seq: 9, position: [2, 3, 4], yaw: 1.5, locomotion: "RUN" });
  } finally {
    await stopFixture(fixture, clients);
  }
});

test("reconnect tells observers to remove the old presence before adding exactly one replacement", async () => {
  const fixture = await startFixture();
  const clients = [];
  try {
    const observer = connectClient(fixture.url, createArenaCookie(fixture.bridge, "observer", "Observer"));
    clients.push(observer);
    await observer.opened;
    await observer.next("ROOM_SNAPSHOT");
    const first = connectClient(fixture.url, createArenaCookie(fixture.bridge, "member_a", "A"));
    clients.push(first);
    await first.opened;
    const firstSnapshot = await first.next("ROOM_SNAPSHOT");
    await observer.next("PLAYER_JOINED");

    const replacement = connectClient(fixture.url, createArenaCookie(fixture.bridge, "member_a", "A"));
    clients.push(replacement);
    await replacement.opened;
    const replacementSnapshot = await replacement.next("ROOM_SNAPSHOT");
    const left = await observer.next("PLAYER_LEFT");
    const joined = await observer.next("PLAYER_JOINED");
    assert.equal(left.presenceId, firstSnapshot.selfPresenceId);
    assert.equal(left.reason, "REPLACED");
    assert.equal(joined.player.presenceId, replacementSnapshot.selfPresenceId);
    assert.equal(fixture.lobby.diagnostics().players.filter((player) => player.userId === "member_a").length, 1);
  } finally {
    await stopFixture(fixture, clients);
  }
});

test("remote avatar download is limited to active same-room sessions and owner endpoint stays isolated", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lobby-avatar-"));
  const files = new Map();
  for (const member of ["member_a", "member_b", "outsider"]) {
    const glb = path.join(root, `${member}.glb`);
    fs.writeFileSync(glb, `avatar:${member}`);
    files.set(member, glb);
  }
  const avatarAssets = {
    isEnabled: () => true,
    getMemberAvatar: (member) => ({ avatarModelUrl: `/uploads/avatars/${Buffer.from(member).toString("hex").padEnd(16, "0")}.glb`, avatarUpdatedAt: 1 }),
    requireOwnedAsset: (member, avatarId) => {
      assert.equal(avatarId, Buffer.from(member).toString("hex").padEnd(16, "0"));
      return { glb: files.get(member) };
    }
  };
  const fixture = await startFixture({ avatarAssets });
  const clients = [];
  try {
    const cookieA = createArenaCookie(fixture.bridge, "member_a", "A");
    const cookieB = createArenaCookie(fixture.bridge, "member_b", "B");
    const outsiderCookie = createArenaCookie(fixture.bridge, "outsider", "Outsider");
    const a = connectClient(fixture.url, cookieA);
    clients.push(a);
    await a.opened;
    const snapshotA = await a.next("ROOM_SNAPSHOT");
    const b = connectClient(fixture.url, cookieB);
    clients.push(b);
    await b.opened;
    const snapshotB = await b.next("ROOM_SNAPSHOT");
    const target = snapshotB.players.find((player) => player.presenceId === snapshotA.selfPresenceId);

    const anonymous = await fetch(`${fixture.baseUrl}${target.avatar.assetUrl}`);
    const outsider = await fetch(`${fixture.baseUrl}${target.avatar.assetUrl}`, { headers: { Cookie: outsiderCookie } });
    const peer = await fetch(`${fixture.baseUrl}${target.avatar.assetUrl}`, { headers: { Cookie: cookieB } });
    assert.equal(anonymous.status, 401);
    assert.equal(outsider.status, 403);
    assert.equal(peer.status, 200);
    assert.equal(await peer.text(), "avatar:member_a");

    const ownerAsset = await fetch(`${fixture.baseUrl}/api/game/avatar/asset?version=${target.avatar.profileVersion}`, { headers: { Cookie: cookieA } });
    const otherAsset = await fetch(`${fixture.baseUrl}/api/game/avatar/asset?version=${target.avatar.profileVersion}`, { headers: { Cookie: cookieB } });
    assert.equal(ownerAsset.status, 200);
    assert.equal(await ownerAsset.text(), "avatar:member_a");
    assert.notEqual(otherAsset.status, 200, "another member cannot use the canonical owner-isolated endpoint");
  } finally {
    await stopFixture(fixture, clients);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("expired arena sessions are removed before they can keep broadcasting lobby movement", async () => {
  let timestamp = 1000;
  const fixture = await startFixture({ now: () => timestamp, ttlMs: 100, heartbeatMs: 60000 });
  const clients = [];
  try {
    const a = connectClient(fixture.url, createArenaCookie(fixture.bridge, "member_a", "Rashad"));
    clients.push(a);
    await a.opened;
    const snapshotA = await a.next("ROOM_SNAPSHOT");
    const presenceA = snapshotA.selfPresenceId;

    timestamp = 1050;
    const b = connectClient(fixture.url, createArenaCookie(fixture.bridge, "member_b", "Daughter A"));
    clients.push(b);
    await b.opened;
    await b.next("ROOM_SNAPSHOT");
    await a.next("PLAYER_JOINED");

    timestamp = 1101;
    a.ws.send(JSON.stringify({ type: "PLAYER_STATE", seq: 1, position: [8, 0, 8], yaw: 0.2, locomotion: "RUN" }));

    const expired = await a.next("ERROR");
    assert.equal(expired.code, "ARENA_SESSION_EXPIRED");
    const left = await b.next("PLAYER_LEFT");
    assert.equal(left.presenceId, presenceA);
    assert.equal(left.reason, "SESSION_EXPIRED");
    assert.equal(fixture.lobby.diagnostics().playerCount, 1);
    assert.equal(fixture.lobby.diagnostics().players[0].userId, "member_b");
  } finally {
    await stopFixture(fixture, clients);
  }
});
