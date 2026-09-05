'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
function fresh(){const p=require.resolve('../public/mirror-motion-phase16');delete require.cache[p];return require(p);}

test('Phase 16 applies bounded partial compensation only for active planted-contact intent',()=>{
  const p=fresh();
  const solver={rootTargetPosition:{x:.2},fullBodyCalibrationState:'ACTIVE'};
  const ok=p.applyToSolver(solver,{active:true,rootXIntent:-.12,anchorCount:2,pattern:'squat',phase:'SQUAT_BENT'});
  assert.equal(ok,true);
  assert.ok(Math.abs(solver.rootTargetPosition.x-.128)<1e-9);
  assert.ok(Math.abs(solver.contactCompensationAppliedX-(-.072))<1e-9);
});

test('Phase 16 does not compensate when contacts are absent',()=>{
  const p=fresh();const solver={rootTargetPosition:{x:.2},fullBodyCalibrationState:'ACTIVE'};
  p.applyToSolver(solver,{active:true,rootXIntent:-.12,anchorCount:0});
  assert.equal(solver.rootTargetPosition.x,.2);
  assert.equal(solver.contactCompensationAppliedX,0);
});

test('Phase 16 clamps bad upstream compensation',()=>{
  const p=fresh();const solver={rootTargetPosition:{x:0},fullBodyCalibrationState:'ACTIVE'};
  p.applyToSolver(solver,{active:true,rootXIntent:-9,anchorCount:2});
  assert.equal(solver.contactCompensationAppliedX,-.14);
});

test('Phase 16 wrapper consumes Phase 15 metadata but preserves downstream packet',()=>{
  global.PocketPTMirrorMotionPhase15={analyze:packet=>({...packet,contactCompensation:{active:false,rootXIntent:0,anchorCount:0}})};
  const p=fresh();let seen=null;const wrapped=p.wrapRenderer(packet=>{seen=packet;return 'ok';});
  const result=wrapped({exerciseContext:{anchors:{}}});
  assert.equal(result,'ok');assert.ok(seen.contactCompensation);
  delete global.PocketPTMirrorMotionPhase15;
});

test('Phase 12 live loader orders Phase 13 through Phase 16 and audits all four',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../public/mirror-motion-phase12.js'),'utf8');
  const i13=src.indexOf("/mirror-motion-phase13.js");
  const i14=src.indexOf("/mirror-motion-phase14.js");
  const i15=src.indexOf("/mirror-motion-phase15.js");
  const i16=src.indexOf("/mirror-motion-phase16.js");
  assert.ok(i13>=0&&i14>i13&&i15>i14&&i16>i15);
  assert.match(src,/MIRROR_MOTION_PHASE15_LOAD_FAILED/);
  assert.match(src,/MIRROR_MOTION_PHASE16_LOAD_FAILED/);
});

test('Phase 16 diagnostics expose bounded root authority and no depth authority',()=>{
  const p=fresh();const text=p.diagnosticsText();
  assert.match(text,/Avatar root authority: YES \(bounded compensation only\)/);
  assert.match(text,/Measured depth authority: NO/);
});
