"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const policyDocument = require("../data/gamification/xp-policy.json");
const levelsDocument = require("../data/gamification/levels.json");
const definitionsDocument = require("../data/gamification/achievements.json");
const { createXpPolicyService, validateXpPolicy } = require("../src/gamification/xpPolicyService");
const { createLevelService } = require("../src/gamification/levelService");
const { createAchievementService } = require("../src/gamification/achievementService");
const { createProjectionService } = require("../src/gamification/projectionService");
const { validateAchievementDefinitions } = require("../src/gamification/policyService");
const { createGamificationEventStore } = require("../src/repositories/gamificationEventStore");
const { createGamificationAwardStore } = require("../src/repositories/gamificationAwardStore");
const { createGamificationLedgerStore } = require("../src/repositories/gamificationLedgerStore");
const { createGamificationProjectionStore } = require("../src/repositories/gamificationProjectionStore");
const { validateEvent } = require("../src/gamification/validators");

function event(index, { type = "workout.completed", at = `2026-08-01T${String(index).padStart(2, "0")}:00:00.000Z`, entity = `activity_${index}` } = {}) {
  return { eventId: `evt_${String(index).padStart(16, "0")}`, eventType: type, occurredAt: at, subjectUserId: "user_1",
    sourceEntity: { type: "activity", id: entity, version: 1 }, verification: { status: "verified" }, payload: {} };
}
function expandedDocument() {
  const policy = structuredClone(policyDocument.policies[0]);
  policy.actions["walk.completed"] = { xp: 15, category: "movement", overlapGroup: "completed_activity", overlapIdentity: "sourceEntity.id" };
  policy.actions["trail.completed"] = { xp: 25, category: "movement", overlapGroup: "completed_activity", overlapIdentity: "sourceEntity.id" };
  policy.actions["nutrition.logged"] = { xp: 10, category: "nutrition" };
  policy.sourceDailyCaps["walk.completed"] = 30;
  policy.sourceDailyCaps["trail.completed"] = 25;
  policy.sourceDailyCaps["nutrition.logged"] = 20;
  policy.dailyCaps.movement = 40;
  policy.dailyCaps.nutrition = 20;
  return { schemaVersion: 1, policies: [policy] };
}

test("versioned policy awards configured base XP and records source, daily, and overlap skips", () => {
  const service = createXpPolicyService(validateXpPolicy(expandedDocument()));
  const results = service.evaluate([
    event(1, { type: "walk.completed", entity: "same" }),
    event(2, { type: "trail.completed", entity: "same" }),
    event(3, { type: "walk.completed" }),
    event(4, { type: "walk.completed" }),
    event(5, { type: "nutrition.logged" }),
    event(6, { type: "nutrition.logged" }),
    event(7, { type: "nutrition.logged" })
  ]);
  assert.deepEqual(results.map((entry) => entry.delta), [15, 0, 15, 0, 10, 10, 0]);
  assert.deepEqual(results.map((entry) => entry.reason), ["base_action_awarded", "overlap_group_skipped", "base_action_awarded", "source_daily_cap_reached", "base_action_awarded", "base_action_awarded", "source_daily_cap_reached"]);
  assert.ok(results.every((entry) => entry.policyVersion === "1.0.0" && entry.sourceEventId && entry.occurredAt));
});

test("category caps reset at UTC day boundaries and sources remain independently capped", () => {
  const document = expandedDocument();
  document.policies[0].dailyCaps.movement = 25;
  const results = createXpPolicyService(validateXpPolicy(document)).evaluate([
    event(1, { type: "walk.completed" }), event(2, { type: "walk.completed" }),
    event(3, { type: "trail.completed" }), event(4, { type: "trail.completed", at: "2026-08-02T00:00:00.000Z" })
  ]);
  assert.deepEqual(results.map((entry) => [entry.delta, entry.reason]), [[15, "base_action_awarded"], [0, "daily_cap_reached"], [0, "daily_cap_reached"], [25, "base_action_awarded"]]);
});

test("effective policy versions are selected only by event occurrence time", () => {
  const first = structuredClone(expandedDocument().policies[0]);
  first.effectiveTo = "2026-09-01T00:00:00.000Z";
  const second = structuredClone(first);
  second.policyVersion = "2.0.0";
  second.effectiveFrom = first.effectiveTo;
  second.effectiveTo = null;
  second.actions["workout.completed"].xp = 150;
  second.dailyCaps.workout = 150;
  second.sourceDailyCaps["workout.completed"] = 150;
  const results = createXpPolicyService(validateXpPolicy({ schemaVersion: 1, policies: [second, first] })).evaluate([
    event(1), event(2, { at: "2026-09-01T00:00:00.000Z" })
  ]);
  assert.deepEqual(results.map((entry) => [entry.delta, entry.policyVersion]), [[100, "1.0.0"], [150, "2.0.0"]]);
});

