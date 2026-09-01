'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const studio = require('../public/motion/movement-capture-studio');

function recording(view, primitiveId='crouch') {
  return { meta: { primitiveId, captureView:view } };
}
function frame(t, hipY=.5, elbow=160) {
  return {
    t,
    joints: {
      left_shoulder:{x:.35,y:.25,confidence:.9}, right_shoulder:{x:.65,y:.25,confidence:.9},
      left_elbow:{x:.3,y:.45,confidence:.9}, right_elbow:{x:.7,y:.45,confidence:.9},
      left_wrist:{x:.25,y:.65,confidence:.9}, right_wrist:{x:.75,y:.65,confidence:.9},
      left_hip:{x:.4,y:hipY,confidence:.9}, right_hip:{x:.6,y:hipY,confidence:.9},
      left_knee:{x:.4,y:.75,confidence:.9}, right_knee:{x:.6,y:.75,confidence:.9},
      left_ankle:{x:.4,y:.95,confidence:.9}, right_ankle:{x:.6,y:.95,confidence:.9}
    },
    landmarks:{hipCenter:{x:.5,y:hipY,confidence:.9},bodyCenter:{x:.5,y:(.25+hipY)/2,confidence:.9}},
    directions:{bodyAxis:{x:0,y:1,z:0}}, derivedAngles:{leftElbow:elbow,rightElbow:elbow}
  };
}

test('paired view coverage requires both front and side', () => {
  assert.deepEqual(studio.coverage([], 'crouch'), {front:false,side:false,complete:false});
  assert.deepEqual(studio.coverage([recording('front')], 'crouch'), {front:true,side:false,complete:false});
  assert.deepEqual(studio.coverage([recording('front'), recording('side')], 'crouch'), {front:true,side:true,complete:true});
  assert.equal(studio.nextRequiredView([], 'crouch'), 'front');
  assert.equal(studio.nextRequiredView([recording('front')], 'crouch'), 'side');
  assert.equal(studio.nextRequiredView([recording('front'),recording('side')], 'crouch'), null);
});

test('milestones include timestamped skeleton pictures', () => {
  const rec={meta:{primitiveId:'crouch',label:'slow squat'},frames:[frame(0,.45),frame(500,.72),frame(1000,.46)]};
  const milestones=studio.buildMilestones(rec);
  assert.ok(milestones.length >= 2);
  assert.equal(milestones[0].timestampMs,0);
  assert.ok(milestones.some((m)=>m.timestampMs===500));
  assert.ok(milestones.every((m)=>m.skeletonSvg.includes('<svg')));
  assert.ok(milestones.every((m)=>Number.isInteger(m.frameIndex)));
});

test('squat key frame prefers deepest hip position', () => {
  const rec={meta:{primitiveId:'crouch'},frames:[frame(0,.4),frame(100,.75),frame(200,.5)]};
  assert.equal(studio.selectKeyFrame(rec).index,1);
});

test('roadmap requires paired front and side views for every foundation task', () => {
  const roadmap=JSON.parse(fs.readFileSync(path.join(__dirname,'../public/motion/registry/movement-recording-roadmap.v1.json'),'utf8'));
  assert.equal(roadmap.schemaVersion,2);
  for (const task of roadmap.foundationSession.tasks) assert.deepEqual(task.requiredViews,['front','side']);
});

test('boot loads recorder then roadmap then paired-view capture studio without owning camera', () => {
  const source=fs.readFileSync(path.join(__dirname,'../public/boot-core.js'),'utf8');
  assert.match(source,/movement-recorder\.js/);
  assert.match(source,/movement-recording-roadmap\.js/);
  assert.match(source,/movement-capture-studio\.js/);
  assert.doesNotMatch(source,/getUserMedia/);
});

test('studio source contains custom movement and checkpoint contracts', () => {
  const source=fs.readFileSync(path.join(__dirname,'../public/motion/movement-capture-studio.js'),'utf8');
  assert.match(source,/Custom movement/);
  assert.match(source,/One-Arm Push-Up Left/);
  assert.match(source,/poseCheckpoints/);
  assert.match(source,/captureView/);
  assert.match(source,/Now rotate and record the/);
});
