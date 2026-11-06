'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {installRugbyProfileRoutes}=require('../src/routes/rugbyProfileRoutes');
function fixture(){
 const records=new Map();
 const routes=new Map();
 const app={get:(path,...handlers)=>routes.set('GET '+path,handlers),put:(path,...handlers)=>routes.set('PUT '+path,handlers),post:(path,...handlers)=>routes.set('POST '+path,handlers)};
 const requireAuth=(req,res,next)=>req.auth?.userId?next():res.status(401).json({ok:false});
 const userStore={
  loadUser:id=>structuredClone(records.get(id)||{userId:id}),
  updateUser:(id,update)=>{const user=update(userStore.loadUser(id));records.set(id,structuredClone(user));return user;}
 };
 installRugbyProfileRoutes({app,requireAuth,userStore});
 function call(method,path,userId,body){
  const handlers=routes.get(method+' '+path);assert.ok(handlers,'route registered');
  let status=200,payload,headers={};
  const res={set:(key,value)=>{headers[key]=value;return res;},status:code=>{status=code;return res;},json:value=>{payload=value;return res;}};
  const req={auth:userId?{userId}:null,body};
  let index=0;const next=()=>{const handler=handlers[index++];if(handler)handler(req,res,next);};next();
  return {status,payload,headers};
 }
 return {call,records};
}
test('requires authentication on all six rugby endpoints',()=>{
 const {call}=fixture();
 for(const [method,path] of [['GET','profile'],['PUT','profile'],['GET','assessments'],['POST','assessments'],['GET','checkins'],['POST','checkins']]){
  assert.equal(call(method,'/api/me/rugby/'+path,null,{}).status,401);
 }
});
test('profile records are isolated between athletes',()=>{
 const {call}=fixture();
 assert.equal(call('PUT','/api/me/rugby/profile','player-a',{club:'Dallas Harlequins',position:'Wing'}).status,200);
 assert.equal(call('GET','/api/me/rugby/profile','player-b').payload.data,null);
 assert.equal(call('GET','/api/me/rugby/profile','player-a').payload.data.position,'Wing');
});
test('assessments remain private and are labelled unverified',()=>{
 const {call}=fixture();
 const result=call('POST','/api/me/rugby/assessments','player-a',{type:'sprint_10m',value:1.9,date:'2026-11-06'});
 assert.equal(result.status,201);assert.equal(result.payload.data.verified,false);
 assert.equal(call('GET','/api/me/rugby/assessments','player-b').payload.data.length,0);
 assert.equal(call('GET','/api/me/rugby/assessments','player-a').payload.data.length,1);
});
test('daily check-in upserts per athlete and never adds SAQ with unverified schedule',()=>{
 const {call}=fixture();
 for(const readiness of ['normal','fatigued']){
  const result=call('POST','/api/me/rugby/checkins','player-a',{date:'2026-11-06',readiness,week:1});
  assert.equal(result.status,201);assert.equal(result.payload.matchScheduleVerified,false);
  assert.match(result.payload.data.plan.saq,/No additional SAQ/);
 }
 assert.equal(call('GET','/api/me/rugby/checkins','player-a').payload.data.length,1);
 assert.equal(call('GET','/api/me/rugby/checkins','player-b').payload.data.length,0);
});
test('pain concern suppresses SAQ and requests evaluation',()=>{
 const {call}=fixture();
 const result=call('POST','/api/me/rugby/checkins','player-a',{date:'2026-11-06',readiness:'pain',week:1});
 assert.equal(result.payload.data.plan.phase,'stop_and_refer');
 assert.match(result.payload.data.plan.saq,/No SAQ/);
});
test('invalid inputs are rejected without saving records',()=>{
 const {call}=fixture();
 assert.equal(call('PUT','/api/me/rugby/profile','player-a',{club:'',position:'Wing'}).status,400);
 assert.equal(call('POST','/api/me/rugby/assessments','player-a',{type:'sprint_10m',value:-2,date:'2026-11-06'}).status,400);
 assert.equal(call('POST','/api/me/rugby/checkins','player-a',{date:'2026-02-30',readiness:'normal'}).status,400);
 assert.equal(call('GET','/api/me/rugby/assessments','player-a').payload.data.length,0);
});
