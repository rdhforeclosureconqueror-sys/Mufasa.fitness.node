"use strict";
const {isVerifiedAcademyReport} = require("./academy");
const {isVerifiedIntegrationEvidence} = require("./integration");
// Readiness consumes evidence issued by executions in this process. JSON imports
// are untrusted until a separately authenticated durable evidence store exists.
function experimentManagerReadiness({academyReport, integrationEvidence = []} = {}) {
  const academy = isVerifiedAcademyReport(academyReport);
  const integration = Array.isArray(integrationEvidence) && integrationEvidence.some(isVerifiedIntegrationEvidence);
  return Object.freeze({
    gates: Object.freeze({EXPERIMENT_MANAGER_INTERNAL_CORE_VERIFIED: academy ? "PASS" : "INCOMPLETE", EXPERIMENT_MANAGER_INTERNAL_INTEGRATION_VERIFIED: integration ? "PASS" : "INCOMPLETE", EXPERIMENT_MANAGER_ARCHITECTURE_READY: "INCOMPLETE", EXPERIMENT_MANAGER_LIVE_ENABLED: "BLOCKED", EXPERIMENT_MANAGER_HUMAN_ACCEPTED: "HUMAN_TEST_REQUIRED"}),
    internalCoreReady: academy && integration, architectureReady: false, certified: false, liveEnabled: false,
    limitations: Object.freeze(["Academy is synthetic architecture evidence only.", "Full E0-E8 contract remains partial: Analyst-driven design and department handoffs need implementation.", "State is in memory; durable storage and application authentication wiring are required before operational use.", "Human acceptance, live outcome evidence, and economic review remain pending."]),
  });
}
module.exports = {experimentManagerReadiness};
