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
 assert.equal(allowed({auth:{userId:'x'}},{}),false);
 assert.equal(allowed({auth:{userId:'x'}},{QUINS_BUILD_PREVIEW:'true'}),true);
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

test('ruck clock drives modeled defensive recovery',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../public/rugby-ravens-protected.js'),'utf8');
 assert.ok(js.includes("Math.floor(Math.max(0,ruck.time-3)/1.2)"));
 assert.ok(js.includes('data-clock-defense'));
 assert.ok(js.includes('lastRuck=null'));
});

test('ruck playback waits for modeled ball release and pause cancels playback',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../public/rugby-ravens-protected.js'),'utf8');
 assert.ok(js.includes('data-playback-clock'));
 assert.ok(js.includes('Math.min(8000,(lastRuck||evaluateRuck()).time*1000)'));
 assert.ok(js.includes('clearTimeout(timer)'));
 assert.ok(js.includes('if(token!==playToken)return'));
});

test('fast-ball chain explains terminology and does not guarantee a line break',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../public/rugby-ravens-protected.js'),'utf8');
 for(const term of ['FAST-BALL CHAIN','data-chain-fast','data-chain-slow','data-chain-attack','data-chain-side','data-chain-defense','data-gap','No reliable gap','Fast ball alone never guarantees a break'])assert.ok(js.includes(term),term);
});

test('focused Quin pitch views keep shared state and preserve full XV',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../public/rugby-ravens-protected.js'),'utf8');
 for(const token of ['data-view="forwards"','data-view="backs"','data-view="full"',"pitchView='forwards'",'function applyPitchView()','n<=9:n>=9','applyPitchView();'])assert.ok(js.includes(token),token);
 assert.ok(js.includes("markers[n].setAttribute('visibility'"));
 assert.ok(js.includes("defenders.forEach((d,i)=>d.setAttribute('visibility'"));
});

test('generic realignment walkthrough is separate from protected coach playbook',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../public/rugby-ravens-protected.js'),'utf8');
 for(const token of ['data-realign-start','data-realign-next','data-realign-exit','data-drill','Generic teaching drill','not</strong> the coach-approved RAVENS formation','function showDrill(step)','drillFrames','players.setAttribute(\'visibility\'','function render(){if(!data)return;if(drillStep>=0)return;'])assert.ok(js.includes(token),token);
});

test('coach screenshot formation preserves scrum cluster and Ruck 2 pod groupings',()=>{
 const p=getPlay('wedge');
 assert.equal(p.geometry,'source-informed-approximate-from-coach-screenshots');
 const scrum=p.stages.find(s=>s.id==='scrum'),ruck2=p.stages.find(s=>s.id==='ruck2');
 assert.ok(Math.max(...[1,2,3,4,5,6,7,8].map(n=>scrum.positions[n][0]))<125);
 for(const group of [[1,2,12],[8,3,15],[4,5,13]]){
  const xs=group.map(n=>ruck2.positions[n][0]);
  assert.ok(Math.max(...xs)-Math.min(...xs)<100);
 }
 assert.ok(ruck2.positions[1][0]<ruck2.positions[8][0]);
 assert.ok(ruck2.positions[8][0]<ruck2.positions[4][0]);
});

test('defensive line follows ruck anchor rather than static pitch columns',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../public/rugby-ravens-protected.js'),'utf8');
 for(const token of ["const priorRuck=","const ruckAnchor=","const lineX=","const fast=ruck&&ruck.time<=3","defenders[n].setAttribute('cx'","defenders[n].setAttribute('cy'"])assert.ok(js.includes(token),token);
 assert.ok(!js.includes("let x=bank===0?290:335"));
});
