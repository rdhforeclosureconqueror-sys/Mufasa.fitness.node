"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateSuspiciousMovement, SUSPICIOUS_MOVEMENT_THRESHOLDS } = require("../src/stepping/suspiciousMovementPolicy");
const { validateCompletion, verificationDiagnostic } = require("../src/services/steppingIntoGreatnessService");

const accepted=(i)=>({latitude:40,longitude:-74+i/1e6,capturedAtMs:i*1000,accepted:true});
const rejected=(i,reason="impossible_speed")=>({...accepted(i),accepted:false,rejectionReason:reason});
const completion=(overrides={})=>({distanceMeters:808.9,gpsQuality:{rating:"good",acceptedSamples:20,rejectedSamples:0,suspiciousMovementDetected:true},samples:Array.from({length:20},(_,i)=>accepted(i)),...overrides});

test("one isolated rejected GPS sample does not invalidate a run",()=>{
  const input=completion({gpsQuality:{rating:"good",acceptedSamples:20,rejectedSamples:1,suspiciousMovementDetected:true},samples:[...Array.from({length:10},(_,i)=>accepted(i)),rejected(10),...Array.from({length:10},(_,i)=>accepted(i+11))]});
  assert.equal(validateCompletion(input).state,"valid");
});

test("several isolated rejected samples among many valid samples do not invalidate a run",()=>{
  const samples=Array.from({length:100},(_,i)=>i%20===10?rejected(i):accepted(i));
  assert.equal(validateCompletion(completion({gpsQuality:{rating:"good",acceptedSamples:95,rejectedSamples:5},samples})).state,"valid");
});

test("the production-like 1239/228 ratio verifies without a sustained suspicious pattern",()=>{
  const samples=Array.from({length:1467},(_,i)=>i%6===5?rejected(i,"poor_accuracy"):accepted(i));
  const validation=validateCompletion(completion({gpsQuality:{rating:"good",acceptedSamples:1239,rejectedSamples:228,suspiciousMovementDetected:true},samples}));
  assert.equal(validation.state,"valid");assert.deepEqual(validation.reasons,[]);
});

test("repeated impossible jumps fail verification",()=>{
  const samples=[accepted(0),rejected(1,"gps_jump"),accepted(2),rejected(3,"gps_jump"),accepted(4),rejected(5,"gps_jump"),accepted(6)];
  const validation=validateCompletion(completion({gpsQuality:{rating:"good",acceptedSamples:4,rejectedSamples:3},samples}));
  assert.equal(validation.state,"questionable");assert.ok(validation.reasons.includes("suspicious_movement"));assert.equal(validation.movementEvidence.patterns.repeatedLargeJumps,true);
});

test("sustained impossible speed fails verification",()=>{
  const samples=[accepted(0),rejected(1),rejected(2),rejected(3),accepted(4)];
  const validation=validateCompletion(completion({gpsQuality:{rating:"good",acceptedSamples:2,rejectedSamples:3},samples}));
  assert.equal(validation.state,"questionable");assert.equal(validation.movementEvidence.patterns.sustainedImpossibleSpeed,true);
});

test("insufficient accepted points and poor GPS quality remain enforced",()=>{
  assert.equal(validateCompletion(completion({gpsQuality:{rating:"good",acceptedSamples:1,rejectedSamples:0},samples:[accepted(0)]})).state,"invalid");
  const poor=validateCompletion(completion({gpsQuality:{rating:"poor",acceptedSamples:20,rejectedSamples:2}}));
  assert.equal(poor.state,"questionable");assert.ok(poor.reasons.includes("poor_gps_quality"));
});

test("successful verification enables completion, XP, achievements, and records eligibility",()=>{
  const activity={activityId:"activity_policy",clientSessionId:"session_policy",userId:"member",activityType:"run",status:"completed",createdAt:"2026-08-14T10:00:00Z",updatedAt:"2026-08-14T10:10:00Z",endedAt:"2026-08-14T10:10:00Z",distanceMeters:808.9,verificationLevel:"verified_gps",validation:validateCompletion(completion()),gpsQuality:{rating:"good",acceptedSamples:20,rejectedSamples:0},selectedRoute:{routeId:"trail_1"}};
  const diagnostic=verificationDiagnostic(activity);
  assert.equal(diagnostic.decision,"VERIFIED");
  for(const key of ["greatness.activity.completed","xp","achievements","records"])assert.equal(diagnostic.qualifications[key],true,key);
});

test("policy thresholds are stable and explicit",()=>assert.deepEqual(SUSPICIOUS_MOVEMENT_THRESHOLDS,{minimumAcceptedSamples:2,minimumSamplesForRatio:20,maximumMovementRejectionRatio:.5,consecutiveImpossibleSamples:3,repeatedLargeJumps:3,teleportDistanceMeters:1000}));
