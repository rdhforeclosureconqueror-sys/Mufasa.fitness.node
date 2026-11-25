'use strict';
const policy=require('../../data/rugby/master-intelligence-v1/policies/beast-mode-stage-criteria-candidate.json');
function reviewCandidate(stageId,observations){
 const stage=policy.stages.find(s=>s.id===stageId);
 const out=(status,reason)=>({status,reason,criteriaApproved:false,stageChangeAuthorized:false,automaticProgressionAllowed:false});
 if(!stage||!Array.isArray(observations)||!observations.length)return out('REVIEW_REQUIRED','missing_stage_or_observations');
 if(observations.some(o=>!o||typeof o!=='object'||stage.proposedDimensions.some(k=>!Number.isInteger(o[k])||o[k]<1||o[k]>5)))return out('REVIEW_REQUIRED','missing_or_invalid_quality');
 if(observations.some(o=>stage.proposedDimensions.some(k=>o[k]<4)))return out('HOLD','candidate_quality_not_met');
 return out('REVIEW_REQUIRED','candidate_quality_met_approval_and_verified_evidence_required');
}
module.exports={reviewCandidate};
