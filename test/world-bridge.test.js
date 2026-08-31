"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createWorldBridge, PROTOCOL_VERSION, EXPERIENCE } = require("../src/world/worldBridge");

function requestWithCookie(cookie = "") {
  return { headers: { cookie }, get(name) { return String(name).toLowerCase() === "cookie" ? cookie : null; } };
}

test("world bridge creates an experience-scoped one-time launch ticket", () => {
  let clock = 1_700_000_000_000;
  const bridge = createWorldBridge({ now: () => clock, ttlMs: 60_000, secureCookie: false });
  const created = bridge.createTicket({ userId: "member_a", name: "Member A", email: "member.a@example.com", jti: "canonical-jti" });
  assert.ok(created.ticket.length >= 40);
  const first = bridge.exchangeTicket(created.ticket);
  assert.ok(first);
  assert.equal(first.session.userId, "member_a");
  assert.equal(first.session.displayName, "Member A");
  assert.deepEqual(first.session.experience, EXPERIENCE);
  assert.equal(bridge.exchangeTicket(created.ticket), null, "launch ticket must be one-time use");
});

test("bootstrap exposes minimum member and experience data only", () => {
  const bridge = createWorldBridge({ now: () => 1_700_000_000_000, ttlMs: 60_000, secureCookie: false });
  const created = bridge.createTicket({ userId: "member_b", name: "Rashad", email: "rashad@example.com", jti: "canonical-secret-id" });
  const exchanged = bridge.exchangeTicket(created.ticket);
  const payload = bridge.bootstrap(exchanged.session);
  assert.equal(payload.protocolVersion, PROTOCOL_VERSION);
  assert.deepEqual(payload.member, { id: "member_b", displayName: "Rashad" });
  assert.deepEqual(payload.experience, { type: "PUSH_UP_ARENA", challengeId: "push_up" });
  assert.equal(payload.avatar, null);
  assert.deepEqual(payload.api, { baseUrl: "/api/game" });
  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes("canonical-secret-id"), false);
  assert.equal(serialized.includes("example.com"), false);
  assert.equal(serialized.includes("password"), false);
  assert.equal(serialized.includes("health"), false);
  assert.equal(serialized.includes("intake"), false);
});

test("display name never derives from email or user id", () => {
  const bridge = createWorldBridge({ secureCookie: false });
  const withoutName = bridge.exchangeTicket(bridge.createTicket({ userId: "private-member-id", email: "private.person@example.com" }).ticket);
  const payload = bridge.bootstrap(withoutName.session);
  assert.equal(payload.member.displayName, "Member");
  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes("private.person"), false);
  assert.equal(serialized.includes("private-member-id"), true, "canonical member id remains part of the explicit protocol identity contract");
});

test("expired launch ticket fails closed", () => {
  let clock = 1_700_000_000_000;
  const bridge = createWorldBridge({ now: () => clock, ttlMs: 1000, secureCookie: false });
  const created = bridge.createTicket({ userId: "member_c" });
  clock += 1001;
  assert.equal(bridge.exchangeTicket(created.ticket), null);
});

test("arena cookie resolves only the bound member session and expires", () => {
  let clock = 1_700_000_000_000;
  const bridge = createWorldBridge({ now: () => clock, ttlMs: 1000, secureCookie: false });
  const a = bridge.exchangeTicket(bridge.createTicket({ userId: "member_a" }).ticket);
  const b = bridge.exchangeTicket(bridge.createTicket({ userId: "member_b" }).ticket);
  const cookieA = `${bridge.constants.ARENA_COOKIE}=${a.credential}`;
  const cookieB = `${bridge.constants.ARENA_COOKIE}=${b.credential}`;
  assert.equal(bridge.readSession(requestWithCookie(cookieA)).session.userId, "member_a");
  assert.equal(bridge.readSession(requestWithCookie(cookieB)).session.userId, "member_b");
  assert.notEqual(a.credential, b.credential);
  clock += 1001;
  assert.equal(bridge.readSession(requestWithCookie(cookieA)), null);
  assert.equal(bridge.readSession(requestWithCookie(cookieB)), null);
});

test("protocol contract cannot be switched to a different challenge internally", () => {
  const bridge = createWorldBridge({ secureCookie: false });
  assert.equal(bridge.constants.EXPERIENCE.type, "PUSH_UP_ARENA");
  assert.equal(bridge.constants.EXPERIENCE.challengeId, "push_up");
  assert.equal(Object.isFrozen(bridge.constants.EXPERIENCE), true);
});
