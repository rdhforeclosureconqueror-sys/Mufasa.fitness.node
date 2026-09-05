'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
function fresh(){const p=require.resolve('../public/mirror-motion-live-acceptance');delete require.cache[p];return require(p);}
function clear(){delete global.PocketPTMirrorMotionAcceptance;delete global.PocketPTMirrorMotionCameraReview;delete global.PocketPTMirrorMotionCameraActivation;delete global.PocketPTMirrorMotionPhase13;delete global.PocketPTMirrorMotionPhase14;}

test('harness exposes the ordered real-device acceptance sequence',()=>{clear();const p=fresh();assert.equal(p.STEPS[0].id,'calibration');assert.equal(p.STEPS.at(-1).id,'presentation_modes');assert.ok(p.STEPS.some(s=>s.id==='camera_pan_near'));assert.ok(p.STEPS.some(s=>s.id==='camera_pan_far'));});

test('record captures canonical first-failure snapshot with the step',()=>{clear();global.PocketPTMirrorMotionAcceptance={evaluate:()=>({status:'FAIL',firstFailingBoundary:'PHASE5_IK_FAILURE',firstWaitingBoundary:'NONE'})};const p=fresh();const entry=p.record('squat','FAIL','knee snapped');assert.equal(entry.result,'FAIL');assert.equal(entry.snapshot.firstFailingBoundary,'PHASE5_IK_FAILURE');const report=p.report();assert.equal(report.firstFailure.id,'squat');assert.equal(report.complete,false);clear();});

test('complete requires every acceptance step to pass',()=>{clear();global.PocketPTMirrorMotionAcceptance={evaluate:()=>({status:'READY',firstFailingBoundary:'NONE',firstWaitingBoundary:'NONE'})};const p=fresh();for(const step of p.STEPS)p.record(step.id,'PASS');assert.equal(p.report().complete,true);clear();});

test('harness does not create motion authority',()=>{clear();const p=fresh();const text=p.diagnosticsText();assert.match(text,/LIVE ACCEPTANCE HARNESS/);assert.equal(typeof p.record,'function');assert.equal('process' in p,false);assert.equal('applyToSolver' in p,false);});

test('Phase 12 loads live acceptance after camera activation',()=>{const fs=require('node:fs'),path=require('node:path');const src=fs.readFileSync(path.join(__dirname,'../public/mirror-motion-phase12.js'),'utf8');const activation=src.indexOf('/mirror-motion-camera-activation.js'),harness=src.indexOf('/mirror-motion-live-acceptance.js');assert.ok(activation>=0&&harness>activation);assert.match(src,/MIRROR_MOTION_LIVE_ACCEPTANCE_LOAD_FAILED/);});