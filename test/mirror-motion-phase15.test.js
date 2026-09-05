'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
function fresh(){const p=require.resolve('../public/mirror-motion-phase15');delete require.cache[p];return require(p);}

test('Phase 15 emits no compensation without planted contacts',()=>{
  global.PocketPTMirrorMotionPhase14={diagnostics:()=>({lastAppliedX:.12})};
  const p=fresh();const out=p.analyze({exerciseContext:{pattern:'squat',phase:'SQUAT_BENT',anchors:{}}});
  assert.equal(out.contactCompensation.active,false);assert.equal(out.contactCompensation.rootXIntent,0);
  delete global.PocketPTMirrorMotionPhase14;
});

test('Phase 15 opposes bounded Phase 14 lateral root motion when contacts are planted',()=>{
  global.PocketPTMirrorMotionPhase14={diagnostics:()=>({lastAppliedX:.12})};
  const p=fresh();const out=p.analyze({exerciseContext:{pattern:'squat',phase:'SQUAT_BENT',anchors:{left_ankle:{x:1,y:2},right_ankle:{x:3,y:4}}}});
  assert.equal(out.contactCompensation.active,true);assert.equal(out.contactCompensation.rootXIntent,-.12);assert.equal(out.contactCompensation.anchorCount,2);
  delete global.PocketPTMirrorMotionPhase14;
});

test('Phase 15 prefers explicit same-frame root evidence over stale global diagnostics',()=>{
  global.PocketPTMirrorMotionPhase14={diagnostics:()=>({lastAppliedX:.2})};
  const p=fresh();const packet={exerciseContext:{anchors:{left_ankle:{x:0,y:0}}}};
  const out=p.analyze(packet,{sourceRootX:0});
  assert.equal(out.contactCompensation.sourceRootX,0);
  assert.equal(out.contactCompensation.rootXIntent,0);
  assert.equal(out.contactCompensation.active,false);
  delete global.PocketPTMirrorMotionPhase14;
});

test('Phase 15 clamps compensation and preserves review-first authority boundary',()=>{
  global.PocketPTMirrorMotionPhase14={diagnostics:()=>({lastAppliedX:.8})};
  const p=fresh();const out=p.analyze({exerciseContext:{anchors:{left_wrist:{x:0,y:0}}}});
  assert.equal(out.contactCompensation.rootXIntent,-.22);const d=p.diagnostics();assert.equal(d.avatarRootAuthority,false);assert.equal(d.measuredDepthAuthority,false);
  delete global.PocketPTMirrorMotionPhase14;
});

test('Phase 15 uses release hysteresis instead of flickering off immediately',()=>{
  let x=.1;global.PocketPTMirrorMotionPhase14={diagnostics:()=>({lastAppliedX:x})};
  const p=fresh();const packet={exerciseContext:{anchors:{left_ankle:{x:0,y:0}}}};
  assert.equal(p.analyze(packet).contactCompensation.active,true);x=0;
  assert.equal(p.analyze(packet).contactCompensation.active,true);assert.equal(p.analyze(packet).contactCompensation.active,true);assert.equal(p.analyze(packet).contactCompensation.active,false);
  delete global.PocketPTMirrorMotionPhase14;
});

test('Phase 15 diagnostics identify review-first no-root authority',()=>{const p=fresh();const text=p.diagnosticsText();assert.match(text,/Avatar root authority: NO \(review-first\)/);assert.match(text,/Measured depth authority: NO/);});
