'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const phase12=require('../public/mirror-motion-phase12.js');

test('reports missing Phase 11 as first activation failure',()=>{const d=phase12.sync();assert.equal(d.firstFailingBoundary,'PHASE12_PHASE11_MISSING');});

test('reports healthy Phase 11 activation and safety telemetry',()=>{const prior=global.PocketPTMirrorMotionPhase11;global.PocketPTMirrorMotionPhase11={diagnostics:()=>({patched:true,rendererBound:true,processErrors:0,firstFailingBoundary:'NONE',suppressions:7,activePairs:2,authoritySwitches:3,ambiguityReleases:1,protectedBypasses:4,contextResets:2})};try{phase12.reset();const d=phase12.sync();assert.equal(d.firstFailingBoundary,'NONE');assert.equal(d.lastIssue,'PHASE11_LIVE');assert.equal(d.suppressions,7);assert.equal(d.activePairs,2);assert.equal(d.authoritySwitches,3);assert.equal(d.ambiguityReleases,1);assert.equal(d.protectedBypasses,4);}finally{global.PocketPTMirrorMotionPhase11=prior;}});

test('propagates Phase 11 current runtime failure instead of claiming live',()=>{const prior=global.PocketPTMirrorMotionPhase11;global.PocketPTMirrorMotionPhase11={diagnostics:()=>({patched:true,rendererBound:true,processErrors:1,firstFailingBoundary:'PHASE11_PROCESS_ERROR'})};try{phase12.reset();const d=phase12.sync();assert.equal(d.firstFailingBoundary,'PHASE11_PROCESS_ERROR');assert.equal(d.lastIssue,'PHASE11_RUNTIME_FAILURE');}finally{global.PocketPTMirrorMotionPhase11=prior;}});

test('historical Phase 11 process errors do not keep Phase 12 failed after recovery',()=>{const prior=global.PocketPTMirrorMotionPhase11;global.PocketPTMirrorMotionPhase11={diagnostics:()=>({patched:true,rendererBound:true,processErrors:4,firstFailingBoundary:'NONE',lastIssue:'RECOVERED'})};try{phase12.reset();const d=phase12.sync();assert.equal(d.firstFailingBoundary,'NONE');assert.equal(d.lastIssue,'PHASE11_LIVE');assert.equal(d.phase11ProcessErrors,4);assert.match(phase12.diagnosticsText(),/process errors \(historical\): 4/);}finally{global.PocketPTMirrorMotionPhase11=prior;}});

test('Phase 12 preserves downstream loader failure separately from Phase 11 current health',()=>{const source=fs.readFileSync(path.join(__dirname,'../public/mirror-motion-phase12.js'),'utf8');assert.match(source,/loadFailureBoundary:'NONE'/);assert.match(source,/else if\(state\.loadFailureBoundary!=='NONE'\)/);assert.match(source,/state\.loadFailureBoundary=boundary/);assert.match(source,/Persistent loader failure:/);});

test('Phase 11 current failure retains priority over downstream loader failure',()=>{const source=fs.readFileSync(path.join(__dirname,'../public/mirror-motion-phase12.js'),'utf8');const phase11=source.indexOf("else if(state.phase11FirstFailure!=='NONE')"),loader=source.indexOf("else if(state.loadFailureBoundary!=='NONE')");assert.ok(phase11>=0&&loader>phase11);});

test('Phase 10 activation bridge loads Phase 11 before Phase 12 with distinct failures',()=>{const source=fs.readFileSync(path.join(__dirname,'../public/mirror-motion-phase10.js'),'utf8');const p11=source.indexOf('/mirror-motion-phase11.js?v=20260904-phase11');const p12=source.indexOf('/mirror-motion-phase12.js?v=20260904-phase12');assert.ok(p11>=0&&p12>p11);assert.match(source,/MIRROR_MOTION_PHASE11_LOAD_FAILED/);assert.match(source,/MIRROR_MOTION_PHASE12_LOAD_FAILED/);});

test('startup resource audit includes every live mirror-motion phase through Phase 12',()=>{const source=fs.readFileSync(path.join(__dirname,'../public/runtime-state.js'),'utf8');for(let phase=2;phase<=12;phase++)assert.match(source,new RegExp(`/mirror-motion-phase${phase}\\.js`));});

test('diagnostics explicitly deny measured-depth authority',()=>{assert.match(phase12.diagnosticsText(),/Measured depth authority: NO/);});