'use strict';
const {createHash}=require('node:crypto');
const {validateProgram}=require('../program-engine/programValidator');
// Pure candidate only; never write an assignment or grant authorization.
function buildExactAssignmentCandidate({athleteId,draft,review,existingAssignment}){
 const s=draft?.snapshot;
 if(!athleteId||draft?.state!=='review_only'||s?.athleteId!==athleteId||review?.athleteId!==athleteId||review.priorityId!==s.priorityId||review.persisted!==true||review.state!=='coach_review_recorded'||!review.id||review.fingerprint!==draft.fingerprint||createHash('sha256').update(JSON.stringify(s)).digest('hex')!==draft.fingerprint)throw Error('Exact recorded review required');
 const program=validateProgram(structuredClone(s.program));
 if(!Array.isArray(program.mesocycles)||!program.microcycles.length||program.microcycles.some(w=>!Array.isArray(w.sessions)))throw Error('Incomplete program');
 if(existingAssignment&&(existingAssignment.userId!==athleteId||!existingAssignment.assignmentId||!Number.isInteger(existingAssignment.version)))throw Error('Invalid existing assignment');
 return {schemaVersion:1,state:'assignment_candidate_only',athleteId,reviewId:review.id,fingerprint:draft.fingerprint,program,expectedAssignment:existingAssignment?{assignmentId:existingAssignment.assignmentId,version:existingAssignment.version}:null,replacementRequired:Boolean(existingAssignment),assignmentAuthorized:false,trainingAuthorized:false};
}
module.exports={buildExactAssignmentCandidate};