test("invalid policies and ineligible events are rejected or safely ignored", () => {
  assert.throws(() => validateXpPolicy({ schemaVersion: 1, policies: [] }), /invalid XP policy/);
  const bad = expandedDocument(); bad.policies[0].actions["walk.completed"].xp = 1.5;
  assert.throws(() => validateXpPolicy(bad), /invalid XP policy/);
  const service = createXpPolicyService(validateXpPolicy(expandedDocument()));
  assert.deepEqual(service.evaluate([{ ...event(1), verification: { status: "provisional" } }, event(2, { type: "unknown.completed" })]), []);
});

test("ledger validates immutable entries, conflicts, and exact append-only reversals", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-ledger-"));
  const store = createGamificationLedgerStore({ filePath: path.join(directory, "ledger.json") });
  const original = createXpPolicyService(validateXpPolicy(policyDocument)).evaluate([event(1)])[0];
  assert.equal(store.append(original).status, "recorded");
  assert.equal(store.append(original).status, "duplicate");
  assert.throws(() => store.append({ ...original, delta: 99 }), /effect key conflict/);
  const reversal = { ...original, effectKey: "reverse:1", entryId: "reverse_1", delta: -original.delta, sourceEventId: "evt_9999999999999999", reason: "source_reversed:source_invalidated", reversalOf: original.entryId };
  assert.equal(store.append(reversal).status, "recorded");
  assert.throws(() => store.append({ ...reversal, effectKey: "reverse:2", entryId: "reverse_2" }), /duplicate.*reversal/);
  assert.throws(() => store.append({ delta: 1 }), /invalid.*entry/);
});

test("full replay is deterministic and idempotent across multiple cycles, reversals, and level recalculation", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-xp-replay-"));
  const eventStore = createGamificationEventStore({ filePath: path.join(directory, "events.json") });
  const ledgerStore = createGamificationLedgerStore({ filePath: path.join(directory, "ledger.json") });
  const projectionStore = createGamificationProjectionStore({ filePath: path.join(directory, "projections.json") });
  const service = createAchievementService({ eventStore, definitions: validateAchievementDefinitions(definitionsDocument.definitions),
    awardStore: createGamificationAwardStore({ filePath: path.join(directory, "awards.json") }), ledgerStore,
    projectionService: createProjectionService({ projectionStore, levelService: createLevelService(levelsDocument.levels) }),
    xpPolicyService: createXpPolicyService(validateXpPolicy(policyDocument)) });
  const source = validateEvent({ eventId: "evt_0000000000000001", eventType: "workout.completed", schemaVersion: 1,
    occurredAt: "2026-08-01T10:00:00.000Z", recordedAt: "2026-08-01T10:00:01.000Z", actorUserId: "user_1", subjectUserId: "user_1", source: "session-service",
    sourceEntity: { type: "session", id: "session_1", version: 1 }, idempotencyKey: "workout.completed:session_1", correlationId: "request_1", causationEventId: null,
    verification: { status: "verified", method: "authoritative-write", riskFlags: [] }, payload: { durationBand: "20_to_44_min", exerciseCountBand: "one", generated: false } }, { now: Date.parse("2026-12-01T00:00:00.000Z") });
  eventStore.append(source);
  const checksums = [service.replay().checksum, service.replay().checksum];
  projectionStore.remove(); checksums.push(service.replay().checksum);
  assert.equal(new Set(checksums).size, 1);
  assert.equal(projectionStore.readAll().user_1.lifetimeXp, 190);
  assert.equal(projectionStore.readAll().user_1.level.level, 2);
  const correction = validateEvent({ ...source, eventId: "evt_0000000000000999", eventType: "workout.revoked", occurredAt: "2026-08-02T10:00:00.000Z", recordedAt: "2026-08-02T10:00:01.000Z",
    source: "gamification-system", sourceEntity: { type: "correction", id: "correction_1", version: 1 }, idempotencyKey: "workout.revoked:session_1", causationEventId: source.eventId,
    verification: { status: "verified", method: "derived", riskFlags: [] }, payload: { originalEventId: source.eventId, reasonCode: "source_invalidated" } }, { now: Date.parse("2026-12-01T00:00:00.000Z") });
  eventStore.append(correction);
  const corrected = service.replay();
  const count = ledgerStore.all().length;
  assert.equal(corrected.projections.user_1.lifetimeXp, 0);
  assert.equal(corrected.projections.user_1.level.level, 1);
  assert.ok(ledgerStore.all().filter((entry) => entry.reversalOf).every((entry) => entry.delta < 0 && entry.reason.includes("reversed")));
  projectionStore.remove();
  assert.equal(service.replay().checksum, corrected.checksum);
  assert.equal(ledgerStore.all().length, count);
});

test("approved level thresholds handle exact boundaries and reject malformed curves", () => {
  const levels = createLevelService(levelsDocument.levels);
  assert.deepEqual([levels.forXp(0).level, levels.forXp(99).level, levels.forXp(100).level, levels.forXp(306249).level, levels.forXp(306250).level], [1, 1, 2, 49, 50]);
  assert.throws(() => createLevelService([{ level: 1, minimumXp: 0 }, { level: 2, minimumXp: 0 }]), /strictly increasing/);
});
