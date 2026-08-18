(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MotionViewerContract = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STATUSES = Object.freeze(["disabled", "idle", "loading", "ready", "unavailable", "timed_out", "failed"]);
  const STATUS_SET = new Set(STATUSES);

  function descriptor(exerciseId) {
    const value = String(exerciseId || "").trim();
    if (!value) throw new TypeError("Motion viewer requires a canonical exerciseId");
    return Object.freeze({ exerciseId: value });
  }

  function isStatus(value) { return STATUS_SET.has(value); }

  function diagnostic({ stage, status, elapsedMs, exerciseId, failureCode = null }) {
    return Object.freeze({
      stage: String(stage),
      status: isStatus(status) ? status : "failed",
      elapsedMs: Math.max(0, Number(elapsedMs) || 0),
      exerciseId: String(exerciseId),
      failureCode: failureCode ? String(failureCode) : null
    });
  }

  return Object.freeze({ STATUSES, descriptor, isStatus, diagnostic });
});
