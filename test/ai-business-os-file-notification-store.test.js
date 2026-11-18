"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createFileNotificationStore}=require("../src/business-os/organization/file-notification-store");
const {createNotificationLifecycle}=require("../src/business-os/organization/notification-lifecycle");
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"notification-store-"));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const filePath=path.join(dir,"notifications.json");const work={id:"qa",organizationId:"org",version:1,state:"ASSIGNED"};
 const coordinator={getWork:()=>({...work})};const key="org:qa:1:AWAITING_EXECUTION:INDEPENDENT_QA";
 const intent={idempotencyKey:key,organizationId:"org",workId:"qa",workVersion:1,recipientRole:"INDEPENDENT_QA",deliveryStatus:"NOT_SENT",approvalGranted:false};
 return {filePath,work,coordinator,key,intent};
}
test("pending and acknowledged records survive adapter restart without duplicate enqueue",t=>{
 const f=fixture(t);const one=createNotificationLifecycle({coordinator:f.coordinator,store:createFileNotificationStore({filePath:f.filePath})});
 one.enqueue(f.intent);
 const two=createNotificationLifecycle({coordinator:f.coordinator,store:createFileNotificationStore({filePath:f.filePath})});
 assert.equal(two.list().length,1);assert.equal(two.enqueue(f.intent).status,"PENDING");
 two.markDelivered(f.key);two.acknowledge(f.key,{actorRole:"INDEPENDENT_QA"});
 const three=createFileNotificationStore({filePath:f.filePath});
 assert.equal(three.get(f.key).status,"ACKNOWLEDGED");assert.equal(three.list().length,1);
 assert.equal(three.get(f.key).approvalGranted,false);
});
test("stale work reconciliation survives restart",t=>{
 const f=fixture(t),store=createFileNotificationStore({filePath:f.filePath});
 const one=createNotificationLifecycle({coordinator:f.coordinator,store});one.enqueue(f.intent);f.work.version=2;
 assert.equal(one.reconcile()[0].status,"SUPERSEDED");
 assert.equal(createFileNotificationStore({filePath:f.filePath}).get(f.key).status,"SUPERSEDED");
});
test("corrupt snapshots fail closed rather than resetting notification history",t=>{
 const f=fixture(t);fs.writeFileSync(f.filePath,"{bad json");
 assert.throws(()=>createFileNotificationStore({filePath:f.filePath}),/notification_store_read_failed/);
});
test("invalid paths and mismatched keys are rejected",t=>{
 const f=fixture(t);assert.throws(()=>createFileNotificationStore({filePath:"relative.json"}),/absolute_notification_store_path_required/);
 const store=createFileNotificationStore({filePath:f.filePath});
 assert.throws(()=>store.put("wrong",f.intent),/notification_store_key_mismatch/);
});
