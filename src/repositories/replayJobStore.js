"use strict";

const fs = require("fs");
const path = require("path");
const { createHash, randomUUID } = require("crypto");

function digest(state) { return createHash("sha256").update(JSON.stringify({ schemaVersion: state.schemaVersion, revision: state.revision, jobs: state.jobs, history: state.history })).digest("hex"); }
function sleep(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

function createReplayJobStore({ filePath, lockTimeoutMs = 5_000, staleLockMs = 30_000, clock = () => new Date(), ownerId = `${process.pid}:${randomUUID()}` }) {
  const backupPath = `${filePath}.bak`;
  const lockPath = `${filePath}.lock`;
  function empty() { const state = { schemaVersion: 2, revision: 0, jobs: [], history: [] }; return { ...state, checksum: digest(state) }; }
  function parse(candidate) {
    const raw = JSON.parse(fs.readFileSync(candidate, "utf8"));
    if (raw?.schemaVersion === 1 && Array.isArray(raw.jobs) && Array.isArray(raw.history)) return { schemaVersion: 2, revision: 0, jobs: raw.jobs, history: raw.history, checksum: null };
    if (raw?.schemaVersion !== 2 || !Number.isSafeInteger(raw.revision) || !Array.isArray(raw.jobs) || !Array.isArray(raw.history) || raw.checksum !== digest(raw)) throw new Error("invalid replay job store structure or checksum");
    return raw;
  }
  function readUnsafe() {
    if (!fs.existsSync(filePath)) return empty();
    try { return parse(filePath); } catch (error) {
      if (fs.existsSync(backupPath)) { const recovered = parse(backupPath); fs.copyFileSync(backupPath, filePath); return recovered; }
      throw error;
    }
  }
  function acquire() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const deadline = Date.now() + lockTimeoutMs;
    while (true) {
      try { fs.mkdirSync(lockPath); fs.writeFileSync(path.join(lockPath, "owner.json"), JSON.stringify({ ownerId, acquiredAt: clock().toISOString() })); return; }
      catch (error) {
        if (error.code !== "EEXIST") throw error;
        try { if (Date.now() - fs.statSync(lockPath).mtimeMs > staleLockMs) { fs.rmSync(lockPath, { recursive: true, force: true }); continue; } } catch { continue; }
        if (Date.now() >= deadline) throw Object.assign(new Error("timed out acquiring replay store lock"), { code: "REPLAY_STORE_LOCK_TIMEOUT" });
        sleep(10);
      }
    }
  }
  function release() { try { const owner = JSON.parse(fs.readFileSync(path.join(lockPath, "owner.json"), "utf8")); if (owner.ownerId === ownerId) fs.rmSync(lockPath, { recursive: true, force: true }); } catch {} }
  function persist(state) {
    const base = { schemaVersion: 2, revision: state.revision + 1, jobs: state.jobs, history: state.history };
    const sealed = { ...base, checksum: digest(base) };
    const temp = `${filePath}.${ownerId.replaceAll(":", "_")}.tmp`;
    const fd = fs.openSync(temp, "w");
    try { fs.writeFileSync(fd, JSON.stringify(sealed)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    if (fs.existsSync(filePath)) fs.copyFileSync(filePath, backupPath);
    fs.renameSync(temp, filePath);
    const dir = fs.openSync(path.dirname(filePath), "r"); try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
    return sealed;
  }
  function update(mutator) {
    acquire();
    try { const state = readUnsafe(); const result = mutator(state); persist(state); return result; } finally { release(); }
  }
  function read() { acquire(); try { return structuredClone(readUnsafe()); } finally { release(); } }
  return Object.freeze({ read, update, ownerId, filePath });
}

module.exports = { createReplayJobStore, digest };
