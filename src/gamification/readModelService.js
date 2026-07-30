"use strict";

const { createHash } = require("crypto");
const { checksum } = require("./projectionService");
const { evaluateAchievement } = require("./achievementEvaluator");

function digest(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function validUserId(value) { return typeof value === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(value); }

function createReadModelService({ eventStore, projectionStore, ledgerStore, awardStore, achievementService,
  xpPolicies, xpPolicyService, definitions, levelService, clock = () => new Date() }) {
  const history = [];
  let failures = 0;
  let lastSuccessfulReplay = null;
  const currentPolicies = () => typeof xpPolicies === "function" ? xpPolicies() : xpPolicies;

  function events() {
    const result = [];
    let cursor = 0;
    while (true) {
      const page = eventStore.readAfter(cursor, 100);
      if (!page.length) return result;
      result.push(...page.map((item) => item.event));
      cursor = page.at(-1).sequence;
    }
  }
  function analytics() {
    const entries = ledgerStore.all();
    const count = (reason) => entries.filter((entry) => entry.reason === reason).length;
    return { totalEvents: eventStore.metrics().count,
      totalXpAwarded: entries.filter((e) => e.delta > 0).reduce((n, e) => n + e.delta, 0),
      totalXpSkipped: entries.filter((e) => e.delta === 0).length,
      dailyCapHits: count("daily_cap_reached"), sourceCapHits: count("source_daily_cap_reached"),
      overlapSuppressions: count("overlap_group_skipped"), replayFrequency: history.length, replayFailures: failures };
  }
  function replay(operation = "replay_all", replayOptions = {}) {
    const started = clock();
    try {
      const result = achievementService.replay(replayOptions);
      const completed = clock();
      const durationMs = Math.max(0, completed.getTime() - started.getTime());
      const eventsProcessed = eventStore.metrics().count;
      const record = { operation, status: "succeeded", startedAt: started.toISOString(), completedAt: completed.toISOString(),
        durationMs, eventsProcessed, throughputPerSecond: durationMs ? Number((eventsProcessed * 1000 / durationMs).toFixed(2)) : eventsProcessed,
        projectionChecksum: result.checksum, replayVersion: 1,
        policyVersion: currentPolicies().at(-1)?.policyVersion || null };
      history.push(record); lastSuccessfulReplay = record.completedAt;
      return { ...result, diagnostics: structuredClone(record) };
    } catch (error) {
      failures += 1;
      history.push({ operation, status: "failed", startedAt: started.toISOString(), completedAt: clock().toISOString(), error: String(error.message || error) });
      throw error;
    }
  }
  function profile(userId) {
    if (!validUserId(userId)) throw new TypeError("invalid user id");
    const value = projectionStore.read(userId);
    return value ? { ...value, replayStatus: lastSuccessfulReplay ? "ready" : "not_replayed", lastReplayTimestamp: lastSuccessfulReplay } : null;
  }
  function ledger(userId) { return ledgerStore.all().filter((entry) => entry.subjectUserId === userId); }
  function status() { const recent = history.at(-1) || null; return { lastSuccessfulReplay, replayFailures: failures, latest: recent, analytics: analytics() }; }
  function verify() {
    const projections = projectionStore.readAll();
    const entries = ledgerStore.all();
    const mismatches = [];
    for (const [userId, projection] of Object.entries(projections)) {
      const lifetimeXp = entries.filter((e) => e.subjectUserId === userId).reduce((n, e) => n + e.delta, 0);
      if (projection.lifetimeXp !== lifetimeXp) mismatches.push({ userId, field: "lifetimeXp", expected: lifetimeXp, actual: projection.lifetimeXp });
      if (projection.currentLevel !== levelService.forXp(lifetimeXp).level) mismatches.push({ userId, field: "currentLevel" });
      const active = new Map();
      for (const record of awardStore.all().filter((r) => r.subjectUserId === userId)) active.set(record.awardKey, record.kind !== "revocation");
      const expectedEarned = [...active.values()].filter(Boolean).length;
      if (projection.earnedAchievements.length !== expectedEarned) mismatches.push({ userId, field: "achievements" });
    }
    // Integrity inspection is deliberately read-only. Determinism is enforced by
    // replay tests and checksummed history; this endpoint never rebuilds or repairs.
    return { valid: mismatches.length === 0, mismatches, projectionChecksum: checksum(projections), ledgerChecksum: digest(ledgerStore.all()), replayAlgorithmVersion: 1 };
  }
  function simulate({ userId, policyVersion, eventStream }) {
    if (!validUserId(userId) || !Array.isArray(eventStream) || eventStream.some((e) => e.subjectUserId !== userId)) throw new TypeError("invalid simulation request");
    const policy = currentPolicies().find((item) => item.policyVersion === policyVersion);
    if (!policy) throw new TypeError("unknown policy version");
    const scopedPolicyService = require("./xpPolicyService").createXpPolicyService([policy]);
    const original = eventStream.filter((event) => event.eventType !== "workout.revoked");
    const revoked = new Set(eventStream.filter((event) => event.eventType === "workout.revoked").map((event) => event.payload.originalEventId));
    const active = original.filter((event) => !revoked.has(event.eventId));
    const xpEntries = scopedPolicyService.evaluate(original);
    const achievementResults = definitions.map((definition) => ({ definition, result: evaluateAchievement(definition, active) }));
    const earnedAchievements = achievementResults.filter((x) => x.result.qualified).map((x) => x.definition.id);
    const previouslyEarned = definitions.filter((definition) => evaluateAchievement(definition, original).qualified).map((definition) => definition.id);
    const revokedAchievements = previouslyEarned.filter((id) => !earnedAchievements.includes(id));
    const achievementXp = achievementResults.filter((x) => x.result.qualified).reduce((n, x) => n + x.definition.reward.lifetimeXp, 0);
    const awardedXp = xpEntries.reduce((n, e) => n + e.delta, 0) + achievementXp;
    return { userId, policyVersion, awardedXp, skippedXp: xpEntries.filter((e) => e.delta === 0).length,
      capDecisions: xpEntries.filter((e) => e.reason.includes("cap_")), overlapDecisions: xpEntries.filter((e) => e.reason === "overlap_group_skipped"),
      earnedAchievements, revokedAchievements, finalLevel: levelService.forXp(awardedXp).level };
  }
  function deleteProjection(userId) { if (!validUserId(userId)) throw new TypeError("invalid user id"); return projectionStore.removeUser(userId); }
  return Object.freeze({ profile, ledger, status, history: () => structuredClone(history), analytics, replay,
    rebuild: (userId, replayOptions = {}) => { if (!validUserId(userId)) throw new TypeError("invalid user id"); return replay(`rebuild_user:${userId}`, replayOptions).projections[userId] || null; },
    deleteProjection, verify, simulate, currentPolicy: () => structuredClone(currentPolicies().at(-1) || null), events });
}

module.exports = { createReadModelService, digest, validUserId };
