"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createPostgresReconciliationWriter,reconciliationAuditSchemaSQL}=require("../src/business-os/organization/postgres-notification-reconciliation-writer");
test("rejects untrusted actor before acquiring database connection",async()=>{
 const writer=createPostgresReconciliationWriter({pool:{connect:async()=>{throw Error("unexpected_db");}},verifyActor:async()=>({authorized:false}),verifyDelivery:async()=>({verified:true})});
 await assert.rejects(()=>writer.confirmVerified({organizationId:"org",key:"k",attemptId:"a",actor:{},receipt:"r"}),/reconciliation_unauthorized/);
});
test("rejects unverified receipt before database connection",async()=>{
 const writer=createPostgresReconciliationWriter({pool:{connect:async()=>{throw Error("unexpected_db");}},verifyActor:async()=>({authorized:true,actorId:"admin"}),verifyDelivery:async()=>({verified:false})});
 await assert.rejects(()=>writer.confirmVerified({organizationId:"org",key:"k",attemptId:"a",actor:{},receipt:"r"}),/reconciliation_delivery_unverified/);
});
test("verified transition and audit share transaction",async()=>{
 const calls=[];let released=false;
 const client={async query(sql){calls.push(sql);if(sql.includes("UPDATE business_os_notification_attempts"))return {rowCount:1};return {rowCount:1};},release(){released=true;}};
 const writer=createPostgresReconciliationWriter({pool:{connect:async()=>client},verifyActor:async()=>({authorized:true,actorId:"admin"}),verifyDelivery:async()=>({verified:true})});
 assert.equal((await writer.confirmVerified({organizationId:"org",key:"k",attemptId:"a",actor:{},receipt:"receipt"})).status,"VERIFIED");
 assert.equal(calls[0],"BEGIN");assert.equal(calls.at(-1),"COMMIT");assert.ok(calls.some(q=>q.includes("INSERT INTO business_os_notification_reconciliation_audit")));assert.ok(released);
 assert.match(reconciliationAuditSchemaSQL,/PRIMARY KEY \(organization_id,idempotency_key,attempt_id\)/);
});
test("conflict rolls back and never writes audit",async()=>{
 const calls=[];const client={async query(sql){calls.push(sql);return sql.includes("UPDATE business_os_notification_attempts")?{rowCount:0}:{rowCount:1};},release(){}};
 const writer=createPostgresReconciliationWriter({pool:{connect:async()=>client},verifyActor:async()=>({authorized:true,actorId:"admin"}),verifyDelivery:async()=>({verified:true})});
 await assert.rejects(()=>writer.confirmVerified({organizationId:"org",key:"k",attemptId:"a",actor:{},receipt:"receipt"}),/reconciliation_state_conflict/);
 assert.equal(calls.at(-1),"ROLLBACK");assert.ok(!calls.some(q=>q.includes("INSERT INTO business_os_notification_reconciliation_audit")));
});
