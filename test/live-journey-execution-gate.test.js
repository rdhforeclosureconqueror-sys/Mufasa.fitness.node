"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {assessExecutionRequest,CONFIRM}=require("../src/services/liveJourneyExecutionGate");
const {REQUIRED}=require("../src/services/liveJourneySafetyContract");
const {ALLOWED_KINDS}=require("../src/services/liveJourneySafeguardEvidence");
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
 const evidence=Object.fromEntries(REQUIRED.map(id=>[id,{kind:ALLOWED_KINDS[id],reference:"verified-receipt-"+id}]));
 const body={confirmation:CONFIRM,evidence,...Object.fromEntries(REQUIRED.map(key=>[key,true]))};
 const verified={...Object.fromEntries(REQUIRED.map(key=>[key,true])),trustedEvidence:Object.fromEntries(REQUIRED.map(id=>[id,{...evidence[id],verified:true}]))};
 const result=assessExecutionRequest(body,verified);
 assert.equal(result.readyForImplementation,true);
 assert.equal(result.firstFailure,"EXECUTOR_NOT_IMPLEMENTED");
 assert.equal(result.executionPerformed,false);
});

test("missing trusted evidence blocks even when every caller flag is true",()=>{
 const body={confirmation:CONFIRM,...Object.fromEntries(REQUIRED.map(id=>[id,true]))};
 const context=Object.fromEntries(REQUIRED.map(id=>[id,true]));
 const result=assessExecutionRequest(body,context);
 assert.equal(result.authorized,false);
 assert.equal(result.readyForImplementation,false);
 assert.equal(result.firstFailure,"adminAuthorized");
});
