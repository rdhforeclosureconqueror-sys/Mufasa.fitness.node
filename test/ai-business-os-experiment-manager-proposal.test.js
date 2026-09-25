"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Analyst = require("../src/business-os/analyst");
const Experiment = require("../src/business-os/experiment-manager");

const evidence = [{classification: "VERIFIED_OUTCOME", evidenceRefs: ["evidence:conversion"]}];
const assessmentInput = {organizationId: "org", candidateRef: "candidate:push-up", inputArtifactRefs: ["analyst:assessment"], evidence, problemEvidence: .9, productFit: .9, readiness: .9, outcomeStrength: .9, confidence: .9, productReadiness: "OPERATIONAL"};
const context = {candidateRef: "candidate:push-up", question: "Will former athletes complete the Push-Up Arena?", hypothesis: "A bounded competition will produce completed attempts.", variable: "competitive_push_up_message", successMetric: "challenge_completion", failureMetric: "challenge_rejection", audience: "former_athletes", offer: "60-second Push-Up Arena", channel: "internal_fixture", window: "seven_days", productReadiness: "OPERATIONAL", capabilityReadiness: "OPERATIONAL", costCeiling: 0, minimumUsefulEvidence: 1, riskCeiling: "LOW", boundary: "INTERNAL", stopConditions: ["budget_exhausted", "technical_failure"], requiredAuthorityRefs: ["grant:experiment"], diagnosticMetrics: ["challenge_start", "camera_permission"], evidencePlan: ["evidence:conversion"]};

function manager() { return Experiment.createExperimentManager({organizationId: "org", clock: () => new Date("2035-01-01T00:00:00Z")}); }
function assessment(overrides = {}) { return Analyst.createAnalystAssessment({...assessmentInput, ...overrides}); }

test("EM-1 builds a bounded proposal from an ADVANCE_TO_EXPERIMENT assessment", () => {
  const result = Experiment.buildExperimentProposal({manager: manager(), assessment: assessment(), context});
  assert.equal(result.status, "PROPOSAL_READY");
  assert.equal(result.proposal.workId, "analyst:assessment");
  assert.equal(result.proposal.audience, "former_athletes");
  assert.equal(result.proposal.offer, "60-second Push-Up Arena");
  assert.equal(result.proposal.assessmentRef, result.assessmentRef);
  assert.deepEqual(result.proposal.motivatingEvidenceRefs, ["evidence:conversion"]);
});

test("EM-1 rejects assessments that cannot authorize an experiment", () => {
  for (const overrides of [
    {unknowns: ["audience"]},
    {contradictions: ["source-a conflicts with source-b"]},
    {productReadiness: "PARTIAL"},
    {evidence: [{classification: "SYNTHETIC", evidenceRefs: ["fixture"]}]},
  ]) {
    const m = manager();
    assert.throws(() => Experiment.buildExperimentProposal({manager: m, assessment: assessment(overrides), context}), /analyst_disposition_blocks_experiment|product_readiness_blocks_experiment/);
  }
});

test("EM-1 rejects missing product context, identity mismatch, and unsupported capability", () => {
  const m = manager();
  assert.throws(() => Experiment.buildExperimentProposal({manager: m, assessment: assessment(), context: {...context, offer: ""}}), /experiment_context_required:offer/);
  assert.throws(() => Experiment.buildExperimentProposal({manager: m, assessment: assessment(), context: {...context, candidateRef: "candidate:other"}}), /candidate_scope_mismatch/);
  assert.throws(() => Experiment.buildExperimentProposal({manager: m, assessment: assessment(), context: {...context, capabilityReadiness: "PARTIAL"}}), /capability_readiness_blocks_experiment/);
});

test("EM-1 preserves assessment provenance and refuses rewritten history", () => {
  const m = manager();
  const forged = {...assessment(), historicalEvidenceRewritten: true};
  assert.throws(() => Experiment.buildExperimentProposal({manager: m, assessment: forged, context}), /analyst_historical_evidence_rewritten/);
  const noProvenance = {...assessment(), provenance: {policyRef: "ANALYST_REASONING_POLICY_V1", inputArtifactRefs: []}};
  assert.throws(() => Experiment.buildExperimentProposal({manager: m, assessment: noProvenance, context}), /analyst_provenance_required/);
});

test("EM-1 coordinator design requires the Analyst assessment path", async () => {
  const m = manager();
  const fake = {kind: "AnalystAssessment", organizationId: "org", id: "fake", candidateRef: "candidate:push-up", version: 1, evidenceRefs: ["evidence:conversion"], analysis: {score: 90, reasoning: ["supported"], openQuestions: []}, disposition: "ADVANCE_TO_EXPERIMENT", confidence: .9, limitations: [], provenance: {policyRef: "ANALYST_REASONING_POLICY_V1", inputArtifactRefs: ["analyst:assessment"]}, historicalEvidenceRewritten: false};
  await assert.rejects(async () => Experiment.createExperimentRuntimeInvoker({manager: m, kernel: {repository: {data: {actors: new Map(), grants: new Map()}}}})({work: {id: "work", organizationId: "org", missionType: "DESIGN_EXPERIMENT", authorityRefs: [], budget: {maxCost: 0}}, assignment: {roleId: "EXPERIMENT_MANAGER", roleVersion: 1, organizationId: "org", workId: "work", status: "ACTIVE", actorRef: "agent"}, role: {id: "EXPERIMENT_MANAGER", version: 1}, input: {assessment: fake, context}}), /experiment_runtime_authority_required/);
});

test("EM-1 rejects malformed assessment records before recording a proposal", () => {
  for (const patch of [
    {id: ""}, {candidateRef: ""}, {contractVersion: "unknown"},
    {confidence: 2}, {analysis: {score: 101, reasoning: ["ok"], openQuestions: []}},
    {analysis: {score: 90, reasoning: [null], openQuestions: []}},
    {analysis: {score: 90, reasoning: ["ok"]}},
    {historicalEvidenceRewritten: undefined}, {limitations: "not-a-list"},
    {provenance: {policyRef: "unknown", inputArtifactRefs: ["analyst:assessment"]}},
  ]) {
    const m = manager(), a = {...assessment(), ...patch};
    assert.throws(() => Experiment.buildExperimentProposal({manager: m, assessment: a, context}), /analyst_/);
    assert.equal(m.getProposal(`experiment-proposal:${a.id}`, 1), null);
  }
});

test("EM-1 rejects malformed optional context and empty evidence plans", () => {
  for (const patch of [
    {limitations: "text"}, {confounders: [null]}, {capabilityRefs: "capability"},
    {diagnosticMetrics: {}}, {evidencePlan: []},
    {failureMetric: " challenge_completion "},
  ]) {
    assert.throws(() => Experiment.buildExperimentProposal({manager: manager(), assessment: assessment(), context: {...context, ...patch}}),
      /experiment_context_invalid|experiment_evidence_plan_required|distinct_outcome_metrics_required/);
  }
});
