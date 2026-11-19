"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {evaluate}=require("../scripts/marketing-bot-scout-analyst-handoff");
test("no market observations fail closed at Scout",()=>{
 const result=evaluate();
 assert.equal(result.scoutDisposition,"INSUFFICIENT_EVIDENCE");
 assert.equal(result.firstFailure,"SCOUT");
 assert.equal(result.gate,"BLOCKED");
 assert.equal(result.experimentAuthorized,false);
});
test("synthetic observations cannot become verified demand",()=>{
 const result=evaluate({scoutInput:{observations:[{signalType:"EXPLICIT_INTENT",sourceId:"controlled-fixture",evidenceClassification:"SYNTHETIC"}],productReadiness:"OPERATIONAL"},analystInput:{evidence:[{classification:"SYNTHETIC",evidenceRefs:["controlled-fixture"]}]}});
 assert.equal(result.scoutDisposition,"REJECT_UNSUPPORTED");
 assert.equal(result.analystDisposition,"REJECT");
 assert.equal(result.gate,"BLOCKED");
 assert.equal(result.platinumCertified,false);
});
test("Analyst cannot execute a campaign even with input evidence",()=>{
 const result=evaluate({analystInput:{requestedAction:"LAUNCH_CAMPAIGN",evidence:[{classification:"VERIFIED_OUTCOME",evidenceRefs:["evidence-1"]}]}});
 assert.equal(result.analystDisposition,"REJECT");
 assert.equal(result.experimentAuthorized,false);
});
