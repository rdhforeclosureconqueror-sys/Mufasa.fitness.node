"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {schemaSQL}=require("../src/business-os/organization/postgres-notification-repository");
const {claimSchemaSQL,createPostgresNotificationClaims}=require("../src/business-os/organization/postgres-notification-claims");
const {attemptSchemaSQL,createPostgresNotificationAttemptLedger}=require("../src/business-os/organization/postgres-notification-attempt-ledger");
test("real Postgres persists ambiguous outcomes and prevents duplicate unresolved attempts",async t=>{
 if(!process.env.NOTIFICATION_TEST_DATABASE_URL)return t.skip("requires ephemeral PostgreSQL");
 const {Pool}=require("pg"),pool=new Pool({connectionString:process.env.NOTIFICATION_TEST_DATABASE_URL});
 const org="ledger-ci-"+process.pid+"-"+Date.now(),key="notification";
 try{
  await pool.query(schemaSQL);await pool.query(claimSchemaSQL);await pool.query(attemptSchemaSQL);
  await pool.query("INSERT INTO business_os_notifications (organization_id,idempotency_key,record) VALUES ($1,$2,$3::jsonb)",[org,key,JSON.stringify({organizationId:org,idempotencyKey:key,status:"PENDING"})]);
  const claims=createPostgresNotificationClaims({pool}),ledger=createPostgresNotificationAttemptLedger({pool});
  assert.ok(await claims.claim({organizationId:org,key,token:"worker",leaseSeconds:120}));
  const [first,second]=await Promise.all([
   ledger.start({organizationId:org,key,attemptId:"a",claimToken:"worker"}),
   ledger.start({organizationId:org,key,attemptId:"b",claimToken:"worker"})
  ]);
  assert.equal(Number(Boolean(first))+Number(Boolean(second)),1);
  const attemptId=first?"a":"b";
  assert.equal((await ledger.finish({organizationId:org,key,attemptId,claimToken:"worker",outcome:"UNKNOWN",reason:"provider_timeout"})).outcome,"UNKNOWN");
  assert.equal(await ledger.start({organizationId:org,key,attemptId:"c",claimToken:"worker"}),null);
  assert.equal((await ledger.list(org,key))[0].outcome,"UNKNOWN");
  assert.equal((await ledger.list("other",key)).length,0);
  await assert.rejects(()=>ledger.finish({organizationId:org,key,attemptId,claimToken:"wrong",outcome:"VERIFIED"}),/notification_attempt_state_conflict/);
 }finally{
  await pool.query("DELETE FROM business_os_notifications WHERE organization_id=$1",[org]).catch(()=>{});
  await pool.end();
 }
});
