'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {Pool}=require('pg');
const {createPostgresPolicyStore}=require('../src/rugby/beastModePostgresPolicyStore');
const {publish,restore}=require('../src/rugby/beastModePolicyLedger');
test('isolated PostgreSQL policy ledger persists and serializes competing writers',async()=>{
 const url=process.env.RUGBY_TEST_DATABASE_URL;
 assert.ok(url,'Dedicated test database required');
 assert.equal(new URL(url).pathname,'/rugby_policy_test');
 const pool=new Pool({connectionString:url});
 try{
  await pool.query(fs.readFileSync('docs/rugby/master-intelligence-v1/beast-mode-policy-storage.sql','utf8'));
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
 }finally{await pool.end();}
});
