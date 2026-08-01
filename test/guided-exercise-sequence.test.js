'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PUSH_UP_SEQUENCE, SequencePlayer } = require('../public/guided-exercise-sequence');

test('prototype is intentionally limited to the top-bottom-top push-up sequence', () => {
  assert.deepEqual(PUSH_UP_SEQUENCE.map(step => step.label), ['Top position', 'Bottom position', 'Top position']);
  assert.deepEqual(PUSH_UP_SEQUENCE.map(step => step.position), ['top', 'bottom', 'top']);
});

test('guided sequence repeats and can pause without camera setup', () => {
  let tick;
  const rendered = [];
  const player = new SequencePlayer({ onStep: step => rendered.push(step.label), setTimer: callback => (tick = callback, 1), clearTimer: () => {} });
  player.start();
  tick(); tick(); tick();
  assert.deepEqual(rendered, ['Top position', 'Bottom position', 'Top position', 'Top position']);
  assert.equal(player.toggle(), false);
});

test('live preview labels agree with every internal expected phase',()=>{const elements=new Map();const make=(id)=>({id,dataset:{},textContent:'',hidden:false,children:[],attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},addEventListener(){}});for(const id of ['movementPreview','guidedPreviewTitle','sequenceSteps','previewToggle','guidedPreviewNext'])elements.set(id,make(id));elements.get('sequenceSteps').children=[make('a'),make('b'),make('c')];const player=require('../public/guided-exercise-sequence').mount({getElementById:id=>elements.get(id)});for(const [phase,title,next] of [['TOP','Top position','Hold the top'],['LOWERING','Lowering','Continue lowering'],['BOTTOM','Bottom position','Hold the bottom'],['RISING','Rising','Continue pressing'],['TOP_COMPLETE','Top complete','Confirm the top']]){player.setLiveTarget(phase);assert.equal(elements.get('movementPreview').dataset.expectedPhase,phase);assert.equal(elements.get('guidedPreviewTitle').textContent,title);assert.match(elements.get('guidedPreviewNext').textContent,new RegExp(next));}});

test('challenge page exposes the guided preview before camera setup', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/push-up-challenge.html'), 'utf8');
  assert.ok(html.indexOf('id="movementPreview"') < html.indexOf('id="setupTitle"'));
  assert.match(html, /Top[\s\S]+Bottom[\s\S]+Top/);
  assert.match(html, /id="previewToggle"[^>]*>Pause preview/);
});
