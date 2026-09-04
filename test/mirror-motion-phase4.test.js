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

function horizontalPacket(overrides={}) {
  return packet({
    left_shoulder:[40,80], right_shoulder:[42,80], left_hip:[100,82], right_hip:[102,82],
    left_elbow:[35,95], right_elbow:[45,105], left_wrist:[30,110], right_wrist:[50,110],
    left_knee:[135,82], right_knee:[137,82], left_ankle:[170,82], right_ankle:[172,82],
    ...overrides
  });
}

function find(out,name){ return out.keypoints.find(p=>p.name===name); }

test('normalizes canonical workout aliases instead of inventing another exercise authority', () => {
  assert.equal(phase4.normalizeExercise('Bodyweight Squat'),'squat');
  assert.equal(phase4.normalizeExercise('Push-Up'),'pushup');
  assert.equal(phase4.normalizeExercise('Jumping Jack'),'jumping_jack');
});

test('current progression exercise wins over stale first-block compatibility snapshot', () => {
  global.__selectedExercise = 'Bodyweight Squat';
  global.WorkoutProgressionRuntime = { getCurrentExerciseMeta: () => ({ exerciseId:'jumping_jack', name:'Jumping Jack' }) };
  assert.equal(phase4.selectedExercise(), 'jumping_jack');
  delete global.WorkoutProgressionRuntime;
  delete global.__selectedExercise;
});

test('squat context anchors feet and corrects small camera drift', () => {
  const engine = phase4.createExerciseContextEngine({ anchorMaxDriftRatio:.5, anchorCorrectionGain:1, anchorCorrectionMinRatio:.001 });
  const first = engine.process(packet(), 'squat');
  assert.equal(first.exerciseContext.pattern,'squat');
  assert.ok(first.exerciseContext.anchors.left_ankle);
  const second = engine.process(packet({ left_ankle:[46,181], right_ankle:[54,181] }), 'squat');
  assert.equal(find(second,'left_ankle').exerciseConstraintState,'contact_anchor_corrected');
  assert.equal(find(second,'left_ankle').x,43);
  assert.equal(find(second,'right_ankle').x,57);
});

test('zero-drift planted contacts are maintained without inflating correction diagnostics', () => {
  const engine = phase4.createExerciseContextEngine();
  const first = engine.process(packet(),'squat');
  const second = engine.process(packet(),'squat');
  assert.equal(first.exerciseContext.frameStats.anchorCorrections,0);
  assert.equal(second.exerciseContext.frameStats.anchorCorrections,0);
  assert.equal(engine.diagnostics().anchorCorrections,0);
  assert.equal(find(second,'left_ankle').exerciseConstraintState,'contact_anchor_maintained');
});

test('clearing or changing the selected exercise releases stale contacts', () => {
  const engine = phase4.createExerciseContextEngine();
  assert.equal(engine.process(packet(),'squat').exerciseContext.frameStats.anchoredContacts,2);
  const cleared = engine.process(packet(), 'jumping_jack');
  assert.equal(cleared.exerciseContext.frameStats.anchoredContacts,0);
  assert.match(cleared.exerciseContext.lastIssue,/ANCHORS_RELEASED/);
});

test('push-up transition does not lock contacts before horizontal posture is established', () => {
  const engine = phase4.createExerciseContextEngine();
  const upright = engine.process(packet(), 'pushup');
  assert.equal(upright.exerciseContext.phase,'PUSHUP_TRANSITION');
  assert.equal(upright.exerciseContext.frameStats.anchoredContacts,0);
});

test('forward bend is not enough to become push-up horizontal when hips and ankles are not aligned', () => {
  const engine = phase4.createExerciseContextEngine({ pushupEnterFrames:1 });
  const bent = packet({
    left_shoulder:[40,80], right_shoulder:[40,100], left_hip:[100,82], right_hip:[100,98],
    left_ankle:[105,180], right_ankle:[120,180]
  });
  const out = engine.process(bent,'pushup');
  assert.equal(out.exerciseContext.phase,'PUSHUP_TRANSITION');
  assert.equal(out.exerciseContext.frameStats.anchoredContacts,0);
});

