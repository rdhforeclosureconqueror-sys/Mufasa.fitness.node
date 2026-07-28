'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../public/push-up-challenge');
const metadata=require('../public/exercise-metadata');
const profile=C.getPushUpProfile(metadata);
const good=(timestamp,y=.5)=>({timestamp,usable:true,analysisUsable:true,trackingState:C.TRACKING_STATES.LOCKED,landmarks:{shoulder:{x:.1,y:.5,confidence:.9},hip:{x:.5,y,confidence:.9},ankle:{x:.9,y:.5,confidence:.9}}});
const bad=timestamp=>({timestamp,usable:false,analysisUsable:false,trackingState:C.TRACKING_STATES.DEGRADED,landmarks:{shoulder:null,hip:null,ankle:null}});

function locked(machine){for(let i=0;i<5;i++)machine.update(true,i*20);assert.equal(machine.state,C.TRACKING_STATES.LOCKED);}

test('tracking state machine stabilizes, degrades, recovers, and only reaches LOST after hard loss',()=>{const m=new C.TrackingStateMachine();assert.equal(m.state,'SEARCHING');assert.equal(m.update(true,0),'STABILIZING');for(let i=1;i<5;i++)m.update(true,i*20);assert.equal(m.state,'LOCKED');assert.equal(m.update(false,100),'DEGRADED');assert.equal(m.update(false,800),'DEGRADED');assert.equal(m.update(false,2100),'LOST');assert.equal(m.update(true,2120),'RECOVERING');m.update(true,2140);m.update(true,2160);assert.equal(m.update(true,2180),'LOCKED');assert.equal(m.recoveryEvents,1);});

test('one or several brief bad frames preserve the person lock and never become LOST',()=>{const m=new C.TrackingStateMachine();locked(m);m.update(false,120);m.update(false,500);assert.equal(m.state,'DEGRADED');m.update(true,520);m.update(true,540);m.update(true,560);m.update(true,580);assert.equal(m.state,'LOCKED');assert.ok(m.longestDropoutMs<750);});

test('landmark display hold is cached, display-only, and expires without becoming analysis usable',()=>{const c=new C.LandmarkContinuity();const points={shoulder:{x:.1,y:.2,confidence:.9},hip:{x:.3,y:.4,confidence:.9},ankle:{x:.5,y:.6,confidence:.9}};c.update(points,.75,0);let held=c.update({...points,ankle:{x:.5,y:.6,confidence:.2}},.75,200);assert.equal(held.analysis.ankle,null);assert.equal(held.display.ankle.cached,true);assert.equal(held.display.ankle.displayOnly,true);held=c.update({...points,ankle:{x:.5,y:.6,confidence:.2}},.75,800);assert.equal(held.display.ankle,null);assert.ok(c.history.ankle.confidenceEMA>.2);});

test('repetition state and count survive dropouts and recovery cannot synthesize a rep',()=>{const reps=new C.RepetitionEventEngine({movementThreshold:.04});reps.observe(good(0,.4));reps.observe(good(20,.46));assert.equal(reps.phase,'away');const count=reps.count;reps.observe(bad(40));assert.equal(reps.phase,'away');assert.equal(reps.lastConfirmedRepPhase,'away');assert.equal(reps.observe(good(60,.4)),null);assert.equal(reps.count,count);assert.equal(reps.phase,'top');});

test('dropouts at top, lowering, bottom, or rising never emit repetitions',()=>{for(const y of [.4,.43,.46,.42]){const reps=new C.RepetitionEventEngine();reps.observe(good(0,.4));if(y>.44)reps.observe(good(10,y));assert.equal(reps.observe(bad(20)),null);assert.equal(reps.observe(good(30,.4)),null);assert.equal(reps.count,0);}});

test('recorder strips cached display points and summarizes tracking interruptions',()=>{const recorder=new C.PerformanceRecorder({profile});recorder.start({mode:'practice',requiredViewEstablished:true});recorder.frame({...good(0),displayLandmarks:{ankle:{cached:true,displayOnly:true}}});recorder.frame(bad(100));recorder.frame(bad(200));recorder.frame(good(300));const stored=recorder.session.normalizedLandmarkFrames[0];assert.equal(stored.displayLandmarks,undefined);const result=recorder.finish();assert.equal(result.summary.recoveryEvents,1);assert.equal(result.summary.longestContinuousDropoutMs,100);assert.ok(result.summary.totalTrackingLossDurationMs>=100);});

test('person lock rejects implausible torso jumps without lowering confidence threshold',()=>{const capture=new C.PoseCaptureEngine({profile});assert.equal(capture.acceptPerson({center:{x:.2,y:.2},scale:.2}),true);assert.equal(capture.acceptPerson({center:{x:.9,y:.9},scale:.2}),false);assert.deepEqual(capture.personLock.center,{x:.2,y:.2});assert.equal(profile.poseAnalysis.rules[0].minimumLandmarkConfidence,.75);});

test('watchdog restarts a stalled loop once and does not create duplicate loops',()=>{let starts=0,stops=0;const runtime={startPoseLoop:()=>{starts++;return{stop(){stops++;}}}};const capture=new C.PoseCaptureEngine({profile,poseRuntime:runtime,setTimer:null,now:()=>5000});capture.video={videoWidth:100,videoHeight:100};capture.detector={};capture.startLoop();capture.lastInferenceCompletedAt=1000;assert.equal(capture.watchdogTick(5000),true);assert.equal(starts,2);assert.equal(stops,1);assert.equal(capture.poseLoopRestartCount,1);assert.equal(capture.watchdogTick(5001),false);assert.equal(starts,2);});

test('frame-processing exceptions always clear the inference guard and allow another frame',async()=>{let callback;const runtime={startPoseLoop:o=>(callback=o.onPoseFrame,{stop(){}})};const capture=new C.PoseCaptureEngine({profile,poseRuntime:runtime,setTimer:null,onFrame:()=>{throw new Error('transient')}});await capture.start({videoWidth:100,videoHeight:100},{detector:{}});callback({pose:null});assert.equal(capture.inferenceInProgress,false);assert.equal(capture.consecutiveInferenceErrors,1);callback({pose:null});assert.equal(capture.inferenceInProgress,false);});
