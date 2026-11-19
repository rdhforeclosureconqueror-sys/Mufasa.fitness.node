"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const BOOT_ID = crypto.randomUUID();

// Atomic, fail-closed file ledger. Must reside on a persistent shared volume;
// multi-instance deployments require a transactional database instead.
function createAiUsageLedger({ filePath, now = () => new Date() }) {
  const lockPath = filePath + ".lock";
  function record({ userId, feature, exempt = false }) {
    if (exempt) return { allowed: true, exempt: true };
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    let fd;
    function acquire() {
      try {
        fd = fs.openSync(lockPath, "wx", 0o600);
        fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, bootId: BOOT_ID, createdAt: Date.now() }));
        return true;
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        // Single-instance Render service: recover only provably dead local owners.
        // Ambiguous or malformed locks remain fail-closed.
        let owner;
        try { owner = JSON.parse(fs.readFileSync(lockPath, "utf8")); }
        catch { return false; }
        if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0 || !Number.isFinite(owner.createdAt)) return false;
        if (Date.now() - owner.createdAt < 1000) return false;
        // A reused PID after a restart is not proof that the original writer lives.
        // The owner identity includes a per-process boot token.
        if (owner.pid !== process.pid || owner.bootId === BOOT_ID) {
          try { process.kill(owner.pid, 0); return false; }
          catch (e) { if (e.code !== "ESRCH") return false; }
        }
        // Avoid deleting a lock replaced during inspection.
        let before, after;
        try {
          before = fs.statSync(lockPath);
          after = fs.statSync(lockPath);
          if (before.ino !== after.ino || before.mtimeMs !== after.mtimeMs) return false;
          fs.unlinkSync(lockPath);
        } catch { return false; }
        try {
          fd = fs.openSync(lockPath, "wx", 0o600);
          fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, bootId: BOOT_ID, createdAt: Date.now() }));
          return true;
        } catch (e) { if (e.code === "EEXIST") return false; throw e; }
      }
    }
    if (!acquire()) return { allowed: false, busy: true };
    try {
      const date = now();
      const day = date.toISOString().slice(0, 10);
      const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
      const week = monday.toISOString().slice(0, 10);
      const entries = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : [];
      if (!Array.isArray(entries)) throw new Error("Invalid AI usage ledger");
      const mine = entries.filter(e => e.userId === userId);
      const daily = mine.filter(e => e.day === day).length;
      const weekly = mine.filter(e => e.week === week).length;
      if (daily >= 3 || weekly >= 10) return { allowed: false, daily, weekly, dailyRemaining: Math.max(0, 3 - daily), weeklyRemaining: Math.max(0, 10 - weekly) };
      entries.push({ userId, feature, day, week, timestamp: date.toISOString() });
      const temp = filePath + "." + process.pid + ".tmp";
      fs.writeFileSync(temp, JSON.stringify(entries), { mode: 0o600 });
      fs.renameSync(temp, filePath);
      return { allowed: true, daily: daily + 1, weekly: weekly + 1, dailyRemaining: 2 - daily, weeklyRemaining: 9 - weekly };
    } finally { fs.closeSync(fd); fs.unlinkSync(lockPath); }
  }
  return { record };
}
module.exports = { createAiUsageLedger };
