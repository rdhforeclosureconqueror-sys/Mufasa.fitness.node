'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
(async()=>{
 const base='https://mufasafitsite.onrender.com',expectedCommit=process.env.RUGBY_PRODUCTION_SHA;
 assert.match(expectedCommit||'',/^[a-f0-9]{40}$/,'Set RUGBY_PRODUCTION_SHA to the intended merge commit');
 const get=url=>fetch(url,{signal:AbortSignal.timeout(120000)}),checks=[];
 for(const route of ['/','/community-hub.html','/rugby.html','/rugby-player.html','/workout.html','/rugby-arena.html']){
  const r=await get(base+route);assert.equal(r.status,200,route);const body=await r.text();
  if(route==='/community-hub.html')assert.match(body,/href="\/rugby-player.html"/);
  if(route==='/rugby.html')assert.match(body,/href="\/game\/rugby-hq\/index.html">PLAY RUGBY HQ/);
  checks.push({route,status:r.status});
 }
 const version=await(await get(base+'/__frontend-version.json')).json();assert.equal(version.commit,expectedCommit);
 const manifest=JSON.parse(fs.readFileSync('public/game/rugby-hq/build-manifest.json','utf8'));
 assert.deepEqual(await(await get(base+'/game/rugby-hq/build-manifest.json')).json(),manifest);
 for(const [name,expected]of Object.entries(manifest.files)){
  const r=await get(base+'/game/rugby-hq/'+name);assert.equal(r.status,200,name);const mime=r.headers.get('content-type');
  if(name.endsWith('.wasm'))assert.match(mime,/application\/wasm/);if(name.endsWith('.js'))assert.match(mime,/javascript/);
  const b=Buffer.from(await r.arrayBuffer());assert.equal(b.length,expected.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),expected.sha256,name);
  checks.push({asset:name,bytes:b.length,mime,sha256:expected.sha256});
 }
 const healthResponse=await get('https://mufasa-fitness-node.onrender.com/health');assert.equal(healthResponse.status,200);const health=await healthResponse.json();assert.equal(health.ok,true);
 const result={pass:true,commit:version.commit,checks,backend:{ok:health.ok,degraded:health.degraded}};
 fs.mkdirSync('tmp',{recursive:true});fs.writeFileSync('tmp/rugby-production-smoke.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
