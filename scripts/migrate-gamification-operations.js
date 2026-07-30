"use strict";

const fs = require("fs");
const path = require("path");
const { createReplayJobStore } = require("../src/repositories/replayJobStore");

const apply = process.argv.includes("--apply");
const dataDir = path.resolve(process.env.POCKET_PT_DATA_DIR || path.join(__dirname, "..", "data"));
const filePath = path.join(dataDir, "gamification", "replay-jobs.json");
const result = { migration: "gamification-operations-v2", mode: apply ? "apply" : "dry-run", filePath, existed: fs.existsSync(filePath), migrated: false };
try {
  const store = createReplayJobStore({ filePath });
  const current = store.read();
  result.sourceSchemaVersion = current.schemaVersion;
  result.jobCount = current.jobs.length;
  result.historyCount = current.history.length;
  if (apply) { store.update(() => {}); result.migrated = true; result.targetRevision = store.read().revision; }
  result.ok = true;
} catch (error) { result.ok = false; result.error = error.code || error.message; }
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exitCode = 1;
