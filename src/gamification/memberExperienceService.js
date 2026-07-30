"use strict";

function createMemberExperienceService({ readModelService, definitions, levels }) {
  const publicDefinitions = new Map(definitions.filter((item) => item.visibility === "public").map((item) => [item.id, item]));
  const levelThresholds = new Map(levels.map((item) => [item.level, item.minimumXp]));

  function achievementView(item) {
    const definition = publicDefinitions.get(item.achievementId);
    if (!definition) return null;
    return {
      id: item.achievementId,
      name: definition.name,
      badgeId: item.badgeId,
      state: item.state,
      progress: { value: item.progress.value, target: item.progress.target },
      rewardXp: definition.reward.lifetimeXp
    };
  }

  function get(userId) {
    const projection = readModelService.profile(userId);
    if (!projection) return { schemaVersion: 1, state: "empty", level: null, achievements: [], badges: [], streaks: [], recentRewards: [], stats: { lifetimeXp: 0, achievementsEarned: 0, badgesEarned: 0 } };
    const currentMinimum = levelThresholds.get(projection.currentLevel) ?? projection.lifetimeXp;
    const nextMinimum = levelThresholds.get(projection.currentLevel + 1) ?? null;
    const achievements = projection.achievements.map(achievementView).filter(Boolean);
    const earned = achievements.filter((item) => item.state === "earned");
    const recentRewards = readModelService.ledger(userId).filter((entry) => entry.delta > 0).slice(-5).reverse().map((entry) => ({
      id: entry.effectKey, xp: entry.delta, earnedAt: entry.occurredAt, source: entry.reason || entry.sourceType || "progress"
    }));
    return {
      schemaVersion: 1,
      state: "ready",
      level: { current: projection.currentLevel, highest: projection.highestLevel, lifetimeXp: projection.lifetimeXp,
        currentLevelMinimumXp: currentMinimum, nextLevelMinimumXp: nextMinimum,
        xpIntoLevel: projection.lifetimeXp - currentMinimum, xpToNextLevel: nextMinimum === null ? 0 : Math.max(0, nextMinimum - projection.lifetimeXp),
        levelSpanXp: nextMinimum === null ? 0 : nextMinimum - currentMinimum },
      achievements,
      badges: earned.map((item) => ({ id: item.badgeId, achievementId: item.id, name: item.name })),
      streaks: projection.currentStreaks.filter((item) => publicDefinitions.has(item.achievementId)).map((item) => ({ id: item.achievementId, days: item.value })),
      recentRewards,
      stats: { lifetimeXp: projection.lifetimeXp, achievementsEarned: earned.length, badgesEarned: earned.length }
    };
  }
  return Object.freeze({ get });
}
module.exports = { createMemberExperienceService };
