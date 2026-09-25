"use strict";
const {createExperimentManager} = require("./manager");
const {createKernelApprovalAuthority, APPROVAL_ACTION} = require("./approval");
const {createConstitutionalKernel} = require("../kernel/kernel");
const {createRoleConfigurationRegistry} = require("../organization/roles");
const {createOrganizationalCoordinator} = require("../organization/coordinator");
const {buildExperimentProposal} = require("./proposal-reasoning");
const {createAnalystAssessment} = require("../analyst/assessment");
const verifiedIntegration = new WeakSet();
const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const scopeMatches = (allowed, actual) => allowed.includes(actual) || allowed.some(x => x.endsWith("*") && actual.startsWith(x.slice(0, -1)));

function createExperimentRuntimeInvoker({manager, kernel, clock = () => new Date()} = {}) {
  if (!manager || !kernel) throw new Error("experiment_runtime_dependencies_required");
  return async ({work, assignment, role, input = {}}) => {
    if (role.id !== "EXPERIMENT_MANAGER" || assignment.roleId !== role.id || assignment.roleVersion !== role.version) throw new Error("experiment_manager_role_required");
    if (!["DESIGN_EXPERIMENT", "INTERPRET_EXPERIMENT"].includes(work.missionType)) throw new Error("experiment_mission_invalid");
    if (work.organizationId !== manager.organizationId || assignment.organizationId !== work.organizationId || assignment.workId !== work.id || assignment.status !== "ACTIVE") throw new Error("experiment_assignment_scope_mismatch");
    const actor = kernel.repository.data.actors.get(assignment.actorRef);
    if (actor?.status !== "ACTIVE" || !work.authorityRefs?.length || !work.authorityRefs.every(ref => {
      const grant = kernel.repository.data.grants.get(ref);
      return grant && grant.subjectActorId === assignment.actorRef && grant.status === "ACTIVE" && !grant.revokedAt && (!grant.expiresAt || new Date(grant.expiresAt) > clock()) && scopeMatches(grant.actionScopes, "organization.assign") && scopeMatches(grant.resourceScopes, `organization:${work.organizationId}`);
    })) throw new Error("experiment_runtime_authority_required");
    let artifacts;
    if (work.missionType === "DESIGN_EXPERIMENT") {
      if (!input.assessment) throw new Error("analyst_assessment_required");
      if (!input.assessment.provenance?.inputArtifactRefs?.every(ref => work.inputArtifactRefs.includes(ref))) throw new Error("experiment_input_provenance_required");
      if (!Number.isFinite(work.budget?.maxCost) || !Number.isFinite(input.context?.costCeiling) || input.context.costCeiling > work.budget.maxCost) throw new Error("experiment_budget_exceeded");
      const built = buildExperimentProposal({manager, assessment: input.assessment, context: {...input.context, workId: work.id, requiredAuthorityRefs: work.authorityRefs, riskCeiling: work.riskBoundary, boundary: input.context.boundary || "INTERNAL"}, id: input.id || `proposal:${work.id}`, version: input.version || 1});
      const p = built.proposal;
      artifacts = [{id: `artifact:${p.id}:${p.version}`, artifactType: "ExperimentProposal", proposal: p, costCeiling: p.costCeiling, sourceEvidenceRefs: p.motivatingEvidenceRefs}];
    } else {
      const candidate = input.result || manager.getResult(input.runRef);
      const result = manager.validateResult(candidate);
      if (!work.inputArtifactRefs.includes(result.id) || !work.dependencyWorkRefs.includes(result.workId)) throw new Error("experiment_result_work_link_required");
      artifacts = [
        {id: `artifact:${result.id}`, artifactType: "ExperimentResult", result, sourceEvidenceRefs: [result.id, ...result.evidenceRefs]},
        {id: `artifact:interpretation:${result.id}`, artifactType: "ExperimentInterpretation", resultClass: result.resultClass, resultRef: result.id, proposalRef: result.proposalRef, proposalVersion: result.proposalVersion, sourceWorkRef: result.workId, runRef: result.runRef, limitations: result.limitations, sourceEvidenceRefs: [result.id, ...result.evidenceRefs]},
      ];
    }
    return {runRef: `experiment-manager:${work.id}`, artifacts: artifacts.map(artifact => ({...artifact, organizationId: work.organizationId, workId: work.id, producingRoleId: role.id, producingRoleVersion: role.version, producingActorRef: assignment.actorRef, provenance: {inputRefs: work.inputArtifactRefs, policyRef: "EXPERIMENT_MANAGER_POLICY_V1"}, status: "PROPOSED", version: 1, limitations: artifact.limitations || ["Internal architecture evidence only"], applicableScope: ["internal-experiment"], createdAt: clock().toISOString()}))};
  };
}

