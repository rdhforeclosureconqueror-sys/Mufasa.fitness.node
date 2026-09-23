"use strict";
const STAGES=Object.freeze(["SCENARIO_SETUP","FIXTURE_VALIDATION","BRAIN_INITIALIZATION","COMPONENT_EXECUTION","OBSERVATION_COLLECTION","ASSERTION_EVALUATION","FAILURE_CLASSIFICATION","CERTIFICATION_RECORDING","REGRESSION_COMPARISON","REPORTING"]);
function diagnostics(outcomes={},brainFirstFailure=null,at=new Date().toISOString()){
 let academyFirstFailure=null,blocked=false;
 const checks=STAGES.map((id,order)=>{let status=outcomes[id]?.status||"NOT_RUN",reason=outcomes[id]?.reason||"not_run",evidence=outcomes[id]?.evidence||[];if(blocked){status="BLOCKED";reason=`blocked_by:${academyFirstFailure.checkId}`}else if(status==="FAIL"){academyFirstFailure={checkId:id,reason,derivedAt:at};blocked=true}return Object.freeze({id,order,status,reason,evidence})});
 return Object.freeze({checks,academyFirstFailure,brainFirstFailure:brainFirstFailure||null});
}
module.exports={STAGES,diagnostics};
