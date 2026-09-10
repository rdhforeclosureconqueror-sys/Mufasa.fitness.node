'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=relative=>fs.readFileSync(path.join(__dirname,'..',relative),'utf8');

test('Yoga production page pins Motion Lab handoff to canonical backend on mobile',()=>{
  const html=read('public/yoga.html');
  assert.match(html,/backendOrigin:\s*"https:\/\/mufasa-fitness-node\.onrender\.com"/);
  assert.match(html,/window\.MAAT_BACKEND_ORIGIN/);
  assert.doesNotMatch(html,/<script src="\/backend-origin\.js"><\/script>/);
});

test('Yoga runtime gate loads the generated motion registry through protected Motion Lab assets',()=>{
  const source=read('public/motion/yoga-motion-runtime-gate.js');
  assert.match(source,/motion-lab-generated-motion-registry\.js/);
  assert.match(source,/ensureGeneratedRegistry/);
  assert.match(source,/\/dev\/motion-lab-assets\//);
});

test('generated motion registry persists only after the generated motion is active and Play is enabled',()=>{
  const source=read('public/motion/motion-lab-generated-motion-registry.js');
  assert.match(source,/pocketpt\.motionLab\.generatedMotions\.v1/);
  assert.match(source,/pocketpt:motion-spec-generated/);
  assert.match(source,/play&&!play\.disabled&&selectedMotionMatches\(id\)/);
  assert.match(source,/FIRST FAILURE: generated Motion Spec did not become the active motion with an enabled Play control/);
  assert.match(source,/Generated Motions/);
  assert.match(source,/data-generated-motion/);
  assert.match(source,/runtime\.loadMotionSpec\(item\.contract\)/);
  assert.match(source,/contract\?\.spec\|\|contract/);
  assert.match(source,/Press Play to inspect/);
});
