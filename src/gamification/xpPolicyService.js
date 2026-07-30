"use strict";

const { createHash } = require("crypto");

const VERSION = /^\d+\.\d+\.\d+$/;
const SOURCE = /^[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)+$/;
const FIELD = /^(?:sourceEntity|payload)(?:\.[a-zA-Z0-9_]+)+$/;

function invalid(message) { throw new Error(`invalid XP policy: ${message}`); }
function canonicalDate(value, nullable = false) {
  if (nullable && value === null) return true;
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function validateXpPolicy(document) {
  if (document?.schemaVersion !== 1 || !Array.isArray(document.policies) || !document.policies.length) invalid("document envelope");
  const versions = new Set();
  const policies = document.policies.map((policy) => {
    if (!VERSION.test(policy?.policyVersion || "") || versions.has(policy.policyVersion)) invalid("policyVersion must be unique semantic version");
    versions.add(policy.policyVersion);
    if (!canonicalDate(policy.effectiveFrom) || !canonicalDate(policy.effectiveTo, true) || (policy.effectiveTo && policy.effectiveTo <= policy.effectiveFrom)) invalid(`effective interval ${policy.policyVersion}`);
    if (policy.dayBoundary !== "UTC") invalid(`unsupported day boundary ${policy.policyVersion}`);
    if (!policy.actions || typeof policy.actions !== "object" || Array.isArray(policy.actions) || !Object.keys(policy.actions).length) invalid(`actions ${policy.policyVersion}`);
    for (const [source, action] of Object.entries(policy.actions)) {
      if (!SOURCE.test(source) || !Number.isSafeInteger(action?.xp) || action.xp < 0 || !action.category) invalid(`action ${source}`);
      if (action.overlapGroup && (!policy.overlapGroups?.[action.overlapGroup] || !FIELD.test(action.overlapIdentity || ""))) invalid(`overlap action ${source}`);
    }
    for (const [name, cap] of Object.entries(policy.dailyCaps || {})) if (!name || !Number.isSafeInteger(cap) || cap < 0) invalid(`daily cap ${name}`);
    for (const [source, cap] of Object.entries(policy.sourceDailyCaps || {})) if (!SOURCE.test(source) || !Number.isSafeInteger(cap) || cap < 0) invalid(`source cap ${source}`);
    for (const [name, group] of Object.entries(policy.overlapGroups || {})) if (!name || group?.strategy !== "first_by_occurred_at_then_event_id") invalid(`overlap group ${name}`);
    return structuredClone(policy);
  }).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.policyVersion.localeCompare(b.policyVersion));
  for (let index = 1; index < policies.length; index += 1) {
    if (policies[index - 1].effectiveTo === null || policies[index - 1].effectiveTo > policies[index].effectiveFrom) invalid("overlapping effective intervals");
  }
  return Object.freeze(policies.map(Object.freeze));
}

function atPath(value, path) { return path.split(".").reduce((current, part) => current?.[part], value); }
function stableId(key) { return `xpb_${createHash("sha256").update(key).digest("hex").slice(0, 24)}`; }
function createXpPolicyService(policies) {
  const currentPolicies = () => typeof policies === "function" ? policies() : policies;
  function policyAt(timestamp) { return currentPolicies().find((policy) => timestamp >= policy.effectiveFrom && (!policy.effectiveTo || timestamp < policy.effectiveTo)); }
  function evaluate(events) {
    const counters = new Map();
    const overlaps = new Set();
    const entries = [];
    const ordered = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.eventId.localeCompare(b.eventId));
    for (const event of ordered) {
      const policy = policyAt(event.occurredAt);
      const action = policy?.actions[event.eventType];
      if (!action || event.verification?.status !== "verified") continue;
      const day = event.occurredAt.slice(0, 10);
      const categoryKey = `${event.subjectUserId}:${day}:category:${action.category}`;
      const sourceKey = `${event.subjectUserId}:${day}:source:${event.eventType}`;
      const overlapKey = action.overlapGroup ? `${event.subjectUserId}:${action.overlapGroup}:${atPath(event, action.overlapIdentity)}` : null;
      let reason = "base_action_awarded";
      if (overlapKey && overlaps.has(overlapKey)) reason = "overlap_group_skipped";
      else if ((counters.get(sourceKey) || 0) + action.xp > (policy.sourceDailyCaps?.[event.eventType] ?? Number.MAX_SAFE_INTEGER)) reason = "source_daily_cap_reached";
      else if ((counters.get(categoryKey) || 0) + action.xp > (policy.dailyCaps?.[action.category] ?? Number.MAX_SAFE_INTEGER)) reason = "daily_cap_reached";
      const delta = reason === "base_action_awarded" ? action.xp : 0;
      if (overlapKey) overlaps.add(overlapKey);
      if (delta) {
        counters.set(sourceKey, (counters.get(sourceKey) || 0) + delta);
        counters.set(categoryKey, (counters.get(categoryKey) || 0) + delta);
      }
      const effectKey = `base-xp:${policy.policyVersion}:${event.eventId}`;
      entries.push({ effectKey, entryId: stableId(effectKey), kind: "lifetime_xp", delta, subjectUserId: event.subjectUserId,
        sourceEventId: event.eventId, achievementId: null, policyVersion: policy.policyVersion, reason,
        occurredAt: event.occurredAt, reversalOf: null });
    }
    return entries;
  }
  return Object.freeze({ evaluate, policyAt });
}

module.exports = { createXpPolicyService, validateXpPolicy };
