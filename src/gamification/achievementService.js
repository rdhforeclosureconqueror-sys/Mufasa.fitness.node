"use strict";

const { createHash } = require("crypto");
const { evaluateAchievement } = require("./achievementEvaluator");

function stableId(prefix, key) { return `${prefix}_${createHash("sha256").update(key).digest("hex").slice(0, 24)}`; }

function createAchievementService({ eventStore, definitions, awardStore, ledgerStore, projectionService, xpPolicyService = null, generationStore = null, policyVersions = () => [] }) {
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
  function replay({ assertCommitOwner = () => {} } = {}) {
    const stream = readStream();
    if (generationStore) generationStore.begin({ sourceCursor: eventStore.metrics().lastCursor, policyVersions: policyVersions() });
    const events = sourceEvents(stream);
    if (xpPolicyService) {
      const originalEvents = stream.filter((event) => event.eventType !== "workout.revoked");
      for (const entry of xpPolicyService.evaluate(originalEvents)) ledgerStore.append(entry);
      for (const correction of stream.filter((event) => event.eventType === "workout.revoked")) {
        const originalEffect = ledgerStore.all().find((entry) => entry.effectKey.startsWith("base-xp:") && entry.sourceEventId === correction.payload.originalEventId && entry.delta > 0);
        if (originalEffect) {
          const effectKey = `base-xp-reversal:${originalEffect.entryId}:${correction.eventId}`;
          ledgerStore.append({ effectKey, entryId: stableId("xpr", effectKey), kind: "lifetime_xp", delta: -originalEffect.delta,
            subjectUserId: correction.subjectUserId, sourceEventId: correction.eventId, achievementId: null,
            policyVersion: originalEffect.policyVersion, reason: `source_reversed:${correction.payload.reasonCode}`,
            occurredAt: correction.occurredAt, reversalOf: originalEffect.entryId });
        }
      }
    }
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
          const priorRecords = awardStore.all().filter((record) => record.awardKey === awardKey);
          const priorState = priorRecords.at(-1)?.kind;
          const awardRecord = {
            recordKey: `award:${awardKey}`, kind: "award", awardKey,
            awardId: stableId("awd", awardKey), subjectUserId, achievementId: definition.id,
            definitionVersion: definition.definitionVersion, badgeId: definition.badgeId,
            sourceEventIds: qualification.result.evidence, qualifiedAt: qualification.event.occurredAt
          };
          if (priorState === "revocation") {
            const cycleKey = `${awardKey}:${qualification.event.eventId}`;
            awardStore.append({ ...awardRecord, recordKey: `reinstate:${cycleKey}`, kind: "reinstatement", reinstatementEventId: qualification.event.eventId });
          } else awardStore.append(awardRecord);
          if (definition.reward.lifetimeXp > 0 && priorState !== "award" && priorState !== "reinstatement") {
            const effectSuffix = priorState === "revocation" ? `:reinstate:${qualification.event.eventId}` : "";
            const effectKey = `achievement-xp:${awardKey}${effectSuffix}`;
            ledgerStore.append({
            effectKey, entryId: stableId("xpe", effectKey), kind: "lifetime_xp",
            delta: definition.reward.lifetimeXp, subjectUserId, sourceEventId: qualification.event.eventId,
            achievementId: definition.id, policyVersion: "achievement-xp-v1", reason: priorState === "revocation" ? "achievement_reinstated" : "achievement_awarded", occurredAt: qualification.event.occurredAt, reversalOf: null
          });
          }
        }
      }
    }
    const activeAwards = new Map();
    for (const record of awardStore.all()) activeAwards.set(record.awardKey, record.kind !== "revocation");
    const qualifiedKeys = new Set(evaluations.filter((item) => item.qualified).map((item) => item.awardKey));
    for (const [awardKey, active] of activeAwards) {
      if (!active || qualifiedKeys.has(awardKey)) continue;
      const records = awardStore.all().filter((record) => record.awardKey === awardKey);
      const original = records.at(-1);
      const correction = stream.find((event) => event.eventType === "workout.revoked" && original.sourceEventIds.includes(event.payload.originalEventId));
      if (!correction) continue;
      awardStore.append({ recordKey: `revoke:${awardKey}:${correction.eventId}`, kind: "revocation", awardKey, awardId: original.awardId, subjectUserId: original.subjectUserId, achievementId: original.achievementId, correctionEventId: correction.eventId, reasonCode: correction.payload.reasonCode, occurredAt: correction.occurredAt });
      const reversedIds = new Set(ledgerStore.all().filter((entry) => entry.reversalOf).map((entry) => entry.reversalOf));
      const originalEffect = ledgerStore.all().findLast((entry) => entry.achievementId === original.achievementId && entry.delta > 0 && !reversedIds.has(entry.entryId));
      if (originalEffect) ledgerStore.append({ effectKey: `achievement-xp-reversal:${awardKey}:${correction.eventId}`, entryId: stableId("xpr", `${awardKey}:${correction.eventId}`), kind: "lifetime_xp", delta: -originalEffect.delta, subjectUserId: original.subjectUserId, sourceEventId: correction.eventId, achievementId: original.achievementId, policyVersion: "achievement-xp-v1", reason: `achievement_reversed:${correction.payload.reasonCode}`, occurredAt: correction.occurredAt, reversalOf: originalEffect.entryId });
    }
    const result = projectionService.rebuild({ evaluations, awardRecords: awardStore.all(), ledgerEntries: ledgerStore.all() });
    if (generationStore) result.generation = generationStore.commit(assertCommitOwner);
    return result;
  }
  return Object.freeze({ replay });
}

module.exports = { createAchievementService, stableId };