test('horizontal push-up establishes wrist and ankle contact anchors after confirmation', () => {
  const engine = phase4.createExerciseContextEngine({ pushupEnterFrames:2 });
  const first = engine.process(horizontalPacket(),'pushup');
  assert.equal(first.exerciseContext.phase,'PUSHUP_TRANSITION');
  assert.equal(first.exerciseContext.frameStats.anchoredContacts,0);
  const second = engine.process(horizontalPacket(),'pushup');
  assert.equal(second.exerciseContext.phase,'PUSHUP_HORIZONTAL');
  assert.equal(second.exerciseContext.frameStats.anchoredContacts,4);
});

test('single noisy transition frame does not release established push-up contacts', () => {
  const engine = phase4.createExerciseContextEngine({ pushupEnterFrames:2, pushupExitFrames:2 });
  engine.process(horizontalPacket(),'pushup');
  const active = engine.process(horizontalPacket(),'pushup');
  assert.equal(active.exerciseContext.frameStats.anchoredContacts,4);
  const oneBad = engine.process(packet(),'pushup');
  assert.equal(oneBad.exerciseContext.phase,'PUSHUP_HORIZONTAL');
  assert.equal(oneBad.exerciseContext.frameStats.anchoredContacts,4);
  const confirmedExit = engine.process(packet(),'pushup');
  assert.equal(confirmedExit.exerciseContext.phase,'PUSHUP_TRANSITION');
  assert.equal(confirmedExit.exerciseContext.frameStats.anchoredContacts,0);
});

test('side-on push-up uses torso length for body scale so small drift does not release contacts', () => {
  const engine = phase4.createExerciseContextEngine({ pushupEnterFrames:1, anchorCorrectionGain:1, anchorCorrectionMinRatio:.001 });
  const first = engine.process(horizontalPacket(),'pushup');
  assert.equal(first.exerciseContext.frameStats.anchoredContacts,4);
  assert.ok(first.exerciseContext.bodyScalePx > 50, `expected torso-derived body scale, got ${first.exerciseContext.bodyScalePx}`);
  const drifted = engine.process(horizontalPacket({ left_wrist:[35,110] }),'pushup');
  assert.equal(drifted.exerciseContext.frameStats.anchoredContacts,4);
  assert.equal(find(drifted,'left_wrist').exerciseConstraintState,'contact_anchor_corrected');
  assert.equal(find(drifted,'left_wrist').x,30);
});

test('jumping jack classifies open state without planting the feet', () => {
  const engine = phase4.createExerciseContextEngine({ jackOpenAnkleRatio:1.4 });
  const out = engine.process(packet({ left_wrist:[35,20], right_wrist:[65,20], left_ankle:[20,180], right_ankle:[80,180] }), 'jumping_jack');
  assert.equal(out.exerciseContext.phase,'JACK_OPEN');
  assert.equal(out.exerciseContext.frameStats.anchoredContacts,0);
});

test('Phase 2 tracker reset clears Phase 4 contact context before next frame', () => {
  let trackerResets = 1;
  global.PocketPTMirrorMotionPhase2 = { diagnostics: () => ({ trackerResets }) };
  global.__selectedExercise = 'Bodyweight Squat';
  const wrapped = phase4.wrapRenderer(packetOut => packetOut);
  const first = wrapped(packet());
  assert.equal(first.exerciseContext.frameStats.anchoredContacts,2);
  trackerResets = 2;
  const second = wrapped(packet());
  assert.equal(phase4.diagnostics().contextResets >= 1,true);
  assert.equal(second.exerciseContext.pattern,'squat');
  delete global.PocketPTMirrorMotionPhase2;
  delete global.__selectedExercise;
});

test('renderer wrapper passes exercise-context packet to downstream renderer', () => {
  let received = null;
  const wrapped = phase4.wrapRenderer(p => { received = p; return true; });
  const raw = packet();
  assert.equal(wrapped(raw), true);
  assert.ok(received.exerciseContext);
});

test('diagnostics expose exercise state, contacts, hysteresis, resets and first failure boundary', () => {
  const text = phase4.diagnosticsText();
  assert.match(text,/First failing boundary:/);
  assert.match(text,/Exercise pattern:/);
  assert.match(text,/Exercise phase:/);
  assert.match(text,/Anchored contacts:/);
  assert.match(text,/Anchor corrections:/);
  assert.match(text,/Push-up enter streak:/);
  assert.match(text,/Push-up exit streak:/);
  assert.match(text,/Context resets:/);
});
