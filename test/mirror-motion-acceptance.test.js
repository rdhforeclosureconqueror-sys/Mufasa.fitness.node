'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
function fresh(){const p=require.resolve('../public/mirror-motion-acceptance');delete require.cache[p];return require(p);}
function clear(){for(let n=2;n<=18;n++)delete global[`PocketPTMirrorMotionPhase${n}`];delete global.AvatarRuntime;delete global.__avatarRuntime;delete global.PocketPTMotionLabRuntime;}
function healthyPhases(){for(let n=2;n<=18;n++)global[`PocketPTMirrorMotionPhase${n}`]={diagnostics:()=>({firstFailingBoundary:'NONE',processErrors:0,lastIssue:'OK'})};}

test('acceptance waits at the earliest missing stage instead of claiming ready',()=>{clear();global.PocketPTMirrorMotionPhase2={diagnostics:()=>({firstFailingBoundary:'NONE',processErrors:0})};const p=fresh();const d=p.evaluate();assert.equal(d.status,'WAITING');assert.equal(d.firstWaitingBoundary,'PHASE3_NOT_LOADED');clear();});

test('acceptance reports the earliest actual phase failure before downstream symptoms',()=>{clear();healthyPhases();global.PocketPTMirrorMotionPhase5={diagnostics:()=>({firstFailingBoundary:'PHASE5_IK_FAILURE',processErrors:1,lastIssue:'IK'})};global.PocketPTMirrorMotionPhase11={diagnostics:()=>({firstFailingBoundary:'PHASE11_DOWNSTREAM_FAILURE',processErrors:1})};global.AvatarRuntime={boneRestPose:{hips:{}}};const p=fresh();const d=p.evaluate();assert.equal(d.status,'FAIL');assert.equal(d.firstFailingBoundary,'PHASE5_IK_FAILURE');clear();});

test('acceptance does not call the stack ready until avatar runtime and rest pose are observable',()=>{clear();healthyPhases();const p=fresh();let d=p.evaluate();assert.equal(d.status,'WAITING');assert.equal(d.firstWaitingBoundary,'AVATAR_RUNTIME_NOT_AVAILABLE');global.AvatarRuntime={};d=p.evaluate();assert.equal(d.firstWaitingBoundary,'REST_POSE_NOT_OBSERVABLE');clear();});

test('acceptance reports READY only with healthy phases, avatar runtime, and protected rest evidence',()=>{clear();healthyPhases();global.AvatarRuntime={boneRestPose:{hips:{},spine:{}}};const p=fresh();const d=p.evaluate();assert.equal(d.status,'READY');assert.equal(d.firstFailingBoundary,'NONE');assert.equal(d.firstWaitingBoundary,'NONE');assert.equal(d.restPoseStatus,'CAPTURED');assert.equal(d.restPoseBoneCount,2);clear();});

test('Phase 12 loads the final acceptance diagnostics after Phase 18',()=>{const fs=require('node:fs'),path=require('node:path');const src=fs.readFileSync(path.join(__dirname,'../public/mirror-motion-phase12.js'),'utf8');const p18=src.indexOf('/mirror-motion-phase18.js'),accept=src.indexOf('/mirror-motion-acceptance.js');assert.ok(p18>=0&&accept>p18);assert.match(src,/MIRROR_MOTION_ACCEPTANCE_LOAD_FAILED/);});