"use strict";
const {createScenarioRegistry} = require("../academy/registry");
const {createAcademyRunner} = require("../academy/runner");
const {createExperimentFixture} = require("./academy-fixtures");
const {createExperimentManager} = require("./manager");
const {createAnalystAssessment} = require("../analyst/assessment");
const {buildExperimentProposal} = require("./proposal-reasoning");
const {verifyExperimentManagerIntegration, isVerifiedIntegrationEvidence} = require("./integration");
const {PROHIBITED_ACTIONS} = require("./policy");
const verifiedReports = new WeakSet();
const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const rejected = fn => { try { fn(); return null; } catch (error) { return error.message; } };
const cases = [
  ["analyst-to-proposal", "PROPOSAL_READY", () => { const f = createExperimentFixture(); const assessment = createAnalystAssessment({organizationId: f.organizationId, candidateRef: "candidate:fixture", inputArtifactRefs: ["analyst:fixture"], evidence: [{classification: "VERIFIED_OUTCOME", evidenceRefs: ["evidence:fixture"]}], problemEvidence: .9, productFit: .9, readiness: .9, outcomeStrength: .9, confidence: .9, productReadiness: "OPERATIONAL"}); return buildExperimentProposal({manager: f.manager, assessment, context: {candidateRef: "candidate:fixture", question: "Will the fixture complete?", hypothesis: "The fixture completes.", variable: "fixture", successMetric: "completion", failureMetric: "rejection", audience: "synthetic_subjects", offer: "internal_fixture", channel: "academy", window: "one_run", productReadiness: "OPERATIONAL", capabilityReadiness: "OPERATIONAL", costCeiling: 0, minimumUsefulEvidence: 1, riskCeiling: "LOW", boundary: "INTERNAL", stopConditions: ["technical_failure"], requiredAuthorityRefs: ["grant:experiment"]}}).status; }],
  ["bounded-proposal", "REVIEW_REQUIRED", () => createExperimentFixture().p.status],
  ["missing-evidence", "proposal_evidence_required:motivatingEvidenceRefs", () => rejected(() => createExperimentFixture({proposal: {motivatingEvidenceRefs: []}}))],
  ["missing-hypothesis", "proposal_field_required:hypothesis", () => rejected(() => createExperimentFixture({proposal: {hypothesis: ""}}))],
  ["no-verifier", "human_approval_verifier_unavailable", () => { const f = createExperimentFixture(), m = createExperimentManager({organizationId: f.organizationId}); m.propose(f.input); return rejected(() => m.approve(f.approvalInput)); }],
  ["forged-identity", "approval_identity_is_server_owned", () => { const f = createExperimentFixture(); return rejected(() => f.manager.approve({...f.approvalInput, actorType: "HUMAN", actorId: "owner", authorityRef: "approval-grant"})); }],
  ["forged-session", "authenticated_human_required", () => { const f = createExperimentFixture(); return rejected(() => f.manager.approve(f.approvalInput, {authenticated: true, actorId: "owner"})); }],
  ["revoked-authority", "approval_authority_denied:REVOKED_AUTHORITY", () => { const f = createExperimentFixture(), {request} = f.start(); f.kernel.revokeGrant("approval-grant", "issuer"); return rejected(() => f.manager.start(request)); }],
  ["budget-overflow", "experiment_budget_exceeded", () => { const f = createExperimentFixture(), {request} = f.start(); return rejected(() => f.manager.start({...request, budget: 6})); }],
  ["cumulative-budget", "experiment_cumulative_budget_exceeded", () => { const f = createExperimentFixture(), {request} = f.start({budget: 3}); return rejected(() => f.manager.start({...request, idempotencyKey: "second"})); }],
  ["changed-replay", "run_idempotency_conflict", () => { const f = createExperimentFixture(), {request} = f.start(); return rejected(() => f.manager.start({...request, budget: 4})); }],
  ["identical-replay", true, () => { const f = createExperimentFixture(), {request, run} = f.start(), replay = f.manager.start(request); return replay.id === run.id && replay.replayed; }],
  ["boundary-mismatch", "run_boundary_mismatch", () => { const f = createExperimentFixture(), {request} = f.start(); return rejected(() => f.manager.start({...request, boundary: "ACADEMY"})); }],
  ["immutable-design", true, () => { const f = createExperimentFixture(); f.approve(); f.p.hypothesis = "tampered"; return f.manager.getProposal(f.p.id, 1).hypothesis === f.input.hypothesis && rejected(() => f.manager.propose(f.input)) === "proposal_version_immutable"; }],
  ["missing-versus-zero", true, () => { const f = createExperimentFixture(), {run} = f.start(), missing = f.measure(run, {value: null}), zero = f.measure(run, {value: 0}); return missing.presence === "MISSING" && !("value" in missing) && zero.presence === "PRESENT" && zero.value === 0; }],
  ["duplicate-sample", "duplicate_measurement_sample", () => { const f = createExperimentFixture(), {run} = f.start(); f.measure(run); return rejected(() => f.measure(run)); }],
  ["stale-measurement", "measurement_window_invalid", () => { const f = createExperimentFixture(), {run} = f.start(); return rejected(() => f.measure(run, {observedAt: "2034-12-31T00:00:00Z"})); }],
  ["insufficient-evidence", "INCONCLUSIVE", () => { const f = createExperimentFixture({proposal: {minimumUsefulEvidence: 2}}), {run} = f.start(); f.measure(run); return f.manager.complete({runRef: run.id, evidenceRefs: ["measurement:one"]}).resultClass; }],
  ["false-success", "result_measurement_evidence_required", () => { const f = createExperimentFixture(), {run} = f.start(); f.measure(run); return rejected(() => f.manager.complete({runRef: run.id, evidenceRefs: ["unrelated"]})); }],
  ["technical-failure", "TECHNICAL_FAILURE", () => { const f = createExperimentFixture(), {run} = f.start(); f.measure(run, {metric: "rejection"}); return f.manager.complete({runRef: run.id, technicalFailure: true, evidenceRefs: ["failure:log"]}).resultClass; }],
  ["contradictory-results", "INCONCLUSIVE", () => { const f = createExperimentFixture(), {run} = f.start(); f.measure(run); f.measure(run, {metric: "rejection"}); return f.manager.complete({runRef: run.id}).resultClass; }],
  ["stop-condition", "INCONCLUSIVE", () => { const f = createExperimentFixture(), {run} = f.start(); f.measure(run); f.manager.triggerStop({runRef: run.id, condition: "technical_failure", evidenceRefs: ["failure:log"]}); return f.manager.complete({runRef: run.id}).resultClass; }],
  ["pause-revoked-resume", "approval_authority_denied:REVOKED_AUTHORITY", () => { const f = createExperimentFixture(), {run} = f.start(); f.manager.pause({runRef: run.id, reason: "inspect", evidenceRefs: ["qa:review"]}); f.kernel.revokeGrant("approval-grant", "issuer"); return rejected(() => f.manager.resume({runRef: run.id, reason: "continue", evidenceRefs: ["qa:review"]})); }],
  ["cancelled-result", "INCONCLUSIVE", () => { const f = createExperimentFixture(), {run} = f.start(); f.measure(run); f.manager.cancel({runRef: run.id, reason: "cancel", evidenceRefs: ["operator:request"]}); return f.manager.complete({runRef: run.id}).resultClass; }],
  ["forged-result", "stored_experiment_result_required", () => { const f = createExperimentFixture(), {run} = f.start(), result = f.manager.complete({runRef: run.id}); return rejected(() => f.manager.validateResult({...result, resultClass: "SUPPORTED"})); }],
  ["work-scope", "result_work_scope_mismatch", () => { const f = createExperimentFixture(), {run} = f.start(); return rejected(() => f.manager.complete({runRef: run.id, workId: "another-work"})); }],
  ["reserved-live-actions", true, () => PROHIBITED_ACTIONS.every(requestedAction => rejected(() => createExperimentFixture({proposal: {requestedAction}})) === `experiment_action_unavailable:${requestedAction}`)],
  ["governed-integration", true, async () => isVerifiedIntegrationEvidence(await verifyExperimentManagerIntegration())],
];
const scenarios = freeze(cases.map(([name, expected]) => ({
  id: `experiment.${name}`, version: "1.1.0", purpose: `Verify ${name}`, level: name === "governed-integration" ? "INTEGRATED" : "ADVERSARIAL", mode: "DETERMINISTIC", components: ["EXPERIMENT_MANAGER"],
  executorRef: `experiment.${name}`, fixture: {id: `fixture:${name}`, organizationId: "academy-experiment", actors: [{id: "owner", type: "HUMAN"}], configurationRefs: ["experiment-manager/1.1.0"], inputEvidence: [`fixture:${name}`]},
  expectedInvariants: [`${name} behavior is enforced by production code`], humanRequiredCriteria: [],
  assertions: [{id: `assert:${name}`, observationRef: `observation:${name}`, observationPath: "actual", operator: "EQUALS", expected, invariant: `${name} behavior is enforced by production code`}],
  limitations: ["Synthetic architecture evidence; no human or live certification."],
})));
function registerExperimentScenarios(registry) { for (const scenario of scenarios) registry.register(scenario); return registry; }
function createExperimentExecutors() {
  return Object.fromEntries(cases.map(([name, , execute]) => [`experiment.${name}`, async () => ({
    observations: [{id: `observation:${name}`, type: "OBSERVED_FACT", source: "experiment-manager-production-execution", value: {actual: await execute()}, evidenceRefs: [`execution:experiment.${name}`]}], executionEvidenceRefs: [`execution:experiment.${name}`],
  })]));
}
async function runExperimentManagerAcademy() {
  const registry = registerExperimentScenarios(createScenarioRegistry());
  const runner = createAcademyRunner({registry, executors: createExperimentExecutors(), brainVersion: "experiment-manager/1.1.0"});
  const report = freeze(await runner.run());
  verifiedReports.add(report);
  return report;
}
function isVerifiedAcademyReport(report) {
  return verifiedReports.has(report) && report.results.length === scenarios.length && scenarios.every(s => report.results.filter(r => r.scenarioId === s.id && r.scenarioVersion === s.version && r.verdict === "PASS" && r.assertions.length > 0 && r.assertions.every(a => a.status === "PASS") && r.observations.every(o => o.evidenceRefs.length)).length === 1);
}
module.exports = {scenarios, registerExperimentScenarios, createExperimentExecutors, runExperimentManagerAcademy, isVerifiedAcademyReport};
