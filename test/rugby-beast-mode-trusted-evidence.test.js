'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {defaultPolicy}=require('../src/rugby/beastModePolicy');
const {evaluateTrustedEvidence}=require('../src/rugby/beastModeTrustedEvidence');

const athleteId='athlete-1';
const eligibility={decision:'ELIGIBLE_FOR_COACH_REVIEW',pain:false,clinicalConcern:false};
const at=day=>`2026-11-${String(day).padStart(2,'0')}T10:00:00.000Z`;
function reviewed(event){
 return [event,{eventId:`review-${event.eventId}`,athleteId,occurredAt:event.recordedAt,recordedAt:event.recordedAt,eventType:'coach_reviewed',sourceRef:`evidence:${event.eventId}`,verificationStatus:'coach_reviewed',finding:'confirmed'}];
}
function quality(id,day,dimensions,context){
 return reviewed({eventId:id,athleteId,occurredAt:at(day),recordedAt:at(day),eventType:'quality_observed',sourceRef:`quality:${id}`,verificationStatus:'unverified',stageId:'BM-01',score:4,dimensions,context});
}
function evidence(){
 return [
  ...quality('q1',1,['control','balance','technique'],'basic_control'),
  ...quality('q2',2,['trunk_stability','lower_limb_alignment'],'basic_control'),
  ...reviewed({eventId:'session',athleteId,occurredAt:at(1),recordedAt:at(1),eventType:'session_completed',sourceRef:'session:1',verificationStatus:'unverified'}),
  ...reviewed({eventId:'attendance',athleteId,occurredAt:at(1),recordedAt:at(1),eventType:'attendance_recorded',sourceRef:'attendance:1',verificationStatus:'unverified'}),
  ...reviewed({eventId:'base',athleteId,occurredAt:at(1),recordedAt:at(1),eventType:'assessment_recorded',sourceRef:'assessment:sprint',assessmentType:'sprint_10m',verificationStatus:'unverified'}),
  ...reviewed({eventId:'retest',athleteId,occurredAt:at(2),recordedAt:at(2),eventType:'assessment_recorded',sourceRef:'assessment:sprint',assessmentType:'sprint_10m',verificationStatus:'unverified'})
 ];
}
function request(patch={}){return {athleteId,currentStage:'BM-01',policy:defaultPolicy(),evidence:evidence(),eligibility,...patch};}
test('joins confirmed assessment, competency, programme and retest evidence into a review-only progression recommendation',()=>{
 const result=evaluateTrustedEvidence(request());
 assert.equal(result.decision,'PROGRESSION_REVIEW');
 assert.equal(result.nextStage,'BM-02');
 assert.equal(result.automaticProgression,false);
 assert.equal(result.runtimeActivation,false);
 assert.equal(result.automaticPrescription,false);
 assert.equal(result.eligibleEvidenceEventIds.length,6);
});
test('unreviewed evidence cannot establish competency or programme adherence',()=>{
 const result=evaluateTrustedEvidence(request({evidence:evidence().filter(event=>event.eventType!=='coach_reviewed')}));
 assert.equal(result.decision,'REVIEW_REQUIRED');
 assert.deepEqual(result.reasons.sort(),['baseline_and_retest_required','competency_dimensions_incomplete','observation_days_incomplete','programme_adherence_records_required','stage_contexts_incomplete','trusted_quality_evidence_required']);
});
test('stage criteria enforce all dimensions, repeated days and observation span without averaging',()=>{
 const sparse=evidence().filter(event=>!['q2','review-q2'].includes(event.eventId));
 const result=evaluateTrustedEvidence(request({evidence:sparse}));
 assert.equal(result.decision,'REVIEW_REQUIRED');
 assert.ok(result.reasons.includes('competency_dimensions_incomplete'));
 assert.ok(result.reasons.includes('observation_days_incomplete'));
 assert.ok(result.reasons.includes('observation_span_incomplete'));
});
test('missing retest, unsafe eligibility and malformed policy fail closed',()=>{
 const noRetest=evidence().filter(event=>!['retest','review-retest'].includes(event.eventId));
 assert.deepEqual(evaluateTrustedEvidence(request({evidence:noRetest})).reasons,['baseline_and_retest_required']);
 assert.equal(evaluateTrustedEvidence(request({eligibility:{...eligibility,pain:true}})).decision,'REFER');
 assert.deepEqual(evaluateTrustedEvidence(request({policy:{stages:[]}})).reasons,['approved_stage_criteria_required']);
});
test('the top stage is a maintain-review recommendation, never an automatic change',()=>{
 const policy=defaultPolicy();
 const stage=policy.stages[6];
 const ev=[];
 const dimensions=stage.proposedDimensions;
 for(const [index,day] of [1,3,5,8].entries())ev.push(...reviewed({eventId:`top-${index}`,athleteId,occurredAt:at(day),recordedAt:at(day),eventType:'quality_observed',sourceRef:`quality:top-${index}`,verificationStatus:'unverified',stageId:'BM-07',score:4,dimensions,context:index===0?'rugby_decision_context':'repeated_explosive_effort'}));
 ev.push(...reviewed({eventId:'top-session',athleteId,occurredAt:at(1),recordedAt:at(1),eventType:'session_completed',sourceRef:'session:top',verificationStatus:'unverified'}));
 ev.push(...reviewed({eventId:'top-attendance',athleteId,occurredAt:at(1),recordedAt:at(1),eventType:'attendance_recorded',sourceRef:'attendance:top',verificationStatus:'unverified'}));
 ev.push(...reviewed({eventId:'top-base',athleteId,occurredAt:at(1),recordedAt:at(1),eventType:'assessment_recorded',sourceRef:'assessment:top',assessmentType:'sprint',verificationStatus:'unverified'}));
 ev.push(...reviewed({eventId:'top-retest',athleteId,occurredAt:at(8),recordedAt:at(8),eventType:'assessment_recorded',sourceRef:'assessment:top',assessmentType:'sprint',verificationStatus:'unverified'}));
 const result=evaluateTrustedEvidence(request({currentStage:'BM-07',policy,evidence:ev}));
 assert.equal(result.decision,'MAINTAIN_REVIEW');
 assert.equal(result.nextStage,'BM-07');
});
