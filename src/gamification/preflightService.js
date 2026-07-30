"use strict";

const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");

const MIGRATION_VERSION = 3;
function createGamificationPreflightService({ dataDirectory, eventStore, generationStore, replayStore, policyManager, readModelService }) {
  function check() {
    const checks = {};
    try { const metrics = eventStore.metrics(); eventStore.readAfter(Math.max(0, metrics.lastCursor - 1), 1); checks.events = { valid: true, ...metrics }; } catch (error) { checks.events = { valid: false, error: error.message }; }
    try { const generation = generationStore.active(); checks.generation = { valid: Boolean(generation.generationId), generationId: generation.generationId || null, sourceCursor: generation.sourceCursor || 0 }; } catch (error) { checks.generation = { valid: false, error: error.message }; }
    try { replayStore.read(); checks.replay = { valid: true }; } catch (error) { checks.replay = { valid: false, error: error.message }; }
    try { checks.policies = { valid: policyManager.allPublished().length > 0, published: policyManager.allPublished().length }; } catch (error) { checks.policies = { valid: false, error: error.message }; }
    try { const report = readModelService.verify(); checks.integrity = { valid: report.valid, mismatchCount: report.mismatches.length }; } catch (error) { checks.integrity = { valid: false, error: error.message }; }
    try { fs.mkdirSync(dataDirectory, { recursive: true }); const probe = path.join(dataDirectory, `.write-probe-${process.pid}`); fs.writeFileSync(probe, "ok", { flag: "wx" }); fs.rmSync(probe); checks.writable = { valid: true }; } catch (error) { checks.writable = { valid: false, error: error.code || error.message }; }
    try { const migration = JSON.parse(fs.readFileSync(path.join(dataDirectory, "migration-manifest.json"), "utf8")); const { checksum, ...body } = migration; const validChecksum = checksum === createHash("sha256").update(JSON.stringify(body)).digest("hex"); checks.migration = { valid: validChecksum && migration.version === MIGRATION_VERSION && migration.status === "applied", version: migration.version || null }; } catch { checks.migration = { valid: false, version: null }; }
    const replayStatus = readModelService.status(); checks.startupReplay = { valid: Boolean(replayStatus.lastSuccessfulReplay), lastSuccessfulReplay: replayStatus.lastSuccessfulReplay };
    return { ready: Object.values(checks).every((item) => item.valid), migrationVersion: MIGRATION_VERSION, checks };
  }
  return Object.freeze({ check });
}

module.exports = { createGamificationPreflightService, MIGRATION_VERSION };
