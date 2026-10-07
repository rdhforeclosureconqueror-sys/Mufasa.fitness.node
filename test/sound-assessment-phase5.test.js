"use strict";
const test=require("node:test");const assert=require("node:assert/strict");
const R=require("../src/sound-assessment/quick-result");
const {QUICK_BANK}=require("../src/sound-assessment/quick-bank");
const answers=Object.fromEntries(QUICK_BANK.map((q,i)=>[q.id,i%4]));
test("all seven internal dimensions have customer-safe labels and explanations",()=>{assert.deepEqual(Object.keys(R.CUSTOMER_DIMENSIONS).sort(),["AG","CL","CO","EF","EX","GR","SP"]);for(const x of Object.values(R.CUSTOMER_DIMENSIONS)){assert.ok(x.label);assert.ok(x.preview.length>20);assert.ok(x.detail.length>x.preview.length);}});
test("Quick result never exposes dimension codes in customer-facing serialized payload",()=>{const r=R.buildQuickResult(answers);assert.equal(r.ok,true);const customer={...r.result};delete customer.internal;const text=JSON.stringify(customer);for(const code of ["GR","EF","AG","CO","EX","CL","SP","AR"])assert.doesNotMatch(text,new RegExp('"' + code + '"'));});
test("result uses preview plus collapsed read-more detail",()=>{const r=R.buildQuickResult(answers);assert.equal(r.result.sections.length,7);for(const s of r.result.sections){assert.ok(s.preview);assert.ok(s.detail.length>s.preview.length);assert.equal(s.collapsedByDefault,true);assert.equal(s.actionLabel,"Read more");}});
test("result is sectioned rather than one large explanation",()=>{const r=R.buildQuickResult(answers);assert.deepEqual(r.result.sections.map(s=>s.id),R.SECTION_ORDER);});
test("Quick result includes Deep Assessment CTA and directional confidence language",()=>{const r=R.buildQuickResult(answers);assert.equal(r.result.deepAssessmentCTA.actionLabel,"Go deeper");assert.match(r.result.confidence.note,/Deep Assessment/);assert.ok(r.result.confidence.score<=78);});
test("voice is explicitly not enabled in Phase 5 but premium-ready structure is reserved",()=>{const r=R.buildQuickResult(answers);assert.equal(r.result.presentation.voiceEnabled,false);assert.equal(r.result.presentation.voiceReservedForPremium,true);});
test("customer copy avoids diagnosis claims",()=>{const r=R.buildQuickResult(answers);const text=JSON.stringify(r.result);assert.match(text,/not a medical diagnosis/);});

test("incomplete Quick answers fail before customer profile construction",()=>{const r=R.buildQuickResult({});assert.equal(r.ok,false);assert.equal(r.diagnostic.FIRST_FAILURE,"SA_ANSWER_MISSING");assert.equal(r.diagnostic.STAGE,"PROFILE");assert.equal(r.diagnostic.answeredCount,0);});
test("Deep CTA preserves opaque assessment and session linkage",()=>{const r=R.buildQuickResult(answers,{assessmentRef:"qa_123",sessionRef:"sess_456"});assert.equal(r.ok,true);assert.deepEqual(r.result.deepAssessmentCTA.handoff,{assessmentRef:"qa_123",sessionRef:"sess_456",sourceMode:"quick",sourceBankVersion:r.result.internal.bankVersion});});
test("successful Phase 5 result emits RESULT_RENDER diagnostic",()=>{const r=R.buildQuickResult(answers);assert.equal(r.ok,true);assert.equal(r.diagnostic.STATUS,"PASS");assert.equal(r.diagnostic.FIRST_FAILURE,"NONE");assert.equal(r.diagnostic.STAGE,"RESULT_RENDER");assert.equal(r.diagnostic.questionCount,10);assert.equal(r.diagnostic.answeredCount,10);});
