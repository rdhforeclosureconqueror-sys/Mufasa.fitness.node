"use strict";
const crypto = require("node:crypto");
const APPROVAL_SCOPE = "EXPERIMENT_RUN_INTERNAL";
const APPROVAL_ACTION = "experiment.approve.internal";
const proposalDigest = proposal => crypto.createHash("sha256").update(JSON.stringify(proposal)).digest("hex");

// authenticate resolves an authenticated server request/session, never body identity.
function createKernelApprovalAuthority({kernel, authenticate, policyVersionId} = {}) {
  if (!kernel || typeof authenticate !== "function" || !policyVersionId) throw new Error("approval_authority_dependencies_required");
  function authorize({actorId, authorityRef, proposal, budgetCeiling}) {
    const actor = kernel.repository.data.actors.get(actorId);
    const grant = kernel.repository.data.grants.get(authorityRef);
    if (actor?.type !== "HUMAN" || actor.status !== "ACTIVE") throw new Error("authenticated_human_required");
    if (!Number.isFinite(grant?.constraints?.budgetCeiling) || budgetCeiling > grant.constraints.budgetCeiling) throw new Error("approval_grant_budget_exceeded");
    const proof = kernel.authorize({actorId, grantId: authorityRef, policyVersionId,
      intentId: `experiment-approval:${crypto.randomUUID()}`,
      actionType: APPROVAL_ACTION, resourceScope: `organization:${proposal.organizationId}`,
      payload: {proposalRef: proposal.id, proposalVersion: proposal.version, proposalDigest: proposalDigest(proposal), budgetCeiling},
    });
    if (!proof.ok) throw new Error(`approval_authority_denied:${proof.code}`);
    return proof;
  }
  return Object.freeze({
    verify({context, proposal, budgetCeiling}) {
      const principal = authenticate(context);
      if (!principal || principal.then || principal.authenticated !== true || principal.organizationId !== proposal.organizationId || !principal.evidenceRef) throw new Error("authenticated_human_required");
      const proof = authorize({actorId: principal.actorId, authorityRef: principal.authorityRef, proposal, budgetCeiling});
      return {actorId: principal.actorId, actorType: "HUMAN", authorityRef: principal.authorityRef, scope: APPROVAL_SCOPE, decisionRef: proof.decision.id, evidenceRefs: [principal.evidenceRef, proof.decision.id]};
    },
    check(approval, proposal) {
      if (approval.scope !== APPROVAL_SCOPE || approval.proposalDigest !== proposalDigest(proposal)) throw new Error("approval_design_mismatch");
      authorize({actorId: approval.actorId, authorityRef: approval.authorityRef, proposal, budgetCeiling: approval.budgetCeiling});
      return true;
    },
  });
}
module.exports = {APPROVAL_SCOPE, APPROVAL_ACTION, proposalDigest, createKernelApprovalAuthority};
