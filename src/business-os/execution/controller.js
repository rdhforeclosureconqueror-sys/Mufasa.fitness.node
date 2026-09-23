"use strict";
const crypto=require("node:crypto"),C=require("./contracts");
const {STAGES,deriveDiagnostics}=require("./diagnostics");
const hash=value=>crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const compatible=(expected,actual)=>expected?.type===actual?.type&&JSON.stringify(expected?.required||[])===JSON.stringify(actual?.required||[]);
function createExecutionController({registry,kernel,contextEngine=null,memorySystem=null,adapters={},verifiers={},clock=()=>new Date(),id=()=>crypto.randomUUID()}={}){
 const attempts=[],invocations=[],results=[],observations=[],verifications=[],replans=[],idempotency=new Map();
 const now=()=>clock().toISOString();
 const diagnostic=(stage,code,passed=[])=>{const outcomes={};for(const name of STAGES.slice(0,STAGES.indexOf(stage)))outcomes[name]={status:passed.includes(name)||true?"PASS":"NOT_RUN"};outcomes[stage]={status:"FAIL",reason:code};return deriveDiagnostics(outcomes,now())};
 const fail=(stage,code,extra={})=>({ok:false,code,nextAction:extra.nextAction||("AUTHORITY POLICY KILL_SWITCH COST_RISK".includes(stage)?"STOP":"REPLAN"),...extra,diagnostics:diagnostic(stage,code)});
 function validate(goal,plan,step,actor,budget){
  if(!goal?.objective||goal.organizationId!==actor.organizationId)return fail("GOAL","INVALID_GOAL");
  if(!plan||plan.goalId!==goal.id||plan.organizationId!==goal.organizationId)return fail("PLAN_VALIDATION","INVALID_PLAN");
  const dependencies=step.dependencyIds.map(dep=>plan.steps.find(s=>s.id===dep));if(dependencies.some(dep=>!dep||dep.status!=="COMPLETED"))return fail("PLAN_VALIDATION","DEPENDENCY_UNSATISFIED",{nextAction:"STOP",stepStatus:"BLOCKED"});
  const capability=registry.getCapability(step.capabilityId,actor);if(!capability)return fail("CAPABILITY_RESOLUTION","CAPABILITY_NOT_FOUND");
  if(capability.status!=="AVAILABLE"||capability.validationStatus!=="VALIDATED")return fail("CAPABILITY_RESOLUTION","CAPABILITY_UNAVAILABLE");
  const tool=registry.getTool(step.toolId,actor);if(!tool)return fail("TOOL_RESOLUTION","TOOL_NOT_FOUND");if(tool.status!=="AVAILABLE")return fail("TOOL_RESOLUTION","TOOL_UNAVAILABLE");
  if(!tool.supportedCapabilityIds.includes(capability.id)||![...(capability.requiredToolIds||[]),...(capability.optionalToolIds||[])].includes(tool.id))return fail("TOOL_RESOLUTION","CAPABILITY_TOOL_MISMATCH");
  const missing=(tool.inputSchema.required||[]).filter(key=>step.inputs[key]===undefined);if(missing.length)return fail("INPUT_VALIDATION","MISSING_REQUIRED_INPUT",{missing});
  if(!compatible(step.expectedOutput,tool.outputSchema))return fail("INPUT_VALIDATION","OUTPUT_CONTRACT_MISMATCH");
  if(step.estimatedCost?.amount===null||tool.cost?.amount===null)return fail("COST_RISK","UNKNOWN_COST",{nextAction:"ESCALATE"});
  const estimated=Math.max(step.estimatedCost?.amount||0,tool.cost?.amount||0);if(estimated>budget.maxCost)return fail("COST_RISK","COST_BOUNDARY_EXCEEDED",{nextAction:"STOP"});
  if(!budget.allowedRisks.includes(step.risk)||!budget.allowedRisks.includes(tool.risk))return fail("COST_RISK","RISK_REQUIRES_ESCALATION",{nextAction:"ESCALATE"});
  if(C.AUTONOMY_LEVELS.indexOf(goal.requestedAutonomy)>C.AUTONOMY_LEVELS.indexOf(capability.autonomyLevel)||!tool.autonomyLevels.includes(goal.requestedAutonomy))return fail("COST_RISK","AUTONOMY_NOT_PERMITTED",{nextAction:"ESCALATE"});
  if((step.humanApprovalRequired||capability.humanRequiredSteps.includes(step.id))&&!step.humanApproval)return fail("POLICY","HUMAN_ACCEPTANCE_REQUIRED",{nextAction:"ESCALATE"});
  return {ok:true,capability,tool};
 }
 async function execute({goal,plan,stepId,actor,budget={maxCost:Infinity,allowedRisks:["LOW"]},contextRequest,substitutionLineage=null}){
  let step=plan?.steps.find(x=>x.id===stepId);if(!step)return fail("PLAN_VALIDATION","STEP_NOT_FOUND");
  let context=null;if(contextEngine){const built=contextEngine.build({...contextRequest,requestingActorId:actor.id,actor,correlationId:goal.correlationId});if(!built.ok)return fail("CONTEXT",built.code);context=built.package}
  let checked=validate(goal,plan,step,actor,budget);if(!checked.ok)return checked;
  let selected=checked.tool,substitutionOf=substitutionLineage,attemptNo=0,lastFailure=null;
  const maxAttempts=Math.max(1,step.retryPolicy.maxAttempts||1);
  while(attemptNo<maxAttempts){
   attemptNo++;
   const authorization=kernel.authorize({actorId:actor.id,intentId:`${goal.id}:${step.id}:${attemptNo}:${selected.id}`,actionType:`tool.${selected.id}`,resourceScope:`organization:${goal.organizationId}`,payload:step.inputs,grantId:step.authorityRef,policyVersionId:step.policyRef,humanApproval:step.humanApproval,correlationId:goal.correlationId});
   if(!authorization.ok){const kernelStage=authorization.diagnostics.firstFailure.checkId;const stage=authorization.code==="KILL_SWITCH_ACTIVE"?"KILL_SWITCH":kernelStage==="POLICY"?"POLICY":"AUTHORITY";return fail(stage,authorization.code,{nextAction:authorization.code==="HUMAN_ACCEPTANCE_REQUIRED"?"ESCALATE":"STOP"})}
   if(idempotency.has(step.idempotencyKey)){const prior=idempotency.get(step.idempotencyKey);return {...prior,replayed:true}}
   const adapter=adapters[selected.id];if(!adapter)return fail("EXECUTION","ADAPTER_NOT_AVAILABLE");
   const attempt=C.ExecutionAttempt({id:id(),planId:plan.id,stepId:step.id,toolId:selected.id,attempt:attemptNo,status:"RUNNING",startedAt:now(),correlationId:goal.correlationId,substitutionOf});attempts.push(attempt);
   const invocation=C.ToolInvocation({id:id(),attemptId:attempt.id,toolId:selected.id,inputHash:hash(step.inputs),idempotencyKey:step.idempotencyKey,startedAt:now(),status:"STARTED",substitutionOf});invocations.push(invocation);
   try{
    let timer;const raw=await Promise.race([adapter.invoke(step.inputs),new Promise((_,reject)=>{timer=setTimeout(()=>{const e=new Error("timeout");e.code="TIMEOUT";e.retryable=true;reject(e)},Math.min(step.timeoutMs,selected.timeoutMs))})]);clearTimeout(timer);
    const valid=raw&&typeof raw==="object"&&(selected.outputSchema.required||[]).every(key=>raw[key]!==undefined);const toolResult=C.ToolResult({id:id(),invocationId:invocation.id,toolId:selected.id,status:valid?"RETURNED":"INVALID_OUTPUT",receivedAt:now(),rawHash:hash(raw),actualCost:selected.cost?.amount??null});results.push(toolResult);
    const observation=C.Observation({id:id(),toolResultId:toolResult.id,classification:valid?"TOOL_RESPONSE_OBSERVED":"MALFORMED_OUTPUT_OBSERVED",observedAt:now(),evidenceRefs:[]});observations.push(observation);
    const invocationEvidence=kernel.recordExternalEvidence({actorId:actor.id,intentId:authorization.intent.id,correlationId:goal.correlationId,scope:`organization:${goal.organizationId}`,source:`tool:${selected.id}`,payload:{status:toolResult.status,resultId:toolResult.id},fromId:authorization.intent.id});
    if(!valid){lastFailure="INVALID_TOOL_OUTPUT";break}
    const verifier=verifiers[step.verificationMethod];const verdict=verifier?await verifier({raw,step,tool:selected,context}):{status:"UNVERIFIED",evidenceRefs:[]};
    if(!C.VERIFICATION_STATUSES.includes(verdict.status))throw new Error("invalid_verification_status");
    const verification=C.VerificationResult({id:id(),observationId:observation.id,status:verdict.status,method:step.verificationMethod,verifiedAt:now(),evidenceRefs:verdict.evidenceRefs||[],detailsHash:hash(verdict.details||null)});verifications.push(verification);
    const verifyEvidence=kernel.recordExternalEvidence({actorId:actor.id,intentId:authorization.intent.id,correlationId:goal.correlationId,scope:`organization:${goal.organizationId}`,source:`verifier:${step.verificationMethod}`,payload:{status:verification.status,verificationId:verification.id},fromId:invocationEvidence.id});
    if(memorySystem)memorySystem.writeMemory({memoryType:"EPISODIC",organizationId:goal.organizationId,scope:"execution",subjectRefs:[goal.id],workRefs:[plan.id],sourceRefs:[toolResult.id],evidenceRefs:[invocationEvidence.id,verifyEvidence.id],provenanceRefs:[invocation.id],retentionClass:"STANDARD",permissionTags:actor.permissionTags||["PUBLIC"],sensitivityTags:["INTERNAL"],content:{toolId:selected.id,toolStatus:toolResult.status,verificationStatus:verification.status}});
    const success=verification.status==="VERIFIED_SUCCESS";const nextAction=success?(plan.steps.every(s=>s.id===step.id||s.status==="COMPLETED")?"COMPLETE":"CONTINUE"):(verification.status==="VERIFIED_FAILURE"?"REPLAN":verification.status==="PARTIAL"?"REPLAN":"ESCALATE");
    const outcome={ok:success,code:success?null:`VERIFICATION_${verification.status}`,nextAction,stepStatus:success?"COMPLETED":nextAction==="ESCALATE"?"ESCALATED":"FAILED",tool:selected,substitutionOf,attempt,invocation,toolResult,observation,verification,evidenceRefs:[invocationEvidence.id,verifyEvidence.id],diagnostics:success?deriveDiagnostics(Object.fromEntries(STAGES.map(x=>[x,{status:"PASS"}])),now()):diagnostic("VERIFICATION",`VERIFICATION_${verification.status}`)};
    idempotency.set(step.idempotencyKey,outcome);return outcome;
   }catch(error){lastFailure=error.code==="TIMEOUT"?"TOOL_TIMEOUT":"TOOL_FAILURE";const failedResult=C.ToolResult({id:id(),invocationId:invocation.id,toolId:selected.id,status:lastFailure,receivedAt:now(),rawHash:null,actualCost:selected.cost?.amount??null});results.push(failedResult);const failedObservation=C.Observation({id:id(),toolResultId:failedResult.id,classification:lastFailure==="TOOL_TIMEOUT"?"NO_RESULT_OBSERVED":"FAILURE_OBSERVED",observedAt:now(),evidenceRefs:[]});observations.push(failedObservation);kernel.recordExternalEvidence({actorId:actor.id,intentId:authorization.intent.id,correlationId:goal.correlationId,scope:`organization:${goal.organizationId}`,source:`tool:${selected.id}`,payload:{status:lastFailure,resultId:failedResult.id},fromId:authorization.intent.id});const canRetry=error.retryable===true&&attemptNo<maxAttempts;if(canRetry)continue;break}
  }
  if(step.failureBehavior.allowSubstitution){const alternatives=registry.toolsForCapability(step.capabilityId,actor).filter(t=>t.id!==selected.id&&t.status==="AVAILABLE"&&compatible(selected.inputSchema,t.inputSchema)&&compatible(selected.outputSchema,t.outputSchema)&&t.cost.amount!==null&&t.cost.amount<=budget.maxCost&&budget.allowedRisks.includes(t.risk)&&t.autonomyLevels.includes(goal.requestedAutonomy));if(alternatives.length){substitutionOf=selected.id;selected=alternatives.sort((a,b)=>a.id.localeCompare(b.id))[0];replans.push(C.ReplanDecision({planId:plan.id,stepId:step.id,decision:"SUBSTITUTE_TOOL",reason:lastFailure,createdAt:now(),fromToolId:substitutionOf,toToolId:selected.id}));step={...step,toolId:selected.id,retryPolicy:{...step.retryPolicy,maxAttempts:1}};return execute({goal,plan:{...plan,steps:plan.steps.map(s=>s.id===step.id?step:s)},stepId,actor,budget,contextRequest,substitutionLineage:substitutionOf})}}
  const nextAction=step.failureBehavior.onExhausted||"REPLAN";return fail("EXECUTION",lastFailure||"RETRY_EXHAUSTED",{nextAction,stepStatus:nextAction==="STOP"?"STOPPED":"FAILED",attempts:attemptNo});
 }
 return Object.freeze({execute,validate,getLedger:()=>structuredClone({attempts,invocations,results,observations,verifications,replans})});
}
module.exports={createExecutionController,compatible};
