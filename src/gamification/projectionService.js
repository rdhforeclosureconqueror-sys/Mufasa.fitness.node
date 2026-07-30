"use strict";

const { createHash } = require("crypto");

function checksum(projections) {
  return createHash("sha256").update(JSON.stringify(projections)).digest("hex");
}
function createProjectionService({ projectionStore, levelService }) {
  function rebuild({ evaluations, awardRecords, ledgerEntries }) {
    const users = [...new Set(evaluations.map((item) => item.subjectUserId))].sort();
    const projections = {};
    for (const userId of users) {
      const records = awardRecords.filter((record) => record.subjectUserId === userId);
      const awardStatus = new Map();
      for (const record of records) awardStatus.set(record.awardKey, record.kind === "award" ? "active" : "revoked");
      const userLedger = ledgerEntries.filter((entry) => entry.subjectUserId === userId && entry.kind === "lifetime_xp").sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.effectKey.localeCompare(b.effectKey));
      const xp = userLedger.reduce((sum, entry) => sum + entry.delta, 0);
      let runningXp = 0;
      let highestXp = 0;
      for (const entry of userLedger) { runningXp += entry.delta; highestXp = Math.max(highestXp, runningXp); }
      projections[userId] = {
        catalogVersion: 1,
        lifetimeXp: xp,
        level: levelService.forXp(xp),
        highestLevelAchieved: levelService.forXp(highestXp).level,
        achievements: evaluations.filter((item) => item.subjectUserId === userId).map((item) => ({
          achievementId: item.definition.id,
          definitionVersion: item.definition.definitionVersion,
          badgeId: item.definition.badgeId,
          hidden: item.definition.visibility === "hidden" && awardStatus.get(item.awardKey) !== "active",
          state: awardStatus.get(item.awardKey) === "active" ? "earned" : awardStatus.get(item.awardKey) === "revoked" ? "revoked" : item.progress.value > 0 ? "in_progress" : "locked",
          progress: item.progress
        })).sort((a, b) => a.achievementId.localeCompare(b.achievementId))
      };
    }
    projectionStore.replace(projections);
    return { projections, checksum: checksum(projections) };
  }
  return Object.freeze({ rebuild });
}

module.exports = { checksum, createProjectionService };
