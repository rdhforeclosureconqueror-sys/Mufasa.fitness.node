'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
function fresh(){const p=require.resolve('../public/mirror-motion-live-acceptance-controls');delete require.cache[p];return require(p);}
function clear(){delete global.PocketPTMirrorMotionLiveAcceptance;}

test('controls expose the next harness step without motion authority',()=>{clear();global.PocketPTMirrorMotionLiveAcceptance={report:()=>({steps:[{id:'calibration',label:'Calibration',result:'NOT_RUN'}]})};const p=fresh();assert.equal(p.currentStep().id,'calibration');assert.equal('process' in p,false);assert.equal('applyToSolver' in p,false);clear();});

test('controls record against only the current step',()=>{clear();let called=null;global.PocketPTMirrorMotionLiveAcceptance={report:()=>({steps:[{id:'calibration',label:'Calibration',result:'NOT_RUN'}]}),record:(id,result,notes)=>{called={id,result,notes};return called;}};const p=fresh();p.record('FAIL','voice overlap');assert.deepEqual(called,{id:'calibration',result:'FAIL',notes:'voice overlap'});clear();});

test('controls reset delegates to canonical harness',()=>{clear();let resets=0;global.PocketPTMirrorMotionLiveAcceptance={report:()=>({steps:[]}),reset:()=>{resets++;}};const p=fresh();p.reset();assert.equal(resets,1);clear();});

test('Phase 12 loads controls after the live acceptance harness',()=>{const fs=require('node:fs'),path=require('node:path');const src=fs.readFileSync(path.join(__dirname,'../public/mirror-motion-phase12.js'),'utf8');const harness=src.indexOf('/mirror-motion-live-acceptance.js'),controls=src.indexOf('/mirror-motion-live-acceptance-controls.js');assert.ok(harness>=0&&controls>harness);assert.match(src,/MIRROR_MOTION_LIVE_ACCEPTANCE_CONTROLS_LOAD_FAILED/);});