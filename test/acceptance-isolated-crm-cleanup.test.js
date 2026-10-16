"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {run}=require("../scripts/acceptance-isolated-crm-cleanup");
test("isolated credential and CRM source lifecycle cleans all temporary data",()=>{
 const report=run();
 assert.equal(report.passed,true,JSON.stringify(report.firstFailure));
 assert.deepEqual(report.checks.map(x=>x.id),["CREATE","CRM_VISIBLE","OWNERSHIP","CLEANUP","VERIFY_ABSENT"]);
 assert.ok(report.checks.every(x=>x.status==="PASS"));
 assert.equal(report.mode,"TEMP_STORAGE_ONLY_NO_PRODUCTION_WRITES");
});
