"use strict";
const TASKS=Object.freeze(["STRUCTURED_EXTRACTION","CLASSIFICATION","EVIDENCE_GROUNDED_ANALYSIS","RECOMMENDATION","PLAN_DRAFT","UNCERTAINTY_ASSESSMENT"]);
function createCognitiveCore({gateway}){
 const run=(taskType,request)=>{if(!TASKS.includes(taskType))throw new Error("unsupported_cognitive_operation");return gateway.invoke({...request,taskType})};
 return Object.freeze({extract:request=>run("STRUCTURED_EXTRACTION",request),classify:request=>run("CLASSIFICATION",request),analyze:request=>run("EVIDENCE_GROUNDED_ANALYSIS",request),recommend:request=>run("RECOMMENDATION",request),draftPlan:request=>run("PLAN_DRAFT",request),assessUncertainty:request=>run("UNCERTAINTY_ASSESSMENT",request)});
}
module.exports={TASKS,createCognitiveCore};
