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

test('scrum positions follow rugby front row locks and back row instead of a grid',()=>{
 const p=getPlay().stages[0].positions;
 assert.equal(p[1][0],p[2][0]);assert.equal(p[2][0],p[3][0]);
 assert.ok(p[4][0]<p[1][0]);assert.ok(p[6][0]<p[4][0]);
 assert.ok(p[9][0]>p[1][0]);assert.ok(p[10][0]>p[9][0]);
});
test('no jersey circles overlap after phase placement',()=>{
 for(const stage of getPlay().stages){
  const ps=Object.values(stage.positions);
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
   assert.ok(Math.hypot(ps[i][0]-ps[j][0],ps[i][1]-ps[j][1])>=20,
    stage.id+' collision '+i+' / '+j);
  }
 }
});
test('same RAVENS UI offers attack-only and responsive-defense experiments',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../public/rugby-ravens-protected.js'),'utf8');
 for(const term of ['data-defense-toggle','data-strategy','data-crash','data-wide','data-reset-defense','defenseReport','With Defense'])assert.ok(js.includes(term),term);
});

test('defensive decisions advance only coach-authored stages',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../public/rugby-ravens-protected.js'),'utf8');
 assert.ok(js.includes("p.id==='ruck1'"));
 assert.ok(js.includes("p.id==='ruck2'"));
 assert.ok(js.includes("p.id==='edge'"));
 assert.ok(js.includes("index=nextRuck"));
 assert.ok(js.includes("index=wide"));
 assert.ok(js.includes("recovery++"));
 assert.ok(js.includes("no further coach-authored ruck"));
});

test('ball transfer visual identifies documented carriers and avoids inventing ruck pass',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../public/rugby-ravens-protected.js'),'utf8');
 for(const term of ['function animateBall(from,to)','data-ball-status','if(!to.ballCarrier)','in-flight','previousStage=p','cancelBall()'])assert.ok(js.includes(term),term);
});

test('iPhone pitch controls appear before long defensive report and are responsive',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../public/rugby-ravens-protected.js'),'utf8');
 assert.ok(js.indexOf('class="pitch-controls"')<js.indexOf('class="decision"'));
 assert.ok(js.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
 assert.ok(js.includes("if(!$('[data-defense-toggle]').checked){$('[data-defense-toggle]').checked=true;}"));
 assert.ok(js.includes('data-action-status'));
});
