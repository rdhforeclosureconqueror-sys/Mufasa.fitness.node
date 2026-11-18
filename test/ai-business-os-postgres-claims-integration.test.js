"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {schemaSQL}=require("../src/business-os/organization/postgres-notification-repository");
const {claimSchemaSQL,createPostgresNotificationClaims}=require("../src/business-os/organization/postgres-notification-claims");
test("real PostgreSQL: only one active claimant, expiry takeover and token isolation",async t=>{
 const url=process.env.NOTIFICATION_TEST_DATABASE_URL;if(!url)return t.skip("requires ephemeral CI Postgres");
 const {Pool}=require("pg"),pool=new Pool({connectionString:url});
 const org="claims-ci-"+process.pid+"-"+Date.now(),key="claim",tokenA="worker-a",tokenB="worker-b";
 try{
  await pool.query(schemaSQL);await pool.query(claimSchemaSQL);
  await pool.query("INSERT INTO business_os_notifications (organization_id,idempotency_key,record) VALUES ($1,$2,$3::jsonb)",[org,key,JSON.stringify({organizationId:org,idempotencyKey:key,status:"PENDING"})]);
  const claims=createPostgresNotificationClaims({pool});
  const [a,b]=await Promise.all([claims.claim({organizationId:org,key,token:tokenA}),claims.claim({organizationId:org,key,token:tokenB})]);
  assert.equal(Number(Boolean(a))+Number(Boolean(b)),1);
  const winner=a?tokenA:tokenB,loser=a?tokenB:tokenA;
  assert.equal(await claims.owns({organizationId:org,key,token:winner}),true);
  assert.equal(await claims.owns({organizationId:org,key,token:loser}),false);
  assert.equal(await claims.release({organizationId:org,key,token:loser}),false);
  assert.equal(await claims.release({organizationId:org,key,token:winner}),true);
  // Expired lease can be reclaimed, active lease cannot.
  assert.ok(await claims.claim({organizationId:org,key,token:tokenA,leaseSeconds:30}));
  assert.equal(await claims.claim({organizationId:org,key,token:tokenB}),null);
  await pool.query("UPDATE business_os_notification_claims SET claimed_until=NOW()-INTERVAL '1 second' WHERE organization_id=$1 AND idempotency_key=$2",[org,key]);
  assert.ok(await claims.claim({organizationId:org,key,token:tokenB}));
  assert.equal(await claims.owns({organizationId:org,key,token:tokenA}),false);
  assert.equal(await claims.owns({organizationId:org,key,token:tokenB}),true);
 }finally{
  await pool.query("DELETE FROM business_os_notifications WHERE organization_id=$1",[org]).catch(()=>{});
  await pool.end();
 }
});
