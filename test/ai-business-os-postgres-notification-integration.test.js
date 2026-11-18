"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {schemaSQL,createPostgresNotificationRepository}=require("../src/business-os/organization/postgres-notification-repository");
const url=process.env.NOTIFICATION_TEST_DATABASE_URL;
test("real Postgres notification persistence and concurrent CAS", {skip:!url?"NOTIFICATION_TEST_DATABASE_URL not configured":false},async t=>{
 const {Pool}=require("pg");const pool=new Pool({connectionString:url,max:4});
 const table="business_os_notifications";
 try{
  await pool.query(schemaSQL);
  const repo=createPostgresNotificationRepository({pool});
  const suffix=require("node:crypto").randomUUID(),org="notification-integration-"+suffix,key="notification-"+suffix;
  
  const record={organizationId:org,idempotencyKey:key,workId:"work",workVersion:1,recipientRole:"MANAGER",status:"PENDING",deliveryStatus:"NOT_SENT",approvalGranted:false,authorizationRequested:false};
  const inserts=await Promise.all([repo.insertIfAbsent(record),repo.insertIfAbsent(record)]);
  assert.equal(inserts.filter(x=>x.inserted).length,1);
  assert.equal((await repo.list(org)).length,1);
  assert.equal((await repo.list("another-"+org)).length,0);
  const results=await Promise.allSettled([
   repo.transition({organizationId:org,key,expectedStatus:"PENDING",expectedVersion:1,nextStatus:"DELIVERED",patch:{attempts:1}}),
   repo.transition({organizationId:org,key,expectedStatus:"PENDING",expectedVersion:1,nextStatus:"DELIVERED",patch:{attempts:1}})
  ]);
  assert.equal(results.filter(x=>x.status==="fulfilled").length,1);
  assert.equal(results.filter(x=>x.status==="rejected"&&x.reason.message==="notification_state_conflict").length,1);
  assert.equal((await repo.get(org,key)).record.status,"DELIVERED");
  assert.equal(BigInt((await repo.get(org,key)).version),2n);
  await assert.rejects(()=>repo.transition({organizationId:"another-"+org,key,expectedStatus:"DELIVERED",expectedVersion:2,nextStatus:"ACKNOWLEDGED"}),/notification_state_conflict/);
 }finally{await pool.query("DELETE FROM "+table+" WHERE organization_id LIKE $1",["notification-integration-%"]).catch(()=>{});await pool.end();}
});
