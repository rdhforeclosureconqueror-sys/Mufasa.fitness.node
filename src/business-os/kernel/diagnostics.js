"use strict";
const {DiagnosticCheck,FirstFailure}=require("./contracts");

const STAGES=Object.freeze(["ACTOR","AUTHORITY","POLICY","STATE_VALIDATION","EXECUTION","RESULT_OBSERVATION","EVIDENCE","AUDIT_COMPLETION","EVENT_EMISSION"]);
function deriveDiagnostics(outcomes,now=()=>new Date().toISOString()){
 const checks=[];
 for(let order=0;order<STAGES.length;order++){
  const id=STAGES[order],dependencies=order?[STAGES[order-1]]:[];
  const upstream=checks[order-1];
  let status="NOT_RUN",reason=null,evidence=[];
  if(upstream&&["FAIL","BLOCKED"].includes(upstream.status)){status="BLOCKED";reason=`blocked_by:${upstream.id}`}
  else if(outcomes[id])({status,reason=null,evidence=[]}=outcomes[id]);
  checks.push(DiagnosticCheck({id,status,reason,evidence,order,dependencies}));
 }
 const failed=checks.filter(c=>c.status==="FAIL").sort((a,b)=>a.order-b.order)[0];
 return Object.freeze({checks:Object.freeze(checks),firstFailure:failed?FirstFailure({checkId:failed.id,derivedAt:now()}):null});
}
module.exports={STAGES,deriveDiagnostics};
