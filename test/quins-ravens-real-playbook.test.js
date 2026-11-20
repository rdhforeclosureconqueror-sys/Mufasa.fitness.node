'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {getPlay}=require('../src/services/quinsRavensPlaybook');
const {allowed,installQuinsProtectedRoutes}=require('../src/routes/quinsProtectedRoutes');
test('real coach-sourced RAVENS order and possession',()=>{
 const p=getPlay();assert.equal(p.stages.length,9);assert.deepEqual(p.stages.map(s=>s.id),['scrum','unders','ruck1','jets','roll','wedge10','wedge6','edge','ruck2']);
 assert.equal(p.stages[1].ballCarrier,12);assert.equal(p.stages[6].ballCarrier,14);
 for(const s of p.stages){assert.equal(Object.keys(s.positions).length,15);for(const pos of Object.values(s.positions))assert.ok(pos[0]>=0&&pos[0]<=390&&pos[1]>=0&&pos[1]<=260);}
});
test('FLASH does not invent carrier',()=>{const p=getPlay('flash');assert.equal(p.stages.at(-1).id,'flash');assert.equal(p.stages.at(-1).ballCarrier,null);assert.throws(()=>getPlay('bad'));});
test('protected play endpoint rejects anonymous requests',()=>{
 const routes={};installQuinsProtectedRoutes({app:{get(p,...handlers){routes[p]=handlers;}},requireAuth:()=>{},env:{}});
 assert.equal(routes['/api/quins/ravens/play'].length,2);
 let status=200,body;const res={set(){return this;},status(n){status=n;return this;},json(p){body=p;return this;}};
 routes['/api/quins/ravens/play'][1]({auth:null,query:{}},res);
 assert.equal(status,403);assert.equal(body.error,'QUINS_TEAM_ACCESS_REQUIRED');
 assert.equal(allowed({auth:{userId:'x'}},{}),true);
});
test('public script has no private coach play details',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../public/rugby-ravens-protected.js'),'utf8');
 assert.ok(js.includes('/api/quins/ravens/play'));assert.ok(!js.includes('#12 UNDERS CRASH'));assert.ok(!js.includes('DECOY JETS'));
});
