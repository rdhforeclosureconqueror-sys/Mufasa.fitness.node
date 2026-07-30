"use strict";

const OPERATORS = new Set(["count", "sum", "distinct_count", "streak", "percent_delta", "all_of", "any_of"]);

function validateRule(rule, achievementId, depth = 0) {
  if (!rule || !OPERATORS.has(rule.operator) || depth > 8) throw new Error(`invalid achievement rule: ${achievementId}`);
  if (rule.operator === "all_of" || rule.operator === "any_of") {
    if (!Array.isArray(rule.rules) || !rule.rules.length) throw new Error(`empty achievement rule group: ${achievementId}`);
    rule.rules.forEach((child) => validateRule(child, achievementId, depth + 1));
    return;
  }
  if (!Number.isFinite(rule.threshold) || rule.threshold < 0) throw new Error(`invalid achievement threshold: ${achievementId}`);
  if (["sum", "distinct_count", "percent_delta"].includes(rule.operator) && typeof rule.field !== "string") throw new Error(`achievement rule requires a field: ${achievementId}`);
}

function validateAchievementDefinitions(definitions) {
  const ids = new Set();
  const published = [];
  for (const definition of definitions) {
    if (ids.has(definition.id)) throw new Error(`duplicate achievement ID: ${definition.id}`);
    ids.add(definition.id);
    if (!["draft", "published", "disabled", "retired", "quarantined"].includes(definition.lifecycleState)) throw new Error(`invalid achievement lifecycle: ${definition.id}`);
    if (!Number.isSafeInteger(definition.reward?.lifetimeXp) || definition.reward.lifetimeXp < 0) throw new Error(`invalid XP reward: ${definition.id}`);
    if (!definition.badgeId || !definition.effectiveFrom || !Array.isArray(definition.acceptedEvents)) throw new Error(`incomplete achievement: ${definition.id}`);
    validateRule(definition.criteria, definition.id);
    if (definition.lifecycleState === "published") published.push(definition);
  }
  return published;
}

module.exports = { validateAchievementDefinitions, validateRule };
