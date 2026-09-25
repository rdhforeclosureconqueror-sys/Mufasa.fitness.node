"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const E = require("../src/business-os/experiment-manager");
const {createExperimentFixture} = require("../src/business-os/experiment-manager/academy-fixtures");
const {createRoleConfigurationRegistry} = require("../src/business-os/organization/roles");
const {createOrganizationalCoordinator} = require("../src/business-os/organization/coordinator");
const {createScenarioRegistry} = require("../src/business-os/academy/registry");
const {createAcademyRunner} = require("../src/business-os/academy/runner");
const {createAnalystAssessment} = require("../src/business-os/analyst/assessment");

function coordinatorFixture() {
  const f = createExperimentFixture(), roles = createRoleConfigurationRegistry({organizationId: f.organizationId});
  roles.registerDefaults();
  f.kernel.issueGrant({id: "role-grant", issuerActorId: "issuer", subjectActorId: "agent", actionScopes: ["organization.assign"], resourceScopes: [`organization:${f.organizationId}`], constraints: {}});
  const invoker = E.createExperimentRuntimeInvoker({manager: f.manager, kernel: f.kernel, clock: f.clock});
  const assessment = createAnalystAssessment({organizationId: f.organizationId, candidateRef: "candidate:fixture", inputArtifactRefs: ["analyst:fixture"], evidence: [{classification: "VERIFIED_OUTCOME", evidenceRefs: ["evidence:fixture"]}], problemEvidence: .9, productFit: .9, readiness: .9, outcomeStrength: .9, confidence: .9, productReadiness: "OPERATIONAL"});
  const context = {candidateRef: "candidate:fixture", question: "Will the fixture complete?", hypothesis: "The bounded fixture completes.", variable: "fixture", successMetric: "completion", failureMetric: "rejection", audience: "synthetic_subjects", offer: "internal_fixture", channel: "academy", window: "one_run", productReadiness: "OPERATIONAL", capabilityReadiness: "OPERATIONAL", costCeiling: 0, minimumUsefulEvidence: 1, riskCeiling: "LOW", boundary: "INTERNAL", stopConditions: ["technical_failure"], requiredAuthorityRefs: ["role-grant"]};
  let n = 0;
  const coordinator = createOrganizationalCoordinator({organizationId: f.organizationId, roleRegistry: roles, runtimeInvoker: invoker, kernel: f.kernel, clock: f.clock, id: () => `role:${++n}`});
  coordinator.objective({id: "objective", organizationId: f.organizationId, objective: "test", successCriteria: ["attribution"], priority: "HIGH", scope: ["internal"], budget: {currency: "USD", maxCost: 10}, riskBoundary: "LOW", authorityRefs: ["role-grant"], evidenceRefs: ["analyst:fixture"], status: "ACTIVE"});
  function work(id, extra = {}) { return coordinator.createWork({id, organizationId: f.organizationId, objectiveRef: "objective", missionType: "DESIGN_EXPERIMENT", eligibleRoleIds: ["EXPERIMENT_MANAGER"], inputArtifactRefs: ["analyst:fixture"], dependencyWorkRefs: [], authorityRefs: ["role-grant"], policyRefs: ["EXPERIMENT_MANAGER_POLICY_V1"], budget: {currency: "USD", maxCost: 10}, riskBoundary: "LOW", correlationId: id, causationId: "objective", idempotencyKey: id, ...extra}); }
  const assign = id => coordinator.assign(id, {roleId: "EXPERIMENT_MANAGER", actorRef: "agent", authorityRefs: ["role-grant"]});
  return {...f, roles, invoker, coordinator, work, assign, assessment, context};
}

