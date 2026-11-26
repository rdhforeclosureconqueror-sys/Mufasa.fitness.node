'use strict';
// Candidate development review only; input provenance must be established by a trusted service before activation.
function reviewDevelopmentCycle(input){
 const out=(status,reason)=>({status,reason,retestAllowed:status!=='REFER'&&status!=='HOLD_SAFETY',stageChangeAuthorized:false,automaticProgressionAllowed:false});
 if(!input||typeof input!=='object'||Array.isArray(input))return out('HOLD_SAFETY','missing_cycle');
 if(input.pain===true||input.clinicalConcern===true)return out('REFER','safety_concern');
 if(input.pain!==false||input.clinicalConcern!==false)return out('HOLD_SAFETY','unknown_safety');
 const {athleteId,stageId,baseline,retest,programme,fieldObservations}=input;
 const date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 const same=x=>x&&x.athleteId===athleteId&&x.stageId===stageId;
 if(typeof athleteId!=='string'||!athleteId||!/^BM-0[1-7]$/.test(stageId)||!same(baseline)||!same(retest)||!same(programme)||!date(baseline.date)||!date(retest.date)||baseline.date>=retest.date||typeof baseline.protocolId!=='string'||!baseline.protocolId||baseline.protocolId!==retest.protocolId)return out('REVIEW_REQUIRED','comparable_baseline_retest_required');
 if(typeof programme.version!=='string'||!programme.version||!Array.isArray(programme.sessions)||!programme.sessions.length)return out('REVIEW_REQUIRED','versioned_programme_required');
 const sessions=programme.sessions;
 if(new Set(sessions.map(s=>s?.id)).size!==sessions.length||sessions.some(s=>!s||typeof s.id!=='string'||!s.id||!date(s.date)||s.date<=baseline.date||s.date>retest.date||!['completed','coach_modified','planned_recovery','missed','unknown'].includes(s.status)))return out('REVIEW_REQUIRED','invalid_programme_evidence');
 if(sessions.some(s=>['missed','unknown'].includes(s.status)))return out('HOLD','programme_consistency_review');
 if(!Array.isArray(fieldObservations)||!fieldObservations.length||fieldObservations.some(o=>!same(o)||!date(o.date)||o.date<=baseline.date||o.date>retest.date||o.context!=='rugby_field'||o.finding!=='demonstrated'))return out('REVIEW_REQUIRED','field_transfer_required');
 return out('REVIEW_REQUIRED','candidate_cycle_complete_trusted_review_required');
}
module.exports={reviewDevelopmentCycle};
