"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { loadGamificationConfig } = require("../src/config/gamification");
const { validateEvent, EventValidationError } = require("../src/gamification/validators");
const { createEventService } = require("../src/gamification/eventService");
const { createGamificationEventStore } = require("../src/repositories/gamificationEventStore");
const { createGamificationDefinitionStore } = require("../src/repositories/gamificationDefinitionStore");

function tempFile() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-events-")), "events.json"); }
function event(overrides = {}) {
  return {
    eventId: "evt_1234567890abcdef", eventType: "workout.completed", schemaVersion: 1,
    occurredAt: "2026-07-30T10:00:00.000Z", recordedAt: "2026-07-30T10:00:01.000Z",
    actorUserId: "user_1", subjectUserId: "user_1", source: "session-service",
    sourceEntity: { type: "session", id: "session_1", version: 1 },
    idempotencyKey: "workout.completed:session_1", correlationId: "request_1", causationEventId: null,
    verification: { status: "verified", method: "authoritative-write", riskFlags: [] },
    payload: { durationBand: "20_to_44_min", exerciseCountBand: "one", generated: false },
    ...overrides
  };
}

test("all gamification switches default off and require an explicit true", () => {
  assert.deepEqual(loadGamificationConfig({}), {
    eventCapture: false, evaluation: false, readApi: false, operations: false, notifications: false, leaderboards: false,
    sources: { workoutCompleted: false }
  });
  assert.equal(loadGamificationConfig({ GAMIFICATION_EVENT_CAPTURE: "true" }).eventCapture, true);
});

test("gamification feature dependencies fail closed instead of partially initializing", () => {
  assert.throws(() => loadGamificationConfig({ GAMIFICATION_EVALUATION: "true" }), /requires GAMIFICATION_EVENT_CAPTURE/);
  assert.throws(() => loadGamificationConfig({ GAMIFICATION_EVENT_CAPTURE: "true", GAMIFICATION_READ_API: "true" }), /requires GAMIFICATION_EVALUATION/);
  assert.throws(() => loadGamificationConfig({ GAMIFICATION_EVENT_CAPTURE: "true", GAMIFICATION_EVALUATION: "true", GAMIFICATION_OPERATIONS: "true" }), /requires GAMIFICATION_READ_API/);
  assert.throws(() => loadGamificationConfig({ GAMIFICATION_NOTIFICATIONS: "true" }), /GAMIFICATION_NOTIFICATIONS requires GAMIFICATION_READ_API/);
  assert.throws(() => loadGamificationConfig({ GAMIFICATION_LEADERBOARDS: "true" }), /GAMIFICATION_LEADERBOARDS requires GAMIFICATION_READ_API/);
});

test("event validation returns a minimized immutable registered envelope", () => {
  const extra = event({ attackerField: "ignored" });
  const validated = validateEvent(extra, { now: Date.parse("2026-07-30T10:02:00.000Z") });
  assert.equal(validated.attackerField, undefined);
  assert.ok(Object.isFrozen(validated));
  assert.ok(Object.isFrozen(validated.payload));
});

test("event validation rejects unknown versions, payload fields, invalid values, and future facts", () => {
  const cases = [
    [event({ schemaVersion: 2 }), "UNKNOWN_EVENT_CONTRACT"],
    [event({ payload: { durationBand: "20_to_44_min", exerciseCountBand: "one", generated: false, exactGps: "private" } }), "UNSAFE_PAYLOAD"],
    [event({ payload: { durationBand: "twenty", exerciseCountBand: "one", generated: false } }), "INVALID_PAYLOAD"],
    [event({ occurredAt: "2026-07-31T10:00:00.000Z" }), "FUTURE_EVENT"]
  ];
  for (const [candidate, code] of cases) {
    assert.throws(() => validateEvent(candidate, { now: Date.parse("2026-07-30T10:02:00.000Z") }), (error) => error instanceof EventValidationError && error.code === code);
  }
});

