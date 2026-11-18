"use strict";
// Read-only, deterministic diagnostics; no bot dispatch or approval side effects.
function diagnoseOrganizationalWork(coordinator) {
 if (!coordinator || typeof coordinator.listWork !== "function" || typeof coordinator.events !== "function") throw new Error("coordinator_required");
 const work=coordinator.listWork(), events=coordinator.events();
 const byId=new Map(work.map(w=>[w.id,w]));
 const terminal=new Set(["COMPLETED","FAILED","CANCELLED"]);
 return Object.freeze(work.map(w=>{
  let reason=null,ownerRole=null,dependencies=[];
  if(w.state==="CREATED" || w.state==="BLOCKED"){
   dependencies=(w.dependencyWorkRefs||[]).filter(id=>byId.get(id)?.state!=="COMPLETED");
   reason=dependencies.length?"WAITING_FOR_DEPENDENCIES":"BLOCKED_UNCLASSIFIED";
  } else if(w.state==="ELIGIBLE"){reason="AWAITING_ASSIGNMENT";ownerRole=w.eligibleRoleIds?.length===1?w.eligibleRoleIds[0]:null;}
  else if(w.state==="ASSIGNED"){reason="AWAITING_EXECUTION";}
  else if(w.state==="RUNNING"){reason="EXECUTION_IN_PROGRESS";}
  else if(w.state==="FAILED"){reason="EXECUTION_FAILED";}
  else if(w.state==="CANCELLED"){reason="WORK_CANCELLED";}
  const history=events.filter(e=>e.subject===w.id);
  const failure=[...history].reverse().find(e=>e.type==="WORK_FAILED");
  return Object.freeze({workId:w.id,missionType:w.missionType,state:w.state,reason,ownerRole,dependencyWorkRefs:Object.freeze(dependencies),latestEventType:history.at(-1)?.type||null,latestEventAt:history.at(-1)?.at||null,failureReason:w.state==="FAILED"?(failure?.payload?.reason||"UNKNOWN"):null,requiresAttention:!terminal.has(w.state)&&w.state!=="RUNNING",notificationSent:false,approvalAuthorized:false});
 }));
}
module.exports={diagnoseOrganizationalWork};
