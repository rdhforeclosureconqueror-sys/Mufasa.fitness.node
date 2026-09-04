'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const THREE=require('three');
const phase8=require('../public/mirror-motion-phase8.js');

function solverWithExistingRoll(roll=.35){
  const rest=new THREE.Quaternion().setFromEuler(new THREE.Euler(.1,.05,-.08));
  const z=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),roll);
  return {THREE,rootRestQuaternion:rest.clone(),rootTargetQuaternion:rest.clone().multiply(z)};
}

test('accepted facing intent is clamped and applied as rest-relative Y yaw without erasing existing root rotation',()=>{
  phase8.reset();
  const solver=solverWithExistingRoll(.31);
  const originalDelta=solver.rootRestQuaternion.clone().invert().multiply(solver.rootTargetQuaternion.clone());
  const ok=phase8.applyYawToSolver(solver,{state:'SIDE',confidence:.95,yawIntentDeg:120,source:'2d_projection',measuredDepth:false});
  assert.equal(ok,true);
  assert.equal(solver.facingYawAppliedDeg,65);
  const expected=solver.rootRestQuaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),65*Math.PI/180)).multiply(originalDelta).normalize();
  assert.ok(1-Math.abs(expected.dot(solver.rootTargetQuaternion))<1e-10);
});

test('weak intent holds prior yaw only for a bounded number of frames, then releases',()=>{
  phase8.reset();
  assert.equal(phase8.chooseYaw({state:'SIDE',confidence:.9,yawIntentDeg:40,source:'2d_projection',measuredDepth:false}),40);
  for(let i=0;i<phase8.DEFAULTS.maxWeakHoldFrames;i++) assert.equal(phase8.chooseYaw({state:'SIDE',confidence:.2,yawIntentDeg:40,source:'hold',measuredDepth:false}),40);
  assert.equal(phase8.chooseYaw({state:'SIDE',confidence:.2,yawIntentDeg:40,source:'hold',measuredDepth:false}),0);
});

test('claimed measured depth clears stored yaw so weak intent cannot resurrect it',()=>{
  phase8.reset();
  phase8.chooseYaw({state:'SIDE',confidence:.99,yawIntentDeg:50,source:'2d_projection',measuredDepth:false});
  assert.equal(phase8.chooseYaw({state:'SIDE',confidence:.99,yawIntentDeg:50,source:'2d_projection',measuredDepth:true}),0);
  assert.equal(phase8.diagnostics().lastYawDeg,0);
  assert.equal(phase8.chooseYaw({state:'SIDE',confidence:.2,yawIntentDeg:50,source:'hold',measuredDepth:false}),0);
});

test('solver replacement clears prior solver yaw history before weak intent is considered',()=>{
  phase8.reset();
  const a=solverWithExistingRoll(0),b=solverWithExistingRoll(0);
  phase8.applyYawToSolver(a,{state:'SIDE',confidence:.95,yawIntentDeg:45,source:'2d_projection',measuredDepth:false});
  phase8.applyYawToSolver(b,{state:'SIDE',confidence:.2,yawIntentDeg:45,source:'hold',measuredDepth:false});
  assert.equal(b.facingYawAppliedDeg,0);
  assert.ok(phase8.diagnostics().contextResets>=1);
});

test('front-facing trusted intent returns yaw to neutral',()=>{
  phase8.reset();
  phase8.chooseYaw({state:'SIDE',confidence:.95,yawIntentDeg:-45,source:'2d_projection',measuredDepth:false});
  assert.equal(phase8.chooseYaw({state:'FRONT',confidence:.95,yawIntentDeg:0,source:'2d_projection',measuredDepth:false}),0);
});

test('runtime loader includes Phase 7 before Phase 8 and exposes distinct load failures',()=>{
  const fs=require('node:fs');
  const source=fs.readFileSync(require.resolve('../public/runtime-state.js'),'utf8');
  const seven=source.indexOf('/mirror-motion-phase7.js?v=20260904-phase7');
  const eight=source.indexOf('/mirror-motion-phase8.js?v=20260904-phase8');
  assert.ok(seven>=0&&eight>seven);
  assert.match(source,/MIRROR_MOTION_PHASE7_LOAD_FAILED/);
  assert.match(source,/MIRROR_MOTION_PHASE8_LOAD_FAILED/);
});

test('Phase 7 and Phase 8 both observe Phase 2 tracker reset lifecycle',()=>{
  const fs=require('node:fs');
  const seven=fs.readFileSync(require.resolve('../public/mirror-motion-phase7.js'),'utf8');
  const eight=fs.readFileSync(require.resolve('../public/mirror-motion-phase8.js'),'utf8');
  assert.match(seven,/trackerResetCount/);
  assert.match(seven,/engine\.reset\(\)/);
  assert.match(eight,/PHASE2_TRACKER_RESET/);
});

test('diagnostics expose first-failure, context resets and no-depth authority',()=>{
  const text=phase8.diagnosticsText();
  assert.match(text,/First failing boundary:/);
  assert.match(text,/Context resets:/);
  assert.match(text,/Measured depth authority: NO/);
  assert.match(text,/Applied yaw:/);
});
