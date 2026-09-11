'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('production frontend build injects an early commit-cache-busted runtime config into workout shell',()=>{
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'pocketpt-debug-build-'));
  const commit='1234567890abcdef1234567890abcdef12345678';
  try{
    execFileSync(process.execPath,[path.join(root,'scripts/build-frontend.js')],{
      cwd:root,
      env:{...process.env,FRONTEND_BUILD_OUTPUT:out,VITE_GOOGLE_MAPS_BROWSER_API_KEY:'test-browser-key',GIT_COMMIT:commit},
      stdio:'pipe'
    });
    const workout=fs.readFileSync(path.join(out,'workout.html'),'utf8');
    assert.match(workout,new RegExp(`/runtime-config\\.js\\?v=${commit}`));
    assert.match(workout,/data-pocketpt-runtime-config="true"/);
    assert.equal((workout.match(/data-pocketpt-runtime-config="true"/g)||[]).length,1);
    const runtimeAt=workout.indexOf('/runtime-config.js');
    const formEngineAt=workout.indexOf('/form-engine.js');
    assert.ok(runtimeAt>=0 && formEngineAt>=0 && runtimeAt<formEngineAt,'runtime-config must establish debug presentation authority before core workout scripts');
  }finally{fs.rmSync(out,{recursive:true,force:true});}
});

test('runtime config loads current deployment identity diagnostics alongside the consolidated mirror authority',()=>{
  const runtime=read('public/runtime-config.js');
  assert.match(runtime,/\/mirror-debug-center\.js\?v=20260910-producer-authority-v5/);
  assert.match(runtime,/\/mirror-deployment-diagnostics\.js\?v=20260910-producer-authority-v2/);
  assert.match(runtime,/data-mirror-deployment-diagnostics/);
  assert.match(runtime,/PocketPTMirrorPresentationAuthority/);
  assert.match(runtime,/dynamicProducerSuppression: true/);
});

test('deployment diagnostics compare canonical frontend and backend deployment identities without creating another visible panel',()=>{
  const source=read('public/mirror-deployment-diagnostics.js');
  assert.match(source,/\/__frontend-version\.json/);
  assert.match(source,/\/api\/deployment\/identity/);
  assert.match(source,/Frontend\/backend parity/);
  assert.match(source,/front===back\?'ALIGNED':'MISMATCH'/);
  assert.match(source,/mirrorMotionDeploymentDebug/);
  assert.match(source,/style\.setProperty\('display','none','important'\)/);
  assert.doesNotMatch(source,/position\s*:\s*fixed/i,'deployment producer must not create a second visible overlay');
});

test('existing consolidated debug center still owns one launcher, Copy All, close and forced legacy hiding',()=>{
  const source=read('public/mirror-debug-center.js');
  assert.match(source,/pocketptMirrorDebugCenter/);
  assert.match(source,/pocketptMirrorDebugLauncher/);
  assert.match(source,/Copy All/);
  assert.match(source,/data-close/);
  assert.match(source,/style\.setProperty\('display','none','important'\)/);
});
