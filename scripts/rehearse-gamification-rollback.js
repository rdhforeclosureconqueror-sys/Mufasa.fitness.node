"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { createHash } = require("crypto");

const argument = process.argv.find((value) => value.startsWith("--data-dir="));
const dataDir = path.resolve(argument ? argument.slice("--data-dir=".length) : fs.mkdtempSync(path.join(os.tmpdir(), "gamification-rollback-")));
if (process.env.NODE_ENV === "production" || process.env.RENDER_SERVICE_TYPE) throw new Error("Refusing to rehearse rollback in production");
const directory = path.join(dataDir, "gamification"); fs.mkdirSync(directory, { recursive: true });
let authoritative = ["events.json", "xp-ledger.json", "awards.json"].filter((name) => fs.existsSync(path.join(directory, name)));
let evidenceDirectory = directory;
if (!authoritative.length) {
  evidenceDirectory = path.join(directory, ".rollback-rehearsal-fixture"); fs.mkdirSync(evidenceDirectory, { recursive: true });
  for (const name of ["events.json", "xp-ledger.json", "awards.json"]) fs.writeFileSync(path.join(evidenceDirectory, name), JSON.stringify({ fixture: true, records: [] }));
  authoritative = ["events.json", "xp-ledger.json", "awards.json"];
}
const digest = (name) => createHash("sha256").update(fs.readFileSync(path.join(evidenceDirectory, name))).digest("hex");
const before = Object.fromEntries(authoritative.map((name) => [name, digest(name)]));
const manifestPath = path.join(directory, "derived-manifest.json");
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : null;
const previousActiveGeneration = manifest?.activeGeneration || null;

// A rehearsal never changes authoritative stores. Projections are deliberately treated as disposable.
for (const name of ["projections.json"]) if (fs.existsSync(path.join(directory, name))) fs.copyFileSync(path.join(directory, name), path.join(directory, `${name}.rollback-rehearsal`));
const after = Object.fromEntries(authoritative.map((name) => [name, digest(name)]));
if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Authoritative history changed during rollback rehearsal");

process.stdout.write(`${JSON.stringify({ ok: true, productionChangesApplied: false, fixtureEvidence: evidenceDirectory !== directory, disableOrder: ["GAMIFICATION_OPERATIONS=false", "GAMIFICATION_EVALUATION=false", "GAMIFICATION_SOURCE_WORKOUT_COMPLETED=false", "GAMIFICATION_EVENT_CAPTURE=false", "GAMIFICATION_READ_API=false"], authoritativeHistoryPreserved: authoritative, previousActiveGeneration, previousGenerationAvailable: !manifest?.previousGeneration || fs.existsSync(path.join(directory, "derived-generations", `${manifest.previousGeneration}.json`)), projectionBackupCreated: fs.existsSync(path.join(directory, "projections.json.rollback-rehearsal")), nextHumanActions: ["restart every instance", "wait for health checks", "revert the approved application commit", "verify the previous generation and core domain smoke tests"] }, null, 2)}\n`);
