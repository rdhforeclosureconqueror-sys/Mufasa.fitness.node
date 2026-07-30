"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createSessionService } = require("../src/services/sessionService");

function memoryUserStore() {
  const users = new Map();
  return {
    loadUser(userId) { return structuredClone(users.get(userId) || { userId, sessions: {}, events: [] }); },
    updateUser(userId, update) { const next = update(this.loadUser(userId)); users.set(userId, structuredClone(next)); return next; }
  };
}

test("successful workout completion emits once after the authoritative commit", () => {
  const store = memoryUserStore();
  const facts = [];
  const service = createSessionService({
    userStore: store,
    workoutCompletedAdapter(fact) {
      assert.ok(store.loadUser(fact.userId).sessions[fact.session.sessionId].endedAt, "event must observe committed data");
      facts.push(fact);
    }
  });
  service.startSession({ userId: "user_1", sessionId: "session_1" });
  service.completeSession({ userId: "user_1", sessionId: "session_1", correlationId: "request_1" });
  assert.equal(facts.length, 1);
  assert.equal(facts[0].correlationId, "request_1");
  assert.throws(() => service.completeSession({ userId: "user_1", sessionId: "session_1" }), /already completed/);
  assert.equal(facts.length, 1);
});

test("failed domain writes emit nothing and capture failures cannot change domain success", () => {
  const errors = [];
  let calls = 0;
  const service = createSessionService({
    userStore: memoryUserStore(),
    workoutCompletedAdapter() { calls += 1; throw new Error("event store unavailable"); },
    logger: { error(message, metadata) { errors.push({ message, metadata }); } }
  });
  assert.throws(() => service.completeSession({ userId: "user_1", sessionId: "missing" }), /does not exist/);
  assert.equal(calls, 0);
  service.startSession({ userId: "user_1", sessionId: "session_1" });
  const result = service.completeSession({ userId: "user_1", sessionId: "session_1" });
  assert.ok(result.endedAt);
  assert.equal(calls, 1);
  assert.equal(errors[0].metadata.errorCode, "CAPTURE_FAILED");
  assert.equal(errors[0].metadata.error, undefined, "logs must not expose payload/error details");
});
