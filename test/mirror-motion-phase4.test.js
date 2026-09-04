'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const modulePath = require.resolve('../public/mirror-motion-phase4.js');
delete require.cache[modulePath];
const phase4 = require(modulePath);

function packet(points = {}) {
  const defaults = {
    left_shoulder:[40,50], right_shoulder:[60,50], left_elbow:[38,70], right_elbow:[62,70], left_wrist:[36,90], right_wrist:[64,90],
    left_hip:[43,100], right_hip:[57,100], left_knee:[43,140], right_knee:[57,140], left_ankle:[43,180], right_ankle:[57,180]
  };
  const merged = { ...defaults, ...points };
  return { keypoints:Object.entries(merged).map(([name,[x,y]]) => ({ name,x,y,score:.95,confidence:.95,stabilityState:'smoothed' })) };
}

function find(out,name){ return out.keypoints.find(p=>p.name===name); }

test('normalizes canonical workout aliases instead of inventing another exercise authority', () => {
  assert.equal(phase4.normalizeExercise('Bodyweight Squat'),'squat');
  assert.equal(phase4.normalizeExercise('Push-Up'),'pushup');
  assert.equal(phase4.normalizeExercise('Jumping Jack'),'jumping_jack');
});

test('squat context anchors feet and corrects small camera drift', () => {
  const engine = phase4.createExerciseContextEngine({ anchorMaxDriftRatio:.5, anchorCorrectionGain:1 });
  const first = engine.process(packet(), 'squat');
  assert.equal(first.exerciseContext.pattern,'squat');
  assert.ok(first.exerciseContext.anchors.left_ankle);
  const second = engine.process(packet({ left_ankle:[46,181], right_ankle:[54,181] }), 'squat');
  assert.equal(find(second,'left_ankle').exerciseConstraintState,'contact_anchor');
  assert.equal(find(second,'left_ankle').x,43);
  assert.equal(find(second,'right_ankle').x,57);
});

test('push-up transition does not lock contacts before horizontal posture is established', () => {
  const engine = phase4.createExerciseContextEngine();
  const upright = engine.process(packet(), 'pushup');
  assert.equal(upright.exerciseContext.phase,'PUSHUP_TRANSITION');
  assert.equal(upright.exerciseContext.frameStats.anchoredContacts,0);
});

test('horizontal push-up establishes wrist and ankle contact anchors', () => {
  const engine = phase4.createExerciseContextEngine();
  const horizontal = packet({
    left_shoulder:[40,80], right_shoulder:[40,100], left_hip:[100,82], right_hip:[100,98],
    left_elbow:[35,95], right_elbow:[45,105], left_wrist:[30,110], right_wrist:[50,110],
    left_knee:[135,84], right_knee:[135,96], left_ankle:[170,84], right_ankle:[170,96]
  });
  const out = engine.process(horizontal,'pushup');
  assert.equal(out.exerciseContext.phase,'PUSHUP_HORIZONTAL');
  assert.equal(out.exerciseContext.frameStats.anchoredContacts,4);
});

test('jumping jack classifies open state without planting the feet', () => {
  const engine = phase4.createExerciseContextEngine({ jackOpenAnkleRatio:1.4 });
  const out = engine.process(packet({ left_wrist:[35,20], right_wrist:[65,20], left_ankle:[20,180], right_ankle:[80,180] }), 'jumping_jack');
  assert.equal(out.exerciseContext.phase,'JACK_OPEN');
  assert.equal(out.exerciseContext.frameStats.anchoredContacts,0);
});

test('renderer wrapper fails open if exercise-context processing throws', () => {
  const original = phase4.createExerciseContextEngine;
  let received = null;
  const wrapped = phase4.wrapRenderer(p => { received = p; return true; });
  const raw = packet();
  assert.equal(wrapped(raw), true);
  assert.ok(received.exerciseContext);
  assert.equal(typeof original, 'function');
});

test('diagnostics expose exercise state, contacts and first failure boundary', () => {
  const text = phase4.diagnosticsText();
  assert.match(text,/First failing boundary:/);
  assert.match(text,/Exercise pattern:/);
  assert.match(text,/Exercise phase:/);
  assert.match(text,/Anchored contacts:/);
  assert.match(text,/Anchor corrections:/);
});
