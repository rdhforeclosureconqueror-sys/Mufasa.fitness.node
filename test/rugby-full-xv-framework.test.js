'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {load,validate}=require('../scripts/validate-rugby-full-xv');
const changed=mutate=>{const bundle=load();mutate(bundle);return validate(bundle);};
test('full XV definitions resolve roles, assessment domains and canonical exercises',()=>assert.deepEqual(validate(),[]));
test('missing scrum-half cannot masquerade as complete XV coverage',()=>assert.ok(changed(b=>b['position-profiles'].profiles=b['position-profiles'].profiles.filter(p=>p.number!==9)).some(e=>e.includes('1–15'))));
test('unknown protocol and exercise IDs fail validation',()=>{
 const errors=changed(b=>{b['position-profiles'].profiles[0].assessmentIds.push('invented_test');b['development-links'].links[0].canonicalExerciseExamples.push('invented_exercise');});
 assert.ok(errors.some(e=>e.includes('unknown assessment')));assert.ok(errors.some(e=>e.includes('unresolved exercise')));
});
test('runtime activation and automatic dose cannot enter candidate definitions',()=>{
 const errors=changed(b=>{b['assessment-candidates'].runtimeActivation=true;b['development-links'].links[0].automaticDose=true;});
 assert.ok(errors.some(e=>e.includes('inactive candidate')));assert.ok(errors.some(e=>e.includes('automatic prescription')));
});
test('source provenance and physical units are required',()=>{
 const errors=changed(b=>{const p=b['assessment-candidates'].protocols[0];p.sourceIds=['invented_source'];p.metrics[0].unit='mph';});
 assert.ok(errors.some(e=>e.includes('unknown or missing source')));assert.ok(errors.some(e=>e.includes('unsupported metric unit')));
});
test('unsafe selection threshold and loss of scrum role fail',()=>{
 const errors=changed(b=>{b['position-profiles'].profiles[0].selectionThresholds={benchKg:100};b['position-profiles'].profiles[0].assessmentIds=b['position-profiles'].profiles[0].assessmentIds.filter(id=>id!=='scrum_role');});
 assert.ok(errors.some(e=>e.includes('unapproved selection threshold')));assert.ok(errors.some(e=>e.includes('scrum role missing')));
});

test('contact candidates require supervision and demonstrated prerequisites',()=>{
 const errors=changed(b=>{const p=b['assessment-candidates'].protocols.find(p=>p.id==='scrum_role');p.requiredSetup=p.requiredSetup.filter(key=>key!=='qualified_supervisor');});
 assert.ok(errors.some(e=>e.includes('missing contact supervision/context')));
});
