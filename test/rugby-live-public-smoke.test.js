'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
// Retry only a read-only readiness probe on transient gateway responses.
async function waitForBackend(base){
 for(let attempt=0;attempt<7;attempt++){
  const response=await fetch(base+'/api/me/rugby/profile',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
  if(![502,503,504].includes(response.status)){assert.equal(response.status,401,'readiness probe must reject anonymous access');return;}
  if(attempt===6)assert.fail('Backend gateway unavailable after bounded readiness retries: '+response.status);
  await new Promise(resolve=>setTimeout(resolve,5000));
 }
}
test('public Rugby HQ page and diagnostics asset are reachable',async()=>{
 for(const path of ['/rugby-player.html','/rugby-diagnostics.js']){
  const response=await fetch('https://mufasafitsite.onrender.com'+path,{signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,200,path);
 }
});

test('live Rugby HQ private reads reject anonymous requests',async()=>{
 const base='https://mufasa-fitness-node.onrender.com';
 await waitForBackend(base);
 for(const path of ['/api/me/rugby/profile','/api/me/rugby/assessments','/api/me/rugby/checkins']){
  const response=await fetch(base+path,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,401,path+' must reject requests without a session');
 }
});

test('live Rugby HQ writes reject requests without authentication',async()=>{
 const base='https://mufasa-fitness-node.onrender.com';
 await waitForBackend(base);
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
