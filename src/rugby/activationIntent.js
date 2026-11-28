'use strict';
const {createHash}=require('node:crypto');
const policy=require('../../data/rugby/master-intelligence-v1/policies/beast-mode-development-cycle.json');
function digest(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
// Records intent only. Policy activation and transactional assignment are separate.
function createActivationIntent({preparation,clock=()=>Date.now()}){
 function prepare(auth,athleteId,priorityId,input,reviewId,decision){
  if(!decision||Object.keys(decision).some(k=>!['fingerprint','expectedAssignment','safetyReviewed','replacementConfirmed','notes'].includes(k))||decision.safetyReviewed!==true||typeof decision.notes!=='string'||!decision.notes.trim()||decision.notes.length>2000)throw Error('Explicit safety review required');
  const candidate=preparation.prepare(auth,athleteId,priorityId,input,reviewId);
  if(candidate.state!=='explicit_safety_review_required'||candidate.readiness?.state!=='explicit_safety_review_required'||candidate.readiness.reasons?.length!==0)throw Error('Outstanding readiness blockers');
  if(candidate.athleteId!==athleteId||candidate.reviewId!==reviewId||candidate.preparedBy!==auth.userId||candidate.fingerprint!==decision.fingerprint)throw Error('Review binding mismatch');
  const expected=candidate.expectedAssignment, supplied=decision.expectedAssignment;
  if(expected===null?supplied!==null:(!supplied||supplied.assignmentId!==expected.assignmentId||supplied.version!==expected.version||decision.replacementConfirmed!==true))throw Error('Existing assignment changed or replacement not confirmed');
  const snapshot={athleteId,priorityId,reviewId,fingerprint:candidate.fingerprint,expectedAssignment:expected,reviewedBy:auth.userId,notes:decision.notes.trim(),readiness:candidate.readiness,policyVersion:policy.version};
  return {schemaVersion:1,state:'activation_intent_only',snapshot:structuredClone(snapshot),intentFingerprint:digest(snapshot),recordedAt:new Date(clock()).toISOString(),policyActive:policy.activation,assignmentAuthorized:false,trainingAuthorized:false,persisted:false};
 }
 return Object.freeze({prepare});
}
module.exports={createActivationIntent};
