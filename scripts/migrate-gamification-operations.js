"use strict";

const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");
const { createReplayJobStore } = require("../src/repositories/replayJobStore");
const { createGamificationEventStore } = require("../src/repositories/gamificationEventStore");
const { createGamificationAwardStore } = require("../src/repositories/gamificationAwardStore");
const { createGamificationLedgerStore } = require("../src/repositories/gamificationLedgerStore");
const { createGamificationProjectionStore } = require("../src/repositories/gamificationProjectionStore");
const { createGamificationGenerationStore } = require("../src/repositories/gamificationGenerationStore");
const { MIGRATION_VERSION } = require("../src/gamification/preflightService");

const apply = process.argv.includes("--apply");
const dataDir = path.resolve(process.env.POCKET_PT_DATA_DIR || path.join(__dirname, "..", "data"));
const directory = path.join(dataDir, "gamification");
const exists = (name) => fs.existsSync(path.join(directory, name));
const result = { migration: `gamification-v${MIGRATION_VERSION}`, mode: apply ? "apply" : "dry-run", directory, stores: {} };
function hashFile(file) { return createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
try {
  fs.mkdirSync(directory, { recursive: true });
  const eventStore = createGamificationEventStore({ filePath: path.join(directory, "events.json") }); result.stores.events = eventStore.metrics();
  const replayStore = createReplayJobStore({ filePath: path.join(directory, "replay-jobs.json") }); result.stores.replay = { jobs: replayStore.read().jobs.length };
  const awards = exists("awards.json") ? createGamificationAwardStore({ filePath: path.join(directory, "awards.json") }).all() : [];
  const ledger = exists("xp-ledger.json") ? createGamificationLedgerStore({ filePath: path.join(directory, "xp-ledger.json") }).all() : [];
  const projections = exists("projections.json") ? createGamificationProjectionStore({ filePath: path.join(directory, "projections.json") }).readAll() : {};
  result.stores.derived = { awards: awards.length, ledger: ledger.length, projections: Object.keys(projections).length };
  if (exists("policy-registry.json")) { JSON.parse(fs.readFileSync(path.join(directory, "policy-registry.json"), "utf8")); result.stores.policyRegistry = { validJson: true }; }
  if (apply) {
    const backup = path.join(dataDir, `gamification-backup-v${MIGRATION_VERSION}-${Date.now()}`); fs.cpSync(directory, backup, { recursive: true });
    const files = fs.readdirSync(backup).filter((name) => fs.statSync(path.join(backup, name)).isFile());
    result.backup = { path: backup, files: Object.fromEntries(files.map((name) => [name, hashFile(path.join(backup, name))])) };
    for (const [name, checksum] of Object.entries(result.backup.files)) if (hashFile(path.join(directory, name)) !== checksum) throw new Error(`backup verification failed for ${name}`);
    replayStore.update(() => {});
    const generationStore = createGamificationGenerationStore({ directory });
    if (!generationStore.readManifest().activeGeneration) { generationStore.begin({ sourceCursor: eventStore.metrics().lastCursor, policyVersions: [] }); for (const record of awards) generationStore.awardStore.append(record); for (const entry of ledger) generationStore.ledgerStore.append(entry); generationStore.projectionStore.replace(projections); result.generation = generationStore.commit(); }
    const manifest = { version: MIGRATION_VERSION, status: "applied", appliedAt: new Date().toISOString(), sourceCursor: eventStore.metrics().lastCursor, backup: result.backup };
    manifest.checksum = createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
    fs.writeFileSync(path.join(directory, "migration-manifest.json"), JSON.stringify(manifest)); result.applied = true;
  }
  result.ok = true;
} catch (error) { result.ok = false; result.error = error.code || error.message; }
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exitCode = 1;
