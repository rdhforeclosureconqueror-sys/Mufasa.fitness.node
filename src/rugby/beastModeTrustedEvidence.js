'use strict';
const {validatePolicy}=require('./beastModePolicy');

const stageIds=['BM-01','BM-02','BM-03','BM-04','BM-05','BM-06','BM-07'];
const iso=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const day=v=>v.slice(0,10);
const outcome=(decision,reasons,nextStage=null,details={})=>({decision,reasons,nextStage,automaticProgression:false,runtimeActivation:false,automaticPrescription:false,...details});

function evaluateTrustedEvidence({athleteId,currentStage,policy,evidence,eligibility}={}){
 if(typeof athleteId!=='string'||!athleteId.trim()||!stageIds.includes(currentStage))return outcome('REVIEW_REQUIRED',['athlete_and_current_stage_required']);
 if(!eligibility||eligibility.decision==='REFER'||eligibility.pain===true||eligibility.clinicalConcern===true)return outcome('REFER',['safety_or_eligibility_referral']);
 if(eligibility.decision!=='ELIGIBLE_FOR_COACH_REVIEW'||eligibility.pain!==false||eligibility.clinicalConcern!==false)return outcome('HOLD',['trusted_eligibility_required']);
 let approved;
 try{approved=validatePolicy(policy);}catch{return outcome('REVIEW_REQUIRED',['approved_stage_criteria_required']);}
 if(!Array.isArray(evidence))return outcome('REVIEW_REQUIRED',['evidence_history_required']);
 const current=evidence.filter(event=>event&&event.athleteId===athleteId&&iso(event.occurredAt)&&iso(event.recordedAt));
 const superseded=new Set(current.map(event=>event.supersedes).filter(Boolean));
 const active=current.filter(event=>!superseded.has(event.eventId));
 const confirmed=new Set(active.filter(event=>event.eventType==='coach_reviewed'&&event.verificationStatus==='coach_reviewed'&&event.finding==='confirmed'&&typeof event.sourceRef==='string'&&event.sourceRef.startsWith('evidence:')).map(event=>event.sourceRef.slice(9)));
 const trusted=active.filter(event=>confirmed.has(event.eventId));
 const stage=approved.stages.find(item=>item.id===currentStage);
 const quality=trusted.filter(event=>event.eventType==='quality_observed'&&event.stageId===currentStage&&Number.isInteger(event.score)&&event.score>=stage.minimumScore&&Array.isArray(event.dimensions)&&typeof event.context==='string');
 const reasons=[];
 const dimensions=new Set(quality.flatMap(event=>event.dimensions));
 if(stage.proposedDimensions.some(dimension=>!dimensions.has(dimension)))reasons.push('competency_dimensions_incomplete');
 const contexts=new Set(quality.map(event=>event.context));
 if(stage.candidateContexts.some(context=>!contexts.has(context)))reasons.push('stage_contexts_incomplete');
 const days=new Set(quality.map(event=>day(event.occurredAt)));
 if(days.size<stage.candidateMinimumDistinctDays)reasons.push('observation_days_incomplete');
 if(quality.length){
  const times=quality.map(event=>Date.parse(event.occurredAt));
  if((Math.max(...times)-Math.min(...times))/86400000<stage.candidateMinimumSpanDays)reasons.push('observation_span_incomplete');
 }else reasons.push('trusted_quality_evidence_required');
 const sessions=trusted.filter(event=>event.eventType==='session_completed');
 const attendance=trusted.filter(event=>event.eventType==='attendance_recorded');
 if(!sessions.length||!attendance.length)reasons.push('programme_adherence_records_required');
 const assessments=trusted.filter(event=>event.eventType==='assessment_recorded');
 const byType=new Map();
 for(const assessment of assessments){
  const type=assessment.assessmentType||assessment.sourceRef;
  byType.set(type,(byType.get(type)||0)+1);
 }
 if(![...byType.values()].some(count=>count>=2))reasons.push('baseline_and_retest_required');
 if(reasons.length)return outcome('REVIEW_REQUIRED',reasons,null,{stageId:stage.id,eligibleEvidenceEventIds:trusted.map(event=>event.eventId)});
 const index=stageIds.indexOf(currentStage);
 return outcome(index===stageIds.length-1?'MAINTAIN_REVIEW':'PROGRESSION_REVIEW',[index===stageIds.length-1?'highest_stage':'coach_decision_required'],stageIds[index+1]||currentStage,{stageId:stage.id,eligibleEvidenceEventIds:trusted.map(event=>event.eventId)});
}
module.exports={evaluateTrustedEvidence};
