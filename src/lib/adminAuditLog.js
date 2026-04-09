"use strict";

const fs = require("fs");
const path = require("path");

function summarizeActor(req) {
  return {
    userId: req?.auth?.userId || null,
    provider: req?.auth?.provider || null,
    providerSubject: req?.auth?.providerSubject || null,
    role: req?.authz?.role || "user",
    isBootstrapSuperAdmin: Boolean(req?.authz?.isBootstrapSuperAdmin)
  };
}

function createAdminAuditLog({ filePath, recentLimit = 20 }) {
  function appendEvent(event) {
    const entry = {
      timestamp: new Date().toISOString(),
      ...event
    };
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`, "utf8");
    return entry;
  }

  function readRecentEntries(limit = recentLimit) {
    if (!fs.existsSync(filePath)) return [];
    const lines = fs.readFileSync(filePath, "utf8").trim().split("\n").filter(Boolean);
    const last = lines.slice(-Math.max(1, limit));
    const parsed = [];
    for (const line of last) {
      try {
        parsed.push(JSON.parse(line));
      } catch {
        // Keep append-only log resilient if one line is corrupted.
      }
    }
    return parsed;
  }

  function recentSummary(limit = recentLimit) {
    const events = readRecentEntries(limit);
    return {
      available: fs.existsSync(filePath),
      filePath,
      recentCount: events.length,
      lastEvent: events.length ? events[events.length - 1] : null,
      byAction: events.reduce((acc, evt) => {
        const key = evt.action || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    };
  }

  return {
    appendEvent,
    readRecentEntries,
    recentSummary,
    summarizeActor,
    filePath
  };
}

module.exports = {
  createAdminAuditLog,
  summarizeActor
};
