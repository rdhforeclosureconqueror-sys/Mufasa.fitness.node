'use strict';
const {randomUUID}=require('node:crypto');
const types=new Set(['assessment_recorded','quality_observed','session_completed','attendance_recorded','coach_reviewed','stage_change_authorized']);
function timestamp(v){
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v))throw Error('Invalid timestamp');
 const n=Date.parse(v);if(!Number.isFinite(n)||new Date(n).toISOString()!==v)throw Error('Invalid timestamp');return n;
}
function appendSelfReport(history,input,athleteId,now=new Date().toISOString(),eventId=randomUUID()){
 if(!Array.isArray(history)||!input||typeof input!=='object'||Array.isArray(input)||typeof athleteId!=='string'||!athleteId.trim())throw Error('Invalid evidence context');
 if(input.eventType!=='assessment_recorded')throw Error('Unsupported self-report event');
 if(Object.keys(input).some(k=>!['eventType','occurredAt','sourceRef','supersedes'].includes(k)))throw Error('Unexpected evidence field');
 if(timestamp(input.occurredAt)>timestamp(now))throw Error('Future evidence');
 if(typeof input.sourceRef!=='string'||!input.sourceRef.trim()||input.sourceRef.length>200)throw Error('Invalid source');
 if(history.some(e=>e.athleteId!==athleteId))throw Error('Cross-athlete evidence');
 if(history.some(e=>e.eventId===eventId))throw Error('Duplicate event');
 if(history.length>=1000)throw Error('Evidence limit');
 const event={eventId,athleteId,occurredAt:input.occurredAt,recordedAt:now,eventType:input.eventType,sourceRef:input.sourceRef,verificationStatus:'unverified'};
 if(input.supersedes!==undefined){
 const prior=history.find(e=>e.eventId===input.supersedes);
 if(!prior||prior.eventType!==event.eventType||prior.verificationStatus!=='unverified'||history.some(e=>e.supersedes===prior.eventId))throw Error('Invalid correction');
 event.supersedes=prior.eventId;
 }
 return [...history,event];
}
function currentEvidence(history,athleteId){
 if(!Array.isArray(history)||history.some(e=>!e||e.athleteId!==athleteId||!types.has(e.eventType)))throw Error('Invalid evidence history');
 const superseded=new Set(history.map(e=>e.supersedes).filter(Boolean));
 return history.filter(e=>!superseded.has(e.eventId)).map(e=>({...e})).sort((a,b)=>timestamp(a.occurredAt)-timestamp(b.occurredAt)||timestamp(a.recordedAt)-timestamp(b.recordedAt));
}
module.exports={appendSelfReport,currentEvidence};
