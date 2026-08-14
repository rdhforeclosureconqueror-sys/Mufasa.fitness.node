"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {verificationDiagnostic}=require("../src/services/steppingIntoGreatnessService");

function activity(overrides={}) {
  return {activityId:"activity_acceptance",clientSessionId:"session_acceptance",userId:"member",activityType:"run",status:"completed",createdAt:"2026-08-14T10:00:00.000Z",updatedAt:"2026-08-14T10:10:00.000Z",endedAt:"2026-08-14T10:10:00.000Z",distanceMeters:1609.344,elapsedTimeMs:600000,movingTimeMs:590000,pausedTimeMs:10000,verificationLevel:"unverified",validation:{state:"questionable",reasons:["poor_gps_quality"]},gpsQuality:{rating:"poor",acceptedSamples:12,rejectedSamples:3,suspiciousMovementDetected:false},goal:{distanceMeters:1609.344,completed:true},selectedRoute:{routeId:"trail_1",routeSource:"trail_network"},...overrides};
}

test("diagnostic reports every verification category and the exact enforced failure",()=>{
  const report=verificationDiagnostic(activity());
  assert.equal(report.decision,"NOT_VERIFIED");
  assert.deepEqual(report.failingReasonCodes,["poor_gps_quality"]);
  assert.deepEqual(report.persistedVerificationReasonCodes,["poor_gps_quality"]);
  assert.equal(report.rules.find(rule=>rule.id==="gps_rating_usable").result,"FAIL");
  assert.equal(report.rules.find(rule=>rule.id==="accepted_sample_ratio").enforced,false);
  assert.equal(report.authoritativePersistence.persisted,true);
  assert.deepEqual(report.qualifications,{"greatness.activity.completed":false,xp:false,achievements:false,records:false,runCountAchievements:false,distanceAchievements:false,trailExploration:false,verifiedTrailVisit:false,trailPhotoContributionEligibility:false});
  for(const category of ["gps_quality","accepted_rejected_sample_ratio","minimum_distance","route_trail_association","goal_completion","elapsed_moving_time_sanity","browser_suspension_resume","speed_pace_plausibility","duplicate_replay_detection","authoritative_persistence","missing_trail_identity"]){
    assert.ok(report.rules.some(rule=>rule.category===category),category);
  }
});

test("diagnostic exposes only safe activity summary GPS and eligibility evidence",()=>{
  const report=verificationDiagnostic(activity({route:{points:[{latitude:1,longitude:2}]}}));
  assert.equal(report.activityTimestamp,"2026-08-14T10:10:00.000Z");
  assert.equal(report.completedDistanceMeters,1609.344);
  assert.deepEqual(report.gpsQuality,{acceptedSamples:12,rejectedSamples:3,rating:"poor",suspiciousMovementDetected:false});
  assert.doesNotMatch(JSON.stringify(report),/latitude|longitude|member/);
});

test("verified persisted trail run qualifies for completion and trail outcomes",()=>{
  const report=verificationDiagnostic(activity({verificationLevel:"verified_gps",validation:{state:"valid",reasons:[]},gpsQuality:{rating:"good",acceptedSamples:12,rejectedSamples:3,suspiciousMovementDetected:false}}));
  assert.equal(report.decision,"VERIFIED");
  assert.deepEqual(report.failingReasonCodes,[]);
  assert.ok(Object.values(report.qualifications).every(Boolean));
});

test("missing trail identity does not invalidate an otherwise verified run but blocks trail outcomes",()=>{
  const report=verificationDiagnostic(activity({verificationLevel:"verified_gps",validation:{state:"valid",reasons:[]},gpsQuality:{rating:"excellent",acceptedSamples:4,rejectedSamples:0,suspiciousMovementDetected:false},selectedRoute:{routeId:null,routeFingerprint:null,routeSource:"place_only"}}));
  assert.equal(report.decision,"VERIFIED");
  assert.equal(report.rules.find(rule=>rule.id==="trail_identity_present").result,"FAIL");
  assert.equal(report.rules.find(rule=>rule.id==="trail_identity_present").enforced,false);
  assert.equal(report.qualifications["greatness.activity.completed"],true);
  assert.equal(report.qualifications.trailPhotoContributionEligibility,false);
});
