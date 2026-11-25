'use strict';
const policy=require('../../data/rugby/master-intelligence-v1/policies/beast-mode-stage-criteria-candidate.json');
function reviewCandidate(stageId,observations,{athleteId,today}={}){
 const stage=policy.stages.find(s=>s.id===stageId);
 const out=(status,reason)=>({status,reason,criteriaApproved:false,stageChangeAuthorized:false,automaticProgressionAllowed:false});
 const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 if(!stage||!Array.isArray(observations)||!observations.length||typeof athleteId!=='string'||!athleteId||!validDate(today))return out('REVIEW_REQUIRED','missing_stage_or_observations');
 if(observations.some(o=>!o||o.athleteId!==athleteId||o.stageId!==stageId||!validDate(o.date)||o.date>today))return out('HOLD','invalid_evidence_context');
 if(observations.some(o=>o.pain===true||o.clinicalConcern===true))return out('REFER','safety_concern');
 if(observations.some(o=>o.pain!==false||o.clinicalConcern!==false))return out('HOLD','unknown_safety');
 if(observations.some(o=>stage.proposedDimensions.some(k=>!Number.isInteger(o[k])||o[k]<1||o[k]>5)))return out('REVIEW_REQUIRED','missing_or_invalid_quality');
 if(observations.some(o=>stage.proposedDimensions.some(k=>o[k]<4)))return out('HOLD','candidate_quality_not_met');
 const days=[...new Set(observations.map(o=>o.date))].sort();
 if(days.length<stage.candidateMinimumDistinctDays||(Date.parse(days.at(-1))-Date.parse(days[0]))/86400000<stage.candidateMinimumSpanDays)return out('REVIEW_REQUIRED','candidate_observation_window_not_met');
 if(!stage.candidateContexts.every(k=>observations.some(o=>o.context===k)))return out('REVIEW_REQUIRED','candidate_context_missing');
 return out('REVIEW_REQUIRED','candidate_quality_met_approval_and_verified_evidence_required');
}
module.exports={reviewCandidate};
