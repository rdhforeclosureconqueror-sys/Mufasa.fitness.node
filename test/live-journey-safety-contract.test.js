"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {assessLiveJourneyPreflight,REQUIRED}=require("../src/services/liveJourneySafetyContract");
test("live journey denied by default with first failure",()=>{
 const result=assessLiveJourneyPreflight();
 assert.equal(result.authorized,false);
 assert.equal(result.executionPerformed,false);
 assert.equal(result.firstFailure,"adminAuthorized");
 assert.equal(result.checks.length,8);
});
test("every missing safeguard fails closed",()=>{
 for(const missing of REQUIRED){
  const input=Object.fromEntries(REQUIRED.map(key=>[key,true]));delete input[missing];
  const result=assessLiveJourneyPreflight(input);
  assert.equal(result.firstFailure,missing);
  assert.equal(result.authorized,false);
 }
});
test("all preflight assertions still do not authorize execution",()=>{
 const result=assessLiveJourneyPreflight(Object.fromEntries(REQUIRED.map(key=>[key,true])));
 assert.equal(result.readyForImplementation,true);
 assert.equal(result.authorized,false);
 assert.equal(result.executionPerformed,false);
});
