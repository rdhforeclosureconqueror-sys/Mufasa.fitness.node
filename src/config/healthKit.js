"use strict";

function enabled(value) { return String(value || "").toLowerCase() === "true"; }

function loadHealthKitConfig(env = process.env) {
  return Object.freeze({
    enabled: enabled(env.HEALTHKIT_ENABLED),
    evidenceIngestionEnabled: enabled(env.HEALTHKIT_EVIDENCE_INGESTION_ENABLED),
    reconciliationVersion: "healthkit-browser-v1"
  });
}

module.exports = { loadHealthKitConfig };
