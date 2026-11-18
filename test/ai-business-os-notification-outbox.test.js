"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createBlockerNotificationOutbox}=require("../src/business-os/organization/notification-outbox");
function fixture(){
 const work=[{id:"qa",organizationId:"org",state:"ELIGIBLE",version:1,dependencyWorkRefs:[]},{id:"economics",organizationId:"org",state:"CREATED",version:1,dependencyWorkRefs:["qa"]}];
 return {listWork:()=>work,getWork:id=>work.find(x=>x.id===id),events:()=>[],data:{assignments:new Map()},work};
}
test("outbox creates one manager notification intent per work version without sending or approving",()=>{
 const f=fixture(),outbox=createBlockerNotificationOutbox({coordinator:f});
 assert.equal(outbox.refresh().length,1);
 assert.deepEqual(outbox.refresh(),outbox.list());
 assert.equal(outbox.list()[0].recipientRole,"MANAGER");
 assert.equal(outbox.list()[0].deliveryStatus,"NOT_SENT");
 assert.equal(outbox.list()[0].approvalGranted,false);
 assert.equal(outbox.list()[0].authorizationRequested,false);
 f.work[0].version=2;
 assert.equal(outbox.refresh().length,2);
});
test("assigned work notifies owning role; dependency blocked work does not generate a misleading alert",()=>{
 const f=fixture();f.work[0].state="ASSIGNED";
 f.data.assignments.set("a",{workId:"qa",roleId:"INDEPENDENT_QA",status:"ACTIVE"});
 const notices=createBlockerNotificationOutbox({coordinator:f}).refresh();
 assert.equal(notices.length,1);
 assert.equal(notices[0].recipientRole,"INDEPENDENT_QA");
 assert.equal(notices[0].reason,"AWAITING_EXECUTION");
});
