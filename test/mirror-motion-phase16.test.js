'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
function fresh(){const p=require.resolve('../public/mirror-motion-phase16');delete require.cache[p];return require(p);}

test('Phase 16 applies bounded partial compensation only for active planted-contact intent',()=>{
  const p=fresh();const solver={rootTargetPosition:{x:.2},fullBodyCalibrationState:'ACTIVE'};
  const ok=p.applyToSolver(solver,{active:true,rootXIntent:-.12,anchorCount:2,pattern:'squat',phase:'SQUAT_BENT'});
  assert.equal(ok,true);assert.ok(Math.abs(solver.rootTargetPosition.x-.128)<1e-9);assert.ok(Math.abs(solver.contactCompensationAppliedX-(-.072))<1e-9);
});

test('Phase 16 does not compensate when contacts are absent',()=>{
  const p=fresh();const solver={rootTargetPosition:{x:.2},fullBodyCalibrationState:'ACTIVE'};
  p.applyToSolver(solver,{active:true,rootXIntent:-.12,anchorCount:0});
  assert.equal(solver.rootTargetPosition.x,.2);assert.equal(solver.contactCompensationAppliedX,0);assert.equal(p.diagnostics().applications,0);
});

test('Phase 16 clamps bad upstream compensation',()=>{
  const p=fresh();const solver={rootTargetPosition:{x:0},fullBodyCalibrationState:'ACTIVE'};
  p.applyToSolver(solver,{active:true,rootXIntent:-9,anchorCount:2});assert.equal(solver.contactCompensationAppliedX,-.14);
});

test('Phase 16 analyzes contacts after current-frame Phase 14 root application',()=>{
  let sourceRootX=null;
  class Solver{constructor(){this.rootTargetPosition={x:0};this.fullBodyCalibrationState='ACTIVE';this.lateralRootAppliedX=0;}observe(){this.lateralRootAppliedX=.2;this.rootTargetPosition.x=.2;return 'observed';}}
  global.PocketPTAvaturnLivePoseSolver={AvaturnLivePoseSolver:Solver};
  global.PocketPTMirrorMotionPhase15={analyze:(packet,options)=>{sourceRootX=options.sourceRootX;return {...packet,contactCompensation:{active:true,rootXIntent:-options.sourceRootX,anchorCount:1,pattern:'squat',phase:'SQUAT_BENT'}};},reset(){}};
  const p=fresh();p.patchSolver();const solver=new Solver();const wrapped=p.wrapRenderer(packet=>solver.observe(packet));
  wrapped({exerciseContext:{anchors:{left_ankle:{x:0,y:0}}}});
  assert.equal(sourceRootX,.2);assert.ok(Math.abs(solver.rootTargetPosition.x-.08)<1e-9);
  delete global.PocketPTAvaturnLivePoseSolver;delete global.PocketPTMirrorMotionPhase15;
});

test('Phase 16 wrapper preserves downstream packet',()=>{
  const p=fresh();let seen=null;const packet={exerciseContext:{anchors:{}}};const wrapped=p.wrapRenderer(value=>{seen=value;return 'ok';});
  const result=wrapped(packet);assert.equal(result,'ok');assert.equal(seen,packet);
});

test('Phase 12 live loader orders Phase 13 through Phase 16 and audits all four',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../public/mirror-motion-phase12.js'),'utf8');
  const i13=src.indexOf('/mirror-motion-phase13.js'),i14=src.indexOf('/mirror-motion-phase14.js'),i15=src.indexOf('/mirror-motion-phase15.js'),i16=src.indexOf('/mirror-motion-phase16.js');
  assert.ok(i13>=0&&i14>i13&&i15>i14&&i16>i15);assert.match(src,/MIRROR_MOTION_PHASE15_LOAD_FAILED/);assert.match(src,/MIRROR_MOTION_PHASE16_LOAD_FAILED/);
});

test('Phase 16 diagnostics expose bounded root authority and no depth authority',()=>{
  const p=fresh();const text=p.diagnosticsText();assert.match(text,/Avatar root authority: YES \(bounded compensation only\)/);assert.match(text,/Measured depth authority: NO/);
});
