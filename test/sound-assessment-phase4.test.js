"use strict";
const test=require("node:test");const assert=require("node:assert/strict");
const {QUICK_BANK,QUICK_BANK_VERSION,QUICK_CONFIDENCE_CEILING,capQuickConfidence,scoreQuickAssessment}=require("../src/sound-assessment/quick-bank");
const {normalizeBank,scoreAssessment}=require("../src/sound-assessment/scoring");
const {auditBalance}=require("../src/sound-assessment/balance-auditor");
test("Quick bank is versioned and exactly 10 items",()=>{assert.match(QUICK_BANK_VERSION,/phase4/);assert.equal(QUICK_BANK.length,10);assert.equal(new Set(QUICK_BANK.map(q=>q.id)).size,10);});
test("Quick items are short four-choice prompts",()=>{for(const q of QUICK_BANK){assert.ok(q.prompt.length<=120);assert.equal(q.options.length,4);for(const x of q.options)assert.ok(x.text.length<=90);}});
test("Quick bank satisfies scoring schema and covers every dimension",()=>{const n=normalizeBank(QUICK_BANK);assert.equal(n.ok,true);const dims=new Set(QUICK_BANK.flatMap(q=>q.options.flatMap(o=>[o.primary_dimension,o.secondary_dimension]).filter(Boolean)));assert.deepEqual([...dims].sort(),["AG","CL","CO","EF","EX","GR","SP"]);});
test("Quick bank contains activation evidence in both directions",()=>{const vals=QUICK_BANK.flatMap(q=>q.options.map(o=>o.activation_value));assert.ok(vals.some(v=>v<0));assert.ok(vals.some(v=>v>0));assert.ok(vals.some(v=>v===0));});
test("Quick confidence is explicitly capped below Deep confidence",()=>{assert.equal(QUICK_CONFIDENCE_CEILING,78);assert.equal(capQuickConfidence(100),78);assert.equal(capQuickConfidence(63.5),63.5);assert.equal(capQuickConfidence(-5),0);});
test("Quick bank produces deterministic scoring output",()=>{const answers=Object.fromEntries(QUICK_BANK.map((q,i)=>[q.id,i%4]));const a=scoreAssessment(QUICK_BANK,answers),b=scoreAssessment(QUICK_BANK,answers);assert.equal(a.ok,true);assert.deepEqual(a,b);});
test("Quick bank must pass configured Phase 3 structural audit",()=>{const r=auditBalance(QUICK_BANK,{randomRuns:256,maxOpportunityRatio:2.5,maxPositionShare:.55,maxRandomWinShare:.5});assert.equal(r.ok,true,r.diagnostic?.DETAIL);});

test("regulated current-state answers do not score as equal need",()=>{assert.equal(QUICK_BANK[0].options[0].direction_value,1);assert.equal(QUICK_BANK[0].options[3].direction_value,0);assert.equal(QUICK_BANK[1].options[2].direction_value,0);});
test("Quick scoring entry point enforces confidence ceiling and metadata",()=>{const answers=Object.fromEntries(QUICK_BANK.map(q=>[q.id,0]));const r=scoreQuickAssessment(answers);assert.equal(r.ok,true);assert.ok(r.result.confidence<=QUICK_CONFIDENCE_CEILING);assert.equal(r.result.confidenceCeiling,78);assert.equal(r.result.mode,"quick");assert.equal(r.result.bankVersion,QUICK_BANK_VERSION);});
