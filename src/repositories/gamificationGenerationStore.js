"use strict";

const fs = require("fs");
const path = require("path");
const { createHash, randomUUID } = require("crypto");
const { validEntry } = require("./gamificationLedgerStore");

function digest(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function createGamificationGenerationStore({ directory }) {
  const manifestPath = path.join(directory, "derived-manifest.json");
  const generationsDir = path.join(directory, "derived-generations");
  const lockPath = `${manifestPath}.lock`;
  let staging = null;

  function empty() { return { awards: [], ledger: [], projections: {} }; }
  function readManifest() {
    if (!fs.existsSync(manifestPath)) return { schemaVersion: 1, activeGeneration: null, previousGeneration: null };
    const value = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const body = { schemaVersion: value.schemaVersion, activeGeneration: value.activeGeneration, previousGeneration: value.previousGeneration };
    if (value.schemaVersion !== 1 || value.checksum !== digest(body)) throw new Error("invalid gamification generation manifest");
    return value;
  }
  function readGeneration(id) {
    if (!id) return empty();
    const value = JSON.parse(fs.readFileSync(path.join(generationsDir, `${id}.json`), "utf8"));
    const body = { schemaVersion: value.schemaVersion, generationId: value.generationId, sourceCursor: value.sourceCursor,
      policyVersions: value.policyVersions, algorithmVersion: value.algorithmVersion, awards: value.awards, ledger: value.ledger, projections: value.projections };
    if (value.schemaVersion !== 1 || value.generationId !== id || value.checksum !== digest(body) || !Array.isArray(value.awards) || !Array.isArray(value.ledger) || typeof value.projections !== "object") throw new Error("invalid gamification derived generation");
    return body;
  }
  function active() { return readGeneration(readManifest().activeGeneration); }
  function begin(metadata = {}) { staging = { ...empty(), sourceCursor: metadata.sourceCursor || 0, policyVersions: metadata.policyVersions || [], algorithmVersion: 1 }; }
  function requireStaging() { if (!staging) throw new Error("gamification generation has not begun"); return staging; }
  function acquire() { fs.mkdirSync(directory, { recursive: true }); const deadline = Date.now() + 10000; while (true) { try { fs.mkdirSync(lockPath); return; } catch (error) { if (error.code !== "EEXIST") throw error; if (Date.now() >= deadline) throw new Error("timed out acquiring generation commit lock"); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5); } } }
  function commit(assertOwner = () => {}) {
    const candidate = requireStaging();
    acquire();
    try {
      // Ownership is checked while holding the publication lock, immediately
      // before the only mutable pointer is switched.
      assertOwner();
      const id = `gen_${digest(candidate).slice(0, 24)}`;
      const body = { schemaVersion: 1, generationId: id, sourceCursor: candidate.sourceCursor, policyVersions: candidate.policyVersions,
        algorithmVersion: candidate.algorithmVersion, awards: candidate.awards, ledger: candidate.ledger, projections: candidate.projections };
      fs.mkdirSync(generationsDir, { recursive: true });
      const generationPath = path.join(generationsDir, `${id}.json`);
      if (!fs.existsSync(generationPath)) writeAtomic(generationPath, { ...body, checksum: digest(body) });
      const prior = readManifest();
      const manifest = { schemaVersion: 1, activeGeneration: id, previousGeneration: prior.activeGeneration };
      writeAtomic(manifestPath, { ...manifest, checksum: digest(manifest) });
      staging = null;
      return { generationId: id, previousGeneration: prior.activeGeneration };
    } finally { fs.rmdirSync(lockPath); }
  }
  function writeAtomic(target, value) {
    const temp = `${target}.${process.pid}.${randomUUID()}.tmp`; const fd = fs.openSync(temp, "w");
    try { fs.writeFileSync(fd, JSON.stringify(value)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(temp, target); const dir = fs.openSync(path.dirname(target), "r"); try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
  }
  const awardStore = Object.freeze({
    append(record) { const state = requireStaging(); const found = state.awards.find((item) => item.recordKey === record.recordKey); if (found) return { status: "duplicate", record: structuredClone(found) }; state.awards.push(structuredClone(record)); return { status: "recorded", record }; },
    all() { return structuredClone(staging ? staging.awards : active().awards); }
  });
  const ledgerStore = Object.freeze({
    append(entry) { const state = requireStaging(); if (!validEntry(entry)) throw new Error("invalid gamification ledger entry"); const found = state.ledger.find((item) => item.effectKey === entry.effectKey); if (found) { if (JSON.stringify(found) !== JSON.stringify(entry)) throw new Error("gamification ledger effect key conflict"); return { status: "duplicate", entry: found }; } if (entry.reversalOf) { const original = state.ledger.find((item) => item.entryId === entry.reversalOf); if (!original || original.reversalOf || original.subjectUserId !== entry.subjectUserId || original.kind !== entry.kind || entry.delta !== -original.delta || state.ledger.some((item) => item.reversalOf === entry.reversalOf)) throw new Error("invalid gamification ledger reversal"); } state.ledger.push(structuredClone(entry)); return { status: "recorded", entry }; },
    all() { return structuredClone(staging ? staging.ledger : active().ledger); }
  });
  const projectionStore = Object.freeze({
    replace(projections) { requireStaging().projections = structuredClone(projections); }, readAll() { return structuredClone(staging ? staging.projections : active().projections); },
    read(userId) { return this.readAll()[userId] || null; }, removeUser() { throw new Error("projections are immutable; rebuild a generation"); }, remove() { throw new Error("projections are immutable; rebuild a generation"); }
  });
  function rollback() { acquire(); try { const current = readManifest(); if (!current.previousGeneration) throw new Error("no prior gamification generation"); readGeneration(current.previousGeneration); const manifest = { schemaVersion: 1, activeGeneration: current.previousGeneration, previousGeneration: current.activeGeneration }; writeAtomic(manifestPath, { ...manifest, checksum: digest(manifest) }); return manifest.activeGeneration; } finally { fs.rmdirSync(lockPath); } }
  return Object.freeze({ begin, commit, rollback, active, readManifest, awardStore, ledgerStore, projectionStore, directory });
}

module.exports = { createGamificationGenerationStore, digest };
