'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/quins-threejs-2v2.html'),'utf8');
test('exactly two attacking and two defending actors',()=>{for(const name of ['a1','a2','d1','d2'])assert.ok(html.includes(name+':actor('));});
test('original three-part coaching workflow is available',()=>{
 for(const label of ['Place support outside','Place support inside','Draw defenders inside','Draw defenders outside','Draw & pass','Dummy & go outside','Dummy & cut inside','Kick & chase'])assert.ok(html.includes(label),label);
});
test('playback controls are immediately after the pitch',()=>{
 const pitch=html.indexOf('id="pitch"'),actions=html.indexOf('class="pitch-actions"'),setup=html.indexOf('id="setup"');
 assert.ok(pitch>=0&&actions>pitch&&setup>actions);
 for(const id of ['play','finish','pause','replay','reset','camera'])assert.ok(html.includes('id="'+id+'"'),id);
});
test('five-yard decision freezes and finish is user-triggered',()=>{
 assert.ok(html.includes("phase='decision';$('finish').disabled=false"));
 assert.ok(html.includes("if(phase!=='decision')return"));
 assert.ok(html.includes("$('finish').onclick=finish"));
});
test('model clearly distinguishes illustrative results',()=>assert.match(html,/Outcomes are simplified teaching hypotheses/));

test('inside draw compresses both defenders and uses an outside counterstep',()=>{
 assert.match(html,/d1:\[-1,z-1\.4\],d2:\[0,z\+1\.4\]/);
 assert.match(html,/phase='counterstep'/);
 assert.match(html,/phase==='counterstep'&&clock>1\.1/);
});
test('pass is explicitly backward and has visible flight before receiver possession',()=>{
 assert.match(html,/passEnd=\[receiver\.x,receiver\.z\]/);
 assert.match(html,/ball\.position\.set\(passStart\[0\]\+/);
 assert.match(html,/received=true/);
 assert.match(html,/const insideCovered=support==='inside'&&draw==='inside'/);
});

test('support lanes are consistent with camera-independent pitch coordinates',()=>{
 assert.match(html,/support==='inside'\?7:-9/);
 assert.match(html,/support==='outside'\?-10:9/);
});
test('kick starts at the decision and resolves by contested ball recovery',()=>{
 assert.match(html,/if\(plan==='kick'\)\{release\(\);return;\}/);
 assert.match(html,/kickOrigin=\[actors\.a1\.position\.x,actors\.a1\.position\.z\]/);
 assert.match(html,/const candidates=Object\.entries\(actors\)/);
 assert.match(html,/candidates\[0\]\.d<1\.8/);
});

test('receiver remains at pass endpoint until the ball arrives',()=>{
 assert.match(html,/targets\.a2=\[receiver\.x,receiver\.z\]/);
 assert.match(html,/if\(!passCaught\)/);
 assert.match(html,/passCaught=true;received=true/);
 assert.match(html,/targets\.a2=\[runner\.x\+10,runner\.z\]/);
});
test('inside support plus outside draw is a viable modeled release',()=>{
 assert.match(html,/support==='inside'&&draw==='outside'/);
 assert.match(html,/targets\.d1=\[-1,draw==='inside'\?-6:3\]/);
});