test("shared role stays a configuration with live adapters unavailable", () => {
  const registry = createRoleConfigurationRegistry({organizationId: "org"}); registry.registerDefaults();
  const role = registry.get("EXPERIMENT_MANAGER");
  assert.equal(role.autonomyCeiling, "RECOMMEND");
  assert.throws(() => E.ExperimentRun({status: "INVALID"}), /invalid_run_status/);
  assert.deepEqual(role.allowedCapabilities, E.CAPABILITIES);
  assert.ok(!role.allowedTools.some(x => /CONTACT|PUBLISH|SPEND|TEST_A|SCALE/.test(x)));
});
test("canonical Academy executes all production scenarios", async t => {
  const report = await E.runExperimentManagerAcademy();
  assert.equal(report.results.length, E.scenarios.length);
  for (const result of report.results) await t.test(result.scenarioId, () => assert.equal(result.verdict, "PASS", JSON.stringify(result)));
  assert.equal(E.isVerifiedAcademyReport(report), true);
});
test("negative control detects a missing cumulative budget enforcement", async () => {
  const registry = E.registerExperimentScenarios(createScenarioRegistry()), executors = E.createExperimentExecutors();
  executors["experiment.cumulative-budget"] = async () => ({observations: [{id: "observation:cumulative-budget", type: "OBSERVED_FACT", source: "negative-control", value: {actual: null}, evidenceRefs: ["negative-control:bypass"]}]});
  const report = await createAcademyRunner({registry, executors}).run({scenarioIds: ["experiment.cumulative-budget"]});
  assert.equal(report.results[0].verdict, "FAIL");
  assert.equal(E.isVerifiedAcademyReport(report), false);
});
test("readiness rejects arbitrary PASS, cloned reports, partial coverage, and forged integration", async () => {
  const fake = E.experimentManagerReadiness({academyResults: [{verdict: "PASS"}], integrationEvidence: [{status: "PASS", sharedRuntime: true, coordinator: true}]});
  assert.equal(fake.internalCoreReady, false);
  const report = await E.runExperimentManagerAcademy(), proof = await E.verifyExperimentManagerIntegration();
  const real = E.experimentManagerReadiness({academyReport: report, integrationEvidence: [proof]});
  assert.equal(real.internalCoreReady, true);
  assert.equal(real.architectureReady, false);
  assert.equal(real.certified, false);
  assert.equal(real.liveEnabled, false);
  assert.equal(real.gates.EXPERIMENT_MANAGER_HUMAN_ACCEPTED, "HUMAN_TEST_REQUIRED");
  assert.equal(E.experimentManagerReadiness({academyReport: structuredClone(report), integrationEvidence: [proof]}).internalCoreReady, false);
  assert.equal(E.experimentManagerReadiness({academyReport: report, integrationEvidence: [structuredClone(proof)]}).internalCoreReady, false);
  assert.equal(E.isVerifiedAcademyReport({...report, results: report.results.slice(1)}), false);
  assert.throws(() => { report.results[0].verdict = "FAIL"; }, TypeError);
});
test("approval requires active human, scoped kernel grant, and bounded grant budget", () => {
  for (const grant of [
    {actionScopes: ["wrong.action"]}, {resourceScopes: ["organization:another"]},
    {expiresAt: "2034-01-01T00:00:00Z"}, {constraints: {budgetCeiling: 1}},
  ]) { const f = createExperimentFixture({grant}); assert.throws(() => f.approve(), /approval_authority_denied|approval_grant_budget/); }
  const f = createExperimentFixture();
  f.kernel.registerActor({id: "owner", type: "AI_AGENT", status: "ACTIVE"});
  assert.throws(() => f.approve(), /authenticated_human_required/);
  const g = createExperimentFixture();
  g.kernel.registerActor({id: "owner", type: "HUMAN", status: "INACTIVE"});
  assert.throws(() => g.approve(), /authenticated_human_required/);
});
test("approval is immutable, bound to a frozen version, and cannot set its own status", () => {
  const f = createExperimentFixture();
  const a = f.approve({id: "approval"});
  assert.throws(() => f.approve({id: a.id}), /approval_immutable/);
  assert.throws(() => f.manager.propose({...f.input, id: "bad-status", status: "APPROVED"}), /invalid_proposal_status/);
  assert.throws(() => f.manager.propose({...f.input, id: "bad-action", requestedAction: "RUN_INTERNAL"}), /proposal_action_mismatch/);
  f.manager.propose({...f.input, version: 2, hypothesis: "revised"});
  assert.equal(f.manager.getProposal(f.p.id, 1).hypothesis, f.input.hypothesis);
  assert.throws(() => f.manager.start({proposalId: f.p.id, proposalVersion: 2, approvalRef: a.id, budget: 1, boundary: "INTERNAL", idempotencyKey: "wrong-version"}), /approved_matching_authority_required/);
  assert.throws(() => f.manager.propose({...f.input, version: 4}), /prior_proposal_version/);
  assert.throws(() => f.manager.propose({...f.input, version: 1.5}), /invalid_proposal_version/);
});
test("second approval cannot bypass the total proposal budget", () => {
  const f = createExperimentFixture(), a = f.approve({budgetCeiling: 10, id: "a"});
  const request = {proposalId: f.p.id, proposalVersion: 1, approvalRef: a.id, budget: 6, boundary: "INTERNAL", idempotencyKey: "a"};
  f.manager.start(request);
  const b = f.approve({id: "b", budgetCeiling: 5});
  assert.throws(() => f.manager.start({...request, approvalRef: b.id, budget: 5, idempotencyKey: "b"}), /cumulative_budget/);
});
test("retries cannot switch approvals and stopped reservations stay allocated", () => {
  const f = createExperimentFixture(), {run, request} = f.start();
  const b = f.approve({id: "second"});
  assert.throws(() => f.manager.start({...request, approvalRef: b.id}), /idempotency_conflict/);
  assert.throws(() => f.manager.start({...request, requestedAction: "DESIGN"}), /run_action_mismatch/);
  f.manager.stop({runRef: run.id, reason: "stop", evidenceRefs: ["operator"]});
  assert.throws(() => f.manager.start({...request, idempotencyKey: "next"}), /cumulative_budget/);
  assert.equal(f.manager.start(request).status, "STOPPED");
});
test("currency arithmetic enforces the ceiling at cent precision", () => {
  const f = createExperimentFixture({proposal: {costCeiling: 0.3}}), a = f.approve({budgetCeiling: 0.3});
  const request = {proposalId: f.p.id, proposalVersion: 1, approvalRef: a.id, budget: 0.1, boundary: "INTERNAL", idempotencyKey: "one"};
  f.manager.start(request);
  f.manager.start({...request, budget: 0.2, idempotencyKey: "two"});
  assert.throws(() => f.manager.start({...request, budget: 0.01, idempotencyKey: "three"}), /cumulative_budget/);
  assert.throws(() => f.manager.start({...request, budget: NaN}), /budget_exceeded/);
  assert.throws(() => f.manager.start({...request, budget: 0.001}), /budget_exceeded/);
});
test("pause/resume and terminal states preserve an auditable history", () => {
  const f = createExperimentFixture(), {run} = f.start(), args = {runRef: run.id, reason: "QA review", evidenceRefs: ["qa:review"]};
  f.manager.pause(args);
  assert.throws(() => f.measure(run), /running_experiment/);
  assert.throws(() => f.manager.complete({runRef: run.id}), /completable_experiment/);
  assert.equal(f.manager.resume(args).status, "RUNNING");
  assert.throws(() => f.manager.resume(args), /invalid_experiment_transition/);
  assert.throws(() => f.manager.triggerStop({runRef: run.id, condition: "undeclared", evidenceRefs: ["qa"]}), /undeclared_stop_condition/);
  f.manager.cancel(args);
  assert.deepEqual(f.manager.getRun(run.id).history.map(h => h.to), ["RUNNING", "PAUSED", "RUNNING", "CANCELLED"]);
  assert.throws(() => f.manager.resume(args), /invalid_experiment_transition/);
  f.manager.complete({runRef: run.id});
  assert.throws(() => f.manager.complete({runRef: run.id}), /already_recorded/);
});
test("present observations require distinct samples, provenance and a valid window", () => {
  const f = createExperimentFixture(), {run} = f.start();
  assert.throws(() => f.measure(run, {evidenceRefs: [""]}), /measurement_evidence_invalid/);
  assert.throws(() => f.measure(run, {sampleRef: ""}), /measurement_evidence_and_sample/);
  assert.throws(() => f.measure(run, {observedAt: "2035-01-02T00:00:00Z"}), /window_invalid/);
  assert.throws(() => f.measure(run, {metric: "clicks"}), /declared_outcome_metric/);
  f.measure(run, {id: "measurement"});
  assert.throws(() => f.measure(run, {id: "measurement", sampleRef: "new-sample"}), /measurement_immutable/);
});
test("supported and unsupported require enough evidence; zero does not imply failure", () => {
  for (const [metric, expected] of [["conversion", "SUPPORTED"], ["rejection", "NOT_SUPPORTED"]]) {
    const f = createExperimentFixture({proposal: {minimumUsefulEvidence: 2}}), {run} = f.start();
    f.measure(run, {metric}); f.measure(run, {metric, sampleRef: "sample:two", evidenceRefs: ["measurement:two"]});
    const result = f.manager.complete({runRef: run.id, evidenceRefs: ["measurement:one", "measurement:two"]});
    assert.equal(result.resultClass, expected);
    assert.equal(result.workId, f.p.workId);
    assert.equal(result.contractVersion, "ai-business-os.organization/1.0.0");
  }
  const f = createExperimentFixture(), {run} = f.start(); f.measure(run, {value: 0});
  assert.equal(f.manager.complete({runRef: run.id, evidenceRefs: ["measurement:one"]}).resultClass, "INCONCLUSIVE");
});
test("policy blocks and technical failures require evidence and cannot become success", () => {
  for (const [flag, expected] of [["policyBlocked", "POLICY_BLOCKED"], ["technicalFailure", "TECHNICAL_FAILURE"]]) {
    const f = createExperimentFixture(), {run} = f.start(); f.measure(run);
    assert.throws(() => f.manager.complete({runRef: run.id, [flag]: true}), /failure_evidence_required/);
    assert.equal(f.manager.complete({runRef: run.id, [flag]: true, evidenceRefs: ["failure:log"]}).resultClass, expected);
  }
});
test("coordinator rejects missing authority, wrong mission, and forged attribution", async () => {
  const f = coordinatorFixture();
  f.work("missing");
  assert.throws(() => f.coordinator.assign("missing", {roleId: "EXPERIMENT_MANAGER", actorRef: "agent", authorityRefs: []}), /authority_missing/);
  const w = f.work("wrong-mission", {missionType: "PUBLISH"});
  assert.throws(() => f.assign(w.id), /mission_incompatible/);
  const work = f.work("valid"), assignment = f.assign(work.id), role = f.roles.get("EXPERIMENT_MANAGER");
  await assert.rejects(f.invoker({work, assignment: {...assignment, actorRef: "forged"}, role, input: f.input}), /runtime_authority_required/);
  await assert.rejects(f.invoker({work: {...work, missionType: "PUBLISH"}, assignment, role, input: f.input}), /mission_invalid/);
  await assert.rejects(f.invoker({work: {...work, organizationId: "other"}, assignment, role, input: f.input}), /assignment_scope/);
});
test("coordinator execution rejects over-budget design before recording it", async () => {
  const f = coordinatorFixture(), work = f.work("over-budget"), assignment = f.assign(work.id);
  await assert.rejects(f.coordinator.execute(assignment.id, {assessment: f.assessment, context: {...f.context, costCeiling: 11}}), /budget_exceeded/);
  assert.equal(f.manager.getProposal("oversized", 1), null);
  assert.equal(f.coordinator.getWork(work.id).state, "FAILED");
});
test("coordinator rechecks grant revocation at execution", async () => {
  const f = coordinatorFixture(), work = f.work("revoked"), assignment = f.assign(work.id);
  f.kernel.revokeGrant("role-grant", "issuer");
  await assert.rejects(f.coordinator.execute(assignment.id, {assessment: f.assessment, context: f.context}), /runtime_authority_required/);
});
test("interpretation rejects unrecorded results and unrelated work", async () => {
  const f = coordinatorFixture(), work = f.work("interpret", {missionType: "INTERPRET_EXPERIMENT", inputArtifactRefs: ["unrelated"]}), assignment = f.assign(work.id);
  await assert.rejects(f.coordinator.execute(assignment.id, {result: {kind: "ExperimentResult", runRef: "forged"}}), /stored_experiment_result_required/);
  const {run} = f.start(), result = f.manager.complete({runRef: run.id});
  await assert.rejects(f.invoker({work, assignment, role: f.roles.get("EXPERIMENT_MANAGER"), input: {result}}), /result_work_link_required/);
});
test("coordinator verifies design and interpretation with canonical result output", async () => {
  const proof = await E.verifyExperimentManagerIntegration();
  assert.equal(proof.artifactRefs.length, 3);
  assert.ok(proof.resultRef && proof.runRef && proof.approvalRef && proof.interpretationWorkRef);
  assert.equal(proof.eventTypes.filter(x => x === "WORK_COMPLETED").length, 2);
});
