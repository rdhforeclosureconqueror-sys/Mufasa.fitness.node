'use strict';
const {createHash,randomUUID}=require('node:crypto');
// Internal review only. Production authorization and persistence are separate boundaries.
function createCoachProgramReview({previewService,authorizationResolver,userStore,clock=()=>Date.now()}){
 function review(auth,athleteId,priorityId,input,decision){
  if(!auth?.userId||auth.providerVerified!==true||auth.provider==='pilot_bypass'||auth.identityClass==='pilot_bypass'||!['admin','super_admin'].includes(authorizationResolver.resolveRole(auth).role))throw Error('Verified admin required');
  if(!decision||Object.keys(decision).some(k=>!['fingerprint','notes'].includes(k))||typeof decision.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(decision.fingerprint)||typeof decision.notes!=='string'||!decision.notes.trim()||decision.notes.length>2000)throw Error('Explicit review required');
  const draft=previewService.preview(auth,athleteId,priorityId,input);
  if(draft.state!=='review_only'||draft.snapshot.athleteId!==athleteId||draft.snapshot.priorityId!==priorityId||draft.fingerprint!==decision.fingerprint||createHash('sha256').update(JSON.stringify(draft.snapshot)).digest('hex')!==draft.fingerprint)throw Error('Stale or mismatched draft');
  return Object.freeze({schemaVersion:1,state:'coach_review_record_candidate',athleteId,priorityId,fingerprint:draft.fingerprint,reviewedBy:auth.userId,reviewedAt:new Date(clock()).toISOString(),notes:decision.notes.trim(),trainingAuthorized:false,assignmentAuthorized:false,persisted:false});
 }
 function save(auth,athleteId,priorityId,input,decision,requestId){
  if(!userStore)throw Error('Review persistence unavailable');
  if(typeof requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId))throw Error('Valid submission ID required');
  const candidate=review(auth,athleteId,priorityId,input,decision);
  let result;
  userStore.updateUser(athleteId,user=>{
   if(user.userId!==athleteId)throw Error('Athlete mismatch');
   const history=user.rugbyCoachProgramReviews||[];
   const existing=history.find(r=>r.requestId===requestId);
   if(existing){
    if(existing.athleteId!==athleteId||existing.priorityId!==priorityId||existing.fingerprint!==candidate.fingerprint||existing.reviewedBy!==candidate.reviewedBy||existing.notes!==candidate.notes)throw Error('Submission ID conflict');
    result=existing;return user;
   }
   if(history.length>=100)throw Error('Review history limit reached');
   result={...candidate,id:randomUUID(),requestId,state:'coach_review_recorded',persisted:true};
   user.rugbyCoachProgramReviews=[...history,result];return user;
  });
  return structuredClone(result);
 }
 return Object.freeze({review,save});
}
module.exports={createCoachProgramReview};
