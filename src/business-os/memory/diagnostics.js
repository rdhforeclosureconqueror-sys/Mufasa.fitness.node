"use strict";
const STAGES=Object.freeze(["MEMORY_WRITE","PROVENANCE_VALIDATION","PERMISSION_CLASSIFICATION","INDEX_UPDATE","RETRIEVAL_REQUEST","PERMISSION_FILTER","FRESHNESS_FILTER","CONTRADICTION_ANALYSIS","CONTEXT_RANKING","CONTEXT_BUDGET","CONTEXT_PACKAGE","COGNITIVE_HANDOFF"]);
function deriveDiagnostics(outcomes,at=new Date().toISOString()){
 let blocked=false,firstFailure=null;
 const checks=STAGES.map((id,order)=>{const supplied=outcomes[id];let status="NOT_RUN",reason="not_run";if(blocked){status="BLOCKED";reason=`blocked_by:${firstFailure.checkId}`}else if(supplied){status=supplied.status;reason=supplied.reason||id.toLowerCase();if(status==="FAIL"){blocked=true;firstFailure=Object.freeze({checkId:id,reason,derivedAt:at})}}return Object.freeze({id,status,reason,order,dependencies:order?[STAGES[order-1]]:[],evidence:supplied?.evidence||[]})});
 const complete=checks.every(x=>["PASS","NOT_APPLICABLE"].includes(x.status));
 return Object.freeze({checks:Object.freeze(checks),firstFailure,exitGate:firstFailure?"NO_GO":complete?"PASS":"INCOMPLETE"});
}
module.exports={STAGES,deriveDiagnostics};
