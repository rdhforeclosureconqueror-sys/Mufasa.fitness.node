"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {attemptSchemaSQL,createPostgresNotificationAttemptLedger}=require("../src/business-os/organization/postgres-notification-attempt-ledger");
test("schema prevents concurrent unresolved STARTED or UNKNOWN attempts",()=>{
 assert.match(attemptSchemaSQL,/outcome IN \('STARTED','UNKNOWN'\)/);
 assert.match(attemptSchemaSQL,/PRIMARY KEY \(organization_id,idempotency_key,attempt_id\)/);
});
test("start requires active matching claim and pending notification",async()=>{
 let sql;const ledger=createPostgresNotificationAttemptLedger({pool:{async query(q,args){sql=q;assert.deepEqual(args,["org","key","a1","token"]);return {rows:[{attempt_id:"a1",outcome:"STARTED"}]};}}});
 assert.equal((await ledger.start({organizationId:"org",key:"key",attemptId:"a1",claimToken:"token"})).outcome,"STARTED");
 assert.match(sql,/claimed_until>NOW\(\)/);
 assert.match(sql,/ON CONFLICT DO NOTHING/);
});
test("finish only transitions matching STARTED attempt and scoped token",async()=>{
 let sql;const ledger=createPostgresNotificationAttemptLedger({pool:{async query(q,args){sql=q;assert.deepEqual(args,["org","key","a1","token","UNKNOWN",null,"timeout"]);return {rowCount:1,rows:[{outcome:"UNKNOWN"}]};}}});
 assert.equal((await ledger.finish({organizationId:"org",key:"key",attemptId:"a1",claimToken:"token",outcome:"UNKNOWN",reason:"timeout"})).outcome,"UNKNOWN");
 assert.match(sql,/outcome='STARTED'/);
 await assert.rejects(()=>ledger.finish({organizationId:"org",key:"key",attemptId:"a1",claimToken:"token",outcome:"RETRY"}),/notification_attempt_outcome_invalid/);
});
