'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {installRugbyProfileRoutes}=require('../src/routes/rugbyProfileRoutes');
function harness(){
 const routes=new Map(),users=new Map();
 const app={get:(path,...handlers)=>routes.set('GET '+path,handlers.at(-1)),post:(path,...handlers)=>routes.set('POST '+path,handlers.at(-1)),put:(path,...handlers)=>routes.set('PUT '+path,handlers.at(-1))};
 const userStore={loadUser:id=>structuredClone(users.get(id)||{}),updateUser:(id,fn)=>{const value=fn(structuredClone(users.get(id)||{}));users.set(id,value);return value;}};
 installRugbyProfileRoutes({app,requireAuth:(_req,_res,next)=>next(),userStore});
 async function call(method,path,userId,body){
  const handler=routes.get(method+' '+path);assert.ok(handler,'missing route');
  const req={auth:{userId},body};const res={statusCode:200,headers:{},set(k,v){this.headers[k]=v;return this;},status(code){this.statusCode=code;return this;},json(data){this.body=data;return this;}};
  await handler(req,res);return res;
 }
 return {call};
}
test('rugby profile and assessment records are isolated per athlete',async()=>{
 const {call}=harness();
 let r=await call('PUT','/api/me/rugby/profile','athlete-a',{club:'Dallas Harlequins',position:'Wing'});
 assert.equal(r.statusCode,200);
 r=await call('GET','/api/me/rugby/profile','athlete-b');assert.equal(r.body.data,null);
 r=await call('POST','/api/me/rugby/assessments','athlete-a',{type:'sprint_10m',value:1.9,date:'2026-11-06'});
 assert.equal(r.statusCode,201);assert.equal(r.body.data.verified,false);
 r=await call('GET','/api/me/rugby/assessments','athlete-b');assert.deepEqual(r.body.data,[]);
 r=await call('GET','/api/me/rugby/assessments','athlete-a');assert.equal(r.body.data.length,1);assert.equal(r.headers['Cache-Control'],'private, no-store');
});
test('check-in is private, updates same day and defaults to recovery only',async()=>{
 const {call}=harness();const path='/api/me/rugby/checkins';
 let r=await call('POST',path,'athlete-a',{date:'2026-11-06',readiness:'normal',week:1});
 assert.equal(r.statusCode,201);assert.equal(r.body.matchScheduleVerified,false);assert.match(r.body.data.plan.saq,/No additional SAQ/);
 r=await call('POST',path,'athlete-a',{date:'2026-11-06',readiness:'fatigued',week:2});
 assert.equal(r.statusCode,201);
 r=await call('GET',path,'athlete-a');assert.equal(r.body.data.length,1);assert.equal(r.body.data[0].readiness,'fatigued');
 r=await call('GET',path,'athlete-b');assert.deepEqual(r.body.data,[]);
});
test('invalid input cannot write records',async()=>{
 const {call}=harness();
 const r=await call('POST','/api/me/rugby/checkins','athlete-a',{date:'2026-02-30',readiness:'normal'});
 assert.equal(r.statusCode,400);
 assert.deepEqual((await call('GET','/api/me/rugby/checkins','athlete-a')).body.data,[]);
});
