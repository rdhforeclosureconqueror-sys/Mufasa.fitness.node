"use strict";
const {CONTRACT_VERSION}=require("./contracts");
const REQUIREMENTS=Object.freeze(["COGNITIVE_CONTRACTS","INVOCATION_AUTHORITY","MODEL_SELECTION","PROVIDER_ABSTRACTION","BOUNDED_INVOCATION","STRUCTURED_OUTPUT","USAGE_COST_LINEAGE","COGNITIVE_PRIMITIVES","METACOGNITION_REFLECTION_SEAM","NON_AUTHORITATIVE_RESULT","FIRST_FAILURE","PHASE_2_TESTS","CANONICAL_READINESS"]);
function phase2Readiness({automated={},humanAccepted=false}={}){
 const checks=REQUIREMENTS.map((id,order)=>Object.freeze({id,order,status:automated[id]||"NOT_RUN",evidenceAuthority:"MACHINE",dependencies:order?[REQUIREMENTS[order-1]]:[]}));
 const firstFailure=checks.find(check=>check.status==="FAIL")?.id||null,machinePass=checks.every(check=>check.status==="PASS");
 return Object.freeze({moduleId:"ai-business-os-phase-2",contractVersion:CONTRACT_VERSION,checks:Object.freeze(checks),firstFailure,humanAcceptance:Object.freeze({required:true,status:humanAccepted?"PASS":"PENDING",recordingAuthority:"AUTHENTICATED_ADMIN_ONLY"}),gate:machinePass?(humanAccepted?"GO":"CONDITIONAL_GO"):"NO_GO",exclusions:Object.freeze(["MEMORY_ENGINE","KNOWLEDGE_ENGINE","CONTEXT_ENGINE","TOOL_REGISTRY","AGENT_RUNTIME","ECONOMICS_ENGINE","LIVE_PROVIDER_CERTIFICATION"])});
}
module.exports={REQUIREMENTS,phase2Readiness};
