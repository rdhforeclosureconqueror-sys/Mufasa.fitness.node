'use strict';
const source='docs/rugby/master-intelligence-v1/knowledge/06-gym-strength-power.md';
const ranges=Object.freeze({strength_endurance:[30,60],hypertrophy:[90,180],strength:[180,300],power:[120,240]});
function reviewAdaptation(program){
 const adaptation=({strength:'strength',muscle_gain:'hypertrophy'})[program.goal]||null;
 return {schemaVersion:1,source,sourceStatus:'consolidated_course_guide_not_activated_policy',adaptation,restGuidanceSeconds:adaptation?[...ranges[adaptation]]:null,availableGuidance:Object.fromEntries(Object.entries(ranges).map(([k,v])=>[k,[...v]])),sequenceGuidance:['power_skill','primary_strength','accessory','isolation'],reasons:['coach_adaptation_confirmation_required','session_duration_feasibility_required',...(adaptation?[]:['adaptation_not_established_by_goal'])],automaticDoseAdjustment:false,trainingAuthorized:false};
}
module.exports={reviewAdaptation};
