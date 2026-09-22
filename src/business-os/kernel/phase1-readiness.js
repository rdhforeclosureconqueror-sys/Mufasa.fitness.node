"use strict";
const {CONTRACT_VERSION}=require("./contracts");
const REQUIREMENTS=Object.freeze([
 "CONTRACT_VERSION_HEALTH","ACTOR","AUTHORITY","POLICY","STATE","EXECUTION","RESULT","EVIDENCE","AUDIT","EVENT_OUTBOX","KILL_SWITCH","FIRST_FAILURE","PHASE_1_TESTS","CANONICAL_READINESS"
]);
function phase1Readiness({automated={},humanAccepted=false}={}){
 const checks=REQUIREMENTS.map((id,order)=>Object.freeze({id,order,status:automated[id]||"NOT_RUN",evidenceAuthority:"MACHINE",dependencies:order?[REQUIREMENTS[order-1]]:[]}));
 const firstFailure=checks.find(check=>check.status==="FAIL")?.id||null;
 const machinePass=checks.every(check=>check.status==="PASS");
 return Object.freeze({moduleId:"ai-business-os-phase-1",contractVersion:CONTRACT_VERSION,checks:Object.freeze(checks),firstFailure,humanAcceptance:Object.freeze({required:true,status:humanAccepted?"PASS":"PENDING",recordingAuthority:"AUTHENTICATED_ADMIN_ONLY"}),gate:machinePass?(humanAccepted?"GO":"CONDITIONAL_GO"):"NO_GO",exclusions:Object.freeze(["MODEL_GATEWAY","AGENT_RUNTIME","MEMORY_ENGINE","KNOWLEDGE_ENGINE","TOOL_REGISTRY"])});
}
module.exports={REQUIREMENTS,phase1Readiness};
