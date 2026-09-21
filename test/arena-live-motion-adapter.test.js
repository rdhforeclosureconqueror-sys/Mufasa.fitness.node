'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const adapterApi = require('../public/arena-live-motion-adapter');
const {PoseCaptureEngine} = require('../public/push-up-challenge');
const profile = {poseAnalysis:{rules:[{minimumLandmarkConfidence:.35}]}};
const names = ['nose','left_eye','right_eye','left_ear','right_ear','left_shoulder','right_shoulder','left_elbow','right_elbow','left_wrist','right_wrist','left_hip','right_hip','left_knee','right_knee','left_ankle','right_ankle'];
function packet(at, elbowY = 45) {
  const points = {
    left_shoulder:[35,25],right_shoulder:[65,25],left_elbow:[30,elbowY],right_elbow:[70,elbowY],left_wrist:[25,65],right_wrist:[75,65],
    left_hip:[42,55],right_hip:[58,55],left_knee:[42,75],right_knee:[58,75],left_ankle:[42,95],right_ankle:[58,95]
  };
  return {at,video:{width:100,height:100},pose:{score:.95},keypoints:names.map((name,index)=>({name,x:points[name]?.[0]??50+index%2,y:points[name]?.[1]??10,score:.95}))};
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const canonicalProcess = input => ({...input,
  orientationIntent:{version:2,state:'QUARTER',confidence:.95,yawIntentDeg:12,source:'2d_projection',measuredDepth:false},
  floorTransitionIntent:{version:1,active:false,phase:'STANDING',direction:'NONE',progress01:0,confidence:.95}
});

test('one PoseCaptureEngine detector result branches to scoring frame and Mirror Motion source packet', async () => {
  let callback, created = 0, observed;
  const runtime = {initMoveNetDetector: async()=>{created++;return{};},startPoseLoop: options=>(callback=options.onPoseFrame,{stop(){}})};
  const capture = new PoseCaptureEngine({profile,poseRuntime:runtime,setTimer:null,onFrame:(frame,source)=>{observed={frame,source};}});
  const video={videoWidth:100,videoHeight:100}; const detector={};
  await capture.start(video,{detector}); callback({pose:packet(1).pose ? {keypoints:packet(1).keypoints} : null,inferenceMs:4});
  assert.equal(created,0); assert.ok(observed.frame.landmarks); assert.equal(observed.source.posePacket.keypoints.length,17);
  assert.equal(Object.hasOwn(observed.frame,'keypoints'),false);
});

test('headless adapter withholds mocap until canonical rest calibration and sends only processed joints', async () => {
  let at=1000; const sent=[], marks=[];
  const adapter=adapterApi.create({now:()=>at,randomUUID:()=> 'mocap-session-a',send:(event,payload)=>(sent.push({event,...payload}),sent.length),mark:(...x)=>marks.push(x),
    processPose: canonicalProcess,
    calibrationOptions:{stableFrames:1,settleMs:0,baseHoldMs:0,promptIntervalMs:0},speak:async()=>({ok:true})});
  assert.equal(adapter.observe(packet(at)),false); await flush();
  at+=1; assert.equal(adapter.observe(packet(at)),false); await flush();
  at+=1; assert.equal(adapter.observe(packet(at)),false); await flush();
  at+=1; adapter.observe(packet(at)); await flush();
  adapter.setExerciseCalibration(true);
  at+=1; assert.equal(adapter.observe(packet(at,55)),true);
  assert.equal(sent[0].event,'LIVE_MOCAP_ACQUIRE'); assert.ok(sent.slice(1).every(x=>x.event==='LIVE_MOCAP_FRAME'));
  const frame=sent.at(-1); assert.equal(frame.mocapVersion,1); assert.ok(frame.frameSequence >= 1); assert.equal(frame.restBaseReady,true);
  assert.ok(frame.joints.LeftArm); assert.ok(frame.joints.Hips); assert.equal(Object.hasOwn(frame,'keypoints'),false); assert.equal(JSON.stringify(frame).includes('token'),false);
  assert.equal(frame.semantics.foundation,'mirror-motion-phase2-18'); assert.equal(frame.semantics.orientation.yawIntentDeg,12);
  assert.ok(marks.some(x=>x[0]==='MIRROR_MOTION_INPUT'&&x[1]==='PASS'));
  assert.ok(adapter.diagnostics().canonicalFrames > 0);
});

test('release closes the mocap session and a later pose begins a new scoped sequence', async () => {
  let at=1, id=0; const sent=[];
  const adapter=adapterApi.create({now:()=>at,randomUUID:()=>`session-${++id}`,send:(event,payload)=>(sent.push({event,...payload}),sent.length),mark:()=>{},
    processPose: canonicalProcess,
    calibrationOptions:{stableFrames:1,settleMs:0,baseHoldMs:0},speak:async()=>({ok:true})});
  for(let i=0;i<4;i++){adapter.observe(packet(++at));await flush();}
  adapter.setExerciseCalibration(true);
  adapter.observe(packet(++at,55)); adapter.release('CAMERA_STOPPED');
  assert.equal(sent.at(-1).event,'LIVE_MOCAP_RELEASE'); assert.equal(sent.at(-1).mocapSessionId,'session-1');
  assert.equal(adapter.diagnostics().sessionId,null); assert.equal(adapter.diagnostics().frameSequence,0);
});

test('production adapter names the complete canonical Phase 2-18 foundation and closures', () => {
  const scripts = adapterApi.CANONICAL_SCRIPTS.join('\n');
  for (let phase=2; phase<=18; phase++) assert.match(scripts, new RegExp(`mirror-motion-phase${phase}\\.js`));
  assert.match(scripts,/mirror-motion-camera-review/);
  assert.match(scripts,/mirror-motion-camera-activation/);
});


test('floor calibration selects the complete five-joint side instead of the scoring three-joint winner', () => {
  const capture = new PoseCaptureEngine({profile, setTimer:null});
  const kp = (name,x,y,score)=>({name,x,y,score});
  const pose={keypoints:[
    kp('left_shoulder',20,30,.99),kp('left_elbow',30,30,.20),kp('left_wrist',40,30,.20),kp('left_hip',50,32,.99),kp('left_ankle',80,34,.99),
    kp('right_shoulder',20,60,.80),kp('right_elbow',30,60,.80),kp('right_wrist',40,60,.80),kp('right_hip',50,62,.80),kp('right_ankle',80,64,.80)
  ]};
  const frame=capture.transform(pose,{width:100,height:100},1000);
  assert.equal(frame.side,'right');
  assert.equal(frame.sequenceLandmarks.elbow.confidence,.8);
  assert.equal(frame.sequenceLandmarks.wrist.confidence,.8);
});
