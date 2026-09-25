"use strict";
const crypto = require("node:crypto");
const {isDeepStrictEqual} = require("node:util");
const C = require("./contracts");
const {assertSafeBoundary} = require("./policy");
const {APPROVAL_SCOPE, proposalDigest} = require("./approval");
const clone = value => structuredClone(value);
const hash = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const refs = values => Array.isArray(values) && values.every(x => typeof x === "string" && x.trim());
const money = value => Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-7;
const cents = value => Math.round(value * 100);

function createExperimentManager({organizationId, clock = () => new Date(), approvalAuthority} = {}) {
  if (!organizationId) throw new Error("organization_required");
  const proposals = new Map(), approvals = new Map(), runs = new Map(), runKeys = new Map(), measurements = new Map(), results = new Map();
  const now = () => clock().toISOString();
  function getProposal(id, version) {
    const p = proposals.get(`${id}@${version}`);
    if (!p) throw new Error("proposal_not_found");
    return p;
  }
  function propose(v = {}) {
    assertSafeBoundary(v.requestedAction || "DESIGN", v.boundary);
    if (v.requestedAction && v.requestedAction !== "DESIGN") throw new Error("proposal_action_mismatch");
    if (v.organizationId && v.organizationId !== organizationId) throw new Error("proposal_scope_mismatch");
    if (v.kind && v.kind !== "ExperimentProposal") throw new Error("invalid_proposal_kind");
    if (v.status && v.status !== "REVIEW_REQUIRED") throw new Error("invalid_proposal_status");
    if (!money(v.costCeiling)) throw new Error("valid_cost_ceiling_required");
    if (!Number.isSafeInteger(v.minimumUsefulEvidence) || v.minimumUsefulEvidence < 1) throw new Error("minimum_useful_evidence_required");
    for (const field of ["id", "workId", "question", "hypothesis", "variable", "successMetric", "failureMetric", "riskCeiling"]) {
      if (typeof v[field] !== "string" || !v[field].trim()) throw new Error(`proposal_field_required:${field}`);
    }
    if (v.successMetric === v.failureMetric) throw new Error("distinct_outcome_metrics_required");
    for (const field of ["motivatingEvidenceRefs", "requiredAuthorityRefs", "stopConditions"]) {
      if (!refs(v[field]) || !v[field].length) throw new Error(`proposal_evidence_required:${field}`);
    }
    const version = v.version ?? 1, key = `${v.id}@${version}`;
    if (!Number.isSafeInteger(version) || version < 1) throw new Error("invalid_proposal_version");
    if (proposals.has(key)) throw new Error("proposal_version_immutable");
    if (version > 1 && !proposals.has(`${v.id}@${version - 1}`)) throw new Error("prior_proposal_version_required");
    const p = C.ExperimentProposal({...v, organizationId, version, status: "REVIEW_REQUIRED", confounders: v.confounders || [], limitations: v.limitations || [], expectedInformationGain: v.expectedInformationGain || "UNKNOWN", createdAt: now()});
    proposals.set(key, p);
    return clone(p);
  }
  function approve({proposalId, proposalVersion, budgetCeiling, id, ...untrusted} = {}, context) {
    const p = getProposal(proposalId, proposalVersion);
    if (Object.keys(untrusted).length) throw new Error("approval_identity_is_server_owned");
    if (!money(budgetCeiling) || cents(budgetCeiling) > cents(p.costCeiling)) throw new Error("approval_budget_exceeds_proposal");
    if (typeof approvalAuthority?.verify !== "function" || typeof approvalAuthority?.check !== "function") throw new Error("human_approval_verifier_unavailable");
    const proof = approvalAuthority.verify({context, proposal: clone(p), budgetCeiling});
    if (!proof || proof.then || proof.actorType !== "HUMAN" || !proof.actorId || !proof.authorityRef || proof.scope !== APPROVAL_SCOPE || !proof.decisionRef || !refs(proof.evidenceRefs) || !proof.evidenceRefs.length) throw new Error("human_approval_verification_failed");
    const digest = proposalDigest(p);
    const approvalId = id || `experiment-approval:${hash({digest, actorId: proof.actorId, authorityRef: proof.authorityRef, budgetCeiling})}`;
    if (approvals.has(approvalId)) throw new Error("approval_immutable");
    const a = C.ExperimentApproval({...proof, id: approvalId, organizationId, proposalRef: p.id, proposalVersion: p.version, proposalDigest: digest, budgetCeiling, status: "APPROVED", approvedAt: now()});
    approvals.set(a.id, a);
    return clone(a);
  }
  function authorized(proposalId, proposalVersion, approvalRef) {
    const p = getProposal(proposalId, proposalVersion), a = approvals.get(approvalRef);
    if (!a || a.status !== "APPROVED" || a.proposalRef !== proposalId || a.proposalVersion !== proposalVersion) throw new Error("approved_matching_authority_required");
    if (approvalAuthority?.check(clone(a), clone(p)) !== true) throw new Error("approval_authority_inactive");
    return {p, a};
  }
  function start({proposalId, proposalVersion, approvalRef, budget, boundary, idempotencyKey, requestedAction = "RUN_INTERNAL"} = {}) {
    assertSafeBoundary(requestedAction, boundary);
    if (requestedAction !== "RUN_INTERNAL") throw new Error("run_action_mismatch");
    const {p, a} = authorized(proposalId, proposalVersion, approvalRef);
    if (boundary !== p.boundary) throw new Error("run_boundary_mismatch");
    if (typeof idempotencyKey !== "string" || !idempotencyKey.trim()) throw new Error("run_idempotency_key_required");
    if (!money(budget) || cents(budget) > cents(p.costCeiling) || cents(budget) > cents(a.budgetCeiling)) throw new Error("experiment_budget_exceeded");
    const fingerprint = hash({proposalId, proposalVersion, approvalRef, budget, boundary, requestedAction});
    const previous = runKeys.get(idempotencyKey);
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new Error("run_idempotency_conflict");
      return {...clone(runs.get(previous.id)), replayed: true};
    }
    // Reservations remain charged after completion/stop. No adapter currently
    // reconciles actual costs or releases unused reservations.
    const allocated = [...runs.values()].filter(r => r.approvalRef === a.id).reduce((sum, r) => sum + cents(r.budget), 0);
    const proposalAllocated = [...runs.values()].filter(r => r.proposalRef === p.id && r.proposalVersion === p.version).reduce((sum, r) => sum + cents(r.budget), 0);
    if (allocated + cents(budget) > cents(a.budgetCeiling) || proposalAllocated + cents(budget) > cents(p.costCeiling)) throw new Error("experiment_cumulative_budget_exceeded");
    const r = C.ExperimentRun({id: `experiment-run:${hash({organizationId, idempotencyKey})}`, organizationId, proposalRef: p.id, proposalVersion: p.version, approvalRef, budget, boundary, status: "RUNNING", idempotencyKey, startedAt: now(), history: [{from: null, to: "RUNNING", at: now(), reason: "approved_internal_run", evidenceRefs: a.evidenceRefs}]});
    runs.set(r.id, r);
    runKeys.set(idempotencyKey, {id: r.id, fingerprint});
    return {...clone(r), replayed: false};
  }
  function transition(runRef, to, allowed, reason, evidenceRefs = []) {
    const run = runs.get(runRef);
    if (!run || !allowed.includes(run.status)) throw new Error("invalid_experiment_transition");
    if (typeof reason !== "string" || !reason.trim() || !refs(evidenceRefs) || !evidenceRefs.length) throw new Error("transition_reason_and_evidence_required");
    if (to === "RUNNING") authorized(run.proposalRef, run.proposalVersion, run.approvalRef);
    const next = C.ExperimentRun({...run, status: to, history: [...run.history, {from: run.status, to, at: now(), reason, evidenceRefs}]});
    runs.set(runRef, next);
    return clone(next);
  }
  function pause({runRef, reason, evidenceRefs} = {}) { return transition(runRef, "PAUSED", ["RUNNING"], reason, evidenceRefs); }
  function resume({runRef, reason, evidenceRefs} = {}) { return transition(runRef, "RUNNING", ["PAUSED"], reason, evidenceRefs); }
  function stop({runRef, reason, evidenceRefs} = {}) { return transition(runRef, "STOPPED", ["RUNNING", "PAUSED"], reason, evidenceRefs); }
  function cancel({runRef, reason, evidenceRefs} = {}) { return transition(runRef, "CANCELLED", ["RUNNING", "PAUSED"], reason, evidenceRefs); }
  function triggerStop({runRef, condition, evidenceRefs} = {}) {
    const r = runs.get(runRef), p = r && getProposal(r.proposalRef, r.proposalVersion);
    if (!p?.stopConditions.includes(condition)) throw new Error("undeclared_stop_condition");
    return stop({runRef, reason: condition, evidenceRefs});
  }
  function measure({runRef, metric, value, sampleRef, evidenceRefs = [], observedAt = now(), id} = {}) {
    const run = runs.get(runRef);
    if (!run || run.status !== "RUNNING") throw new Error("running_experiment_required");
    const p = getProposal(run.proposalRef, run.proposalVersion);
    if (![p.successMetric, p.failureMetric].includes(metric)) throw new Error("declared_outcome_metric_required");
    if (!refs(evidenceRefs)) throw new Error("measurement_evidence_invalid");
    const presence = value === undefined || value === null ? "MISSING" : "PRESENT";
    if (presence === "PRESENT" && (!Number.isFinite(value) || value < 0)) throw new Error("finite_nonnegative_measurement_required");
    if (presence === "PRESENT" && (!evidenceRefs.length || typeof sampleRef !== "string" || !sampleRef.trim())) throw new Error("measurement_evidence_and_sample_required");
    if (!Number.isFinite(Date.parse(observedAt)) || Date.parse(observedAt) < Date.parse(run.startedAt) || Date.parse(observedAt) > clock().getTime()) throw new Error("measurement_window_invalid");
    if (presence === "PRESENT" && [...measurements.values()].some(m => m.runRef === runRef && m.metric === metric && m.sampleRef === sampleRef)) throw new Error("duplicate_measurement_sample");
    const measurementId = id || `measurement:${hash({runRef, metric, count: measurements.size})}`;
    if (measurements.has(measurementId)) throw new Error("measurement_immutable");
    const m = C.ExperimentMeasurement({id: measurementId, runRef, metric, presence, ...(presence === "PRESENT" ? {value, sampleRef} : {}), evidenceRefs, observedAt, recordedAt: now()});
    measurements.set(m.id, m);
    return clone(m);
  }
  function complete({runRef, workId, evidenceRefs = [], technicalFailure = false, policyBlocked = false, limitations = []} = {}) {
    const run = runs.get(runRef);
    if (!run || !["RUNNING", "STOPPED", "CANCELLED"].includes(run.status)) throw new Error("completable_experiment_required");
    if (results.has(runRef)) throw new Error("experiment_result_already_recorded");
    const p = getProposal(run.proposalRef, run.proposalVersion);
    if (workId !== undefined && workId !== p.workId) throw new Error("result_work_scope_mismatch");
    if (!refs(evidenceRefs) || !Array.isArray(limitations) || typeof technicalFailure !== "boolean" || typeof policyBlocked !== "boolean") throw new Error("result_evidence_invalid");
    if ((technicalFailure || policyBlocked) && !evidenceRefs.length) throw new Error("failure_evidence_required");
    const ms = [...measurements.values()].filter(m => m.runRef === runRef);
    const present = metric => ms.filter(m => m.metric === metric && m.presence === "PRESENT");
    const success = present(p.successMetric), failure = present(p.failureMetric);
    const enough = samples => samples.length >= p.minimumUsefulEvidence;
    let resultClass = "INCONCLUSIVE";
    if (policyBlocked) resultClass = "POLICY_BLOCKED";
    else if (technicalFailure) resultClass = "TECHNICAL_FAILURE";
    else if (run.status === "RUNNING") {
      const positiveSuccess = success.some(m => m.value > 0), positiveFailure = failure.some(m => m.value > 0);
      if (positiveSuccess && !positiveFailure && enough(success)) resultClass = "SUPPORTED";
      else if (positiveFailure && !positiveSuccess && enough(failure)) resultClass = "NOT_SUPPORTED";
    }
    if (["SUPPORTED", "NOT_SUPPORTED"].includes(resultClass)) {
      const used = resultClass === "SUPPORTED" ? success : failure;
      if (!used.every(m => m.evidenceRefs.every(ref => evidenceRefs.includes(ref)))) throw new Error("result_measurement_evidence_required");
    }
    const result = C.ExperimentResult({id: `experiment-result:${hash({runRef})}`, organizationId, workId: p.workId, proposalRef: p.id, proposalVersion: p.version, runRef, resultClass, measurements: ms, evidenceRefs, limitations: [...limitations, "Internal or synthetic evidence only; no live market, profitability, or scaling authority."], status: "PROPOSED", createdAt: now()});
    results.set(runRef, result);
    if (run.status === "RUNNING") runs.set(runRef, C.ExperimentRun({...run, status: "COMPLETED", completedAt: now(), history: [...run.history, {from: run.status, to: "COMPLETED", reason: resultClass, at: now(), evidenceRefs}]}));
    return clone(result);
  }
  function validateResult(result) {
    const stored = result && results.get(result.runRef);
    if (!stored || result.organizationId !== organizationId || !isDeepStrictEqual(result, stored)) throw new Error("stored_experiment_result_required");
    return clone(stored);
  }
  return Object.freeze({organizationId, propose, approve, start, pause, resume, stop, cancel, triggerStop, measure, complete, validateResult,
    getProposal: (id, version) => clone(proposals.get(`${id}@${version}`) || null), getRun: id => clone(runs.get(id) || null), getResult: id => clone(results.get(id) || null)});
}
module.exports = {createExperimentManager};
