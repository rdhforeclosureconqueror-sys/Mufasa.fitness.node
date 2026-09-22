"use strict";
const crypto=require("node:crypto");
const C=require("./contracts");
const {STAGES,deriveDiagnostics}=require("./diagnostics");
const hash=value=>crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const matchesType=(value,type)=>type==="array"?Array.isArray(value):type==="null"?value===null:type==="object"?value!==null&&!Array.isArray(value)&&typeof value==="object":typeof value===type;
function validateSchema(value,schema,path="$"){
 if(schema.type&&!matchesType(value,schema.type))return `${path}:expected_${schema.type}`;
 if(schema.enum&&!schema.enum.includes(value))return `${path}:not_in_enum`;
 if(schema.type==="object"){
  for(const key of schema.required||[])if(value[key]===undefined)return `${path}.${key}:required`;
  for(const [key,child] of Object.entries(schema.properties||{}))if(value[key]!==undefined){const error=validateSchema(value[key],child,`${path}.${key}`);if(error)return error}
  if(schema.additionalProperties===false)for(const key of Object.keys(value))if(!schema.properties?.[key])return `${path}.${key}:additional_property`;
 }
 if(schema.type==="array")for(let i=0;i<value.length;i++){const error=validateSchema(value[i],schema.items||{},`${path}[${i}]`);if(error)return error}
 return null;
}
function normalizeError(error){
 const code=C.ERROR_CODES.includes(error?.code)?error.code:"UNKNOWN_PROVIDER_ERROR";
 return C.assertContract(C.ProviderError({code,message:String(error?.message||code).slice(0,200),retryable:error?.retryable===true||["TIMEOUT","RATE_LIMIT","PROVIDER_UNAVAILABLE"].includes(code),providerCode:error?.providerCode||null}));
}
function selectModel(request,profiles,health={},policyVersion="model-selection/1"){
 const eligible=profiles.filter(p=>p.enabled&&request.requiredCapabilities.every(c=>p.capabilities.includes(c))&&(!request.requiredStructuredOutput||p.structuredOutput)&&(!request.contextTokens||request.contextTokens<=p.contextLimit)&&(!request.outputTokens||request.outputTokens<=p.outputLimit)&&(!request.taskTier||p.taskTiers.includes(request.taskTier))&&health[p.id]!=="UNAVAILABLE"&&(!request.budgetCeiling||!p.maxEstimatedCost||p.maxEstimatedCost<=request.budgetCeiling)&&(!request.latencyCeilingMs||!p.expectedLatencyMs||p.expectedLatencyMs<=request.latencyCeilingMs));
 eligible.sort((a,b)=>(a.priority??100)-(b.priority??100)||a.id.localeCompare(b.id));
 return C.ModelSelectionDecision({id:`selection-${request.id}`,requestId:request.id,selectedProfileId:eligible[0]?.id||null,eligibleProfileIds:eligible.map(x=>x.id),reasonCodes:eligible.length?["CAPABILITY_POLICY_MATCH"]:["NO_ELIGIBLE_MODEL"],policyVersion});
}
function createModelGateway({profiles=[],adapters={},authorize,isKillSwitchActive=()=>false,clock=()=>new Date(),id=()=>crypto.randomUUID(),maxAttempts=2,timeoutMs=1000,selectionPolicyVersion="model-selection/1",health={},audit=()=>{},recordEvidence=()=>null}={}){
 const invocations=[];
 const now=()=>clock().toISOString();
 const fail=(request,stage,code,attempts=[],error)=>{const outcomes={};for(const name of STAGES.slice(0,STAGES.indexOf(stage)))outcomes[name]={status:"PASS",reason:`${name.toLowerCase()}_passed`};outcomes[stage]={status:"FAIL",reason:code};const diagnostics=deriveDiagnostics(outcomes,now());audit({type:"COGNITIVE_INVOCATION",outcome:"FAILED",requestId:request.id,code,correlationId:request.correlationId});return C.GatewayResult({ok:false,requestId:request.id,invocations:attempts,error:error||C.ProviderError({code,message:code,retryable:false}),diagnostics})};
 async function invoke(values){
  let request;try{request=C.CognitiveRequest(values)}catch(error){return fail({id:values.id||"invalid",correlationId:values.correlationId},"COGNITIVE_REQUEST","INVALID_REQUEST",[],normalizeError(Object.assign(error,{code:"INVALID_REQUEST"})))}
  const permission=await authorize?.(request);if(!permission?.allowed)return fail(request,"INVOCATION_AUTHORITY",permission?.code||"MISSING_AUTHORITY");
  const killSwitchActive=await isKillSwitchActive(request);if(killSwitchActive)return fail(request,"INVOCATION_AUTHORITY","KILL_SWITCH_ACTIVE");
  const selection=selectModel(request,profiles,health,selectionPolicyVersion);if(!selection.selectedProfileId){const otherwiseEligible=profiles.some(p=>p.enabled&&request.requiredCapabilities.every(c=>p.capabilities.includes(c))&&(!request.requiredStructuredOutput||p.structuredOutput));const budgetBlocked=otherwiseEligible&&request.budgetCeiling&&profiles.some(p=>p.enabled&&p.maxEstimatedCost>request.budgetCeiling);return fail(request,"MODEL_SELECTION",budgetBlocked?"BUDGET_EXCEEDED":"NO_ELIGIBLE_MODEL")}
  const candidates=selection.eligibleProfileIds.map(pid=>profiles.find(p=>p.id===pid));let lastError;
  if(!candidates.some(profile=>adapters[profile.provider]))return fail(request,"PROVIDER_ADAPTER","UNKNOWN_PROVIDER_ERROR",[],C.ProviderError({code:"UNKNOWN_PROVIDER_ERROR",message:"adapter_not_registered",retryable:false}));
  for(const profile of candidates){
   const adapter=adapters[profile.provider];if(!adapter){lastError=C.ProviderError({code:"UNKNOWN_PROVIDER_ERROR",message:"adapter_not_registered",retryable:false});continue}
   for(let attempt=1;attempt<=maxAttempts;attempt++){
    const started=Date.now(),base={id:id(),requestId:request.id,profileId:profile.id,provider:profile.provider,model:profile.model,version:profile.version,promptFingerprint:hash({template:request.promptTemplateVersionId,inputs:request.inputRefs}),configFingerprint:hash(request.cognitiveConfigVersionId),attempt,startedAt:now(),correlationId:request.correlationId,causationId:request.causationId||null,substitutionOf:profile.id===selection.selectedProfileId?null:selection.selectedProfileId};
    try{
     const response=await Promise.race([adapter.invoke({request,profile}),new Promise((_,reject)=>setTimeout(()=>reject(Object.assign(new Error("provider_timeout"),{code:"TIMEOUT",retryable:true})),Math.min(timeoutMs,request.latencyCeilingMs||timeoutMs)))]);
     let parsed;try{parsed=typeof response.content==="string"?JSON.parse(response.content):response.content}catch(error){lastError=C.ProviderError({code:"MALFORMED_RESPONSE",message:"response_not_json",retryable:false});invocations.push(C.ModelInvocation({...base,endedAt:now(),latencyMs:Date.now()-started,status:"FAILED",finishReason:response.finishReason||null,usage:response.usage||null,error:lastError,schemaValidation:"NOT_RUN"}));break}
     const schemaError=validateSchema(parsed,request.requiredOutputSchema);if(schemaError){lastError=C.ProviderError({code:"SCHEMA_INVALID",message:schemaError,retryable:false});invocations.push(C.ModelInvocation({...base,endedAt:now(),latencyMs:Date.now()-started,status:"FAILED",finishReason:response.finishReason||null,usage:response.usage||null,error:lastError,schemaValidation:"FAIL"}));break}
     const cost=profile.pricing&&response.usage?{currency:profile.pricing.currency||"USD",estimated:true,source:profile.pricing.source,version:profile.pricing.version,inputUnits:response.usage.inputTokens,outputUnits:response.usage.outputTokens,amount:(response.usage.inputTokens*(profile.pricing.inputPerToken||0))+(response.usage.outputTokens*(profile.pricing.outputPerToken||0))}:null;
     const invocation=C.ModelInvocation({...base,endedAt:now(),latencyMs:Date.now()-started,status:"SUCCEEDED",finishReason:response.finishReason||null,usage:response.usage||null,cost,schemaValidation:"PASS"});invocations.push(invocation);
     const trace=C.ReasoningTraceSummary({objective:request.purpose,evidenceConsulted:request.evidenceRefs||[],outputCategory:request.taskType,assumptions:[],limitations:parsed.limitations||[],validationOutcome:"SCHEMA_VALID"});
     const evidenceRef=recordEvidence({type:"INFERENCE",requestId:request.id,invocationId:invocation.id,payloadHash:hash(parsed)});
     const result=C.assertContract(C.CognitiveResult({id:id(),requestId:request.id,invocationIds:invocations.filter(x=>x.requestId===request.id).map(x=>x.id),resultType:request.taskType,content:parsed,metacognitiveState:parsed.metacognitiveState||"SUFFICIENT_EVIDENCE",modelAttributedUncertainty:parsed.uncertainty??null,systemConfidence:null,evidenceRefs:[...(request.evidenceRefs||[]),...(evidenceRef?[evidenceRef]:[])],limitations:parsed.limitations||[],reasoningTraceSummary:trace,structuredIntentCandidate:parsed.structuredIntentCandidate||null,createdAt:now(),authoritative:false}));
     const outcomes=Object.fromEntries(STAGES.map(stage=>[stage,{status:"PASS",reason:`${stage.toLowerCase()}_passed`} ]));const diagnostics=deriveDiagnostics(outcomes,now());audit({type:"COGNITIVE_INVOCATION",outcome:"SUCCEEDED",requestId:request.id,invocationId:invocation.id,correlationId:request.correlationId,provider:profile.provider,model:profile.model,version:profile.version});
     return C.GatewayResult({ok:true,requestId:request.id,invocations:invocations.filter(x=>x.requestId===request.id),selection,result,diagnostics});
    }catch(error){lastError=normalizeError(error);invocations.push(C.ModelInvocation({...base,endedAt:now(),latencyMs:Date.now()-started,status:"FAILED",error:lastError,schemaValidation:"NOT_RUN"}));if(!lastError.retryable)break;if(attempt<maxAttempts)await sleep(0)}
   }
  }
  const requestInvocations=invocations.filter(x=>x.requestId===request.id);const stage=lastError?.code==="MALFORMED_RESPONSE"?"RESPONSE_PARSE":lastError?.code==="SCHEMA_INVALID"?"SCHEMA_VALIDATION":"PROVIDER_INVOCATION";return fail(request,stage,lastError?.code||"UNKNOWN_PROVIDER_ERROR",requestInvocations,lastError);
 }
 return Object.freeze({invoke,select:request=>selectModel(request,profiles,health,selectionPolicyVersion),getInvocations:()=>Object.freeze([...invocations])});
}
module.exports={createModelGateway,selectModel,validateSchema,normalizeError};
