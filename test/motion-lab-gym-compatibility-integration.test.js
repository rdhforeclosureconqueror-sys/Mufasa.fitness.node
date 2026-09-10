const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../motion-lab/motion-lab-gym-compatibility-integration.js'),'utf8');

test('keeps gym compatibility outside the canonical Motion Lab bootstrap',()=>{
  assert.match(src,/motion-lab-gym-compatibility-integration-v2/);
  assert.match(src,/PocketPTMotionLabGymCompatibilityIntegration/);
});

test('orders personalized compatibility, controller, then panel',()=>{
  const personal=src.indexOf('PERSONAL_AVATAR_COMPATIBILITY');
  const controller=src.indexOf('GYM_COMPATIBILITY_CONTROLLER');
  const panel=src.indexOf('GYM_COMPATIBILITY_PANEL_SCRIPT');
  assert.ok(personal>=0&&controller>personal&&panel>controller);
});

test('waits for canonical runtime readiness before installing',()=>{
  assert.match(src,/RUNTIME_READY/);
  assert.match(src,/PocketPTMotionLabBootstrapDiagnostics/);
  assert.match(src,/gymCompatibilityState|personalizedAvatarState/);
});

test('reports first failure and verifies rendered panel',()=>{
  assert.match(src,/firstFailure/);
  assert.match(src,/GYM_COMPATIBILITY_PANEL_RENDER/);
  assert.match(src,/getElementById\("gymCompatibilityPanel"\)/);
});

test('does not own animation playback, Godot navigation, or body tracking',()=>{
  assert.doesNotMatch(src,/GO_TO_MAT|MoveNet|TensorFlow|playAnimation|NavigationAgent/);
});
