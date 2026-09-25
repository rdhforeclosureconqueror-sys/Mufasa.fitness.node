"use strict";
// Synthetic test setup only. Does not connect to an account or authenticate a user.
const {createConstitutionalKernel} = require("../kernel/kernel");
const {createExperimentManager} = require("./manager");
const {createKernelApprovalAuthority, APPROVAL_ACTION} = require("./approval");
function createExperimentFixture({proposal = {}, grant = {}} = {}) {
  let time = new Date("2035-01-01T00:00:00Z"), n = 0;
  const clock = () => new Date(time), organizationId = "academy-experiment";
  const kernel = createConstitutionalKernel({clock, id: () => `academy:${++n}`});
  for (const id of ["issuer", "owner"]) kernel.registerActor({id, type: "HUMAN", status: "ACTIVE"});
  kernel.registerActor({id: "agent", type: "AI_AGENT", status: "ACTIVE"});
  kernel.issueGrant({id: "approval-grant", issuerActorId: "issuer", subjectActorId: "owner", actionScopes: [APPROVAL_ACTION], resourceScopes: [`organization:${organizationId}`], constraints: {budgetCeiling: 10}, ...grant});
  kernel.addPolicy({id: "approval-policy", definitionId: "internal", version: 1, rules: {[APPROVAL_ACTION]: {outcome: "ALLOW"}}});
  const session = Object.freeze({});
  const authority = createKernelApprovalAuthority({kernel, policyVersionId: "approval-policy", authenticate: context => context === session ? {authenticated: true, actorId: "owner", authorityRef: "approval-grant", organizationId, evidenceRef: "fixture:authenticated-session"} : null});
  const manager = createExperimentManager({organizationId, clock, approvalAuthority: authority});
  const input = {id: "proposal", workId: "work", question: "Will the fixture complete?", hypothesis: "The fixture completes", variable: "fixture", successMetric: "conversion", failureMetric: "rejection", minimumUsefulEvidence: 1, costCeiling: 10, riskCeiling: "LOW", boundary: "INTERNAL", stopConditions: ["technical_failure", "budget_exhausted"], requiredAuthorityRefs: ["approval-grant"], motivatingEvidenceRefs: ["analyst:fixture"], ...proposal};
  const p = manager.propose(input);
  const approvalInput = {proposalId: p.id, proposalVersion: p.version, budgetCeiling: 5};
  const approve = extra => manager.approve({...approvalInput, ...extra}, session);
  function start(extra = {}) {
    const approval = approve();
    const request = {proposalId: p.id, proposalVersion: p.version, approvalRef: approval.id, budget: 5, boundary: p.boundary, idempotencyKey: "run", ...extra};
    return {approval, request, run: manager.start(request)};
  }
  function measure(run, extra = {}) { return manager.measure({runRef: run.id, metric: "conversion", value: 1, sampleRef: "sample:one", evidenceRefs: ["measurement:one"], ...extra}); }
  return {organizationId, kernel, manager, authority, session, input, p, approvalInput, approve, start, measure, clock, advance: ms => { time = new Date(+time + ms); }};
}
module.exports = {createExperimentFixture};
