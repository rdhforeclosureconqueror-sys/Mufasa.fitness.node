const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const bootstrap=fs.readFileSync(path.join(__dirname,'../motion-lab/motion-lab-bootstrap.js'),'utf8');
const integration=fs.readFileSync(path.join(__dirname,'../motion-lab/motion-lab-gym-compatibility-integration.js'),'utf8');

test('current Motion Lab keeps Thriller catalog while gym compatibility is isolated',()=>{
  assert.match(bootstrap,/thriller_motion_catalog/);
  assert.doesNotMatch(integration,/thriller_motion_catalog/);
});

test('integration does not replace canonical lifecycle owners',()=>{
  ['MotionViewerBoundary','PocketPTMotionLabPoseEditor','PocketPTMotionLabPhaseAuthoring','PocketPTMotionLabDiagnosticConsolidator'].forEach(owner=>assert.match(bootstrap,new RegExp(owner)));
  assert.doesNotMatch(integration,/MotionViewerBoundary\.create|PocketPTMotionLabPoseEditor\.install|PocketPTMotionLabPhaseAuthoring\.install/);
});
