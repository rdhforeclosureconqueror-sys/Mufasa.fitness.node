"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {run}=require("../scripts/firebase-member-cloud-preflight");
test("one-touch Firebase preflight reports all gates and first failure",()=>{
 const report=run();
 assert.equal(report.mode,"offline-read-only");
 assert.equal(report.total,7);
 assert.equal(report.checks.length,7);
 assert.equal(report.passed,true,JSON.stringify(report.firstFailure));
 assert.equal(report.firstFailure,null);
 assert.match(report.warning,/NOT Firebase connectivity/);
});
