"use strict";
function createCircuitBreaker({ threshold = 5, cooldownMs = 30_000, clock = Date.now } = {}) {
  let failures = 0, openedAt = null;
  function canRequest() { if (openedAt === null) return true; if (clock() - openedAt >= cooldownMs) { openedAt = null; failures = 0; return true; } return false; }
  function success() { failures = 0; openedAt = null; }
  function failure() { failures += 1; if (failures >= threshold) openedAt = clock(); }
  function status() { return { state: openedAt !== null ? "open" : "closed", failures, retryAfterMs: openedAt !== null ? Math.max(0, cooldownMs - (clock() - openedAt)) : 0 }; }
  return Object.freeze({ canRequest, success, failure, status });
}
module.exports = { createCircuitBreaker };
