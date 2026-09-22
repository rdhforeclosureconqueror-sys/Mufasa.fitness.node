"use strict";

const CONTRACT_VERSION="ai-business-os.cognition/1.0.0";
const METACOGNITIVE_STATES=Object.freeze(["SUFFICIENT_EVIDENCE","INSUFFICIENT_EVIDENCE","CONFLICTING_EVIDENCE","OUTSIDE_CAPABILITY","HUMAN_REVIEW_REQUIRED"]);
const ERROR_CODES=Object.freeze(["TIMEOUT","RATE_LIMIT","AUTHENTICATION","PROVIDER_UNAVAILABLE","INVALID_REQUEST","CONTEXT_LIMIT","CONTENT_OR_SAFETY_REFUSAL","SCHEMA_INVALID","MALFORMED_RESPONSE","BUDGET_EXCEEDED","KILL_SWITCH_ACTIVE","MODEL_DISABLED","MISSING_AUTHORITY","POLICY_DENY","NO_ELIGIBLE_MODEL","UNKNOWN_PROVIDER_ERROR"]);

function record(kind,values,required=[]){
 for(const key of required)if(values[key]===undefined||values[key]===null||values[key]==="")throw new Error(`invalid_${kind}:${key}`);
 return Object.freeze({contractVersion:CONTRACT_VERSION,kind,...values});
}
const define=(kind,required)=>(values={})=>record(kind,values,required);
const CognitiveRequest=define("CognitiveRequest",["id","requestingActorId","purpose","taskType","promptTemplateVersionId","cognitiveConfigVersionId","inputRefs","requiredOutputSchema","requiredCapabilities","correlationId","constitutionalAuthorityRef","policyVersionRef"]);
const ModelProfile=define("ModelProfile",["id","provider","model","version","enabled","capabilities","structuredOutput","contextLimit","outputLimit","taskTiers","riskTier"]);
const ModelInvocation=define("ModelInvocation",["id","requestId","profileId","provider","model","version","promptFingerprint","configFingerprint","attempt","startedAt","status","correlationId"]);
const CognitiveResult=define("CognitiveResult",["id","requestId","invocationIds","resultType","content","metacognitiveState","evidenceRefs","limitations","createdAt","authoritative"]);
const ReasoningTraceSummary=define("ReasoningTraceSummary",["objective","evidenceConsulted","outputCategory","assumptions","limitations","validationOutcome"]);
const PromptTemplate=define("PromptTemplate",["id","version","purpose","templateHash","outputSchemaVersion","lifecycle"]);
const CognitiveConfigVersion=define("CognitiveConfigVersion",["id","version","configHash","lifecycle"]);
const ProviderError=define("ProviderError",["code","message","retryable"]);
const GatewayResult=define("GatewayResult",["ok","requestId","invocations","diagnostics"]);
const ModelSelectionDecision=define("ModelSelectionDecision",["id","requestId","eligibleProfileIds","reasonCodes","policyVersion"]);

function assertContract(value){
 if(value.kind==="ProviderError"&&!ERROR_CODES.includes(value.code))throw new Error("invalid_ProviderError:code");
 if(value.kind==="CognitiveResult"){
  if(value.authoritative!==false)throw new Error("invalid_CognitiveResult:authoritative");
  if(!METACOGNITIVE_STATES.includes(value.metacognitiveState))throw new Error("invalid_CognitiveResult:metacognitiveState");
 }
 return value;
}
module.exports={CONTRACT_VERSION,METACOGNITIVE_STATES,ERROR_CODES,CognitiveRequest,ModelProfile,ModelInvocation,CognitiveResult,ReasoningTraceSummary,PromptTemplate,CognitiveConfigVersion,ProviderError,GatewayResult,ModelSelectionDecision,assertContract};
