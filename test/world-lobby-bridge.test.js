"use strict";

const http = require("node:http");
const test = require("node:test");
const assert = require("node:assert/strict");
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

async function startFixture() {
  const bridge = createWorldBridge({ secureCookie: false, ttlMs: 60000 });
  const lobby = createLobbyBridge({ worldBridge: bridge, heartbeatMs: 60000 });
  const server = http.createServer((_req, res) => {
    res.statusCode = 404;
    res.end("not found");
  });
  lobby.attach(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    bridge,
    lobby,
    server,
    url: `ws://127.0.0.1:${address.port}${lobby.constants.LOBBY_PATH}`
  };
}

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
