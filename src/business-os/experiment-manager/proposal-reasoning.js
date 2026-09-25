"use strict";
const {DISPOSITIONS} = require("../analyst/contracts");

const refs = value => Array.isArray(value) && value.length > 0 && value.every(x => typeof x === "string" && x.trim());
const text = value => typeof value === "string" && value.trim().length > 0;
const list = value => Array.isArray(value) && value.every(text);

function validateAnalystAssessment({assessment, organizationId} = {}) {
  if (!assessment || assessment.kind !== "AnalystAssessment") throw new Error("analyst_assessment_required");
  if (assessment.organizationId !== organizationId) throw new Error("analyst_assessment_scope_mismatch");
  if (!Number.isSafeInteger(assessment.version) || assessment.version < 1) throw new Error("analyst_assessment_version_invalid");
  if (!DISPOSITIONS.includes(assessment.disposition)) throw new Error("analyst_disposition_invalid");
  if (assessment.disposition !== "ADVANCE_TO_EXPERIMENT") throw new Error(`analyst_disposition_blocks_experiment:${assessment.disposition}`);
  if (!refs(assessment.evidenceRefs)) throw new Error("analyst_evidence_required");
  if (!assessment.analysis || !Number.isFinite(assessment.analysis.score) || assessment.analysis.score < 55) throw new Error("analyst_strength_insufficient");
  if (!Array.isArray(assessment.analysis.reasoning) || !assessment.analysis.reasoning.length) throw new Error("analyst_reasoning_required");
  if (Array.isArray(assessment.analysis.openQuestions) && assessment.analysis.openQuestions.length) throw new Error("analyst_open_questions_require_evidence");
  if (!Number.isFinite(assessment.confidence) || assessment.confidence < 0.55) throw new Error("analyst_confidence_insufficient");
  if (assessment.historicalEvidenceRewritten === true) throw new Error("analyst_historical_evidence_rewritten");
  if (!assessment.provenance || !text(assessment.provenance.policyRef) || !refs(assessment.provenance.inputArtifactRefs)) throw new Error("analyst_provenance_required");
  return assessment;
}

function requireContext(context = {}) {
  const required = ["candidateRef", "question", "hypothesis", "variable", "successMetric", "failureMetric", "audience", "offer", "channel", "window", "riskCeiling", "boundary"];
  for (const field of required) if (!text(context[field])) throw new Error(`experiment_context_required:${field}`);
  if (context.successMetric === context.failureMetric) throw new Error("distinct_outcome_metrics_required");
  if (!Number.isFinite(context.costCeiling) || context.costCeiling < 0) throw new Error("experiment_cost_required");
  if (!Number.isSafeInteger(context.minimumUsefulEvidence) || context.minimumUsefulEvidence < 1) throw new Error("minimum_useful_evidence_required");
  if (!list(context.stopConditions) || !context.stopConditions.length) throw new Error("experiment_stop_conditions_required");
  if (!list(context.requiredAuthorityRefs) || !context.requiredAuthorityRefs.length) throw new Error("experiment_authority_refs_required");
  if (context.productReadiness !== "OPERATIONAL") throw new Error("product_readiness_blocks_experiment");
  if (context.capabilityReadiness !== "OPERATIONAL") throw new Error("capability_readiness_blocks_experiment");
  if (context.assessmentCandidateRef && context.assessmentCandidateRef !== context.candidateRef) throw new Error("candidate_scope_mismatch");
  return context;
}

function buildExperimentProposal({manager, assessment, context = {}, id, version = 1} = {}) {
  if (!manager || typeof manager.propose !== "function") throw new Error("experiment_manager_required");
  const checkedAssessment = validateAnalystAssessment({assessment, organizationId: manager.organizationId});
  const checkedContext = requireContext(context);
  if (checkedAssessment.candidateRef !== checkedContext.candidateRef) throw new Error("candidate_scope_mismatch");
  const proposal = manager.propose({
    id: id || `experiment-proposal:${checkedAssessment.id}`,
    version,
    organizationId: manager.organizationId,
    workId: checkedContext.workId || checkedAssessment.provenance.inputArtifactRefs[0],
    question: checkedContext.question,
    hypothesis: checkedContext.hypothesis,
    motivatingEvidenceRefs: checkedAssessment.evidenceRefs,
    variable: checkedContext.variable,
    successMetric: checkedContext.successMetric,
    failureMetric: checkedContext.failureMetric,
    minimumUsefulEvidence: checkedContext.minimumUsefulEvidence,
    costCeiling: checkedContext.costCeiling,
    riskCeiling: checkedContext.riskCeiling,
    boundary: checkedContext.boundary,
    stopConditions: checkedContext.stopConditions,
    requiredAuthorityRefs: checkedContext.requiredAuthorityRefs,
    confounders: checkedContext.confounders || [],
    limitations: [...(checkedAssessment.limitations || []), ...(checkedContext.limitations || []), "Proposal is bounded by Analyst evidence and does not prove demand or profitability."],
    expectedInformationGain: checkedContext.expectedInformationGain || "BOUNDED",
    audience: checkedContext.audience,
    offer: checkedContext.offer,
    channel: checkedContext.channel,
    window: checkedContext.window,
    diagnosticMetrics: checkedContext.diagnosticMetrics || [],
    capabilityRefs: checkedContext.capabilityRefs || [],
    assessmentRef: checkedAssessment.id,
    assessmentVersion: checkedAssessment.version,
    assessmentDisposition: checkedAssessment.disposition,
    assessmentScore: checkedAssessment.analysis.score,
    assessmentConfidence: checkedAssessment.confidence,
    evidencePlan: checkedContext.evidencePlan || checkedAssessment.evidenceRefs,
  });
  return Object.freeze({status: "PROPOSAL_READY", assessmentRef: checkedAssessment.id, assessmentVersion: checkedAssessment.version, proposal});
}

module.exports = {validateAnalystAssessment, buildExperimentProposal};
