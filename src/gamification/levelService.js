"use strict";

function createLevelService(levels) {
  if (!Array.isArray(levels) || !levels.length || levels[0].level !== 1 || levels[0].minimumXp !== 0 || levels.some((item, index) => !Number.isSafeInteger(item.minimumXp) || (index && item.minimumXp <= levels[index - 1].minimumXp))) {
    throw new Error("level thresholds must be strictly increasing safe integers beginning at level 1 and zero XP");
  }
  function forXp(xp) {
    let selected = levels[0];
    for (const level of levels) if (xp >= level.minimumXp) selected = level;
    return { level: selected.level, minimumXp: selected.minimumXp, nextMinimumXp: levels.find((item) => item.level === selected.level + 1)?.minimumXp ?? null };
  }
  return Object.freeze({ forXp });
}

module.exports = { createLevelService };
