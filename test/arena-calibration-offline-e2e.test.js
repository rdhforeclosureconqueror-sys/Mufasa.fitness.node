'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Calibration = require('../public/arena-pose-calibration');

function topFrame(timestamp) {
  const points={shoulder:[.1,.1],elbow:[.3,.1],wrist:[.5,.1],hip:[.1,.3],ankle:null};
  return {timestamp,sourceWidth:1000,sourceHeight:1000,side:'left',calibrationUsable:true,analysisUsable:false,trackingState:'DEGRADED',sequenceLandmarks:Object.fromEntries(Object.entries(points).map(([name,value])=>[name,value&&{x:value[0],y:value[1],confidence:.9}]))};
}

test('offline backend plus local frames plus READY enters CAPTURE_TOP and stores TOP', async () => {
  let now=1000, configured, backendCalls=0;
  const calibration=Calibration.create({now:()=>now});
  calibration.start();
  const root={askCoach:async()=>{backendCalls++;throw new Error('backend unavailable');},CoachRuntime:{configure(value){configured=value;},getState:()=>({configured:true}),speak:async()=>({ok:false,reason:'backend_unavailable'})}};
  root.window=root;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/arena-coach-runtime.js'),'utf8'),root);
  root.PocketPTArenaCoachRuntime.installCommandHandler(async command => {
    if (!['ready','im ready','i am ready'].includes(command)) return false;
    return calibration.beginReadyCapture();
  });
  assert.equal(configured.deps.bareCommandMatcher('READY!'),true);
  const dispatch=await configured.deps.dispatchCommand('READY!',{source:'speech-recognition'});
  assert.equal(dispatch.arenaCommand,true);
  assert.equal(calibration.snapshot().stage,'CAPTURE_TOP');
  for (const elapsed of [0,220,440,660,880]) {now=1000+elapsed; calibration.observe(topFrame(now),.4);}
  assert.equal(calibration.snapshot().stage,'WAIT_BOTTOM_READY');
  assert.equal(calibration.diagnostics().topReferenceStored,true);
  assert.equal(backendCalls,0);
});
