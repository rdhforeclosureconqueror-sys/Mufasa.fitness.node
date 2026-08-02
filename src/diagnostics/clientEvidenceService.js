"use strict";

const CAPABILITIES = new Set(["greatness_browser_map", "universal_leaderboard"]);
const STATUSES = new Set(["READY", "CLIENT_RUNTIME_FAILED"]);
const CLASSIFICATIONS = new Set([
  "BROWSER_MAP_KEY_MISSING", "BROWSER_CONFIG_UNAVAILABLE", "MAPS_SCRIPT_BLOCKED", "MAPS_AUTHENTICATION_FAILED",
  "MAPS_REFERRER_NOT_ALLOWED", "MAPS_API_NOT_ACTIVATED", "MAP_CONTAINER_ZERO_SIZE",
  "MAP_CONTAINER_NOT_VISIBLE", "MAP_INITIALIZATION_FAILED", "ROUTE_COORDINATES_INVALID",
  "MAPS_LIBRARY_UNAVAILABLE", "UNKNOWN_MAP_RENDER_FAILURE", "LEADERBOARD_REQUEST_INVALID",
  "LEADERBOARD_PERIOD_INVALID", "LEADERBOARD_RESPONSE_INVALID", "LEADERBOARD_CURSOR_INVALID",
  "LEADERBOARD_NOT_AVAILABLE", "LEADERBOARD_PRIVACY_UPDATE_FAILED", "LEADERBOARD_NETWORK_ERROR",
  "LEADERBOARD_BROWSER_COMPATIBILITY_ERROR", "CLIENT_RENDER_SUCCEEDED"
]);
const SAFE_TOKEN = /^[a-zA-Z0-9._-]{1,80}$/;

function createClientEvidenceService({ clock = () => new Date(), maximumRecords = 100 } = {}) {
  const records = [];
  function report(input = {}) {
    if (!CAPABILITIES.has(input.capability) || !STATUSES.has(input.status) || !CLASSIFICATIONS.has(input.classification)) return null;
    const record = {
      capability: input.capability,
      status: input.status,
      classification: input.classification,
      browserFamily: SAFE_TOKEN.test(input.browserFamily || "") ? input.browserFamily : "unknown",
      deviceCategory: ["mobile", "desktop", "tablet", "unknown"].includes(input.deviceCategory) ? input.deviceCategory : "unknown",
      checkedAt: clock().toISOString(),
      buildIdentifier: SAFE_TOKEN.test(input.buildIdentifier || "") ? input.buildIdentifier : null,
      assetToken: SAFE_TOKEN.test(input.assetToken || "") ? input.assetToken : null,
      stage: SAFE_TOKEN.test(input.stage || "") ? input.stage : null
    };
    records.push(record);
    if (records.length > maximumRecords) records.splice(0, records.length - maximumRecords);
    return { ...record };
  }
  function latest() {
    const result = {};
    for (const record of records) result[record.capability] = { ...record };
    return result;
  }
  return { report, latest, count: () => records.length };
}

module.exports = { createClientEvidenceService, CAPABILITIES, CLASSIFICATIONS };
