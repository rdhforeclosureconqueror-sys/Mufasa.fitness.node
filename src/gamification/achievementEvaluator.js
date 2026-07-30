"use strict";

function valueAt(event, field) {
  if (field === "occurredAt" || field === "eventId" || field === "eventType") return event[field];
  return field.split(".").reduce((value, part) => value?.[part], event);
}
function matches(event, where = {}) {
  return Object.entries(where).every(([field, expected]) => {
    const actual = valueAt(event, field);
    return Array.isArray(expected) ? expected.includes(actual) : actual === expected;
  });
}
function eligibleEvents(definition, events) {
  return events.filter((event) => definition.acceptedEvents.some((accepted) => accepted.eventType === event.eventType && accepted.schemaVersions.includes(event.schemaVersion)))
    .filter((event) => event.verification.status === "verified" && definition.acceptedVerificationMethods.includes(event.verification.method));
}
function utcDay(iso) { return iso.slice(0, 10); }
function longestDailyStreak(events) {
  const days = [...new Set(events.map((event) => utcDay(event.occurredAt)))].sort();
  let longest = 0;
  let current = 0;
  let previous = null;
  for (const day of days) {
    const date = Date.parse(`${day}T00:00:00.000Z`);
    current = previous !== null && date - previous === 86400000 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = date;
  }
  return longest;
}
function evaluateRule(rule, events) {
  const selected = events.filter((event) => matches(event, rule.where));
  if (rule.operator === "count") return { value: selected.length, target: rule.threshold };
  if (rule.operator === "distinct_count") return { value: new Set(selected.map((event) => valueAt(event, rule.field))).size, target: rule.threshold };
  if (rule.operator === "sum") return { value: selected.reduce((sum, event) => sum + Number(valueAt(event, rule.field) || 0), 0), target: rule.threshold };
  if (rule.operator === "streak") return { value: longestDailyStreak(selected), target: rule.threshold };
  if (rule.operator === "percent_delta") {
    const values = selected.map((event) => Number(valueAt(event, rule.field))).filter(Number.isFinite);
    const value = values.length > 1 && values[0] !== 0 ? ((values.at(-1) - values[0]) / Math.abs(values[0])) * 100 : 0;
    return { value, target: rule.threshold };
  }
  if (rule.operator === "all_of" || rule.operator === "any_of") {
    const children = rule.rules.map((child) => evaluateRule(child, events));
    const passed = children.map((child) => child.value >= child.target);
    const qualified = rule.operator === "all_of" ? passed.every(Boolean) : passed.some(Boolean);
    return { value: passed.filter(Boolean).length, target: rule.operator === "all_of" ? children.length : 1, qualified };
  }
  throw new Error(`unsupported achievement operator: ${rule.operator}`);
}
function evaluateAchievement(definition, events) {
  const applicable = eligibleEvents(definition, events).filter((event) => event.occurredAt >= definition.effectiveFrom && (!definition.effectiveTo || event.occurredAt < definition.effectiveTo));
  const progress = evaluateRule(definition.criteria, applicable);
  const qualified = progress.qualified ?? progress.value >= progress.target;
  return { definition, progress: { value: progress.value, target: progress.target }, qualified, evidence: applicable.map((event) => event.eventId) };
}

module.exports = { evaluateAchievement, evaluateRule, longestDailyStreak };
