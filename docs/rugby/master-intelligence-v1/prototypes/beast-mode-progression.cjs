"use strict";
const stages=Object.freeze(["BM-01","BM-02","BM-03","BM-04","BM-05","BM-06","BM-07"]);
function evaluate(x){
 const out=(decision,reason,nextStage=null)=>({decision,reason,nextStage,runtimeActivation:false,automaticProgressionAllowed:false,automaticPrescriptionAllowed:false});
 if(!x||typeof x!=="object"||Array.isArray(x))return out("HOLD","invalid_input");
 if(x.pain===true||x.clinicalConcern===true||x.eligibilityDecision==="REFER")return out("REFER","safety_concern");
 if(x.pain!==false||x.clinicalConcern!==false||x.eligibilityDecision!=="ELIGIBLE_FOR_COACH_REVIEW")return out("HOLD","eligibility_required");
 const i=stages.indexOf(x.currentStage);
 if(i<0||typeof x.athleteId!=="string"||!x.athleteId.trim())return out("REVIEW_REQUIRED","invalid_stage_or_athlete");
 if(x.criteriaApproved!==true||x.evidenceVerified!==true||x.evidenceAthleteId!==x.athleteId||x.evidenceStage!==x.currentStage)return out("REVIEW_REQUIRED","approved_matching_evidence_required");
 if(x.coachReviewed!==true)return out("REVIEW_REQUIRED","coach_review_required");
 if(x.reviewFinding==="maintain")return out("MAINTAIN_REVIEW","coach_review_only",stages[i]);
 if(x.reviewFinding==="regress")return out("REGRESSION_REVIEW","coach_review_only",stages[Math.max(0,i-1)]);
 if(x.reviewFinding==="progress")return i===stages.length-1?out("MAINTAIN_REVIEW","highest_stage",stages[i]):out("PROGRESSION_REVIEW","coach_review_only",stages[i+1]);
 return out("REVIEW_REQUIRED","unknown_review_finding");
}
module.exports={evaluate};
