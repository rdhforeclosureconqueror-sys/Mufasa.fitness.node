'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../public/arena-pose-calibration');

function pose(kind, timestamp, width = 640, height = 480, side = 'left') {
  const points = kind === 'BOTTOM'
    ? {shoulder: [140,180], elbow: [90,220], wrist: [140,240], hip: [280,180], ankle: [450,180]}
    : {shoulder: [140,100], elbow: [140,160], wrist: [140,220], hip: [280,100], ankle: [450,100]};
  return {timestamp, sourceWidth: width, sourceHeight: height, side, analysisUsable: true, trackingState: 'LOCKED',
    sequenceLandmarks: Object.fromEntries(Object.entries(points).map(([name,[x,y]]) => [name,{x:x/width,y:y/height,confidence:.95}]))};
}
function fixture() {
  let time = 0, id = 0; const timers = new Map(), updates = [];
  const calibration = C.create({now: () => time, onChange: s => updates.push(s),
    setTimer(fn, delay) {timers.set(++id,{fn,at:time+delay});return id;}, clearTimer: key => timers.delete(key)});
  function at(next) {time=next; for (const [key,timer] of [...timers]) if(timer.at<=time){timers.delete(key);timer.fn();}}
  function hold(kind, fps = 30, duration = 1200) {
    if (calibration.snapshot().stage.startsWith('WAIT_')) calibration.beginReadyCapture();
    const start=time; for(let i=0;i<=Math.ceil(duration*fps/1000);i++){at(start+i*1000/fps);calibration.observe(pose(kind,time),.75);}
    at(time+20);
  }
  return {calibration,timers,updates,at,hold,now:()=>time};
}
for (const fps of [5,10,15,30,60,120]) test(`stable TOP/BOTTOM/TOP capture works at ${fps} pose frames per second`,()=>{
  const f=fixture();f.calibration.start();f.hold('TOP',fps);
  assert.equal(f.calibration.snapshot().stage,'WAIT_BOTTOM_READY');f.hold('BOTTOM',fps);
  assert.equal(f.calibration.snapshot().stage,'WAIT_TOP_CONFIRM_READY');f.hold('TOP',fps);
  assert.equal(f.calibration.snapshot().stage,'CALIBRATED');assert.equal(f.timers.size,0);
});
test('angles use source dimensions, not independently normalized x and y',()=>{
  const a=pose('BOTTOM',0,640,480),b=pose('BOTTOM',0,480,640);
  const x=C.signature(a,.75),y=C.signature(b,.75);
  for(let i=0;i<x.length;i++)assert.ok(Math.abs(x[i]-y[i])<1e-8);
  assert.equal(C.signature({...a,sourceWidth:undefined},.75),null);
});
test('duplicate, backward, stale, future and out-of-frame samples cannot capture',()=>{
  for(const variant of ['duplicate','backward','stale','future','outside']) {
    const f=fixture();f.calibration.start();f.calibration.beginReadyCapture();
    for(let i=0;i<50;i++){f.at(i*100);const p=pose('TOP',f.now());
      if(variant==='duplicate')p.timestamp=0;if(variant==='backward')p.timestamp=-i;
      if(variant==='stale')p.timestamp-=2100;if(variant==='future')p.timestamp+=2000;
      if(variant==='outside')p.sequenceLandmarks.elbow.x=2;
      f.calibration.observe(p,.75);
    }
    assert.equal(f.calibration.snapshot().topCaptured,false,variant);f.calibration.reset();
  }
});
test('tracking interruptions cannot join two short holds into one stable capture',()=>{
  const f=fixture();f.calibration.start();f.calibration.beginReadyCapture();
  for(let i=0;i<6;i++){f.at(i*50);f.calibration.observe(pose('TOP',f.now()),.75);}
  f.at(300);f.calibration.observe(null,.75);
  for(let i=0;i<6;i++){f.at(350+i*50);f.calibration.observe(pose('TOP',f.now()),.75);}
  assert.equal(f.calibration.snapshot().topCaptured,false);f.hold('TOP');assert.equal(f.calibration.snapshot().topCaptured,true);
});
test('every acquisition phase has a deadline and only explicit restart can recover',()=>{
  for(const phase of ['CAPTURE_TOP','CAPTURE_BOTTOM','CONFIRM_TOP']){
    const f=fixture();f.calibration.start();if(phase!=='CAPTURE_TOP')f.hold('TOP');if(phase==='CONFIRM_TOP')f.hold('BOTTOM');f.calibration.beginReadyCapture();
    assert.equal(f.calibration.snapshot().stage,phase);f.at(f.now()+30001);
    assert.equal(f.calibration.snapshot().stage,'NEEDS_RETRY');assert.equal(f.calibration.snapshot().reason,'TIMEOUT');
    assert.equal(f.calibration.snapshot().topCaptured,phase==='CAPTURE_TOP'?false:true);f.hold('TOP');assert.equal(f.calibration.snapshot().stage,'NEEDS_RETRY');
    f.calibration.start();f.hold('TOP');assert.equal(f.calibration.snapshot().stage,'WAIT_BOTTOM_READY');f.calibration.reset();assert.equal(f.timers.size,0);
  }
});
test('camera format change invalidates references while tracked-side churn is recoverable',()=>{
  const changed=fixture();changed.calibration.start();changed.hold('TOP');changed.calibration.beginReadyCapture();changed.at(changed.now()+100);
  changed.calibration.observe({...pose('BOTTOM',changed.now()),sourceWidth:1280},.75);
  assert.equal(changed.calibration.snapshot().stage,'NEEDS_RETRY');assert.equal(changed.calibration.snapshot().reason,'SOURCE_CHANGED');
  assert.equal(changed.calibration.snapshot().topCaptured,false);assert.equal(changed.timers.size,0);
  const side=fixture();side.calibration.start();side.hold('TOP');side.calibration.beginReadyCapture();side.at(side.now()+100);
  side.calibration.observe(pose('BOTTOM',side.now(),640,480,'right'),.75);
  assert.equal(side.calibration.snapshot().stage,'CAPTURE_BOTTOM');assert.equal(side.calibration.snapshot().topCaptured,true);
});
test('invalidate/reset clear templates and late timeout callbacks cannot corrupt a restart',()=>{
  const f=fixture();f.calibration.start();f.calibration.beginReadyCapture();const late=[...f.timers.values()][0].fn;
  f.hold('TOP');f.calibration.beginReadyCapture();f.calibration.invalidate();assert.equal(f.calibration.snapshot().stage,'NEEDS_RETRY');
  f.calibration.start();f.calibration.beginReadyCapture();late();assert.equal(f.calibration.snapshot().stage,'CAPTURE_TOP');
  f.calibration.reset();assert.equal(f.calibration.snapshot().stage,'IDLE');assert.equal(f.timers.size,0);
});
test('tracking loss pauses capture and preserves references until the bounded phase deadline',()=>{
  const f=fixture();f.calibration.start();f.hold('TOP');
  f.calibration.observe(null,.75);f.at(f.now()+500);f.calibration.observe(pose('BOTTOM',f.now()),.75);
  assert.equal(f.calibration.snapshot().topCaptured,true);
  f.hold('BOTTOM');f.hold('TOP');assert.equal(f.calibration.snapshot().calibrated,true);
  f.calibration.observe(null,.75);f.at(f.now()+1501);
  assert.equal(f.calibration.snapshot().reason,null);
  assert.equal(f.calibration.snapshot().topCaptured,true);
});
test('calibrated references reject stale classification and are erased by source changes',()=>{
  const f=fixture();f.calibration.start();f.hold('TOP');f.hold('BOTTOM');f.hold('TOP');
  assert.equal(f.calibration.classify(pose('TOP',f.now()),.75),'TOP');
  assert.equal(f.calibration.classify(pose('TOP',f.now()-2001),.75),'UNUSABLE');
  assert.equal(f.calibration.classify(pose('TOP',f.now(),640,480,'right'),.75),'UNUSABLE');
  f.at(f.now()+100);f.calibration.observe(pose('TOP',f.now(),1280,480,'left'),.75);
  assert.equal(f.calibration.snapshot().stage,'NEEDS_RETRY');
});
test('a long sampling gap resets the hold even without an explicit unusable frame',()=>{
  const f=fixture();f.calibration.start();f.calibration.beginReadyCapture();
  for(const time of [0,100,200,601,701,801]){f.at(time);f.calibration.observe(pose('TOP',time),.75);}
  assert.equal(f.calibration.snapshot().topCaptured,false);
  f.hold('TOP');assert.equal(f.calibration.snapshot().topCaptured,true);
});
