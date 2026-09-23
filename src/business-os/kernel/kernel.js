"use strict";
const crypto=require("node:crypto");
const C=require("./contracts");
const {deriveDiagnostics,STAGES}=require("./diagnostics");
const {createKernelRepository}=require("./repository");
const hash=value=>crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const scopeMatches=(allowed,actual)=>allowed.includes(actual)||allowed.some(x=>x.endsWith("*")&&actual.startsWith(x.slice(0,-1)));

function createConstitutionalKernel({clock=()=>new Date(),id=()=>crypto.randomUUID(),handlerTimeoutMs=100,repository=createKernelRepository()}={}){
 const now=()=>clock().toISOString(),r=repository.data;
 const handlers=new Map([["synthetic.echo",async payload=>({echo:payload.message})],["synthetic.fail",async()=>{throw new Error("synthetic_failure")}],["synthetic.timeout",async()=>new Promise(()=>{})]]);
 const audit=(type,ctx,outcome,reason,extra={})=>repository.appendAudit(C.AuditEvent({id:id(),eventType:type,actorId:ctx.actorId||"SYSTEM",intentId:ctx.intentId||null,workId:ctx.workId||null,authorityGrantId:ctx.grantId||null,policyDecisionId:ctx.policyDecisionId||null,policyVersionId:ctx.policyVersionId||null,outcome,reason,correlationId:ctx.correlationId||id(),causationId:ctx.causationId||null,timestamp:now(),...extra}));
 const fail=(stage,code,ctx={})=>{audit("GOVERNED_ATTEMPT",ctx,"DENIED",code);const failedIndex=STAGES.indexOf(stage),outcomes={};for(let index=0;index<failedIndex;index++)outcomes[STAGES[index]]={status:"PASS",reason:`${STAGES[index].toLowerCase()}_passed`,evidence:[]};outcomes[stage]={status:"FAIL",reason:code,evidence:[ctx.intentId].filter(Boolean)};return {ok:false,code,diagnostics:deriveDiagnostics(outcomes,now)}};

 function registerActor(values){const actor=C.assertEnums(C.Actor({...values,createdAt:values.createdAt||now()}));r.actors.set(actor.id,actor);return actor}
 function issueGrant(values){
  const issuer=r.actors.get(values.issuerActorId),subject=r.actors.get(values.subjectActorId);
  if(!issuer||!subject)throw new Error("unknown_actor");
  if(values.issuerActorId===values.subjectActorId)throw new Error("self_grant_forbidden");
  if(values.parentGrantId){const parent=r.grants.get(values.parentGrantId);if(!parent||parent.issuerActorId!==values.issuerActorId||!values.actionScopes.every(x=>scopeMatches(parent.actionScopes,x))||!values.resourceScopes.every(x=>scopeMatches(parent.resourceScopes,x)))throw new Error("authority_expansion_forbidden")}
  const grant=C.AuthorityGrant({...values,issuedAt:values.issuedAt||now(),status:values.status||"ACTIVE",version:values.version||1,constraints:values.constraints||{}});r.grants.set(grant.id,grant);audit("AUTHORITY_CHANGE",{actorId:values.issuerActorId,grantId:grant.id},"APPROVED","grant_issued");return grant;
 }
 function revokeGrant(grantId,actorId){const grant=r.grants.get(grantId);if(!grant||grant.issuerActorId!==actorId)throw new Error("authority_change_forbidden");r.grants.set(grantId,C.AuthorityGrant({...grant,status:"REVOKED",revokedAt:now(),version:grant.version+1}));audit("AUTHORITY_CHANGE",{actorId,grantId},"APPROVED","grant_revoked")}
 function addPolicy(values){const definition=C.PolicyDefinition({id:values.definitionId,scope:values.scope||"system",createdAt:values.createdAt||now()});const version=C.PolicyVersion({id:values.id,definitionId:definition.id,version:values.version,rules:values.rules,createdAt:values.createdAt||now()});if(r.policies.has(version.id))throw new Error("policy_version_immutable");r.policies.set(version.id,version);return version}
 function createWork(values){const work=C.Work({id:values.id,state:values.state||"READY",version:values.version||1,allowedTransitions:values.allowedTransitions||{READY:["EXECUTING"],EXECUTING:["COMPLETED"]},createdAt:values.createdAt||now()});r.works.set(work.id,work);return work}
 function setKillSwitch(values){if(!r.actors.has(values.issuerActorId))throw new Error("unknown_actor");const issuerGrant=[...r.grants.values()].find(g=>g.subjectActorId===values.issuerActorId&&g.status==="ACTIVE"&&scopeMatches(g.actionScopes,"governance.kill-switch"));if(!issuerGrant)throw new Error("kill_switch_authority_required");const sw=C.KillSwitch({...values,changedAt:now()});r.switches.set(sw.id,sw);audit("KILL_SWITCH_CHANGE",{actorId:values.issuerActorId,grantId:issuerGrant.id},"APPROVED",values.reason);return sw}
 function activeSwitch(action,resource){return [...r.switches.values()].find(s=>s.active&&((s.scopeType==="SYSTEM")||(s.scopeType==="ACTION"&&scopeMatches([s.scopeValue],action))||(s.scopeType==="RESOURCE"&&scopeMatches([s.scopeValue],resource))))}
 function authorize(request){
  const ctx={actorId:request.actorId,intentId:request.intentId,correlationId:request.correlationId||id(),causationId:request.causationId||null};
  const actor=r.actors.get(request.actorId);if(!actor||actor.status!=="ACTIVE")return fail("ACTOR","UNKNOWN_ACTOR",ctx);
  const intent=C.StructuredIntent({id:request.intentId,actorId:actor.id,actionType:request.actionType,resourceScope:request.resourceScope,payloadHash:hash(request.payload),createdAt:now(),correlationId:ctx.correlationId,causationId:ctx.causationId,requestedAuthorityContext:request.grantId});
  const grant=r.grants.get(request.grantId);ctx.grantId=request.grantId;if(!grant)return fail("AUTHORITY","MISSING_AUTHORITY",ctx);
  if(grant.subjectActorId!==actor.id||grant.status!=="ACTIVE"||grant.revokedAt)return fail("AUTHORITY",grant.status==="REVOKED"||grant.revokedAt?"REVOKED_AUTHORITY":"WRONG_SUBJECT",ctx);
  if(grant.expiresAt&&new Date(grant.expiresAt)<=clock())return fail("AUTHORITY","EXPIRED_AUTHORITY",ctx);
  if(!scopeMatches(grant.actionScopes,intent.actionType))return fail("AUTHORITY","WRONG_ACTION_SCOPE",ctx);
  if(!scopeMatches(grant.resourceScopes,intent.resourceScope))return fail("AUTHORITY","WRONG_RESOURCE_SCOPE",ctx);
  if(activeSwitch(intent.actionType,intent.resourceScope))return fail("AUTHORITY","KILL_SWITCH_ACTIVE",ctx);
  const policy=r.policies.get(request.policyVersionId);ctx.policyVersionId=request.policyVersionId;if(!policy)return fail("POLICY","POLICY_NOT_FOUND",ctx);
  const rule=policy.rules[intent.actionType]||{outcome:"DENY",reason:"NO_MATCHING_RULE"};let outcome=rule.outcome;
  if(outcome==="REQUIRE_HUMAN"){const approver=r.actors.get(request.humanApproval?.actorId);if(!approver||approver.type!=="HUMAN"||approver.id===actor.id||!request.humanApproval.accepted)return fail("POLICY","HUMAN_ACCEPTANCE_REQUIRED",ctx);outcome="ALLOW"}
  const decision=C.assertEnums(C.PolicyDecision({id:id(),policyVersionId:policy.id,actorId:actor.id,grantId:grant.id,intentId:intent.id,outcome,reasonCodes:[rule.reason||outcome],evaluatedAt:now(),evidenceRefs:request.humanApproval?[request.humanApproval.evidenceRef]:[]}));ctx.policyDecisionId=decision.id;audit("POLICY_DECISION",ctx,outcome,rule.reason||outcome);
  if(outcome!=="ALLOW")return fail("POLICY","POLICY_DENY",ctx);
  return {ok:true,intent,decision,grant,correlationId:ctx.correlationId};
 }
 function recordExternalEvidence({actorId,intentId,correlationId,scope,source,evidenceType="OBSERVED_FACT",payload,fromId}){const evidence=C.assertEnums(C.EvidenceRecord({id:id(),evidenceType,source,actorId,recordedAt:now(),version:1,scope,payloadHash:hash(payload),confidence:null}));r.evidence.set(evidence.id,evidence);if(fromId){const link=C.ProvenanceLink({id:id(),fromId,toId:evidence.id,relation:"RESULT_OF",createdAt:now()});r.provenance.set(link.id,link)}audit("EXTERNAL_EXECUTION_EVIDENCE",{actorId,intentId,correlationId},"RECORDED",source,{evidenceRefs:[evidence.id]});return evidence}
 function validateTransition(work,to,expectedVersion,ctx){if(work.version!==expectedVersion)return {error:"CONCURRENCY_CONFLICT"};if(!(work.allowedTransitions[work.state]||[]).includes(to))return {error:"ILLEGAL_TRANSITION"};return {transition:C.StateTransition({id:id(),workId:work.id,from:work.state,to,expectedVersion,actorId:ctx.actorId,intentId:ctx.intentId,outcome:"VALID",createdAt:now()})}}
 function promoteEvidence({sourceEvidenceId,evidenceType,actorId,grantId,payload}){const source=r.evidence.get(sourceEvidenceId),grant=r.grants.get(grantId);if(!source)throw new Error("evidence_not_found");if(!grant||grant.subjectActorId!==actorId||!scopeMatches(grant.actionScopes,"evidence.promote"))throw new Error("evidence_promotion_forbidden");const ev=C.assertEnums(C.EvidenceRecord({id:id(),evidenceType,source:"authorized_promotion",actorId,recordedAt:now(),version:1,scope:source.scope,payloadHash:hash(payload),confidence:null}));r.evidence.set(ev.id,ev);const link=C.ProvenanceLink({id:id(),fromId:source.id,toId:ev.id,relation:"DERIVED_FROM",createdAt:now()});r.provenance.set(link.id,link);return ev}

 async function execute(request){
  const ctx={actorId:request.actorId,intentId:request.intentId,workId:request.workId,correlationId:request.correlationId||id(),causationId:request.causationId||null};
  const actor=r.actors.get(request.actorId);if(!actor||actor.status!=="ACTIVE")return fail("ACTOR","UNKNOWN_ACTOR",ctx);
  if(r.intents.has(request.intentId))return fail("AUTHORITY","DUPLICATE_INTENT",ctx);
  const intent=C.StructuredIntent({id:request.intentId,actorId:actor.id,actionType:request.actionType,resourceScope:request.resourceScope,payloadHash:hash(request.payload),createdAt:now(),correlationId:ctx.correlationId,causationId:ctx.causationId,requestedAuthorityContext:request.grantId});
  const grant=r.grants.get(request.grantId);ctx.grantId=request.grantId;
  if(!grant)return fail("AUTHORITY","MISSING_AUTHORITY",ctx);
  if(grant.subjectActorId!==actor.id||grant.status!=="ACTIVE"||grant.revokedAt)return fail("AUTHORITY",grant.status==="REVOKED"||grant.revokedAt?"REVOKED_AUTHORITY":"WRONG_SUBJECT",ctx);
  if(grant.expiresAt&&new Date(grant.expiresAt)<=clock())return fail("AUTHORITY","EXPIRED_AUTHORITY",ctx);
  if(!scopeMatches(grant.actionScopes,intent.actionType))return fail("AUTHORITY","WRONG_ACTION_SCOPE",ctx);
  if(!scopeMatches(grant.resourceScopes,intent.resourceScope))return fail("AUTHORITY","WRONG_RESOURCE_SCOPE",ctx);
  const sw=activeSwitch(intent.actionType,intent.resourceScope);if(sw)return fail("AUTHORITY","KILL_SWITCH_ACTIVE",ctx);
  const policy=r.policies.get(request.policyVersionId);ctx.policyVersionId=request.policyVersionId;
  if(!policy)return fail("POLICY","POLICY_NOT_FOUND",ctx);
  const rule=policy.rules[intent.actionType]||{outcome:"DENY",reason:"NO_MATCHING_RULE"};let outcome=rule.outcome;
  if(outcome==="REQUIRE_HUMAN"){
   const approver=r.actors.get(request.humanApproval?.actorId);
   if(!approver||approver.type!=="HUMAN"||approver.id===actor.id||!request.humanApproval.accepted)return fail("POLICY","HUMAN_ACCEPTANCE_REQUIRED",ctx);
   outcome="ALLOW";
  }
  const decision=C.assertEnums(C.PolicyDecision({id:id(),policyVersionId:policy.id,actorId:actor.id,grantId:grant.id,intentId:intent.id,outcome,reasonCodes:[rule.reason||outcome],evaluatedAt:now(),evidenceRefs:request.humanApproval?[request.humanApproval.evidenceRef]:[]}));ctx.policyDecisionId=decision.id;audit("POLICY_DECISION",ctx,outcome,rule.reason||outcome);
  if(outcome!=="ALLOW")return fail("POLICY","POLICY_DENY",ctx);
  const work=r.works.get(request.workId);if(!work)return fail("STATE_VALIDATION","WORK_NOT_FOUND",ctx);
  const start=validateTransition(work,"EXECUTING",request.expectedVersion,ctx);if(start.error)return fail("STATE_VALIDATION",start.error,ctx);
  const handler=handlers.get(intent.actionType);if(!handler)return fail("EXECUTION","HANDLER_NOT_CONTROLLED",ctx);
  const snap=repository.snapshot();r.intents.set(intent.id,intent);
  try{
   r.works.set(work.id,C.Work({...work,state:"EXECUTING",version:work.version+1}));
   const executionKey=request.executionId||intent.id;
   if(r.executions.has(executionKey)){repository.restore(snap);return fail("EXECUTION","DUPLICATE_EXECUTION",ctx)}
   r.executions.set(executionKey,{status:"STARTED"});
   let timer;const result=await Promise.race([handler(request.payload),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("handler_timeout")),handlerTimeoutMs)})]);clearTimeout(timer);
   if(!result||typeof result!=="object")throw new Error("result_not_observed");
   const evidence=C.assertEnums(C.EvidenceRecord({id:id(),evidenceType:"OBSERVED_FACT",source:`handler:${intent.actionType}`,actorId:actor.id,recordedAt:now(),version:1,scope:intent.resourceScope,payloadHash:hash(result),confidence:null}));r.evidence.set(evidence.id,evidence);
   const link=C.ProvenanceLink({id:id(),fromId:intent.id,toId:evidence.id,relation:"RESULT_OF",createdAt:now()});r.provenance.set(link.id,link);
   const current=r.works.get(work.id),finish=validateTransition(current,"COMPLETED",current.version,ctx);if(finish.error)throw new Error(finish.error);
   r.works.set(work.id,C.Work({...current,state:"COMPLETED",version:current.version+1}));r.executions.set(executionKey,{status:"SUCCEEDED",evidenceId:evidence.id});
   audit("GOVERNED_EXECUTION",ctx,"SUCCEEDED","actual_result_observed",{evidenceRefs:[evidence.id]});
   const event=C.EventEnvelope({id:id(),eventType:"governed.execution.completed",schemaVersion:"1.0.0",producer:"constitutional-kernel",subjectId:work.id,timestamp:now(),correlationId:ctx.correlationId,causationId:intent.id,payloadHash:hash({workId:work.id,evidenceId:evidence.id}),idempotencyKey:`execution:${executionKey}`});r.events.set(event.id,event);
   const outbox=C.OutboxRecord({id:id(),eventId:event.id,idempotencyKey:event.idempotencyKey,state:"PENDING",attempts:0,maxAttempts:request.maxAttempts||3,createdAt:now(),failureEvidence:[]});r.outbox.set(outbox.id,outbox);
   const outcomes=Object.fromEntries(STAGES.map(stage=>[stage,{status:"PASS",reason:`${stage.toLowerCase()}_passed`,evidence:[]} ]));
   return {ok:true,result,evidence,decision,event,outbox,work:r.works.get(work.id),diagnostics:deriveDiagnostics(outcomes,now)};
  }catch(error){repository.restore(snap);return fail(error.message==="handler_timeout"?"EXECUTION":"EXECUTION",error.message==="handler_timeout"?"HANDLER_TIMEOUT":"HANDLER_FAILURE",ctx)}
 }
 function deliverOutbox(outboxId,consumer){const current=r.outbox.get(outboxId);if(!current)throw new Error("outbox_not_found");if(current.state==="DELIVERED"||current.state==="DEAD_LETTER")return current;const receipt=`${consumer.id}:${current.idempotencyKey}`;if(r.consumerReceipts.has(receipt)){const delivered=C.OutboxRecord({...current,state:"DELIVERED",processedAt:now()});r.outbox.set(outboxId,delivered);return delivered}try{consumer.handle(r.events.get(current.eventId));r.consumerReceipts.add(receipt);const delivered=C.OutboxRecord({...current,state:"DELIVERED",attempts:current.attempts+1,processedAt:now()});r.outbox.set(outboxId,delivered);return delivered}catch(error){const attempts=current.attempts+1,state=attempts>=current.maxAttempts?"DEAD_LETTER":"RETRY";const failed=C.OutboxRecord({...current,state,attempts,lastFailure:error.message,failureEvidence:[...(current.failureEvidence||[]),hash(error.message)],nextAttemptAt:state==="RETRY"?now():null});r.outbox.set(outboxId,failed);audit("OUTBOX_DELIVERY",{actorId:"SYSTEM",correlationId:r.events.get(current.eventId).correlationId},"FAILED",state);return failed}}
 function recordLifecycleEvent({eventType,producer="agent-runtime",subjectId,actorId="SYSTEM",correlationId,causationId=null,idempotencyKey,payload={}}){
  if(!eventType||!subjectId||!correlationId||!idempotencyKey)throw new Error("invalid_lifecycle_event");
  const duplicate=[...r.events.values()].find(event=>event.idempotencyKey===idempotencyKey);if(duplicate)return {event:duplicate,outbox:[...r.outbox.values()].find(item=>item.eventId===duplicate.id),replayed:true};
  const event=C.EventEnvelope({id:id(),eventType,schemaVersion:"1.0.0",producer,subjectId,timestamp:now(),correlationId,causationId,payloadHash:hash(payload),idempotencyKey});r.events.set(event.id,event);
  const outbox=C.OutboxRecord({id:id(),eventId:event.id,idempotencyKey,state:"PENDING",attempts:0,maxAttempts:3,createdAt:now(),failureEvidence:[]});r.outbox.set(outbox.id,outbox);audit("LIFECYCLE_EVENT_RECORDED",{actorId,correlationId,causationId},"RECORDED",eventType,{eventRefs:[event.id]});return {event,outbox,replayed:false};
 }
 return Object.freeze({registerActor,issueGrant,revokeGrant,addPolicy,createWork,setKillSwitch,promoteEvidence,authorize,recordExternalEvidence,recordLifecycleEvent,execute,deliverOutbox,repository,contracts:C});
}
module.exports={createConstitutionalKernel};
