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
test('model clearly distinguishes illustrative results',()=>assert.match(html,/simplified scenario, not a guaranteed outcome/));
