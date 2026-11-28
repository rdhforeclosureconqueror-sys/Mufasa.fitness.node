'use strict';
const {createHash}=require('node:crypto');
// Internal review only. Production authorization and persistence are separate boundaries.
function createCoachProgramReview({previewService,authorizationResolver,clock=()=>Date.now()}){
 function review(auth,athleteId,priorityId,input,decision){
  if(!auth?.userId||auth.providerVerified!==true||auth.provider==='pilot_bypass'||auth.identityClass==='pilot_bypass'||!['admin','super_admin'].includes(authorizationResolver.resolveRole(auth).role))throw Error('Verified admin required');
  if(!decision||Object.keys(decision).some(k=>!['fingerprint','notes'].includes(k))||typeof decision.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(decision.fingerprint)||typeof decision.notes!=='string'||!decision.notes.trim()||decision.notes.length>2000)throw Error('Explicit review required');
  const draft=previewService.preview(auth,athleteId,priorityId,input);
  if(draft.state!=='review_only'||draft.snapshot.athleteId!==athleteId||draft.snapshot.priorityId!==priorityId||draft.fingerprint!==decision.fingerprint||createHash('sha256').update(JSON.stringify(draft.snapshot)).digest('hex')!==draft.fingerprint)throw Error('Stale or mismatched draft');
  return Object.freeze({schemaVersion:1,state:'coach_review_record_candidate',athleteId,priorityId,fingerprint:draft.fingerprint,reviewedBy:auth.userId,reviewedAt:new Date(clock()).toISOString(),notes:decision.notes.trim(),trainingAuthorized:false,assignmentAuthorized:false,persisted:false});
 }
 return Object.freeze({review});
}
module.exports={createCoachProgramReview};
