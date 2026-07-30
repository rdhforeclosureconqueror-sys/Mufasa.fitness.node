"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const definitionsDocument = require("../data/gamification/achievements.json");
const levelsDocument = require("../data/gamification/levels.json");
const { validateEvent } = require("../src/gamification/validators");
const { evaluateAchievement, evaluateRule, longestDailyStreak } = require("../src/gamification/achievementEvaluator");
const { validateAchievementDefinitions } = require("../src/gamification/policyService");
const { createAchievementService } = require("../src/gamification/achievementService");
const { createLevelService } = require("../src/gamification/levelService");
const { checksum, createProjectionService } = require("../src/gamification/projectionService");
const { createGamificationEventStore } = require("../src/repositories/gamificationEventStore");
const { createGamificationAwardStore } = require("../src/repositories/gamificationAwardStore");
const { createGamificationLedgerStore } = require("../src/repositories/gamificationLedgerStore");
const { createGamificationProjectionStore } = require("../src/repositories/gamificationProjectionStore");

const NOW = Date.parse("2026-12-31T23:59:59.000Z");
function workout(index, overrides = {}) {
  const day = String(index + 1).padStart(2, "0");
  return validateEvent({
    eventId: `evt_${String(index).padStart(16, "0")}`,
    eventType: "workout.completed", schemaVersion: 1,
    occurredAt: `2026-08-${day}T10:00:00.000Z`, recordedAt: `2026-08-${day}T10:00:01.000Z`,
    actorUserId: "user_1", subjectUserId: "user_1", source: "session-service",
    sourceEntity: { type: "session", id: `session_${index}`, version: 1 },
    idempotencyKey: `workout.completed:session_${index}`, correlationId: `request_${index}`, causationEventId: null,
    verification: { status: "verified", method: "authoritative-write", riskFlags: [] },
    payload: { durationBand: "20_to_44_min", exerciseCountBand: "one", generated: false },
    ...overrides
  }, { now: NOW });
}
function revoked(original, index = 900) {
  return validateEvent({
    eventId: `evt_${String(index).padStart(16, "0")}`, eventType: "workout.revoked", schemaVersion: 1,
    occurredAt: "2026-09-01T10:00:00.000Z", recordedAt: "2026-09-01T10:00:01.000Z",
    actorUserId: "system", subjectUserId: original.subjectUserId, source: "gamification-system",
    sourceEntity: { type: "correction", id: `correction_${index}`, version: 1 },
    idempotencyKey: `workout.revoked:${original.eventId}`, correlationId: `correction_${index}`, causationEventId: original.eventId,
    verification: { status: "verified", method: "derived", riskFlags: [] },
    payload: { originalEventId: original.eventId, reasonCode: "source_invalidated" }
  }, { now: NOW });
}
function harness() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-achievements-"));
  const eventStore = createGamificationEventStore({ filePath: path.join(directory, "events.json") });
  const awardStore = createGamificationAwardStore({ filePath: path.join(directory, "awards.json") });
  const ledgerStore = createGamificationLedgerStore({ filePath: path.join(directory, "ledger.json") });
  const projectionStore = createGamificationProjectionStore({ filePath: path.join(directory, "projections.json") });
  const service = createAchievementService({ eventStore, definitions: validateAchievementDefinitions(definitionsDocument.definitions), awardStore, ledgerStore, projectionService: createProjectionService({ projectionStore, levelService: createLevelService(levelsDocument.levels) }) });
  return { directory, eventStore, awardStore, ledgerStore, projectionStore, service };
}

test("catalogue v1 is bounded, published, unique, versioned, and references safe fixed rewards and badges", () => {
  assert.equal(definitionsDocument.catalogVersion, 1);
  assert.ok(definitionsDocument.definitions.length >= 20 && definitionsDocument.definitions.length <= 30);
  assert.equal(new Set(definitionsDocument.definitions.map((item) => item.id)).size, definitionsDocument.definitions.length);
  assert.deepEqual(validateAchievementDefinitions(definitionsDocument.definitions), definitionsDocument.definitions);
  assert.ok(definitionsDocument.definitions.every((item) => item.lifecycleState === "published" && item.definitionVersion === "1.0.0" && Number.isSafeInteger(item.reward.lifetimeXp) && item.badgeId));
  assert.throws(() => validateAchievementDefinitions([{ ...definitionsDocument.definitions[0], criteria: { operator: "javascript", threshold: 1 } }]), /invalid achievement rule/);
  assert.deepEqual(validateAchievementDefinitions([{ ...definitionsDocument.definitions[0], lifecycleState: "retired" }]), []);
});

