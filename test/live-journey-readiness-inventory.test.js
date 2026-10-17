"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {getLiveJourneyReadiness}=require("../src/services/liveJourneyReadinessInventory");
test("readiness does not certify unverified production safeguards",()=>{
 const report=getLiveJourneyReadiness();
 assert.equal(report.executionPerformed,false);
 assert.equal(report.productionCertified,false);
 assert.equal(report.requiredSafeguards.length,8);
 assert.equal(report.journeyReceipts.length,8);
 assert.ok(report.requiredSafeguards.every(x=>x.status==="UNVERIFIED"));
 assert.ok(report.journeyReceipts.every(x=>x.status==="NOT_COLLECTED"));
});
