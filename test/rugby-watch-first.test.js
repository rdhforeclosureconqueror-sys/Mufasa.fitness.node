'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const js=fs.readFileSync(path.join(__dirname,'../public/rugby-watch-first.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../public/rugby-player.html'),'utf8');
test('teaching demo identifies direction, ball, defense, and example status',()=>{
 for(const text of ['ATTACK DIRECTION','BACKWARD','PASS BEFORE CONTACT','generic teaching example','data-ball','data-d1','data-d2','Watch example','Next step'])assert.ok(js.includes(text),text);
});
test('Rugby HQ loads example after auth and before the existing sandbox',()=>{
 const auth=html.indexOf('if(!auth?.ok)');
 const demo=html.indexOf("demoScript.src='/rugby-watch-first.js'");
 const lesson=html.indexOf("lessonScript.src='/rugby-attack-intelligence.js'");
 assert.ok(auth>=0&&auth<demo&&demo<lesson);
});
test('demo avoids publishing restricted Quin play sequence',()=>{
 for(const term of ['DOUBLE WEDGE','RAVENS MF','FLASH option','#12 CRASH'])assert.equal(js.includes(term),false,term);
});
