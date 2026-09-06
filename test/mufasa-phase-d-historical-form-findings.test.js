'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const { validateFormFindings, validateWorkoutTracking }=require('../src/validation/retentionValidators');
const { createCoachContextService }=require('../src/ai/coachContextService');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('validator persists only bounded needs_attention form findings and strips unknown raw fields',()=>{
  const findings=validateFormFindings([{
    exerciseId:'squat',setIndex:1,ruleId:'knee_tracking',status:'needs_attention',affectedFramePercentage:42,
    maximumConsecutiveDurationMs:875,confidence:.91,recordedAt:'2026-09-06T05:00:00.000Z',source:'workout_form_runtime',
    rawKeypoints:[{x:1,y:2}],videoUrl:'secret'
  }]);
  assert.equal(findings.length,1);
  assert.equal(findings[0].ruleId,'knee_tracking');
  assert.equal('rawKeypoints' in findings[0],false);
  assert.equal('videoUrl' in findings[0],false);
  assert.throws(()=>validateFormFindings([{exerciseId:'squat',setIndex:0,ruleId:'knee_tracking',status:'good',recordedAt:'2026-09-06T05:00:00.000Z',source:'workout_form_runtime'}]),/needs_attention/);
  assert.throws(()=>validateFormFindings([{exerciseId:'squat',setIndex:0,ruleId:'knee_tracking',status:'needs_attention',recordedAt:'2026-09-06T05:00:00.000Z',source:'manual_client_claim'}]),/source must be workout_form_runtime/);
});

test('workout tracking accepts deterministic form findings alongside ordinary completion facts',()=>{
  const tracking=validateWorkoutTracking({
    programId:'p1',workoutId:'w1',exercisesCompleted:['squat'],reps:20,sets:2,formScore:82,completionStatus:'completed',
    formFindings:[{exerciseId:'squat',setIndex:0,ruleId:'knee_tracking',status:'needs_attention',affectedFramePercentage:30,maximumConsecutiveDurationMs:600,confidence:.88,recordedAt:'2026-09-06T05:00:00.000Z',source:'workout_form_runtime'}]
  });
  assert.equal(tracking.formFindings.length,1);
  assert.equal(tracking.formFindings[0].source,'workout_form_runtime');
});

test('Mufasa context exposes recent persisted deterministic form history without raw media',()=>{
  const user={userId:'u1',sessions:{},yogaSessions:[],workoutTracking:[
    {workoutId:'older',ts:100,completionStatus:'completed',formFindings:[]},
    {workoutId:'latest',ts:200,completionStatus:'completed',formFindings:[{exerciseId:'squat',setIndex:1,ruleId:'knee_tracking',status:'needs_attention',affectedFramePercentage:45,maximumConsecutiveDurationMs:900,confidence:.92,source:'workout_form_runtime',rawKeypoints:[1,2,3]}]}
  ]};
  const context=createCoachContextService({userStore:{loadUser:()=>user},clock:()=>0}).build('u1');
  assert.equal(context.schemaVersion,3);
  assert.equal(context.formHistory.authority,'persisted_deterministic_workout_form');
  assert.equal(context.formHistory.latestWorkoutWithFindings.workoutId,'latest');
  assert.equal(context.formHistory.recentFindings[0].ruleId,'knee_tracking');
  assert.equal(context.formHistory.rawCameraMediaIncluded,false);
  assert.doesNotMatch(JSON.stringify(context.formHistory),/rawKeypoints/);
});

test('browser form runtime publishes only completed needs_attention observations into bounded workout memory',()=>{
  const source=read('public/workout-form-runtime.js');
  assert.match(source,/analysisStatus!==STATUS\.COMPLETED/);
  assert.match(source,/filter\(o=>o\?\.status==='needs_attention'\)/);
  assert.match(source,/__POCKETPT_FORM_FINDINGS_CURRENT_WORKOUT__/);
  assert.match(source,/slice\(-MAX_WORKOUT_FINDINGS\)/);
  assert.doesNotMatch(source,/videoUrl|rawKeypoints/);
});

test('dashboard completion bridge clears stale findings on new workout selection but preserves same-workout retry until persistence succeeds',()=>{
  const source=read('public/dashboard-runtime.js');
  assert.match(source,/formFindings: currentFormFindings\(detail\)/);
  assert.match(source,/addEventListener\("workout:selected"[\s\S]*clearPendingFormFindings\("new-workout-selected"\)/);
  const post=source.indexOf('const tracked = await authedRequest("/api/workouts/track"');
  const persistedClear=source.indexOf('clearPendingFormFindings("workout-persisted")');
  const catchIndex=source.indexOf('} catch (err) {',post);
  assert.ok(post>=0&&persistedClear>post,'form-memory clear must happen after canonical workout persistence succeeds');
  assert.ok(catchIndex>post&&persistedClear<catchIndex,'failed persistence must not clear pending findings needed for retry');
});
