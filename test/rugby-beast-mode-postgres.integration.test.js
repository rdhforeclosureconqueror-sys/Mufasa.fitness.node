'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createPostgresPolicyStore}=require('../src/rugby/beastModePostgresPolicyStore');
const {publish,restore}=require('../src/rugby/beastModePolicyLedger');
test('isolated PostgreSQL policy ledger persists and serializes competing writers',{skip:!process.env.RUGBY_TEST_DATABASE_URL&&!process.env.RUGBY_REQUIRE_POSTGRES},async()=>{
 const {Pool}=require('pg');
 const url=process.env.RUGBY_TEST_DATABASE_URL;
 assert.ok(url,'Dedicated test database required');
 assert.equal(new URL(url).pathname,'/rugby_policy_test');
 assert.ok(['localhost','127.0.0.1'].includes(new URL(url).hostname),'Local disposable database required');
 const admin=new Pool({connectionString:url});
 const runtimeUrl=new URL(url);runtimeUrl.username='rugby_policy_runtime';runtimeUrl.password='ci_runtime_only';
 const pool=new Pool({connectionString:runtimeUrl.toString()});
 try{
  await admin.query(fs.readFileSync('docs/rugby/master-intelligence-v1/beast-mode-policy-storage.sql','utf8'));
  await admin.query("CREATE ROLE rugby_policy_runtime LOGIN PASSWORD 'ci_runtime_only' NOSUPERUSER NOCREATEDB NOCREATEROLE; GRANT USAGE ON SCHEMA public TO rugby_policy_runtime; GRANT SELECT, INSERT ON rugby_beast_mode_policy_versions TO rugby_policy_runtime");
  const store=createPostgresPolicyStore(pool),base=await store.read();
  const now='2026-11-25T00:00:00.000Z';
  const next=publish(base,{policy:base[0].policy,expectedVersion:1,reason:'test'},'owner',now);
  const outcomes=await Promise.all([store.compareAndSwap(1,next),store.compareAndSwap(1,next)]);
  assert.deepEqual(outcomes.sort(),[false,true]);
  const fresh=createPostgresPolicyStore(pool),saved=await fresh.read();
  assert.deepEqual(saved,next);
  const restored=restore(saved,{version:1,expectedVersion:2,reason:'restore'},'owner',now);
  assert.equal(await fresh.compareAndSwap(2,restored),true);
  assert.deepEqual(await store.read(),restored);
  assert.equal(await store.compareAndSwap(1,next),false);
  for(const sql of ['UPDATE rugby_beast_mode_policy_versions SET reason=reason','DELETE FROM rugby_beast_mode_policy_versions','TRUNCATE rugby_beast_mode_policy_versions'])await assert.rejects(pool.query(sql),e=>e.code==='42501');
 }finally{await pool.end();await admin.end();}
});
