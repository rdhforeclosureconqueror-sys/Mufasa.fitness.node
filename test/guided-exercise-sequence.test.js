'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SequencePlayer, previewSteps } = require('../public/guided-exercise-sequence');
const PUSH_UP_SEQUENCE=previewSteps(require('../public/exercise-sequence-definitions').pushUp);

test('Push-Up definition supplies its simplified preview sequence', () => {
  assert.deepEqual(PUSH_UP_SEQUENCE.map(step => step.label), ['Top position', 'Bottom position', 'Top position']);
  assert.deepEqual(PUSH_UP_SEQUENCE.map(step => step.position), ['top', 'bottom', 'top']);
});

test('guided sequence repeats and can pause without camera setup', () => {
  let tick;
  const rendered = [];
  const player = new SequencePlayer({ steps:PUSH_UP_SEQUENCE,onStep: step => rendered.push(step.label), setTimer: callback => (tick = callback, 1), clearTimer: () => {} });
  player.start();
  tick(); tick(); tick();
  assert.deepEqual(rendered, ['Top position', 'Bottom position', 'Top position', 'Top position']);
  assert.equal(player.toggle(), false);
});

test('live preview labels agree with every internal expected phase',()=>{const elements=new Map();const make=(id)=>({id,dataset:{},textContent:'',hidden:false,children:[],attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},addEventListener(){}});for(const id of ['movementPreview','guidedPreviewTitle','sequenceSteps','previewToggle','guidedPreviewNext'])elements.set(id,make(id));elements.get('sequenceSteps').children=[make('a'),make('b'),make('c')];const player=require('../public/guided-exercise-sequence').mount({getElementById:id=>elements.get(id)},{definition:require('../public/exercise-sequence-definitions').pushUp});for(const [phase,title,next] of [['TOP','Top position','Hold the top'],['LOWERING','Lowering','Continue lowering'],['BOTTOM','Bottom position','Hold the bottom'],['RISING','Rising','Continue pressing'],['TOP_COMPLETE','Top complete','Confirm the top']]){player.setLiveTarget(phase);assert.equal(elements.get('movementPreview').dataset.expectedPhase,phase);assert.equal(elements.get('guidedPreviewTitle').textContent,title);assert.match(elements.get('guidedPreviewNext').textContent,new RegExp(next));}});

test('challenge page exposes the guided preview before camera setup', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/push-up-challenge.html'), 'utf8');
  assert.ok(html.indexOf('id="movementPreview"') < html.indexOf('id="setupTitle"'));
  assert.match(html, /id="sequenceSteps"[^>]*><\/ol>/);
  assert.match(html, /id="previewToggle"[^>]*>Pause preview/);
});

test('arbitrary preview definitions are rendered without Push-Up assumptions',()=>{const definition={exerciseId:'fixture',initialPhase:'alpha',phases:[{id:'alpha',label:'Ready',visual:'ready',kind:'position',nextLabel:'Flow',nextPhase:'omega'},{id:'omega',label:'Finished',visual:'done',kind:'completion',nextPhase:'alpha',completesRepetition:true}],visualTemplate:{intervalMs:25,steps:[{phaseId:'alpha',label:'Begin here',visualKey:'custom-a',order:2},{phaseId:'omega',label:'All done',visualKey:'custom-z',order:4}]}};const steps=require('../public/guided-exercise-sequence').previewSteps(definition);assert.equal(steps.length,2);assert.deepEqual(steps.map(step=>step.label),['Begin here','All done']);assert.deepEqual(steps.map(step=>step.visualKey),['custom-a','custom-z']);});

test('active definition is selected by page metadata rather than an exercise-specific default',()=>{const api=require('../public/guided-exercise-sequence'),definitions=require('../public/exercise-sequence-definitions');assert.equal(api.resolveDefinition({documentElement:{dataset:{exerciseSequenceId:'squat_fixture'}}}),definitions.squatFixture);assert.throws(()=>api.resolveDefinition({documentElement:{dataset:{exerciseSequenceId:'unknown'}}}),/No exercise sequence definition/);});

test('pause, repeated resume, and reduced motion keep exactly one timer',()=>{let nextId=0,active=new Set();const player=new SequencePlayer({steps:PUSH_UP_SEQUENCE,reducedMotion:true,setTimer:()=>{const id=++nextId;active.add(id);return id;},clearTimer:id=>active.delete(id)});assert.equal(player.timer,null);player.start({manual:true});player.start({manual:true});assert.equal(active.size,1);player.pause();assert.equal(active.size,0);player.start();player.start();assert.equal(active.size,1);assert.equal(player.activeTimerCount(),1);});
