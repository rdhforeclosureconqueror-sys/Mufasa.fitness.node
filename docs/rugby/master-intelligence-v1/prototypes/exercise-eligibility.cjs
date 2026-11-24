"use strict";
function evaluate(x){
 const result=(decision,reason)=>({decision,reason,runtimeActivation:false,automaticPrescriptionAllowed:false,automaticProgressionAllowed:false});
 if(!x||typeof x!=="object"||Array.isArray(x))return result("HOLD","invalid_input");
 if(x.pain===true||x.clinicalConcern===true)return result("REFER","safety_concern");
 if(x.pain!==false||x.clinicalConcern!==false)return result("HOLD","unknown_safety");
 if(x.ageGroup!=="adult"||x.authorized!==true)return result("HOLD","age_or_authorization");
 if(x.exerciseApproved!==true||x.variantApproved!==true)return result("REVIEW_REQUIRED","unapproved_exercise_or_variant");
 if(typeof x.contactRequired!=="boolean")return result("HOLD","unknown_contact_requirements");
 if(x.contactRequired&&(x.supervisionConfirmed!==true||x.contactCompetencyConfirmed!==true))return result("HOLD","contact_requirements");
 if(x.readinessReviewed!==true||x.competencyConfirmed!==true||x.qualityEvidenceValid!==true)return result("REVIEW_REQUIRED","evidence_required");
 return result("ELIGIBLE_FOR_COACH_REVIEW","no_automatic_progression");
}
module.exports={evaluate};
