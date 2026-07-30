"use strict";

const fs = require("fs");
const path = require("path");
const { randomUUID, createHash } = require("crypto");

const STATES = new Set(["draft", "validated", "published", "deprecated", "archived"]);
function overlaps(a, b) {
  const aStart = Date.parse(a.effectiveFrom), bStart = Date.parse(b.effectiveFrom);
  const aEnd = a.effectiveTo ? Date.parse(a.effectiveTo) : Infinity, bEnd = b.effectiveTo ? Date.parse(b.effectiveTo) : Infinity;
  return aStart < bEnd && bStart < aEnd;
}
function createPolicyManager({ filePath, validate, clock = () => new Date(), audit = () => {} }) {
  let validationFailures = 0;
  const lockPath = `${filePath}.lock`, ownerId = `${process.pid}:${randomUUID()}`;
  const backupPath = `${filePath}.bak`;
  function acquire() { fs.mkdirSync(path.dirname(filePath), { recursive: true }); const deadline = Date.now() + 5000; while (true) { try { fs.mkdirSync(lockPath); fs.writeFileSync(path.join(lockPath, "owner"), ownerId); return; } catch (error) { if (error.code !== "EEXIST") throw error; if (Date.now() - fs.statSync(lockPath).mtimeMs > 30000) { fs.rmSync(lockPath, { recursive: true, force: true }); continue; } if (Date.now() >= deadline) throw new Error("timed out acquiring policy registry lock"); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10); } } }
  function release() { try { if (fs.readFileSync(path.join(lockPath, "owner"), "utf8") === ownerId) fs.rmSync(lockPath, { recursive: true, force: true }); } catch {} }
  function locked(operation) { acquire(); try { return operation(); } finally { release(); } }
  function checksum(value) { return createHash("sha256").update(JSON.stringify({ schemaVersion: 2, revision: value.revision, policies: value.policies })).digest("hex"); }
  function parse(candidate) { const value = JSON.parse(fs.readFileSync(candidate, "utf8")); if (value?.schemaVersion === 1 && Array.isArray(value.policies)) return { schemaVersion: 2, revision: 0, policies: value.policies }; if (value?.schemaVersion !== 2 || !Number.isSafeInteger(value.revision) || !Array.isArray(value.policies) || value.checksum !== checksum(value)) throw new Error("invalid policy registry structure or checksum"); return value; }
  function read() { if (!fs.existsSync(filePath)) return { schemaVersion: 2, revision: 0, policies: [] }; try { return parse(filePath); } catch (error) { if (!fs.existsSync(backupPath)) throw error; const recovered = parse(backupPath); fs.copyFileSync(backupPath, filePath); return recovered; } }
  function write(value) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); const base = { schemaVersion: 2, revision: (value.revision || 0) + 1, policies: value.policies }; const sealed = { ...base, checksum: checksum(base) }; const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`; const fd = fs.openSync(temp, "w"); try { fs.writeFileSync(fd, JSON.stringify(sealed)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } if (fs.existsSync(filePath)) fs.copyFileSync(filePath, backupPath); fs.renameSync(temp, filePath); const dir = fs.openSync(path.dirname(filePath), "r"); try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); } }
  function inspect(version) { return structuredClone(read().policies.find((p) => p.policyVersion === version) || null); }
  function create(policy) {
    return locked(() => { const state = read(); if (state.policies.some((p) => p.policyVersion === policy.policyVersion)) throw new Error("policy version already exists");
    const item = structuredClone({ ...policy, lifecycleState: "draft", createdAt: clock().toISOString() }); state.policies.push(item); write(state); audit({ action: "gamification.policy.created", policyVersion: item.policyVersion }); return item;
    });
  }
  function validatePolicy(version) {
    return locked(() => { const state = read(), policy = state.policies.find((p) => p.policyVersion === version); if (!policy) return null;
    if (policy.lifecycleState === "published") throw new Error("published policies are immutable");
    try { validate({ schemaVersion: 1, policies: [policy] }); if (!Number.isFinite(Date.parse(policy.effectiveFrom)) || (policy.effectiveTo && Date.parse(policy.effectiveTo) <= Date.parse(policy.effectiveFrom))) throw new Error("invalid effective period"); }
    catch (error) { validationFailures++; throw error; }
    policy.lifecycleState = "validated"; policy.validatedAt = clock().toISOString(); write(state); audit({ action: "gamification.policy.validated", policyVersion: version }); return structuredClone(policy); });
  }
  function transition(version, target) {
    return locked(() => {
    if (!STATES.has(target)) throw new TypeError("invalid policy lifecycle state");
    const state = read(), policy = state.policies.find((p) => p.policyVersion === version); if (!policy) return null;
    if (policy.lifecycleState === "published" && target !== "deprecated") throw new Error("published policies are immutable");
    if (target === "published") {
      if (policy.lifecycleState !== "validated") throw new Error("only validated policies may be published");
      if (state.policies.some((other) => other !== policy && other.lifecycleState === "published" && overlaps(policy, other))) throw new Error("overlapping published policy effective periods");
      policy.publishedAt = clock().toISOString();
    }
    if (target === "archived" && !["draft", "validated", "deprecated"].includes(policy.lifecycleState)) throw new Error("policy cannot be archived from its current state");
    policy.lifecycleState = target; write(state); audit({ action: `gamification.policy.${target}`, policyVersion: version }); return structuredClone(policy); });
  }
  function seedPublished(policies) {
    return locked(() => { const state = read(); let changed = false;
    for (const source of policies) if (!state.policies.some((item) => item.policyVersion === source.policyVersion)) { state.policies.push({ ...structuredClone(source), lifecycleState: "published", createdAt: clock().toISOString(), validatedAt: clock().toISOString(), publishedAt: clock().toISOString(), migrated: true }); changed = true; }
    if (changed) write(state); return changed; });
  }
  return Object.freeze({ create, inspect, list: () => structuredClone(read().policies), validate: validatePolicy,
    publish: (version) => transition(version, "published"), archive: (version) => transition(version, "archived"), deprecate: (version) => transition(version, "deprecated"),
    allPublished: () => read().policies.filter((p) => p.lifecycleState === "published"),
    published: (at = clock()) => read().policies.filter((p) => p.lifecycleState === "published" && Date.parse(p.effectiveFrom) <= at && (!p.effectiveTo || at < Date.parse(p.effectiveTo))),
    seedPublished, metrics: () => ({ policyValidationFailures: validationFailures }) });
}

module.exports = { createPolicyManager, overlaps };
