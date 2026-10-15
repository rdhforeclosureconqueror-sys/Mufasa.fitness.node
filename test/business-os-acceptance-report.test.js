"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {execute}=require("../scripts/business-os-acceptance-report");
test("selected scenario is isolated and reproducible",()=>{const opts={scenarioIds:["qualified-offer"],commitSha:"fixture-sha"};const a=execute(opts),b=execute(opts);assert.deepEqual(a,b);assert.equal(a.total,1);assert.equal(a.results[0].id,"qualified-offer");assert.equal(a.reportDigest.length,64);assert.equal(a.passed,true)});
test("all synthetic scenarios pass and reject expected invalid requests",()=>{const report=execute();assert.equal(report.total,3);assert.equal(report.passed,true);assert.equal(report.results.filter(x=>x.actual==="REJECT").length,2)});
test("unknown and duplicate scenario IDs fail closed",()=>{assert.throws(()=>execute({scenarioIds:["unknown"]}),/unknown_acceptance_scenario/);assert.throws(()=>execute({scenarioIds:["qualified-offer","qualified-offer"]}),/duplicate_acceptance_selection/);assert.throws(()=>execute({scenarioIds:[]}),/invalid_acceptance_selection/)});
test("commit identity is included in the report digest",()=>{assert.notEqual(execute({commitSha:"a"}).reportDigest,execute({commitSha:"b"}).reportDigest)});
