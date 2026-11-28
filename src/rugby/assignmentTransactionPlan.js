'use strict';
const {createHash}=require('node:crypto');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
// Offline transaction plan only. File-backed userStore is not a cross-process CAS.
function planAssignmentTransaction(user,candidate,intent){
 const s=intent?.snapshot;
 if(!user||!candidate||!s||user.userId!==candidate.athleteId||s.athleteId!==user.userId||intent.state!=='activation_intent_only'||hash(s)!==intent.intentFingerprint||candidate.state!=='explicit_safety_review_required'||s.reviewId!==candidate.reviewId||s.fingerprint!==candidate.fingerprint||hash(s.expectedAssignment)!==hash(candidate.expectedAssignment))throw Error('Matching activation intent required');
 const previous=user.programAssignment??null;
 const actual=previous?{assignmentId:previous.assignmentId,version:previous.version}:null;
 if(previous&&previous.userId!==user.userId||hash(actual)!==hash(s.expectedAssignment))throw Error('Assignment changed');
 return {schemaVersion:1,state:'transaction_plan_only',athleteId:user.userId,intentFingerprint:intent.intentFingerprint,expectedAssignment:actual,previousAssignment:structuredClone(previous),program:structuredClone(candidate.program),requiresAtomicCompareAndSet:true,assignmentAuthorized:false,persisted:false};
}
module.exports={planAssignmentTransaction};
