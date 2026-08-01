'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {ChallengeController,definitionFromDocument,validateChallengeDefinition}=require('../public/challenge-controller');
const definitions=require('../public/exercise-sequence-definitions');

function harness(definition){
  const calls=[],session={sequenceMatcher:{expected:()=>definition.initialPhase.toUpperCase()},start:(mode,setup)=>calls.push(['start',mode,setup]),observe:frame=>(calls.push(['observe',frame]),{frame}),finish:()=>(calls.push(['finish']),{summary:{valid:true}}),reset:()=>calls.push(['reset'])};
  const preview={setLiveTarget:(phase,paused)=>calls.push(['preview',phase,paused]),resumePreview:()=>calls.push(['resume'])};
  return{calls,session,preview,controller:new ChallengeController({definition,session,preview})};
}

test('generic challenge loads Push-Up metadata and delegates its lifecycle',()=>{const {controller,calls}=harness(definitions.pushUp);assert.equal(controller.metadata().title,'Push-Up Challenge');controller.start('practice',{requiredViewEstablished:true});controller.observe({trackingState:'LOCKED'});assert.deepEqual(controller.finish(),{summary:{valid:true}});assert.deepEqual(calls.map(call=>call[0]),['start','observe','preview','finish','resume']);});

test('second exercise definition loads without controller changes and remains fixture-only',()=>{const selected=definitionFromDocument({documentElement:{dataset:{exerciseSequenceId:'squat_fixture'}}},definitions.definitions),{controller}=harness(selected);assert.equal(controller.metadata().exerciseId,'squat_fixture');assert.equal(controller.metadata().title,'Squat Challenge Fixture');assert.equal(controller.metadata().productionEligible,false);controller.start('challenge');assert.equal(controller.state,'active');controller.finish();assert.equal(controller.state,'summary');});

test('challenge definitions fail clearly when required configuration is missing',()=>{const invalid={...definitions.squatFixture,challenge:{}};assert.equal(validateChallengeDefinition(invalid).valid,false);assert.throws(()=>harness(invalid),/challenge.title is required/);});
