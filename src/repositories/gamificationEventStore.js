"use strict";

const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");

function createGamificationEventStore({ filePath, maxRead = 100 }) {
  const backupPath = `${filePath}.bak`;
  const quarantinePath = `${filePath}.quarantine.ndjson`;
  let state;

  function checksum(value) { return createHash("sha256").update(JSON.stringify({ nextSequence: value.nextSequence, events: value.events })).digest("hex"); }
  function empty() {
    const value = { schemaVersion: 1, nextSequence: 1, events: [] };
    return { ...value, checksum: checksum(value) };
  }
  function parse(candidate) {
    const value = JSON.parse(fs.readFileSync(candidate, "utf8"));
    if (value?.schemaVersion !== 1 || !Number.isSafeInteger(value.nextSequence) || !Array.isArray(value.events) || value.checksum !== checksum(value)) throw new Error("invalid event store structure or checksum");
    return value;
  }
  function quarantine(candidate, error) {
    fs.mkdirSync(path.dirname(quarantinePath), { recursive: true });
    fs.appendFileSync(quarantinePath, `${JSON.stringify({ recordedAt: new Date().toISOString(), file: path.basename(candidate), reason: String(error.message || error).slice(0, 200) })}\n`);
  }
  function load() {
    if (!fs.existsSync(filePath)) return empty();
    try { return parse(filePath); } catch (error) {
      quarantine(filePath, error);
      if (fs.existsSync(backupPath)) {
        try {
          const recovered = parse(backupPath);
          fs.copyFileSync(backupPath, filePath);
          return recovered;
        } catch (backupError) { quarantine(backupPath, backupError); }
      }
      throw new Error("Gamification event store is corrupt and no valid backup is available");
    }
  }
  function persist(next) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    const fd = fs.openSync(temp, "w");
    const sealed = { ...next, checksum: checksum(next) };
    try { fs.writeFileSync(fd, JSON.stringify(sealed)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    if (fs.existsSync(filePath)) fs.copyFileSync(filePath, backupPath);
    fs.renameSync(temp, filePath);
    const dir = fs.openSync(path.dirname(filePath), "r");
    try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
    return sealed;
  }
  state = load();

  // The event log is authoritative.  A process-local snapshot must therefore
  // never be used as the basis of a write.  The lock directory is created by
  // the filesystem as one indivisible operation, including on the shared
  // filesystems supported by the deployment.  The winner reloads the latest
  // committed snapshot before applying its append.
  function withWriteLock(operation) {
    const lockPath = `${filePath}.lock`;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const deadline = Date.now() + 10000;
    while (true) {
      try {
        fs.mkdirSync(lockPath);
        break;
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        if (Date.now() >= deadline) throw new Error("Timed out acquiring gamification event store write lock");
        // Atomics.wait provides a synchronous sleep without burning a CPU while
        // keeping this repository's intentionally synchronous API unchanged.
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
      }
    }
    try { return operation(); } finally { fs.rmdirSync(lockPath); }
  }

  function append(event) {
    return withWriteLock(() => {
      state = load();
      const existing = state.events.find((item) => item.event.subjectUserId === event.subjectUserId && item.event.idempotencyKey === event.idempotencyKey);
      if (existing) return { status: "duplicate", sequence: existing.sequence, event: existing.event };
      const item = { sequence: state.nextSequence, event };
      const next = { schemaVersion: 1, nextSequence: state.nextSequence + 1, events: [...state.events, item] };
      state = persist(next);
      return { status: "recorded", sequence: item.sequence, event };
    });
  }
  function readAfter(cursor = 0, limit = maxRead) {
    state = load();
    const bounded = Math.max(1, Math.min(maxRead, Number.isSafeInteger(limit) ? limit : maxRead));
    return state.events.filter((item) => item.sequence > cursor).slice(0, bounded).map((item) => ({ ...item }));
  }
  function metrics() { state = load(); return { count: state.events.length, lastCursor: state.nextSequence - 1 }; }
  function quarantineRejected({ eventType = null, schemaVersion = null, errorCode = "INVALID_EVENT", correlationId = null }) {
    fs.mkdirSync(path.dirname(quarantinePath), { recursive: true });
    fs.appendFileSync(quarantinePath, `${JSON.stringify({ recordedAt: new Date().toISOString(), eventType, schemaVersion, errorCode, correlationId })}\n`);
  }
  return Object.freeze({ append, readAfter, metrics, quarantineRejected });
}

module.exports = { createGamificationEventStore };
