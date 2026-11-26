'use strict';
const {evaluateAthleteEligibility}=require('./athleteEligibility');
const {evaluate}=require('../../docs/rugby/master-intelligence-v1/prototypes/beast-mode-progression.cjs');
// Review-only bridge. No approved stage criteria or stage authorization store yet.
function evaluateAthleteProgression(user,athleteId,today,ageGroup){
 const assessment=evaluateAthleteEligibility(user,athleteId,today,ageGroup);
 const progression=evaluate({athleteId,eligibilityDecision:assessment.eligibility.decision});
 return {...assessment,progression,stageChangeAuthorized:false};
}
module.exports={evaluateAthleteProgression};
