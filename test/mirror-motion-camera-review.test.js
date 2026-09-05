'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
function fresh(){const p=require.resolve('../public/mirror-motion-camera-review');delete require.cache[p];return require(p);}
const names=['left_shoulder','right_shoulder','left_hip','right_hip','left_knee','right_knee','left_ankle','right_ankle'];
function packet(dx=0,extra={}){const base={left_shoulder:[100,100],right_shoulder:[140,100],left_hip:[105,160],right_hip:[135,160],left_knee:[108,220],right_knee:[132,220],left_ankle:[110,280],right_ankle:[130,280]};return{...extra,structural:{bodyScalePx:50},keypoints:names.map(name=>({name,x:base[name][0]+dx,y:base[name][1],confidence:.95,stabilityState:'accepted'}))};}

test('scene evidence detects camera translation and exposes residual subject motion',()=>{const p=fresh(),e=p.createCameraMotionReview();e.observe(packet(0));const out=e.observe(packet(10,{cameraFrameMotion:{globalDxNormalized:.2,globalDyNormalized:0,confidence:.95}}));const i=out.cameraMotionIntent;assert.equal(i.source,'scene');assert.equal(i.detected,true);assert.equal(i.ambiguous,false);assert.ok(Math.abs(i.subjectDxNormalized-.2)<1e-9);assert.ok(Math.abs(i.residualSubjectDxNormalized)<1e-9);assert.equal(i.measuredDepth,false);});

test('pose-only rigid translation remains ambiguous and never becomes authoritative camera detection',()=>{const p=fresh(),e=p.createCameraMotionReview();e.observe(packet(0));const out=e.observe(packet(10));const i=out.cameraMotionIntent;assert.equal(i.source,'pose_coherence');assert.equal(i.detected,false);assert.equal(i.ambiguous,true);assert.ok(i.confidence<=p.DEFAULTS.poseSuspicionConfidenceCap);assert.ok(Math.abs(i.residualSubjectDxNormalized-i.subjectDxNormalized)<1e-9);});

test('pose-only side step is preserved as residual because camera cause cannot be proven',()=>{const p=fresh(),e=p.createCameraMotionReview();e.observe(packet(0));const out=e.observe(packet(-12));assert.equal(out.cameraMotionIntent.detected,false);assert.equal(out.cameraMotionIntent.ambiguous,true);assert.ok(out.cameraMotionIntent.residualSubjectDxNormalized<0);});

test('unreliable geometry does not invent camera motion',()=>{const p=fresh(),e=p.createCameraMotionReview();e.observe(packet(0));const distorted=packet(10);distorted.keypoints.find(x=>x.name==='left_ankle').x+=80;const out=e.observe(distorted);assert.equal(out.cameraMotionIntent.detected,false);assert.equal(out.cameraMotionIntent.source,'unavailable');});

test('Closure B diagnostics remain review-first with no avatar-root or depth authority',()=>{const p=fresh(),d=p.diagnostics();assert.equal(d.reviewFirst,true);assert.equal(d.avatarRootAuthority,false);assert.equal(d.measuredDepthAuthority,false);assert.match(p.diagnosticsText(),/Avatar root authority: NO/);});

test('Phase 13 forwards its packet through camera review without replacing lateral intent',()=>{const fs=require('node:fs'),path=require('node:path');const src=fs.readFileSync(path.join(__dirname,'../public/mirror-motion-phase13.js'),'utf8');assert.match(src,/PocketPTMirrorMotionCameraReview/);assert.match(src,/review\.observe\(out\)/);});

test('Phase 12 loads camera review only after final acceptance script',()=>{const fs=require('node:fs'),path=require('node:path');const src=fs.readFileSync(path.join(__dirname,'../public/mirror-motion-phase12.js'),'utf8');const acceptance=src.indexOf('/mirror-motion-acceptance.js'),review=src.indexOf('/mirror-motion-camera-review.js');assert.ok(acceptance>=0&&review>acceptance);assert.match(src,/MIRROR_MOTION_CAMERA_REVIEW_LOAD_FAILED/);});