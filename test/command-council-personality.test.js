"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  COMMAND_COUNCIL_PERSONALITY,
  COMMAND_COUNCIL_PERSONALITY_VERSION,
  commandCouncilSystemInstructions
}=require("../src/business-os/command/personality");

test("Command Intelligence personality is owner-facing counsel, not the worker agent",()=>{
  assert.equal(COMMAND_COUNCIL_PERSONALITY_VERSION,"maat-council-personality/1.1.0");
  const prompt=commandCouncilSystemInstructions();
  assert.match(prompt,/owner-facing mentor/i);
  assert.match(prompt,/worker\/agent/i);
  assert.match(prompt,/does not grant authority/i);
});

test("Ma'at governs all seven specialist seats without personality dominance",()=>{
  assert.deepEqual(Object.keys(COMMAND_COUNCIL_PERSONALITY.council),[
    "CLARKE","BEN_JOCHANNAN","MALCOLM_X","GARVEY","PAYTON","ALI","THOTH","MAAT"
  ]);
  const prompt=commandCouncilSystemInstructions();
  for(const term of ["truth","justice","proportion","reciprocity","human dignity","corrigible"]){
    assert.match(prompt,new RegExp(term,"i"));
  }
  assert.match(prompt,/minimum relevant council seats/i);
  assert.match(prompt,/Rhetorical force never determines correctness/i);
});

test("Council personality preserves reality feedback and explicit Ma'at mode",()=>{
  const prompt=commandCouncilSystemInstructions();
  assert.match(prompt,/REALITY: test the result/i);
  assert.match(prompt,/FEEDBACK: report, learn, and correct/i);
  assert.match(prompt,/THE MATTER, TRUTH, JUSTICE, BALANCE, RECIPROCITY, ORDER, CONSEQUENCE, COUNCIL TENSION, SYNTHESIS, FEEDBACK/i);
});


test("Council registry exposes aliases and prevents personality substitution",()=>{
  const prompt=commandCouncilSystemInstructions();
  assert.match(prompt,/MALCOLM_X:.*malcolm x/i);
  assert.match(prompt,/ALI:.*muhammad ali/i);
  assert.match(prompt,/all personalities or all perspectives/i);
  assert.match(prompt,/Never invent an unregistered seat/i);
  assert.match(prompt,/bounded reasoning lens/i);
});
