'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const contract = require('../public/motion/pose-observation-v2');
const normalized = require('../public/motion/normalized-pose');

function packet(points, score = 0.91) {
  return { at:1700000000000, video:{width:200,height:100}, pose:{score,keypoints:points}, keypoints:points };
}

test('MoveNet adapter emits versioned detector-neutral evidence with distinct confidence fields', () => {
  const observation = contract.fromMoveNet(packet([{name:'left_wrist',x:50,y:25,score:.8,visibility:.7,presence:.6}]));
  assert.deepEqual(observation.schema,{id:contract.SCHEMA_ID,version:2});
  assert.equal(observation.engine.id,'tensorflow-js');
  assert.equal(observation.model.detector,'MoveNet');
  assert.equal(observation.landmarks.left_wrist.x,.25);
  assert.equal(observation.landmarks.left_wrist.visibility,.7);
  assert.equal(observation.landmarks.left_wrist.presence,.6);
  assert.equal(observation.landmarks.left_wrist.detectorConfidence,.8);
  assert.equal(observation.landmarks.left_wrist.trackingConfidence,.8);
  assert.equal(observation.landmarks.left_wrist.provenance,contract.PROVENANCE.OBSERVED_MODEL);
  assert.equal(observation.landmarks.right_wrist.provenance,contract.PROVENANCE.LOST);
  assert.equal(contract.validate(observation).firstFailure,'NONE');
});

test('legacy projection excludes derived landmarks from scoring and permits presentation projection', () => {
  const observation = contract.fromMoveNet(packet([{name:'right_wrist',x:100,y:40,score:.9,displayOnly:true,mode:'COASTING',opacity:.5}]));
  const scoring = contract.projectLegacy17(observation);
  const presentation = contract.projectLegacy17(observation,{purpose:'presentation'});
  assert.equal(scoring.find(point=>point.name==='right_wrist').score,0);
  assert.equal(scoring.find(point=>point.name==='right_wrist').authoritative,false);
  assert.equal(presentation.find(point=>point.name==='right_wrist').x,100);
  assert.equal(presentation.find(point=>point.name==='right_wrist').authoritative,false);
  assert.equal(contract.assertAuthoritativeProjection(presentation).firstFailure,'NONE');
});

test('validation identifies the first authority leak', () => {
  const observation = contract.fromMoveNet(packet([{name:'nose',x:10,y:10,score:.9,displayOnly:true}]));
  const invalid = {...observation,landmarks:{...observation.landmarks,nose:{...observation.landmarks.nose,authoritative:true}}};
  assert.deepEqual(contract.validate(invalid),{ok:false,firstFailure:'AUTHORITY_LEAKAGE',detail:'nose (TEMPORAL_PREDICTION) cannot be authoritative.'});
});

test('generic normalizer accepts V2 while MoveNet alias remains equivalent', () => {
  const source = packet([{name:'right_shoulder',x:40,y:60,score:.9},{name:'right_elbow',x:80,y:20,score:.8}]);
  assert.deepEqual(normalized.fromPosePacket(source),normalized.fromMoveNetPosePacket(source));
  const observation = contract.fromMoveNet(source);
  const frame = normalized.fromPosePacket(observation);
  assert.equal(frame.joints.right_shoulder.x,.2);
  assert.equal(frame.poseObservationSchemaVersion,2);
  assert.equal(frame.source.ruleset.id,'pose-authority-v1');
});

test('foundation keeps one camera, detector, scheduler and event pipeline', () => {
  const runtime = fs.readFileSync(path.join(__dirname,'../public/pose-runtime.js'),'utf8');
  const recorder = fs.readFileSync(path.join(__dirname,'../public/motion/movement-recorder.js'),'utf8');
  assert.equal((runtime.match(/detector\.estimatePoses\(/g)||[]).length,1);
  assert.equal((runtime.match(/new CustomEvent\('pose-runtime:frame'/g)||[]).length,1);
  assert.doesNotMatch(recorder,/getUserMedia|estimatePoses\(/);
  assert.match(recorder,/event\?\.detail\?\.poseObservation \|\| event\?\.detail\?\.posePacket/);
});

test('MediaPipe adapter preserves 33 landmarks, explicit confidence and estimated world evidence', () => {
  const points=contract.MEDIAPIPE_33.map((_,index)=>({x:index/100,y:index/120,z:-index/200,visibility:.8,presence:.7}));
  const world=contract.MEDIAPIPE_33.map((_,index)=>({x:index/10,y:index/20,z:index/30,visibility:.75}));
  const observation=contract.fromMediaPipe({landmarks:[points],worldLandmarks:[world]},{width:640,height:480,timestamp:1700000001000});
  assert.equal(Object.keys(observation.landmarks).length,33);
  assert.equal(observation.model.detector,'MediaPipe');
  assert.equal(observation.landmarks.left_heel.visibility,.8);
  assert.equal(observation.landmarks.left_heel.presence,.7);
  assert.equal(observation.landmarks.left_heel.provenance,contract.PROVENANCE.OBSERVED_MODEL);
  assert.equal(observation.worldLandmarks.left_heel.estimated,true);
  assert.equal(observation.worldCoordinates.measuredDepth,false);
  assert.equal(observation.authority.worldDepthIsEstimated,true);
  assert.equal(contract.validate(observation).firstFailure,'NONE');
  assert.equal(contract.projectLegacy17(observation).length,17);
});

test('MediaPipe missing person remains a valid lost-evidence observation', () => {
  const observation=contract.fromMediaPipe({landmarks:[],worldLandmarks:[]},{width:320,height:240});
  assert.equal(observation.landmarks.nose.provenance,contract.PROVENANCE.LOST);
  assert.equal(observation.confidence.detector,0);
  assert.equal(contract.validate(observation).firstFailure,'NONE');
});
