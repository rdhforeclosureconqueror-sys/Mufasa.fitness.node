"use strict";

const { createHash } = require("crypto");
const { evaluateAchievement } = require("./achievementEvaluator");

function stableId(prefix, key) { return `${prefix}_${createHash("sha256").update(key).digest("hex").slice(0, 24)}`; }

function createAchievementService({ eventStore, definitions, awardStore, ledgerStore, projectionService }) {
  function readStream() {
    const stream = [];
    let cursor = 0;
    while (true) {
      const page = eventStore.readAfter(cursor, 100);
      if (!page.length) return stream;
      stream.push(...page.map((item) => item.event));
      cursor = page.at(-1).sequence;
    }
  }
  function sourceEvents(stream) {
    const revoked = new Set(stream.filter((event) => event.eventType === "workout.revoked").map((event) => event.payload.originalEventId));
    return stream.filter((event) => event.eventType !== "workout.revoked" && !revoked.has(event.eventId));
  }
  function firstQualification(definition, events) {
    const ordered = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.eventId.localeCompare(b.eventId));
    for (let index = 0; index < ordered.length; index += 1) {
      const result = evaluateAchievement(definition, ordered.slice(0, index + 1));
      if (result.qualified) return { result, event: ordered[index] };
    }
    return null;
  }
  function replay() {
    const stream = readStream();
    const events = sourceEvents(stream);
    const subjects = [...new Set(stream.map((event) => event.subjectUserId))].sort();
    const evaluations = [];
    for (const subjectUserId of subjects) {
      const subjectEvents = events.filter((event) => event.subjectUserId === subjectUserId);
      for (const definition of definitions) {
        const evaluation = evaluateAchievement(definition, subjectEvents);
        const awardKey = `${definition.id}:${definition.definitionVersion}:${subjectUserId}:once`;
        evaluations.push({ ...evaluation, awardKey, subjectUserId });
        const qualification = evaluation.qualified ? firstQualification(definition, subjectEvents) : null;
        if (qualification) {
          awardStore.append({
            recordKey: `award:${awardKey}`, kind: "award", awardKey,
            awardId: stableId("awd", awardKey), subjectUserId, achievementId: definition.id,
            definitionVersion: definition.definitionVersion, badgeId: definition.badgeId,
            sourceEventIds: qualification.result.evidence, qualifiedAt: qualification.event.occurredAt
          });
          if (definition.reward.lifetimeXp > 0) ledgerStore.append({
            effectKey: `achievement-xp:${awardKey}`, entryId: stableId("xpe", awardKey), kind: "lifetime_xp",
            delta: definition.reward.lifetimeXp, subjectUserId, sourceEventId: qualification.event.eventId,
            achievementId: definition.id, policyVersion: "achievement-xp-v1", occurredAt: qualification.event.occurredAt, reversalOf: null
          });
        }
      }
    }
    const activeAwards = new Map();
    for (const record of awardStore.all()) activeAwards.set(record.awardKey, record.kind === "award");
    const qualifiedKeys = new Set(evaluations.filter((item) => item.qualified).map((item) => item.awardKey));
    for (const [awardKey, active] of activeAwards) {
      if (!active || qualifiedKeys.has(awardKey)) continue;
      const original = awardStore.all().find((record) => record.recordKey === `award:${awardKey}`);
      const correction = stream.find((event) => event.eventType === "workout.revoked" && original.sourceEventIds.includes(event.payload.originalEventId));
      if (!correction) continue;
      awardStore.append({ recordKey: `revoke:${awardKey}:${correction.eventId}`, kind: "revocation", awardKey, awardId: original.awardId, subjectUserId: original.subjectUserId, achievementId: original.achievementId, correctionEventId: correction.eventId, reasonCode: correction.payload.reasonCode, occurredAt: correction.occurredAt });
      const originalEffect = ledgerStore.all().find((entry) => entry.effectKey === `achievement-xp:${awardKey}`);
      if (originalEffect) ledgerStore.append({ effectKey: `achievement-xp-reversal:${awardKey}:${correction.eventId}`, entryId: stableId("xpr", `${awardKey}:${correction.eventId}`), kind: "lifetime_xp", delta: -originalEffect.delta, subjectUserId: original.subjectUserId, sourceEventId: correction.eventId, achievementId: original.achievementId, policyVersion: "achievement-xp-v1", occurredAt: correction.occurredAt, reversalOf: originalEffect.entryId });
    }
    return projectionService.rebuild({ evaluations, awardRecords: awardStore.all(), ledgerEntries: ledgerStore.all() });
  }
  return Object.freeze({ replay });
}

module.exports = { createAchievementService, stableId };
