"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {assessExecutionRequest,CONFIRM}=require("../src/services/liveJourneyExecutionGate");
const {REQUIRED}=require("../src/services/liveJourneySafetyContract");
test("live execution denies empty and unconfirmed requests",()=>{
 assert.equal(assessExecutionRequest().firstFailure,"EXPLICIT_CONFIRMATION_REQUIRED");
 assert.equal(assessExecutionRequest({confirmation:"wrong"}).authorized,false);
});
test("caller claims cannot self-attest operational safeguards",()=>{
 const body={confirmation:CONFIRM,...Object.fromEntries(REQUIRED.map(key=>[key,true]))};
 const result=assessExecutionRequest(body,{adminAuthorized:true});
 assert.equal(result.authorized,false);
 assert.equal(result.executionPerformed,false);
 assert.equal(result.firstFailure,"explicitRunConfirmation");
});
test("even externally verified prerequisites do not execute before executor exists",()=>{
 const body={confirmation:CONFIRM,...Object.fromEntries(REQUIRED.map(key=>[key,true]))};
 const verified=Object.fromEntries(REQUIRED.map(key=>[key,true]));
 const result=assessExecutionRequest(body,verified);
 assert.equal(result.readyForImplementation,true);
 assert.equal(result.firstFailure,"EXECUTOR_NOT_IMPLEMENTED");
 assert.equal(result.executionPerformed,false);
});
