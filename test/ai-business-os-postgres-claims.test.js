"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {claimSchemaSQL,createPostgresNotificationClaims}=require("../src/business-os/organization/postgres-notification-claims");
test("claim schema is organization-scoped and references notification",()=>{
 assert.match(claimSchemaSQL,/PRIMARY KEY \(organization_id,idempotency_key\)/);
 assert.match(claimSchemaSQL,/REFERENCES business_os_notifications/);
});
test("claim uses atomic upsert with expired-lease takeover and pending filter",async()=>{
 const calls=[],pool={async query(q,args){calls.push({q,args});return {rows:[{claim_token:"worker-a",attempt:"1"}],rowCount:1};}};
 const claims=createPostgresNotificationClaims({pool});
 assert.equal((await claims.claim({organizationId:"org",key:"key",token:"worker-a"})).claim_token,"worker-a");
 assert.match(calls[0].q,/ON CONFLICT/);
 assert.match(calls[0].q,/c.claimed_until<NOW\(\)/);
 assert.match(calls[0].q,/status'='PENDING'/);
 assert.deepEqual(calls[0].args,["org","key","worker-a",60]);
 await assert.rejects(()=>claims.claim({organizationId:"org",key:"key",token:"a",leaseSeconds:0}),/notification_claim_invalid/);
});
test("release and owns require exact scoped token",async()=>{
 const calls=[],pool={async query(q,args){calls.push({q,args});return {rowCount:1,rows:[{1:1}]};}};
 const claims=createPostgresNotificationClaims({pool});
 assert.equal(await claims.owns({organizationId:"org",key:"k",token:"t"}),true);
 assert.equal(await claims.release({organizationId:"org",key:"k",token:"t"}),true);
 assert.deepEqual(calls[1].args,["org","k","t"]);
});
