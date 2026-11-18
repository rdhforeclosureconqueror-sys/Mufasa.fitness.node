"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createPostgresNotificationRepository,schemaSQL}=require("../src/business-os/organization/postgres-notification-repository");
test("schema enforces tenant-scoped unique idempotency",()=>{assert.match(schemaSQL,/PRIMARY KEY \(organization_id,idempotency_key\)/);});
test("insert uses conflict-safe idempotency and preserves existing record",async()=>{
 const calls=[],existing={record:{status:"PENDING"},version:1};
 const repo=createPostgresNotificationRepository({pool:{query:async(sql,params)=>{calls.push({sql,params});return calls.length===1?{rowCount:0,rows:[]}:{rows:[existing]};}}});
 const r=await repo.insertIfAbsent({organizationId:"org",idempotencyKey:"key",status:"PENDING",approvalGranted:false,deliveryStatus:"NOT_SENT"});
 assert.equal(r.inserted,false);assert.deepEqual(r.entry,existing);assert.match(calls[0].sql,/ON CONFLICT DO NOTHING/);
});
test("optimistic CAS transition requires exact version, tenant and state",async()=>{
 const calls=[],repo=createPostgresNotificationRepository({pool:{query:async(sql,params)=>{calls.push({sql,params});return {rowCount:1,rows:[{record:{status:"DELIVERED"},version:2}]};}}});
 await repo.transition({organizationId:"org",key:"key",expectedStatus:"PENDING",expectedVersion:1,nextStatus:"DELIVERED",patch:{attempts:1}});
 assert.match(calls[0].sql,/version=version\+1/);assert.match(calls[0].sql,/organization_id=\$1/);assert.match(calls[0].sql,/version=\$4/);
 await assert.rejects(()=>repo.transition({organizationId:"org",key:"key",expectedStatus:"PENDING",expectedVersion:1,nextStatus:"ACKNOWLEDGED"}),/notification_transition_invalid/);
 await assert.rejects(()=>repo.transition({organizationId:"org",key:"key",expectedStatus:"PENDING",expectedVersion:1,nextStatus:"DELIVERED",patch:{approvalGranted:true}}),/notification_patch_forbidden/);
});
test("conflicting CAS update fails closed",async()=>{
 const repo=createPostgresNotificationRepository({pool:{query:async()=>({rowCount:0,rows:[]})}});
 await assert.rejects(()=>repo.transition({organizationId:"org",key:"key",expectedStatus:"DELIVERED",expectedVersion:2,nextStatus:"ACKNOWLEDGED"}),/notification_state_conflict/);
});
