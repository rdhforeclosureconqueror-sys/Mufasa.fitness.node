"use strict";

const ALERT_TYPES = Object.freeze({
  STRICT_STARTUP_FAILURE: "strict_startup_failure",
  ENFORCEMENT_VERSION_CONFLICT: "enforcement_version_conflict",
  AUDIT_INTEGRITY_FAILURE: "audit_integrity_failure",
  BREAK_GLASS_USED: "break_glass_used"
});

function createControlPlaneAlertEmitter({ sink = null, logger = console } = {}) {
  function emit(type, details = {}) {
    const event = {
      type,
      severity: details.severity || "warning",
      at: new Date().toISOString(),
      ...details
    };

    if (logger?.warn) logger.warn("[control-plane-alert]", event);
    if (typeof sink === "function") sink(event);
    return event;
  }

  return {
    ALERT_TYPES,
    emit
  };
}

module.exports = {
  ALERT_TYPES,
  createControlPlaneAlertEmitter
};
