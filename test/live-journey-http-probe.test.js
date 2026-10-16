"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {TARGETS,evaluateProbe}=require("../src/services/liveJourneyHttpProbe");
test("probe targets are strictly read-only",()=>{
 assert.equal(TARGETS.length,2);
 for(const target of TARGETS)assert.match(target.path,/^\//);
});
test("expected public page and protected endpoint behavior",()=>{
 assert.equal(evaluateProbe("public-campaign",200).status,"PASS");
 assert.equal(evaluateProbe("admin-preflight-unauthenticated",401).status,"PASS");
 assert.equal(evaluateProbe("admin-preflight-unauthenticated",403).status,"PASS");
 assert.equal(evaluateProbe("admin-preflight-unauthenticated",200).status,"FAIL");
 assert.equal(evaluateProbe("public-campaign",404).status,"FAIL");
});
