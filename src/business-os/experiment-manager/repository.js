"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const TABLES = ["proposals", "approvals", "runs", "runKeys", "measurements", "results"];
const empty = organizationId => ({version: 1, organizationId, tables: Object.fromEntries(TABLES.map(key => [key, []]))});

// Single-host, local persistent-disk adapter. A crashed writer leaves a lock:
// recovery requires an operator to establish the writer is dead before removing it.
function createFileExperimentRepository({filePath, organizationId} = {}) {
  if (!path.isAbsolute(filePath || "") || !organizationId) throw new Error("repository_path_and_organization_required");
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  const lockPath = filePath + ".lock";
  function read() {
    let raw;
    try { raw = fs.readFileSync(filePath, "utf8"); }
    catch (error) { if (error.code === "ENOENT") return empty(organizationId); throw error; }
    const state = JSON.parse(raw);
    if (state.version !== 1 || state.organizationId !== organizationId) throw new Error("experiment_repository_scope_or_version_invalid");
    for (const key of TABLES) {
      const entries = state.tables?.[key];
      if (!Array.isArray(entries) || entries.some(x => !Array.isArray(x) || x.length !== 2 || typeof x[0] !== "string" || !x[1] || typeof x[1] !== "object") || new Set(entries.map(x => x[0])).size !== entries.length) throw new Error("experiment_repository_corrupt");
    }
    return state;
  }
  function transaction(operation, {readOnly = false} = {}) {
    let lock;
    try { lock = fs.openSync(lockPath, "wx", 0o600); }
    catch (error) { if (error.code === "EEXIST") throw new Error("experiment_repository_busy"); throw error; }
    const temp = filePath + "." + crypto.randomUUID() + ".tmp";
    try {
      const state = read();
      const result = operation(state);
      if (result?.then) throw new Error("experiment_repository_sync_operation_required");
      if (!readOnly) {
        const fd = fs.openSync(temp, "wx", 0o600);
        try { fs.writeFileSync(fd, JSON.stringify(state)); fs.fsyncSync(fd); }
        finally { fs.closeSync(fd); }
        fs.renameSync(temp, filePath);
        const dir = fs.openSync(path.dirname(filePath), "r");
        try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
      }
      return result;
    } finally {
      fs.rmSync(temp, {force: true});
      fs.closeSync(lock);
      fs.unlinkSync(lockPath);
    }
  }
  return Object.freeze({organizationId, transaction});
}
module.exports = {createFileExperimentRepository, TABLES};
