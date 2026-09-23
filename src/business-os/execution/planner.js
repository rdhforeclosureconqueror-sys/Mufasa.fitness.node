"use strict";
function createPlanner({contextEngine,cognitiveCore}={}){
 async function propose({contextRequest,cognitiveRequest}){
  const context=contextEngine.build(contextRequest);if(!context.ok)return {ok:false,code:context.code,diagnostics:context.diagnostics};
  const handoff=contextEngine.toCognitiveRequest(context.package,{...cognitiveRequest,taskType:"PLAN_DRAFT"});if(!handoff.ok)return handoff;
  const cognition=await cognitiveCore.draftPlan(handoff.request);if(!cognition.ok)return cognition;
  return Object.freeze({ok:true,contextPackage:context.package,cognitiveResult:cognition.result,candidatePlan:cognition.result.content,authoritative:false,requiresDeterministicValidation:true});
 }
 return Object.freeze({propose});
}
module.exports={createPlanner};
