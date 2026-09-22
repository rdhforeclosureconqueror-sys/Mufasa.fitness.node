"use strict";
const crypto=require("node:crypto");
const C=require("./contracts");
const {STAGES,deriveDiagnostics}=require("./diagnostics");
function createContextEngine({memorySystem,clock=()=>new Date(),id=()=>crypto.randomUUID(),retrievalVersion="context-retrieval/1"}={}){
 const now=()=>clock().toISOString();
 function fail(stage,code){const outcomes={};for(const name of STAGES.slice(0,STAGES.indexOf(stage)))outcomes[name]={status:"PASS"};outcomes[stage]={status:"FAIL",reason:code};return {ok:false,code,diagnostics:deriveDiagnostics(outcomes,now())}}
 function build(values){
  let request;try{request=C.ContextRequest(values)}catch{return fail("RETRIEVAL_REQUEST","INVALID_CONTEXT_REQUEST")}
  if(!request.actor)return fail("PERMISSION_FILTER","ACTOR_PERMISSIONS_REQUIRED");
  const found=memorySystem.retrieve({actor:request.actor,subjectRefs:request.subjectRefs||[],workRefs:request.workRefs||[],memoryTypes:request.requestedMemoryTypes||[],scope:request.scope,taskRef:request.taskRef,requireFresh:request.requireFresh===true,tags:request.tags||[]});
  const claims=memorySystem.retrieveClaims({actor:request.actor,subjectRefs:request.subjectRefs||[],scope:request.scope,statuses:request.requestedKnowledgeStatuses||[],requireFresh:request.requireFresh===true});
  if(found.records.length+claims.length===0&&found.redactions.length)return fail("PERMISSION_FILTER","DENIED_RETRIEVAL");
  if(request.requireFresh&&found.records.length+claims.length===0)return fail("FRESHNESS_FILTER","STALE_ONLY_CONTEXT");
  const subjectSet=new Set(request.subjectRefs||[]),workSet=new Set(request.workRefs||[]);
  const score=item=>{let value=item.priority||0;value+=(item.subjectRefs||[item.subjectRef]).some(x=>subjectSet.has(x))?100:0;value+=(item.workRefs||[]).some(x=>workSet.has(x))?80:0;value+=item.status==="VALIDATED"?30:item.status==="SUPPORTED"?20:item.status==="ACTIVE"?10:0;value+=memorySystem.isFresh(item)?10:0;return value};
  const candidates=[...found.records.map(record=>({category:"MEMORY",record})),...claims.map(record=>({category:"KNOWLEDGE",record}))].map(entry=>({...entry,score:score(entry.record)})).sort((a,b)=>b.score-a.score||a.record.id.localeCompare(b.record.id));
  const budget=Math.max(0,request.budget),selected=candidates.slice(0,budget),truncated=candidates.slice(budget);
  const items=selected.map((entry,rank)=>{
   const subjectMatch=subjectSet.size&&(entry.record.subjectRefs||[entry.record.subjectRef]).some(x=>subjectSet.has(x));
   const workMatch=workSet.size&&(entry.record.workRefs||[]).some(x=>workSet.has(x));
   return Object.freeze({category:entry.category,record:entry.record,selection:Object.freeze({rank:rank+1,score:entry.score,reasons:[...(subjectMatch?["DIRECT_SUBJECT_MATCH"]:[]),...(workMatch?["DIRECT_WORK_MATCH"]:[]),memorySystem.isFresh(entry.record)?"FRESH":"STALE","DETERMINISTIC_ID_TIEBREAK"],provenanceRefs:entry.record.provenanceRefs||entry.record.derivationRefs||entry.record.evidenceRefs||entry.record.supportingEvidenceRefs||[]})});
  });
  const omissions=truncated.map(entry=>({recordId:entry.record.id,reason:"CONTEXT_BUDGET",payloadExposed:false}));
  const contradictions=memorySystem.getRelations().filter(link=>link.relation==="CONTRADICTS"&&items.some(item=>[link.fromRef,link.toRef].includes(item.record.id)));
  const pkg=C.ContextPackage({id:id(),requestId:request.id,requestingActorId:request.requestingActorId,purpose:request.purpose,workRefs:request.workRefs||[],subjectRefs:request.subjectRefs||[],authorityRefs:request.authorityRefs||[],policyRefs:request.policyRefs||[],items,omissions,redactions:found.redactions,contradictions,staleMarkers:items.filter(x=>!memorySystem.isFresh(x.record)).map(x=>x.record.id),retrievalVersion,createdAt:now(),correlationId:request.correlationId,causationId:request.causationId||null,ranking:Object.freeze({strategy:"explicit-match-status-freshness-priority-id/1",candidateCount:candidates.length,includedCount:items.length,truncatedCount:omissions.length})});
  const outcomes=Object.fromEntries(STAGES.slice(0,STAGES.indexOf("CONTEXT_PACKAGE")+1).map(stage=>[stage,{status:"PASS"}]));return {ok:true,package:pkg,diagnostics:deriveDiagnostics(outcomes,now())};
 }
 function toCognitiveRequest(pkg,values){if(pkg.kind!=="ContextPackage")return fail("COGNITIVE_HANDOFF","INVALID_CONTEXT_PACKAGE");if(pkg.items.some(item=>!item.selection?.reasons?.length))return fail("COGNITIVE_HANDOFF","UNATTRIBUTED_CONTEXT_ITEM");const cognition=require("../cognition/contracts");const request=cognition.CognitiveRequest({...values,requestingActorId:pkg.requestingActorId,inputRefs:[pkg.id,...pkg.items.map(x=>x.record.id)],evidenceRefs:pkg.items.flatMap(x=>x.selection.provenanceRefs),correlationId:pkg.correlationId});return {ok:true,request,diagnostics:deriveDiagnostics(Object.fromEntries(STAGES.map(stage=>[stage,{status:"PASS"}])),now())}}
 return Object.freeze({build,toCognitiveRequest});
}
module.exports={createContextEngine};
