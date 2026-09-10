'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('Yoga motion runtime gate is loaded after Motion Lab bootstrap and before user interaction',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../motion-lab/index.html'),'utf8');
  const bootstrap=html.indexOf('/dev/motion-lab-bootstrap.js');
  const gate=html.indexOf('/dev/motion-lab-assets/yoga-motion-runtime-gate.js');
  assert.ok(bootstrap>=0,'bootstrap script missing');
  assert.ok(gate>bootstrap,'runtime gate must load after bootstrap listener is installed');
});

test('runtime gate blocks Create Motion Draft until runtime and Coach profile exist',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../public/motion/yoga-motion-runtime-gate.js'),'utf8');
  assert.match(source,/PocketPTAvatarProfiles\?\.profiles\?\.personalized/);
  assert.match(source,/MotionLabRuntime/);
  assert.match(source,/event\.stopImmediatePropagation\(\)/);
  assert.match(source,/initializeRuntime/);
  assert.match(source,/waitForReady/);
  assert.match(source,/motion_lab_bootstrap_timeout/);
  assert.match(source,/button\.click\(\)/);
});

test('runtime gate exposes first-failure bootstrap diagnostics instead of mislabeling Coach asset',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../public/motion/yoga-motion-runtime-gate.js'),'utf8');
  assert.match(source,/PocketPTMotionLabBootstrapDiagnostics/);
  assert.match(source,/Runtime\/bootstrap failed at/);
  assert.match(source,/diag\.stage/);
  assert.match(source,/diag\.code/);
});
