'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {validateAssessment}=require('../src/rugby/assessmentValidation');
test('accepts a valid manual measurement',()=>assert.deepEqual(validateAssessment({type:'sprint_10m',value:1.9,date:'2026-11-06'}),{type:'sprint_10m',value:1.9,date:'2026-11-06',unit:'seconds'}));
test('rejects invalid measurements and dates',()=>{for(const data of [{type:'unknown',value:2,date:'2026-11-06'},{type:'sprint_10m',value:-1,date:'2026-11-06'},{type:'sprint_10m',value:2,date:'2026-02-30'}])assert.throws(()=>validateAssessment(data));});
