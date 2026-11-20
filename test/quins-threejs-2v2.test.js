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
 assert.match(html,/d1:\[-1,z-1\.5\],d2:\[0,z\+1\.5\]/);
 assert.match(html,/phase='counterstep'/);
 assert.match(html,/phase==='counterstep'&&clock>1\.1/);
});
test('pass is explicitly backward and has visible flight before receiver possession',()=>{
 assert.match(html,/Math\.min\(receiver\.x,carrier\.x-1\.2\)/);
 assert.match(html,/ball\.position\.set\(passStart\[0\]\+/);
 assert.match(html,/received=true/);
 assert.match(html,/if\(support==='inside'\)/);
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
