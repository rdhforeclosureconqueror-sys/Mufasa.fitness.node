"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const test=require("node:test");

const source=fs.readFileSync(path.resolve(__dirname,"..","public","motion","exercise-demo-engine.js"),"utf8");

test("demo engine provides one canonical resolver across product fixtures and motion specs",()=>{
  assert.match(source,/push_up/);
  assert.match(source,/bodyweight_squat/);
  assert.match(source,/stationary_lunge_left/);
  assert.match(source,/sourceType:'product_fixture'/);
  assert.match(source,/sourceType:'motion_spec'/);
});

test("development motion specs cannot be reported as product eligible",()=>{
  assert.match(source,/bodyweight_squat[\s\S]*productEligible:false/);
  assert.match(source,/stationary_lunge_left[\s\S]*productEligible:false/);
  assert.match(source,/requiresHumanVerification:true/);
});

test("product fixture eligibility is derived from canonical registry clearance rather than descriptor optimism",()=>{
  assert.match(source,/registryProductReadiness/);
  assert.match(source,/fixture\.developmentOnly!==true/);
  assert.match(source,/avatar\.developmentOnly!==true/);
  assert.match(source,/avatar\.licenseStatus/);
  assert.doesNotMatch(source,/sourceType:'product_fixture'[\s\S]{0,180}productEligible:true/);
  assert.match(source,/registered-pending-product-clearance/);
});

test("availability fails closed when product registry is missing or cannot resolve the fixture",()=>{
  assert.match(source,/motion_registry_unavailable/);
  assert.match(source,/dependency-unavailable/);
  assert.match(source,/resolveExerciseMotion/);
});

test("demo availability is explicit and unknown exercises fail closed",()=>{
  assert.match(source,/available:false/);
  assert.match(source,/status:'unavailable'/);
  assert.match(source,/code:'demo_unavailable'/);
});

test("motion specs validate before the engine exposes them",()=>{
  assert.match(source,/module\.validate\?\.\(module\.spec\)/);
  assert.match(source,/motion_spec_invalid/);
});