test("typed rules deterministically support count, sum, distinct, AND, OR, improvement, and streak", () => {
  const raw = [
    { eventType: "x", occurredAt: "2026-02-28T23:00:00.000Z", eventId: "a", payload: { amount: 2, kind: "a" } },
    { eventType: "x", occurredAt: "2026-03-01T01:00:00.000Z", eventId: "b", payload: { amount: 3, kind: "b" } }
  ];
  assert.deepEqual(evaluateRule({ operator: "count", threshold: 2 }, raw), { value: 2, target: 2 });
  assert.deepEqual(evaluateRule({ operator: "sum", field: "payload.amount", threshold: 5 }, raw), { value: 5, target: 5 });
  assert.deepEqual(evaluateRule({ operator: "distinct_count", field: "payload.kind", threshold: 2 }, raw), { value: 2, target: 2 });
  assert.equal(evaluateRule({ operator: "all_of", rules: [{ operator: "count", threshold: 2 }, { operator: "sum", field: "payload.amount", threshold: 5 }] }, raw).qualified, true);
  assert.equal(evaluateRule({ operator: "any_of", rules: [{ operator: "count", threshold: 9 }, { operator: "sum", field: "payload.amount", threshold: 5 }] }, raw).qualified, true);
  assert.equal(evaluateRule({ operator: "percent_delta", field: "payload.amount", threshold: 50 }, raw).value, 50);
  assert.equal(longestDailyStreak([workout(1), workout(2), workout(4)]), 2);
});

test("effective intervals, verification, hidden state, tiers, and occurrence-order replay are deterministic", () => {
  const base = definitionsDocument.definitions.find((item) => item.id === "achievement.workout.1_completed");
  assert.equal(evaluateAchievement({ ...base, effectiveFrom: "2027-01-01T00:00:00.000Z" }, [workout(1)]).qualified, false);
  const provisional = workout(1, { verification: { status: "provisional", method: "authoritative-write", riskFlags: [] } });
  assert.equal(evaluateAchievement(base, [provisional]).qualified, false);
  const tier5 = definitionsDocument.definitions.find((item) => item.id === "achievement.workout.5_completed");
  assert.equal(evaluateAchievement(tier5, [5, 1, 4, 2, 3].map(workout)).qualified, true);
});

test("live evaluation and replay append one award and XP effect and rebuild identical projections", () => {
  const h = harness();
  h.eventStore.append(workout(1));
  const first = h.service.replay();
  const awardCount = h.awardStore.all().length;
  const ledgerCount = h.ledgerStore.all().length;
  const second = h.service.replay();
  assert.equal(h.awardStore.all().length, awardCount);
  assert.equal(h.ledgerStore.all().length, ledgerCount);
  assert.equal(second.checksum, first.checksum);
  assert.equal(h.projectionStore.readAll().user_1.lifetimeXp, 90);
  assert.equal(h.projectionStore.readAll().user_1.level.level, 1);
  assert.equal(h.projectionStore.readAll().user_1.achievements.find((item) => item.achievementId === "achievement.workout.streak_30").hidden, true);
  h.projectionStore.remove();
  assert.equal(h.service.replay().checksum, first.checksum);
  const clean = harness();
  clean.eventStore.append(workout(1));
  assert.equal(clean.service.replay().checksum, first.checksum, "clean stores rebuild the same projection checksum");
  assert.equal(createGamificationAwardStore({ filePath: path.join(h.directory, "awards.json") }).all().length, awardCount, "awards survive restart");
  assert.equal(createGamificationLedgerStore({ filePath: path.join(h.directory, "ledger.json") }).all().length, ledgerCount, "XP survives restart");
});

test("correction preserves events and awards while appending revocation and equal-opposite XP", () => {
  const h = harness();
  const event = workout(1);
  h.eventStore.append(event);
  h.service.replay();
  const originalAwards = h.awardStore.all().filter((item) => item.kind === "award");
  const originalXp = h.ledgerStore.all().reduce((sum, item) => sum + item.delta, 0);
  h.eventStore.append(revoked(event));
  const corrected = h.service.replay();
  assert.equal(h.eventStore.metrics().count, 2, "immutable source and correction remain in the stream");
  assert.equal(h.awardStore.all().filter((item) => item.kind === "award").length, originalAwards.length);
  assert.equal(h.awardStore.all().filter((item) => item.kind === "revocation").length, originalAwards.length);
  assert.equal(h.ledgerStore.all().reduce((sum, item) => sum + item.delta, 0), 0);
  assert.ok(h.ledgerStore.all().filter((item) => item.reversalOf).every((item) => item.delta < 0));
  assert.equal(corrected.projections.user_1.lifetimeXp, 0);
  assert.equal(corrected.projections.user_1.achievements.find((item) => item.achievementId === "achievement.workout.1_completed").state, "revoked");
  assert.ok(originalXp > 0);
});

test("replay consumes more than one bounded event-store page and level boundaries are exact", () => {
  const h = harness();
  for (let index = 1; index <= 101; index += 1) h.eventStore.append(workout(index, { occurredAt: new Date(Date.UTC(2026, 7, 1) + index * 3600000).toISOString(), recordedAt: new Date(Date.UTC(2026, 7, 1) + index * 3600000 + 1000).toISOString() }));
  h.service.replay();
  assert.equal(h.projectionStore.readAll().user_1.achievements.find((item) => item.achievementId === "achievement.workout.100_completed").state, "earned");
  const levels = createLevelService(levelsDocument.levels);
  assert.equal(levels.forXp(99).level, 1);
  assert.equal(levels.forXp(100).level, 2);
  assert.equal(levels.forXp(306250).level, 50);
  assert.equal(checksum({ b: 2, a: 1 }), checksum({ b: 2, a: 1 }));
});
