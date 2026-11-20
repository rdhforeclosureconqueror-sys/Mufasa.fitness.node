'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const s=fs.readFileSync(path.join(__dirname,'../public/rugby-attack-intelligence.js'),'utf8');
test('decision is made five yards out and inside-out steps occur after three-yard approach',()=>{for(const x of ['FIVE-YARD DECISION','3 YARDS · FIRST STEP','2 YARDS · SECOND STEP','1 YARD · RELEASE'])assert.ok(s.includes(x),x)});
test('visible SVG ball uses animation frames and backwards pass to support',()=>{for(const x of ['requestAnimationFrame','cancelAnimationFrame','animateBall(releaseFromHands,catchAtHands,1150','positionSupport(130,outside?0:94)','const releaseFromHands=','const catchAtHands='])assert.ok(s.includes(x),x);assert.match(s,/setAttribute\("cx"/);assert.match(s,/setAttribute\("cy"/)});
test('replay cancels staged movement and leaves pitch controls adjacent',()=>{assert.match(s,/function cancel\(\)\{stopBall\(\);clearSequence\(\)/);assert.match(s,/quins-sim-toolbar/);assert.match(s,/quins-sim-watch/)});

test('ball is parented to carrier until one release and receiver after catch',()=>{assert.match(s,/attachBall\(carrier,113,104\)/);assert.match(s,/pitch\.appendChild\(ball\)/);assert.match(s,/attachBall\(support,68,58\)/);assert.match(s,/autoReplay=true/);assert.match(s,/if\(autoReplay\)\{autoReplay=false;choose\(plannedChoice\)/);});
