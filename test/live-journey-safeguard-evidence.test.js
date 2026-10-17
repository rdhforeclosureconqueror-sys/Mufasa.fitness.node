"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {evaluateSafeguardEvidence,ALLOWED_KINDS}=require("../src/services/liveJourneySafeguardEvidence");
test("untrusted self-attestation never authorizes production execution",()=>{
 const evidence=Object.fromEntries(Object.entries(ALLOWED_KINDS).map(([id,kind])=>[id,{kind,reference:"example-receipt-123"}]));
 const result=evaluateSafeguardEvidence(evidence);
 assert.equal(result.authorized,false);
 assert.equal(result.executionPerformed,false);
 assert.equal(result.checks.filter(x=>x.status==="VERIFIED").length,0);
});
test("independent matching attestations can validate evidence but never execute",()=>{
 const evidence=Object.fromEntries(Object.entries(ALLOWED_KINDS).map(([id,kind])=>[id,{kind,reference:"example-receipt-123"}]));
 const trusted=Object.fromEntries(Object.entries(ALLOWED_KINDS).map(([id,kind])=>[id,{kind,reference:"example-receipt-123",verified:true}]));
 const result=evaluateSafeguardEvidence(evidence,trusted);
 assert.equal(result.firstFailure,null);
 assert.equal(result.checks.length,8);
 assert.equal(result.authorized,false);
 assert.equal(result.executionPerformed,false);
});
