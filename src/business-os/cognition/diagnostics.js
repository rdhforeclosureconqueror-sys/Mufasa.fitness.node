"use strict";
const STAGES=Object.freeze(["COGNITIVE_REQUEST","INVOCATION_AUTHORITY","MODEL_SELECTION","PROVIDER_ADAPTER","PROVIDER_INVOCATION","RESPONSE_PARSE","SCHEMA_VALIDATION","RESULT_RECORDING","EVIDENCE_AUDIT"]);
function deriveDiagnostics(outcomes,at){
 let failed=false,firstFailure=null;
 const checks=STAGES.map((id,order)=>{
  const supplied=outcomes[id];
  let status="BLOCKED",reason="upstream_failure";
  if(!failed&&supplied){status=supplied.status;reason=supplied.reason;if(status==="FAIL"){failed=true;firstFailure={checkId:id,reason,derivedAt:at}}}
  else if(!failed){status="NOT_RUN";reason="not_run"}
  return Object.freeze({id,status,reason,order,dependencies:order?[STAGES[order-1]]:[],evidence:supplied?.evidence||[]});
 });
 const complete=checks.every(x=>["PASS","NOT_APPLICABLE"].includes(x.status));
 return Object.freeze({checks,firstFailure,exitGate:firstFailure?"NO_GO":complete?"PASS":"INCOMPLETE"});
}
module.exports={STAGES,deriveDiagnostics};
