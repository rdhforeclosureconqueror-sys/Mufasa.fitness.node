"use strict";

const fs = require("fs");
const path = require("path");

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function createTokenDenylistStore({ filePath, retentionMs = 1000 * 60 * 60 * 24 * 14, now = () => Date.now() }) {
  const state = {
    loaded: false,
    revokedByJti: new Map()
  };

  function persist() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const revoked = [...state.revokedByJti.values()].sort((a, b) => a.expiresAt - b.expiresAt);
    fs.writeFileSync(filePath, JSON.stringify({ revoked }, null, 2));
  }

  function cleanupExpired() {
    const cutoff = now() - retentionMs;
    let removed = 0;
    for (const [jti, entry] of state.revokedByJti.entries()) {
      if (entry.expiresAt <= cutoff) {
        state.revokedByJti.delete(jti);
        removed += 1;
      }
    }
    return removed;
  }

  function ensureLoaded() {
    if (state.loaded) return;
    const parsed = safeReadJson(filePath);
    if (Array.isArray(parsed?.revoked)) {
      for (const item of parsed.revoked) {
        if (!item || typeof item !== "object") continue;
        const jti = String(item.jti || "").trim();
        const expiresAt = Number(item.expiresAt);
        if (!jti || !Number.isFinite(expiresAt)) continue;
        state.revokedByJti.set(jti, {
          jti,
          expiresAt,
          revokedAt: Number(item.revokedAt) || now(),
          reason: String(item.reason || "unspecified").slice(0, 300)
        });
      }
    }
    cleanupExpired();
    state.loaded = true;
  }

  function revoke({ jti, expiresAt, reason = "unspecified" }) {
    ensureLoaded();
    const normalizedJti = String(jti || "").trim();
    const exp = Number(expiresAt);
    if (!normalizedJti) throw new Error("jti is required");
    if (!Number.isFinite(exp)) throw new Error("expiresAt must be a finite epoch millis value");

    cleanupExpired();
    const entry = {
      jti: normalizedJti,
      expiresAt: exp,
      revokedAt: now(),
      reason: String(reason || "unspecified").slice(0, 300)
    };
    state.revokedByJti.set(normalizedJti, entry);
    persist();
    return entry;
  }

  function isRevoked(jti) {
    ensureLoaded();
    if (!jti) return false;
    cleanupExpired();
    return state.revokedByJti.has(String(jti));
  }

  function prune() {
    ensureLoaded();
    const removed = cleanupExpired();
    if (removed > 0) persist();
    return removed;
  }

  function stats() {
    ensureLoaded();
    return {
      enabled: true,
      retentionMs,
      activeRevocationCount: state.revokedByJti.size,
      storagePath: filePath
    };
  }

  return {
    revoke,
    isRevoked,
    prune,
    stats
  };
}

module.exports = {
  createTokenDenylistStore
};
