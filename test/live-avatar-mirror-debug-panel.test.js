'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('protected live mirror lab exposes calibration-to-retarget first-failure diagnostics',()=>{
  const html=read('motion-lab/live-avatar-mirror.html'),runtime=read('motion-lab/live-avatar-mirror.js');
  for(const id of ['calibrationState','retargetGate','poseFramesReceived','calibrationBlockedFrames','retargetFramesExecuted','changedBones','firstFailingBoundary','mirrorNextAction','mirrorDebugReport'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(runtime,/renderMirrorDiagnostics/);
  assert.match(runtime,/mirror\?\.diagnostics/);
  assert.match(runtime,/__liveAvatarMirrorLabDiagnostics/);
  assert.match(runtime,/copyMirrorDebug/);
});