async function verifyExperimentManagerIntegration({clock = () => new Date("2035-01-01T00:00:00Z")} = {}) {
  let n = 0;
  const id = () => `experiment-integration:${++n}`, organizationId = "experiment-integration", actorId = "experiment-agent", grantRef = "grant:experiment";
  const kernel = createConstitutionalKernel({clock, id});
  kernel.registerActor({id: "issuer", type: "HUMAN", status: "ACTIVE"});
  kernel.registerActor({id: "owner", type: "HUMAN", status: "ACTIVE"});
  kernel.registerActor({id: actorId, type: "AI_AGENT", status: "ACTIVE"});
  kernel.issueGrant({id: grantRef, issuerActorId: "issuer", subjectActorId: actorId, actionScopes: ["organization.assign"], resourceScopes: [`organization:${organizationId}`], constraints: {}});
  kernel.issueGrant({id: "approval-grant", issuerActorId: "issuer", subjectActorId: "owner", actionScopes: [APPROVAL_ACTION], resourceScopes: [`organization:${organizationId}`], constraints: {budgetCeiling: 0}});
  kernel.addPolicy({id: "approval-policy", definitionId: "internal-approval", version: 1, rules: {[APPROVAL_ACTION]: {outcome: "ALLOW"}}});
  const session = Object.freeze({});
  const approvalAuthority = createKernelApprovalAuthority({kernel, policyVersionId: "approval-policy", authenticate: context => context === session ? {authenticated: true, actorId: "owner", authorityRef: "approval-grant", organizationId, evidenceRef: "fixture:synthetic-session"} : null});
  const roles = createRoleConfigurationRegistry({organizationId}); roles.registerDefaults();
  const manager = createExperimentManager({organizationId, clock, approvalAuthority});
  const coordinator = createOrganizationalCoordinator({organizationId, roleRegistry: roles, runtimeInvoker: createExperimentRuntimeInvoker({manager, kernel, clock}), kernel, clock, id});
  coordinator.objective({id: "objective:experiment", organizationId, objective: "Verify internal experiment lifecycle", successCriteria: ["attributable interpretation"], priority: "HIGH", scope: ["internal"], budget: {currency: "USD", maxCost: 0}, riskBoundary: "LOW", authorityRefs: [grantRef], evidenceRefs: ["analyst:fixture"], status: "ACTIVE"});
  const createWork = (workId, missionType, inputArtifactRefs, dependencyWorkRefs = []) => coordinator.createWork({id: workId, organizationId, objectiveRef: "objective:experiment", missionType, eligibleRoleIds: ["EXPERIMENT_MANAGER"], inputArtifactRefs, dependencyWorkRefs, authorityRefs: [grantRef], policyRefs: ["EXPERIMENT_MANAGER_POLICY_V1"], budget: {currency: "USD", maxCost: 0}, riskBoundary: "LOW", correlationId: "experiment", causationId: "objective:experiment", idempotencyKey: `create:${workId}`});
  const design = createWork("work:experiment", "DESIGN_EXPERIMENT", ["analyst:fixture"]);
  const assignment = coordinator.assign(design.id, {roleId: "EXPERIMENT_MANAGER", actorRef: actorId, authorityRefs: [grantRef]});
  const assessment = createAnalystAssessment({organizationId, candidateRef: "candidate:fixture", inputArtifactRefs: ["analyst:fixture"], evidence: [{classification: "VERIFIED_OUTCOME", evidenceRefs: ["evidence:fixture"]}], problemEvidence: 0.9, productFit: 0.9, readiness: 0.9, outcomeStrength: 0.9, confidence: 0.9, productReadiness: "OPERATIONAL"});
  const execution = await coordinator.execute(assignment.id, {assessment, context: {candidateRef: "candidate:fixture", question: "Will the bounded fixture complete?", hypothesis: "The bounded fixture completes.", variable: "fixture", successMetric: "completion", failureMetric: "rejection", audience: "synthetic_subjects", offer: "internal_fixture", channel: "academy", window: "one_run", capabilityReadiness: "OPERATIONAL", productReadiness: "OPERATIONAL", costCeiling: 0, minimumUsefulEvidence: 1, riskCeiling: "LOW", boundary: "INTERNAL", stopConditions: ["technical_failure"], requiredAuthorityRefs: [grantRef]}});
  const artifact = coordinator.getArtifact(execution.artifactRefs[0]);
  const approval = manager.approve({proposalId: artifact.proposal.id, proposalVersion: 1, budgetCeiling: 0}, session);
  const run = manager.start({proposalId: artifact.proposal.id, proposalVersion: 1, approvalRef: approval.id, budget: 0, boundary: "INTERNAL", idempotencyKey: "integration-run"});
  manager.measure({runRef: run.id, metric: "completion", value: 1, sampleRef: "sample:fixture", evidenceRefs: ["fixture:completion"]});
  const result = manager.complete({runRef: run.id, evidenceRefs: ["fixture:completion"]});
  const interpret = createWork("work:interpret", "INTERPRET_EXPERIMENT", [result.id], [design.id]);
  const interpretationAssignment = coordinator.assign(interpret.id, {roleId: "EXPERIMENT_MANAGER", actorRef: actorId, authorityRefs: [grantRef]});
  const interpreted = await coordinator.execute(interpretationAssignment.id, {result});
  const interpretation = coordinator.getArtifact(interpreted.artifactRefs[1]);
  if (execution.work.state !== "COMPLETED" || interpreted.work.state !== "COMPLETED" || interpretation.resultRef !== result.id || interpretation.resultClass !== result.resultClass) throw new Error("experiment_integration_verification_failed");
  const proof = freeze({kind: "ExperimentManagerIntegrationEvidence", version: "1.1.0", status: "PASS", sharedRuntime: true, coordinator: true, workRef: design.id, interpretationWorkRef: interpret.id, assignmentRef: assignment.id, grantRef, approvalRef: approval.id, runRef: run.id, resultRef: result.id, artifactRefs: [...execution.artifactRefs, ...interpreted.artifactRefs], eventTypes: coordinator.events().map(x => x.type), limitations: ["Executed synthetic lifecycle; no live campaign or real human acceptance."]});
  verifiedIntegration.add(proof);
  return proof;
}
const isVerifiedIntegrationEvidence = value => verifiedIntegration.has(value);
module.exports = {createExperimentRuntimeInvoker, verifyExperimentManagerIntegration, isVerifiedIntegrationEvidence};
