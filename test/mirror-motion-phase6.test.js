'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const modulePath=require.resolve('../public/mirror-motion-phase6.js');
delete require.cache[modulePath];
const phase6=require(modulePath);

function point(name,x,y,extra={}){return{name,x,y,score:.95,confidence:.95,stabilityState:'smoothed',...extra};}
function packet({x=0,t=0,pattern='squat',phase='SQUAT_BENT',scale=100,anchors={},confidence=.95,state='smoothed'}={}){return{timestampMs:t,keypoints:[point('left_knee',x,0,{confidence,score:confidence,stabilityState:state})],structural:{bodyScalePx:scale},exerciseContext:{pattern,phase,bodyScalePx:scale,anchors}};}

test('small motion is damped instead of copied raw',()=>{
  const engine=phase6.createLiveCurveEngine({baseAlpha:.3,minAlpha:.1,maxAlpha:.9,velocityGain:0,accelerationGain:0});
  engine.process(packet({x:0,t:0}));
  const out=engine.process(packet({x:10,t:33}));
  assert.ok(out.keypoints[0].x>0&&out.keypoints[0].x<10);
  assert.equal(out.keypoints[0].curveState,'adaptive');
});

test('fast deliberate movement increases responsiveness when body scale is known',()=>{
  const slow=phase6.createLiveCurveEngine({baseAlpha:.25,velocityGain:.35,accelerationGain:0});
  slow.process(packet({x:0,t:0}));
  const slowOut=slow.process(packet({x:2,t:33}));
  const fast=phase6.createLiveCurveEngine({baseAlpha:.25,velocityGain:.35,accelerationGain:0});
  fast.process(packet({x:0,t:0}));
  const fastOut=fast.process(packet({x:20,t:33}));
  assert.ok(fastOut.keypoints[0].curveAlpha>slowOut.keypoints[0].curveAlpha);
});

test('planted contacts bypass curve smoothing',()=>{
  const engine=phase6.createLiveCurveEngine();
  const out=engine.process({timestampMs:0,keypoints:[point('left_ankle',40,90)],exerciseContext:{pattern:'squat',phase:'SQUAT_BENT',bodyScalePx:100,anchors:{left_ankle:{x:40,y:90}}},structural:{bodyScalePx:100}});
  assert.equal(out.keypoints[0].curveState,'anchor_passthrough');
  assert.equal(out.keypoints[0].x,40);
});

test('coasted or dropped measurements do not seed curve history',()=>{
  const engine=phase6.createLiveCurveEngine();
  const coast=engine.process(packet({x:50,t:0,state:'coasted'}));
  assert.equal(coast.keypoints[0].curveState,'uncertain_passthrough');
  const good=engine.process(packet({x:10,t:33}));
  assert.equal(good.keypoints[0].curveState,'seeded');
  assert.equal(good.keypoints[0].x,10);
});

test('missing body scale fails open without inventing a pixel scale',()=>{
  const engine=phase6.createLiveCurveEngine();
  const out=engine.process({timestampMs:0,keypoints:[point('left_knee',10,10)],exerciseContext:{pattern:'squat',phase:'SQUAT_BENT',anchors:{}},structural:{}});
  assert.equal(out.keypoints[0].curveState,'scale_unavailable_passthrough');
  assert.equal(engine.diagnostics().scaleBypasses,1);
});

test('exercise changes clear live curve history',()=>{
  const engine=phase6.createLiveCurveEngine({velocityGain:0,accelerationGain:0});
  engine.process(packet({x:0,t:0,pattern:'squat'}));
  engine.process(packet({x:5,t:33,pattern:'squat'}));
  const changed=engine.process(packet({x:30,t:66,pattern:'pushup',phase:'PUSHUP_HORIZONTAL'}));
  assert.equal(changed.keypoints[0].curveState,'seeded');
  assert.ok(engine.diagnostics().resets>=1);
});

test('per-frame telemetry reports tuning rather than cumulative frame counts',()=>{
  const engine=phase6.createLiveCurveEngine({velocityGain:0,accelerationGain:0});
  engine.process(packet({x:0,t:0}));
  const out=engine.process(packet({x:5,t:33}));
  assert.equal(out.liveCurve.frameStats.tunedPoints,1);
  assert.ok(out.liveCurve.estimatedLatencyMs>=0);
});

test('diagnostics expose curve latency, suppression and first failure boundary',()=>{
  const text=phase6.diagnosticsText();
  assert.match(text,/First failing boundary:/);
  assert.match(text,/Average suppression:/);
  assert.match(text,/Estimated curve latency:/);
  assert.match(text,/Scale bypasses:/);
});