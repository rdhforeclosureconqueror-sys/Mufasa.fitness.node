"use strict";
const fs = require("fs");
const path = require("path");

// Atomic, fail-closed file ledger. Must reside on a persistent shared volume;
// multi-instance deployments require a transactional database instead.
function createAiUsageLedger({ filePath, now = () => new Date() }) {
  const lockPath = filePath + ".lock";
  function record({ userId, feature, exempt = false }) {
    if (exempt) return { allowed: true, exempt: true };
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    let fd;
    try { fd = fs.openSync(lockPath, "wx", 0o600); }
    catch (error) {
      if (error.code === "EEXIST") return { allowed: false, busy: true };
      throw error;
    }
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
