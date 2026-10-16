"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {STEPS,evaluateFullJourney}=require("../src/services/fullProductionJourneyEvidence");
test("no receipts cannot certify a live customer journey",()=>{
 const r=evaluateFullJourney();
 assert.equal(r.passed,false);assert.equal(r.firstFailure.id,"campaignEntry");
 assert.equal(r.checks[0].status,"BLOCKED");assert.equal(r.executionPerformed,false);
});
test("first failing receipt blocks downstream claims",()=>{
 const r=evaluateFullJourney({campaignEntry:{verified:true},signup:{verified:false,reason:"SIGNUP_HTTP_500"},authentication:{verified:true}});
 assert.equal(r.firstFailure.id,"signup");assert.equal(r.firstFailure.reason,"SIGNUP_HTTP_500");
 assert.equal(r.checks[2].status,"BLOCKED");
});
test("all eight independent verified receipts can certify evidence completeness",()=>{
 const receipts=Object.fromEntries(STEPS.map(([id])=>[id,{verified:true}]));
 const r=evaluateFullJourney(receipts);
 assert.equal(r.passed,true);assert.equal(r.checks.length,8);assert.equal(r.executionPerformed,false);
});
