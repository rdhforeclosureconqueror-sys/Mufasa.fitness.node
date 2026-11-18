"use strict";
const crypto = require("node:crypto");
const {isDeepStrictEqual} = require("node:util");

// Internal, side-effect-free request for a separately governed QA review.
// This is not QA approval and does not authorize Economics, Learning or scaling.
function requestExperimentQaReview({manager, result, organizationId, workId, reviewerRole = "INDEPENDENT_QA"} = {}) {
  if (!manager || typeof manager.validateResult !== "function") throw new Error("experiment_manager_required");
  if (reviewerRole !== "INDEPENDENT_QA") throw new Error("independent_qa_role_required");
  const stored = manager.validateResult(result);
  if (manager.organizationId !== organizationId || stored.organizationId !== organizationId) throw new Error("qa_organization_scope_mismatch");
  if (stored.workId !== workId || !workId) throw new Error("qa_work_scope_mismatch");
  if (!stored.runRef || !stored.proposalRef || !Number.isSafeInteger(stored.proposalVersion) || !Array.isArray(stored.evidenceRefs) || !Array.isArray(stored.limitations)) throw new Error("qa_result_provenance_required");
  if (!isDeepStrictEqual(stored, result)) throw new Error("stored_experiment_result_required");
  const sourceDigest = crypto.createHash("sha256").update(JSON.stringify(stored)).digest("hex");
  return Object.freeze({
    kind: "ExperimentQaReviewRequest", schemaVersion: 1, status: "REVIEW_REQUIRED",
    organizationId, workId, reviewerRole, sourceResultId: stored.id,
    proposalRef: stored.proposalRef, proposalVersion: stored.proposalVersion,
    runRef: stored.runRef, resultClass: stored.resultClass, sourceDigest,
    evidenceRefs: Object.freeze([...stored.evidenceRefs]),
    limitations: Object.freeze([...stored.limitations, "Internal request only; QA acceptance and downstream authorization are not granted."]),
    qaApproved: false, economicVerified: false, learningPromoted: false, liveEnabled: false
  });
}
module.exports = {requestExperimentQaReview};
