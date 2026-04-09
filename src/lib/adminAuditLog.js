"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function summarizeActor(req) {
  return {
    userId: req?.auth?.userId || null,
    provider: req?.auth?.provider || null,
    providerSubject: req?.auth?.providerSubject || null,
    role: req?.authz?.role || "user",
    isBootstrapSuperAdmin: Boolean(req?.authz?.isBootstrapSuperAdmin)
  };
}

function createAdminAuditLog({ filePath, recentLimit = 20, maxBytes = 512 * 1024, maxArchives = 4, hashChain = true }) {
  const chainState = {
    enabled: Boolean(hashChain),
    lastHash: null
  };

  function listLogPathsInChronologicalOrder() {
    const paths = [];
    for (let i = maxArchives; i >= 1; i -= 1) {
      const candidate = `${filePath}.${i}`;
      if (fs.existsSync(candidate)) paths.push(candidate);
    }
    if (fs.existsSync(filePath)) paths.push(filePath);
    return paths;
  }

  function readParsedEntriesFromPath(logPath) {
    if (!fs.existsSync(logPath)) return [];
    const raw = fs.readFileSync(logPath, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    const parsed = [];
    for (const line of lines) {
      try {
        parsed.push(JSON.parse(line));
      } catch {
        // Keep append-only log resilient if one line is corrupted.
      }
    }
    return parsed;
  }

  function readAllEntries() {
    const logs = listLogPathsInChronologicalOrder();
    return logs.flatMap((logPath) => readParsedEntriesFromPath(logPath));
  }

  function computeEntryHash(entryWithoutHash, previousHash) {
    const payload = JSON.stringify({ ...entryWithoutHash, hashPrev: previousHash || null });
    return crypto.createHash("sha256").update(payload).digest("hex");
  }

  function verifyEntries(entries) {
    if (!chainState.enabled) {
      return { enabled: false, verified: false, issues: [] };
    }
    const issues = [];
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      if (!entry.hash || typeof entry.hash !== "string") {
        issues.push(`entry_index_${i}_missing_hash`);
        break;
      }
      if (i > 0 && entry.hashPrev !== entries[i - 1].hash) {
        issues.push(`entry_index_${i}_broken_link`);
        break;
      }
      const entryWithoutHash = { ...entry };
      delete entryWithoutHash.hash;
      const expectedHash = computeEntryHash(entryWithoutHash, entry.hashPrev || null);
      if (entry.hash !== expectedHash) {
        issues.push(`entry_index_${i}_hash_mismatch`);
        break;
      }
    }

    return {
      enabled: true,
      verified: issues.length === 0,
      issues
    };
  }

  function rotateIfNeeded(incomingEntry) {
    if (!fs.existsSync(filePath)) return false;
    const currentBytes = fs.statSync(filePath).size;
    const incomingBytes = Buffer.byteLength(`${JSON.stringify(incomingEntry)}\n`, "utf8");
    if (currentBytes + incomingBytes <= maxBytes) return false;

    if (maxArchives > 0) {
      const oldestArchive = `${filePath}.${maxArchives}`;
      if (fs.existsSync(oldestArchive)) fs.unlinkSync(oldestArchive);
      for (let i = maxArchives - 1; i >= 1; i -= 1) {
        const src = `${filePath}.${i}`;
        const dst = `${filePath}.${i + 1}`;
        if (fs.existsSync(src)) fs.renameSync(src, dst);
      }
      fs.renameSync(filePath, `${filePath}.1`);
    } else {
      fs.unlinkSync(filePath);
    }

    return true;
  }

  function initializeHashState() {
    if (!chainState.enabled) return;
    const all = readAllEntries();
    const verification = verifyEntries(all);
    if (verification.verified && all.length > 0) {
      chainState.lastHash = all[all.length - 1].hash;
    } else {
      chainState.lastHash = null;
    }
  }

  function appendEvent(event) {
    const baseEntry = {
      timestamp: new Date().toISOString(),
      eventId: crypto.randomUUID(),
      ...event
    };
    const entry = chainState.enabled
      ? {
          ...baseEntry,
          hashPrev: chainState.lastHash,
          hash: computeEntryHash(baseEntry, chainState.lastHash)
        }
      : baseEntry;

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    rotateIfNeeded(entry);
    fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`, "utf8");
    if (chainState.enabled) chainState.lastHash = entry.hash;
    return entry;
  }

  function readRecentEntries(limit = recentLimit) {
    const all = readAllEntries();
    return all.slice(-Math.max(1, limit));
  }

  function readRecentPage({ limit = recentLimit, before = 0 } = {}) {
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || recentLimit));
    const safeBefore = Math.max(0, Number(before) || 0);
    const all = readAllEntries();
    const end = Math.max(0, all.length - safeBefore);
    const start = Math.max(0, end - safeLimit);
    const entries = all.slice(start, end);
    return {
      entries,
      totalEntries: all.length,
      limit: safeLimit,
      before: safeBefore,
      nextBefore: start > 0 ? all.length - start : null,
      integrity: verifyEntries(entries)
    };
  }

  function recentSummary(limit = recentLimit) {
    const events = readRecentEntries(limit);
    const integrity = verifyEntries(events);
    return {
      available: listLogPathsInChronologicalOrder().length > 0,
      filePath,
      recentCount: events.length,
      lastEvent: events.length ? events[events.length - 1] : null,
      retention: {
        maxBytes,
        maxArchives
      },
      tamperEvidence: {
        enabled: chainState.enabled,
        latestHash: chainState.lastHash,
        recentVerification: integrity
      },
      byAction: events.reduce((acc, evt) => {
        const key = evt.action || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    };
  }

  initializeHashState();

  return {
    appendEvent,
    readRecentEntries,
    readRecentPage,
    verifyEntries,
    recentSummary,
    summarizeActor,
    filePath
  };
}

module.exports = {
  createAdminAuditLog,
  summarizeActor
};
