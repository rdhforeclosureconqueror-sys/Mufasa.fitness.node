"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {run,ROLE_ORDER}=require("../scripts/marketing-bot-first-failure");
const fixture=results=>()=>({mode:"SIMULATED_NO_SIDE_EFFECTS",reportDigest:"fixture",results});
const passed=["qualified-offer","unauthorized-approval","missing-economic-evidence","experiment-approval-requires-human","experiment-idempotency-budget"].map(id=>({id,passed:true}));
test("honest baseline blocks Scout first and never certifies Platinum",()=>{const report=run({acceptance:fixture(passed)});assert.equal(report.firstFailure.role,"SCOUT");assert.equal(report.platinumCertified,false);assert.equal(report.readyForLive,false);assert.deepEqual(report.roles.map(r=>r.role),ROLE_ORDER);assert.equal(report.roles.find(r=>r.role==="SALES").status,"INTERNAL_PASS");});
test("a failing Experiment Manager scenario is not counted as pass",()=>{const report=run({acceptance:fixture(passed.map(r=>r.id==="experiment-idempotency-budget"?{...r,passed:false}:r))});assert.equal(report.roles.find(r=>r.role==="EXPERIMENT_MANAGER").reason,"ACCEPTANCE_FAILED");});
test("missing scenario is explicitly blocked",()=>{const report=run({acceptance:fixture(passed.filter(r=>r.id!=="qualified-offer"))});assert.equal(report.roles.find(r=>r.role==="SALES").reason,"MISSING_SCENARIO_RESULT");});
test("rejects untrusted live-mode reports",()=>assert.throws(()=>run({acceptance:()=>({mode:"LIVE",results:passed})}),/untrusted_acceptance_report/));
