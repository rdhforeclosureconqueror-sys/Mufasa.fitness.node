'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const modulePath=require.resolve('../public/mirror-motion-phase5.js');
delete require.cache[modulePath];
const phase5=require(modulePath);

function p(name,x,y,extra={}){ return {name,x,y,score:.95,confidence:.95,stabilityState:'smoothed',...extra}; }
function calibrated(length=5){ return {length,samples:6}; }
function packet({pattern='squat',anchors={left_ankle:{x:0,y:8}},points,segments}={}){
  return {
    keypoints:points||[
      p('left_hip',0,0),p('left_knee',3.2,3.8),p('left_ankle',0,8),
      p('right_hip',10,0),p('right_knee',13,4),p('right_ankle',10,8),
      p('left_shoulder',0,-10),p('left_elbow',3,-6),p('left_wrist',0,-2),
      p('right_shoulder',10,-10),p('right_elbow',13,-6),p('right_wrist',10,-2)
    ],
    structural:{bodyScalePx:10,segmentModel:segments||{
      left_thigh:calibrated(),left_shin:calibrated(),right_thigh:calibrated(),right_shin:calibrated(),
      left_upper_arm:calibrated(),left_forearm:calibrated(),right_upper_arm:calibrated(),right_forearm:calibrated()
    }},
    exerciseContext:{pattern,bodyScalePx:10,anchors}
  };
}
function find(out,name){ return out.keypoints.find(point=>point.name===name); }

test('solves a planted squat leg to calibrated segment lengths',()=>{
  const engine=phase5.createIKEngine();
  const out=engine.process(packet());
  const knee=find(out,'left_knee');
  assert.equal(knee.ikState,'solved');
  assert.ok(Math.abs(Math.hypot(knee.x,knee.y)-5)<1e-9);
  assert.ok(Math.abs(Math.hypot(knee.x,knee.y-8)-5)<1e-9);
  assert.equal(out.ik.frameStats.solvedChains,1);
});

test('preserves the existing bend side by choosing the nearest circle solution',()=>{
  const engine=phase5.createIKEngine();
  const out=engine.process(packet({points:[p('left_hip',0,0),p('left_knee',-3,4),p('left_ankle',0,8)]}));
  assert.ok(find(out,'left_knee').x<0);
});

test('does not solve a leg when Phase 4 has not established the distal contact',()=>{
  const engine=phase5.createIKEngine();
  const out=engine.process(packet({anchors:{}}));
  assert.equal(out.ik.frameStats.solvedChains,0);
  assert.equal(find(out,'left_knee').ikState,undefined);
});

test('does not solve from uncalibrated Phase 3 segment lengths',()=>{
  const engine=phase5.createIKEngine();
  const out=engine.process(packet({segments:{left_thigh:{length:5,samples:2},left_shin:{length:5,samples:2}}}));
  assert.equal(out.ik.frameStats.solvedChains,0);
  assert.equal(out.ik.frameStats.skippedChains,1);
  assert.equal(find(out,'left_knee').ikState,undefined);
});

test('solves planted push-up arm and leg chains',()=>{
  const engine=phase5.createIKEngine();
  const out=engine.process(packet({pattern:'pushup',anchors:{left_wrist:{},right_wrist:{},left_ankle:{},right_ankle:{}}}));
  assert.equal(out.ik.frameStats.solvedChains,4);
  assert.equal(find(out,'left_elbow').ikState,'solved');
  assert.equal(find(out,'right_knee').ikState,'solved');
});

test('does not solve against a coasted anchored endpoint',()=>{
  const engine=phase5.createIKEngine();
  const out=engine.process(packet({points:[p('left_hip',0,0),p('left_knee',3,4),p('left_ankle',0,8,{stabilityState:'coasted'})]}));
  assert.equal(out.ik.frameStats.solvedChains,0);
  assert.equal(out.ik.frameStats.skippedChains,1);
  assert.equal(find(out,'left_knee').ikState,undefined);
});

test('requires trustworthy bend evidence before creating new bend history',()=>{
  const engine=phase5.createIKEngine();
  const out=engine.process(packet({points:[p('left_hip',0,0),p('left_knee',3,4,{confidence:.1,score:.1}),p('left_ankle',0,8)]}));
  assert.equal(out.ik.frameStats.solvedChains,0);
  assert.equal(out.ik.frameStats.skippedChains,1);
  assert.match(out.ik.lastIssue,/IK_SKIPPED_NO_BEND_HINT:left_leg/);
  assert.equal(engine.diagnostics().bendHistoryChains,0);
});

test('clears chain bend history when its Phase 4 contact is released',()=>{
  const engine=phase5.createIKEngine();
  engine.process(packet());
  assert.equal(engine.diagnostics().bendHistoryChains,1);
  const released=engine.process(packet({anchors:{}}));
  assert.equal(released.ik.frameStats.historyClears,1);
  assert.equal(engine.diagnostics().bendHistoryChains,0);
  assert.equal(engine.diagnostics().contactHistoryClears,1);
});

test('reports unreachable geometry instead of forcing an impossible chain',()=>{
  const engine=phase5.createIKEngine();
  const out=engine.process(packet({points:[p('left_hip',0,0),p('left_knee',3,4),p('left_ankle',20,0)]}));
  assert.equal(out.ik.frameStats.unreachableChains,1);
  assert.equal(find(out,'left_knee').ikState,undefined);
  assert.match(out.ik.lastIssue,/IK_UNREACHABLE:left_leg/);
});

test('skips IK when the Phase 3 learned segment model is unavailable',()=>{
  const engine=phase5.createIKEngine();
  const out=engine.process(packet({segments:{}}));
  assert.equal(out.ik.frameStats.skippedChains,1);
});

test('renderer wrapper forwards the IK-solved packet downstream',()=>{
  let received=null;
  const wrapped=phase5.wrapRenderer(value=>{received=value;return 'ok';});
  assert.equal(wrapped(packet()),'ok');
  assert.ok(received.ik);
  assert.equal(find(received,'left_knee').ikState,'solved');
});

test('diagnostics expose first failure and IK chain counters',()=>{
  const text=phase5.diagnosticsText();
  assert.match(text,/First failing boundary:/);
  assert.match(text,/Chains solved:/);
  assert.match(text,/Unreachable chains:/);
  assert.match(text,/Skipped chains:/);
  assert.match(text,/Contact history clears:/);
  assert.match(text,/Max residual:/);
});
