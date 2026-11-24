function evaluateSafety(input = {}) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return {runtimeActivation:false, decisions:[{policy:"input-validation",decision:"hold_for_review",priority:80}], primary:"hold_for_review", automatedPrescriptionAllowed:false};
  }
  const decisions = [];
  const add = (policy, decision, priority) => decisions.push({policy, decision, priority});
  if (input.screening === true) {
    if (input.pain === true || input.clinicalConcern === true) add("screening-pain","block_and_refer",100);
    else if (input.pain !== false || input.clinicalConcern !== false) add("screening-pain","hold_for_review",80);
    if (input.belowReference === true) add("screening-interpretation","contextual_flag_only",20);
    if (input.progress === "worse" || input.progress === "unchanged") add("corrective-review","review",70);
    if (input.validTechnique !== true) add("assessment-validity","hold_for_review",80);
  }
  if (input.clinicalNutritionConcern === true) add("nutrition-scope","refer",100);
  if (input.supplementRequested === true && (input.antiDopingReviewed !== true || input.contaminationReviewed !== true)) add("supplement-safety","hold_recommendation",80);
  if (input.youthDataProcessing === true && input.privacyReviewed !== true) add("youth-privacy","hold_processing",80);
  if (input.persistentSleepProblem === true) add("sleep-followup","human_followup",70);
  if (input.shortSleep === true) add("sleep-followup","no_standalone_injury_prediction",20);
  if (input.medicalInterventionRequested === true) add("coach-scope","refer",100);
  else if (input.coachScreeningRequested === true && input.coachScopeConfirmed !== true) add("coach-scope","hold_for_review",80);
  decisions.sort((a,b)=>b.priority-a.priority);
  return {runtimeActivation:false, decisions, primary:decisions[0]?.decision ?? "no_decision", automatedPrescriptionAllowed:false};
}
module.exports = { evaluateSafety };
