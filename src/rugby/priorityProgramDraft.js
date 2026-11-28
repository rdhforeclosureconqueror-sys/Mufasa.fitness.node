'use strict';
const {createHash}=require('node:crypto');
function freezeTree(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freezeTree(child);Object.freeze(value);}return value;}
// Internal server-only input contract; not an authorization or dosage validator.
// Pure review artifact. Never assigns a program or authorizes training.
function buildPriorityProgramDraft({athleteId,priorityView,priorityId,program,exerciseReview}){
 const fail=message=>{throw new Error(message)};
 if(!athleteId||priorityView?.athlete?.athleteId!==athleteId)fail('Athlete mismatch');
 const p=priorityView.priorities?.find(x=>x.id===priorityId);
 if(!p||p.athleteId!==athleteId||p.evidenceCurrent!==true||p.currentReviewState!=='working_priority')fail('Current priority required');
 if(p.priorityType==='needs_more_evidence')fail('Additional evidence required');
 if(!Array.isArray(p.evidenceIds)||!p.evidenceIds.length||!p.evidenceIds.every(id=>priorityView.evidence?.some(e=>e.id===id)))fail('Current evidence required');
 if(!program||program.schemaVersion!==1||!program.programId||!Array.isArray(program.microcycles)||!program.microcycles.length)fail('Program preview required');
 const snapshot=structuredClone({athleteId,priorityId,priorityVersion:p.version,evidenceIds:p.evidenceIds,evidenceSnapshots:p.evidenceSnapshots,exerciseOptions:p.exerciseOptions,reviewReasons:priorityView.reasons,readiness:priorityView.readiness,program,exerciseReview});
 const fingerprint=createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
 return freezeTree({schemaVersion:1,state:'review_only',fingerprint,snapshot,trainingAuthorized:false,assignmentAuthorized:false,automaticPrescription:false,stageChangeAuthorized:false});
}
module.exports={buildPriorityProgramDraft};
