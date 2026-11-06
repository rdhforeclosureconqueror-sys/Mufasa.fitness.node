'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
test('public Rugby HQ page and diagnostics asset are reachable',async()=>{
 for(const path of ['/rugby-player.html','/rugby-diagnostics.js']){
  const response=await fetch('https://mufasafitsite.onrender.com'+path,{signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,200,path);
 }
});

test('live Rugby HQ private reads reject anonymous requests',async()=>{
 const base='https://mufasa-fitness-node.onrender.com';
 for(const path of ['/api/me/rugby/profile','/api/me/rugby/assessments','/api/me/rugby/checkins']){
  const response=await fetch(base+path,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,401,path+' must reject requests without a session');
 }
});

test('live Rugby HQ writes reject requests without authentication',async()=>{
 const base='https://mufasa-fitness-node.onrender.com';
 const cases=[
  ['PUT','/api/me/rugby/profile',{club:'Dallas Harlequins',position:'Wing'}],
  ['POST','/api/me/rugby/assessments',{type:'sprint_10m',value:1.9,date:'2026-11-06'}],
  ['POST','/api/me/rugby/checkins',{date:'2026-11-06',readiness:'normal',week:1}]
 ];
 for(const [method,path,body] of cases){
  const response=await fetch(base+path,{method,headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,401,method+' '+path+' must reject anonymous writes');
 }
});
