"use strict";

const fs = require("fs");
const path = require("path");

const STATES = new Set(["draft", "validated", "published", "deprecated", "archived"]);
function overlaps(a, b) {
  const aStart = Date.parse(a.effectiveFrom), bStart = Date.parse(b.effectiveFrom);
  const aEnd = a.effectiveTo ? Date.parse(a.effectiveTo) : Infinity, bEnd = b.effectiveTo ? Date.parse(b.effectiveTo) : Infinity;
  return aStart < bEnd && bStart < aEnd;
}
function createPolicyManager({ filePath, validate, clock = () => new Date() }) {
  let validationFailures = 0;
  function read() { if (!fs.existsSync(filePath)) return { schemaVersion: 1, policies: [] }; const value = JSON.parse(fs.readFileSync(filePath, "utf8")); if (!Array.isArray(value.policies)) throw new Error("invalid policy registry"); return value; }
  function write(value) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`; fs.writeFileSync(temp, JSON.stringify(value)); fs.renameSync(temp, filePath); }
  function inspect(version) { return structuredClone(read().policies.find((p) => p.policyVersion === version) || null); }
  function create(policy) {
    const state = read(); if (state.policies.some((p) => p.policyVersion === policy.policyVersion)) throw new Error("policy version already exists");
    const item = structuredClone({ ...policy, lifecycleState: "draft", createdAt: clock().toISOString() }); state.policies.push(item); write(state); return item;
  }
  function validatePolicy(version) {
    const state = read(), policy = state.policies.find((p) => p.policyVersion === version); if (!policy) return null;
    if (policy.lifecycleState === "published") throw new Error("published policies are immutable");
    try { validate({ schemaVersion: 1, policies: [policy] }); if (!Number.isFinite(Date.parse(policy.effectiveFrom)) || (policy.effectiveTo && Date.parse(policy.effectiveTo) <= Date.parse(policy.effectiveFrom))) throw new Error("invalid effective period"); }
    catch (error) { validationFailures++; throw error; }
    policy.lifecycleState = "validated"; policy.validatedAt = clock().toISOString(); write(state); return structuredClone(policy);
  }
  function transition(version, target) {
    if (!STATES.has(target)) throw new TypeError("invalid policy lifecycle state");
    const state = read(), policy = state.policies.find((p) => p.policyVersion === version); if (!policy) return null;
    if (policy.lifecycleState === "published" && target !== "deprecated") throw new Error("published policies are immutable");
    if (target === "published") {
      if (policy.lifecycleState !== "validated") throw new Error("only validated policies may be published");
      if (state.policies.some((other) => other !== policy && other.lifecycleState === "published" && overlaps(policy, other))) throw new Error("overlapping published policy effective periods");
      policy.publishedAt = clock().toISOString();
    }
    if (target === "archived" && !["draft", "validated", "deprecated"].includes(policy.lifecycleState)) throw new Error("policy cannot be archived from its current state");
    policy.lifecycleState = target; write(state); return structuredClone(policy);
  }
  return Object.freeze({ create, inspect, list: () => structuredClone(read().policies), validate: validatePolicy,
    publish: (version) => transition(version, "published"), archive: (version) => transition(version, "archived"), deprecate: (version) => transition(version, "deprecated"),
    published: (at = clock()) => read().policies.filter((p) => p.lifecycleState === "published" && Date.parse(p.effectiveFrom) <= at && (!p.effectiveTo || at < Date.parse(p.effectiveTo))),
    metrics: () => ({ policyValidationFailures: validationFailures }) });
}

module.exports = { createPolicyManager, overlaps };
