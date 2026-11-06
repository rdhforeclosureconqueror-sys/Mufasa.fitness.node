'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {validateProfile}=require('../src/rugby/profileValidation');
test('accepts club and position',()=>assert.deepEqual(validateProfile({club:' Dallas Harlequins ',position:' Wing '}),{club:'Dallas Harlequins',position:'Wing'}));
test('rejects invalid profile fields',()=>{for(const input of [null,{}, {club:'',position:'Wing'},{club:'Club',position:''},{club:'x'.repeat(81),position:'Wing'}])assert.throws(()=>validateProfile(input));});