test("event store deduplicates by subject and key, persists across restart, and resumes by cursor", () => {
  const filePath = tempFile();
  const store = createGamificationEventStore({ filePath, maxRead: 2 });
  assert.equal(store.append(validateEvent(event(), { now: Date.parse("2026-07-30T10:02:00.000Z") })).status, "recorded");
  assert.equal(store.append(validateEvent(event({ eventId: "evt_abcdef1234567890" }), { now: Date.parse("2026-07-30T10:02:00.000Z") })).status, "duplicate");
  const restarted = createGamificationEventStore({ filePath, maxRead: 2 });
  assert.equal(restarted.metrics().count, 1);
  assert.deepEqual(restarted.readAfter(0, 100).map((item) => item.sequence), [1]);
  assert.deepEqual(restarted.readAfter(1), []);
});

test("event store serializes independent process writers without lost events or duplicate cursors", async () => {
  const filePath = tempFile();
  const modulePath = path.resolve(__dirname, "../src/repositories/gamificationEventStore.js");
  const writer = `
    const { createGamificationEventStore } = require(process.argv[1]);
    const filePath = process.argv[2]; const id = process.argv[3];
    const store = createGamificationEventStore({ filePath });
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    store.append({ eventId: 'evt_' + id, subjectUserId: 'user_1', idempotencyKey: 'key_' + id });
  `;
  const run = promisify(execFile);
  await Promise.all(Array.from({ length: 12 }, (_, index) => run(process.execPath, ["-e", writer, modulePath, filePath, String(index)])));

  const records = createGamificationEventStore({ filePath, maxRead: 100 }).readAfter(0, 100);
  assert.equal(records.length, 12);
  assert.deepEqual(records.map((item) => item.sequence).sort((a, b) => a - b), Array.from({ length: 12 }, (_, index) => index + 1));
  assert.equal(new Set(records.map((item) => item.event.idempotencyKey)).size, 12);
});

test("event store recovers the prior atomic snapshot and records safe corruption metadata", () => {
  const filePath = tempFile();
  const store = createGamificationEventStore({ filePath });
  store.append(validateEvent(event(), { now: Date.parse("2026-07-30T10:02:00.000Z") }));
  store.append(validateEvent(event({ eventId: "evt_abcdef1234567890", sourceEntity: { type: "session", id: "session_2", version: 1 }, idempotencyKey: "workout.completed:session_2" }), { now: Date.parse("2026-07-30T10:02:00.000Z") }));
  fs.writeFileSync(filePath, "partial");
  const recovered = createGamificationEventStore({ filePath });
  assert.equal(recovered.metrics().count, 1);
  const quarantine = fs.readFileSync(`${filePath}.quarantine.ndjson`, "utf8");
  assert.match(quarantine, /invalid|Unexpected/);
  assert.doesNotMatch(quarantine, /durationBand/);
});

test("event service quarantines unknown contracts without copying payloads", () => {
  const filePath = tempFile();
  const service = createEventService({ eventStore: createGamificationEventStore({ filePath }), clock: () => new Date("2026-07-30T10:02:00.000Z") });
  assert.throws(() => service.record(event({ schemaVersion: 999, payload: { secret: "never-store" } })), /not registered/);
  const quarantine = fs.readFileSync(`${filePath}.quarantine.ndjson`, "utf8");
  assert.match(quarantine, /UNKNOWN_EVENT_CONTRACT/);
  assert.doesNotMatch(quarantine, /never-store/);
  assert.equal(service.observe().quarantined, 1);
});

test("definition store rejects unsafe seed envelopes and accepts disabled versioned definitions", () => {
  const store = createGamificationDefinitionStore({ directory: tempFile() });
  assert.throws(() => store.validateDocument({ schemaVersion: 1, definitions: [{ id: "x" }] }, "seed.json"), /invalid/);
  const safe = { schemaVersion: 1, definitions: [{ id: "future", definitionVersion: "1.0.0", lifecycleState: "disabled" }] };
  assert.equal(store.validateDocument(safe, "seed.json"), safe);
});
