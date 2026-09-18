'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const comparison=require('../public/motion/pose-engine-comparison');
const contract=require('../public/motion/pose-observation-v2');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function mediaPipeObservation(){
  const points=contract.MEDIAPIPE_33.map((_,index)=>({x:.1+index/100,y:.2+index/120,z:0,visibility:.9,presence:.95}));
  return contract.fromMediaPipe({landmarks:[points],worldLandmarks:[points]},{width:640,height:480,timestamp:1000});
}
function moveNetObservation(){
  const keypoints=contract.LEGACY_17.map((name,index)=>({name,x:20+index,y:30+index,score:.9}));
  return contract.fromMoveNet({at:1000,video:{width:640,height:480},pose:{score:.9,keypoints},keypoints});
}

test('comparison reports ordered first failure and keeps MoveNet as production default',()=>{
  const state=comparison.createComparisonState();
  assert.equal(state.snapshot().firstFailure.id,'camera');
  state.setCamera(true);state.setReady('moveNet',true);state.setReady('mediaPipe',true);state.setRunning(true);
  state.record('moveNet',moveNetObservation(),12);state.record('mediaPipe',mediaPipeObservation(),18);
  const report=state.snapshot();
  assert.equal(report.firstFailure,null);
  assert.equal(report.productionDefault,'MoveNet');
  assert.equal(report.productionDefaultChanged,false);
  assert.equal(report.cameraOwners,1);
  assert.equal(report.schedulerOwners,1);
  assert.equal(report.mediaPipe.evidence.landmarkCount,33);
  assert.equal(report.mediaPipe.evidence.detailedHandsFeetObserved,10);
  assert.equal(report.mediaPipe.evidence.worldDepthMeasured,false);
  assert.equal(report.coordinateOrientation,'camera-image-unflipped');
});

test('inference failure invalidates cached success and becomes the first reported failure',()=>{
  const state=comparison.createComparisonState();
  state.setCamera(true);state.setReady('moveNet',true);state.setReady('mediaPipe',true);state.setRunning(true);
  state.record('moveNet',moveNetObservation(),12);state.record('mediaPipe',mediaPipeObservation(),18);
  state.fail('moveNet',new Error('GPU inference failed'));
  const report=state.snapshot();
  assert.equal(report.firstFailure.id,'movenet_model');
  assert.match(report.firstFailure.detail,/GPU inference failed/);
  assert.equal(report.moveNet.healthy,false);
  assert.equal(report.moveNet.evidence,null);
  assert.match(report.checks.find(item=>item.id==='movenet_frame').detail,/GPU inference failed/);
});

test('Pose Engine Test Lab is protected, isolated and cannot switch production detector',()=>{
  const server=read('server.js'),html=read('motion-lab/pose-engine-test-lab.html'),runtime=read('motion-lab/pose-engine-test-lab.js');
  assert.match(server,/app\.get\("\/dev\/pose-engine-test-lab", motionLabGate/);
  assert.match(server,/app\.get\("\/dev\/pose-engine-test-lab\.js", motionLabGate/);
  assert.match(html,/PRODUCTION DEFAULT UNCHANGED/);
  assert.match(html,/id="firstFailure"/);
  assert.match(runtime,/production remains MoveNet/i);
  assert.match(runtime,/getUserMedia/);
  assert.equal((runtime.match(/requestAnimationFrame\(/g)||[]).length,1);
  assert.equal((runtime.match(/getUserMedia\(/g)||[]).length,1);
  assert.doesNotMatch(runtime,/localStorage|fetch\(['"]\/api\/.*(?:score|result|leaderboard)/);
});

test('production pose runtime remains MoveNet-only while candidate stays in protected lab',()=>{
  const production=read('public/pose-runtime.js'),lab=read('motion-lab/pose-engine-test-lab.js');
  assert.doesNotMatch(production,/PoseLandmarker|mediapipe-tasks-vision/);
  assert.match(lab,/PoseLandmarker\.createFromOptions/);
  assert.match(lab,/one shared camera source/i);
  assert.match(lab,/flipHorizontal:false/);
  assert.doesNotMatch(lab,/flipHorizontal:true/);
  assert.match(lab,/camera-image-unflipped/);
});
