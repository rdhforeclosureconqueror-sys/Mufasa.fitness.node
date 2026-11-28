'use strict';
const {buildExactAssignmentCandidate}=require('./exactAssignmentCandidate');
const {reviewAuthorizationReadiness}=require('./coachAuthorizationReadiness');
// Internal preparation only; never activates training.
function createTrustedAssignmentPreparation({userStore,previewService,authorizationResolver,clock=()=>Date.now()}){
 function prepare(auth,athleteId,priorityId,input,reviewId){
  if(!auth?.userId||auth.providerVerified!==true||auth.provider==='pilot_bypass'||auth.identityClass==='pilot_bypass'||!['admin','super_admin'].includes(authorizationResolver.resolveRole(auth).role))throw Error('Verified admin required');
  if(typeof reviewId!=='string'||!reviewId)throw Error('Review ID required');
  const draft=previewService.preview(auth,athleteId,priorityId,input);
  const user=userStore.loadUser(athleteId);
  if(user?.userId!==athleteId)throw Error('Athlete mismatch');
  const matches=(user.rugbyCoachProgramReviews||[]).filter(r=>r.id===reviewId);
  if(matches.length!==1)throw Error('Unique recorded review required');
  const candidate=buildExactAssignmentCandidate({athleteId,draft,review:matches[0],existingAssignment:user.programAssignment});
  const readiness=reviewAuthorizationReadiness(user,athleteId,draft,new Date(clock()).toISOString().slice(0,10));
  return {...candidate,readiness,state:readiness.state==='blocked'?'blocked':'explicit_safety_review_required',preparedBy:auth.userId};
 }
 return Object.freeze({prepare});
}
module.exports={createTrustedAssignmentPreparation};
