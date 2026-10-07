"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {DIMENSIONS,ACTIVATION_STATES,BOWLS}=require("../src/sound-assessment/domain");
const {PAIR_LIBRARY,validatePairLibrary}=require("../src/sound-assessment/pair-library");

test("Phase 1 defines seven dimensions and independent activation states",()=>{
  assert.deepEqual(Object.keys(DIMENSIONS),["GR","EF","AG","CO","EX","CL","SP"]);
  assert.deepEqual(ACTIVATION_STATES,["UNDERACTIVATED","REGULATED","OVERACTIVATED"]);
});
test("seven bowls map one-to-one to measured dimensions",()=>{
  assert.equal(BOWLS.length,7);
  assert.equal(new Set(BOWLS.map(x=>x.note)).size,7);
  assert.equal(new Set(BOWLS.map(x=>x.dimension)).size,7);
});
test("pair library contains all 21 unique unordered combinations",()=>{
  assert.equal(PAIR_LIBRARY.length,21);
  assert.equal(new Set(PAIR_LIBRARY.map(x=>[...x.bowls].sort().join("-"))).size,21);
  assert.deepEqual(validatePairLibrary(),{STATUS:"PASS",FIRST_FAILURE:"NONE",STAGE:"PAIR_LIBRARY",DETAIL:"21/21 unique curated unordered bowl pairs loaded.",pairCount:21});
});
test("every pair exposes required curated practice fields",()=>{
  for(const p of PAIR_LIBRARY){
    for(const key of ["id","publicName","interval","symbolism","experientialDirection","underactivationUse","overactivationUse","anchorSuitability","accentSuitability","transitionSuitability","cautions","suggestedPulse","bijaMantra","closingGroundingSequence","shortCustomerDescription","practitionerInterpretation"]) assert.ok(p[key],`${p.id} missing ${key}`);
  }
});
test("malformed or incomplete pair libraries fail closed",()=>{
  const result=validatePairLibrary(PAIR_LIBRARY.slice(0,20));
  assert.equal(result.STATUS,"FAIL"); assert.equal(result.FIRST_FAILURE,"SA_PAIR_MISSING"); assert.equal(result.STAGE,"PAIR_LIBRARY");
});
test("all 21 pairs have distinct curated public names and non-generic cautions",()=>{
  assert.equal(new Set(PAIR_LIBRARY.map(p=>p.publicName)).size,21);
  assert.equal(new Set(PAIR_LIBRARY.map(p=>p.cautions)).size,21);
  assert.equal(PAIR_LIBRARY.find(p=>p.id==="SA_PAIR_A_B").anchorSuitability,"LOW");
  assert.equal(PAIR_LIBRARY.find(p=>p.id==="SA_PAIR_C_G").publicName,"Grounded Truth");
});
