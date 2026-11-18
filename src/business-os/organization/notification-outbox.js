"use strict";
const {inspectOrganizationalBlockers}=require("./blocker-diagnostics");
// In-memory, idempotent notification intent outbox. No delivery or approval occurs here.
function createBlockerNotificationOutbox({coordinator}={}){
 if(!coordinator || typeof coordinator.listWork!=="function")throw new Error("coordinator_required");
 const pending=new Map();
 function refresh(){
  const report=inspectOrganizationalBlockers(coordinator);
  for(const item of report.items){
   if(item.reason==="EXECUTION_IN_PROGRESS")continue;
   const work=coordinator.getWork(item.workId);
   if(!work)continue;
   const ownerRole=item.ownerRole || (item.reason==="AWAITING_ASSIGNMENT" ? "MANAGER" : null);
   if(!ownerRole)continue; // dependencies are owned by their own work, not the blocked work.
   const key=[work.organizationId,item.workId,work.version,item.reason,ownerRole].join(":");
   if(!pending.has(key))pending.set(key,Object.freeze({
    idempotencyKey:key,organizationId:work.organizationId,workId:item.workId,
    workVersion:work.version,reason:item.reason,recipientRole:ownerRole,
    failureEventRef:item.failureEventRef,deliveryStatus:"NOT_SENT",
    approvalGranted:false,authorizationRequested:false
   }));
  }
  return list();
 }
 function list(){return Object.freeze([...pending.values()]);}
 return Object.freeze({refresh,list});
}
module.exports={createBlockerNotificationOutbox};
