"use strict";
// Read-only operational diagnostics. No approval or notification is implied.
function inspectOrganizationalBlockers(coordinator) {
 if (!coordinator || typeof coordinator.listWork !== "function" || typeof coordinator.events !== "function") throw new Error("coordinator_required");
 const work = coordinator.listWork(), events = coordinator.events();
 const byId = new Map(work.map(w=>[w.id,w]));
 const assignments = coordinator.data?.assignments;
 const items = work.filter(w=>w.state!=="COMPLETED").map(w=>{
  const waitingOn=(w.dependencyWorkRefs||[]).filter(id=>byId.get(id)?.state!=="COMPLETED");
  const assigned = assignments && [...assignments.values()].find(a=>a.workId===w.id && a.status==="ACTIVE");
  const failure=[...events].reverse().find(e=>e.type==="WORK_FAILED" && e.subject===w.id);
  let reason="AWAITING_EXECUTION", owner=assigned?.roleId||null;
  if(waitingOn.length){reason="DEPENDENCY_BLOCKED";owner=null;}
  else if(w.state==="FAILED"){reason="EXECUTION_FAILED";owner=assigned?.roleId||null;}
  else if(w.state==="ELIGIBLE"){reason="AWAITING_ASSIGNMENT";owner=null;}
  else if(w.state==="CREATED"){reason="AWAITING_DEPENDENCY_RECHECK";owner=null;}
  else if(w.state==="ASSIGNED"){reason="AWAITING_EXECUTION";}
  else if(w.state==="RUNNING"){reason="EXECUTION_IN_PROGRESS";}
  return Object.freeze({workId:w.id,state:w.state,reason,ownerRole:owner,waitingOn:Object.freeze(waitingOn),failureEventRef:failure?.idempotencyKey||null,notificationSent:false,approvalGranted:false});
 });
 return Object.freeze({total:work.length,incomplete:items.length,items:Object.freeze(items)});
}
module.exports={inspectOrganizationalBlockers};
