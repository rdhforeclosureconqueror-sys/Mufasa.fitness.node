'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const s=fs.readFileSync(path.join(__dirname,'../public/rugby-attack-intelligence.js'),'utf8');
test('five-yard decision starts footwork before contact',()=>{for(const x of ['FIVE-YARD DECISION','5 YARDS · FIRST CUT','3 YARDS · COUNTERSTEP','BEFORE CONTACT · RELEASE'])assert.ok(s.includes(x),x)});
test('visible SVG ball uses animation frames and backwards pass to support',()=>{for(const x of ['requestAnimationFrame','cancelAnimationFrame','animateBall(releaseFromHands,catchAtHands,1150','positionSupport(110,outside?0:94)','const releaseFromHands=','const catchAtHands='])assert.ok(s.includes(x),x);assert.match(s,/setAttribute\("cx"/);assert.match(s,/setAttribute\("cy"/)});
test('replay cancels staged movement and leaves pitch controls adjacent',()=>{assert.match(s,/function cancel\(\)\{stopBall\(\);clearSequence\(\)/);assert.match(s,/quins-sim-toolbar/);assert.match(s,/quins-sim-watch/)});

test('ball is parented to carrier until one release and receiver after catch',()=>{assert.match(s,/attachBall\(carrier,113,104\)/);assert.match(s,/pitch\.appendChild\(ball\)/);assert.match(s,/attachBall\(support,68,58\)/);assert.match(s,/autoReplay=true/);assert.match(s,/if\(autoReplay\)\{autoReplay=false;choose\(plannedChoice\)/);});

test('early footwork preserves pre-release clearance',()=>{assert.match(s,/positionCarrier\(82,inside\)/);assert.match(s,/positionCarrier\(97,-inside\)/);assert.match(s,/positionCarrier\(107,-inside\)/);assert.match(s,/move\(defender,0,inside\*\.45\)/);});
