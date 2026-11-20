'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/quins-threejs-2v2.html'),'utf8');
test('2v2 has exactly two attackers and two defenders',()=>{
 assert.match(html,/a1:actor\(/);assert.match(html,/a2:actor\(/);assert.match(html,/d1:actor\(/);assert.match(html,/d2:actor\(/);
 assert.match(html,/starts=\{a1:/);
});
test('all four defensive reads and four attack decisions are present',()=>{
 for(const x of ['balanced','press','drift','jam','fix','carry','wide','hold'])assert.ok(html.includes(x),x);
 for(const x of ['id="play"','id="pause"','id="reset"','id="replay"','id="new"','id="camera"'])assert.ok(html.includes(x),x);
});
test('decision outcome depends on both defense and choice, and reset clears state',()=>{
 assert.match(html,/const outcomes=\{/);assert.match(html,/return outcomes\[s\]\[c\]/);
 assert.match(html,/function newRep\(\)\{phase='read';choice=null/);
 assert.match(html,/role="status" aria-live="polite"/);
});
test('prototype does not claim to be the protected coach playbook',()=>{
 assert.match(html,/Illustrative decision model/);assert.match(html,/not a verified reconstruction/);
 assert.doesNotMatch(html,/\/api\/quins\/ravens\/play/);
});
