"use strict";
const crypto=require("node:crypto");
const C=require("./contracts");
const {STAGES,deriveDiagnostics}=require("./diagnostics");
const clone=value=>structuredClone(value);
const forbiddenKeys=new Set(["chainOfThought","chain_of_thought","hiddenReasoning","privateReasoning","scratchpad"]);
function safePayload(value){if(value===null||typeof value!=="object")return value;const out=Array.isArray(value)?[]:{};for(const [key,item] of Object.entries(value))if(!forbiddenKeys.has(key))out[key]=safePayload(item);return out}
function createMemorySystem({clock=()=>new Date(),id=()=>crypto.randomUUID(),freshnessPolicies={VOLATILE:60_000,STANDARD:86_400_000,STABLE:null}}={}){
 const memories=new Map(),claims=new Map(),relations=new Map(),index=new Map();
 const now=()=>clock().toISOString(),fail=(stage,reason)=>{const outcomes={};for(const name of STAGES.slice(0,STAGES.indexOf(stage)))outcomes[name]={status:"PASS"};outcomes[stage]={status:"FAIL",reason};return {ok:false,code:reason,diagnostics:deriveDiagnostics(outcomes,now())}};
 const canRead=(record,actor)=>record.permissionTags.includes("PUBLIC")||record.permissionTags.includes(`ACTOR:${actor.id}`)||(actor.permissionTags||[]).some(tag=>record.permissionTags.includes(tag));
 const freshness=(record,at=clock())=>{const limit=record.freshnessPolicyMs!==undefined?record.freshnessPolicyMs:freshnessPolicies[record.freshnessClass||"STANDARD"];const base=new Date(record.observedAt||record.createdAt);return limit===null||at-base<=limit};
 const reindex=record=>{for(const ref of [...(record.subjectRefs||[]),...(record.workRefs||[])]){if(!index.has(ref))index.set(ref,new Set());index.get(ref).add(record.id)}};
 function writeMemory(values){
  if(values.agentPrivateDurable)throw new Error("private_durable_memory_forbidden");
  if(values.memoryType!=="WORKING"&&!(values.provenanceRefs?.length||values.evidenceRefs?.length||values.sourceRefs?.length))return fail("PROVENANCE_VALIDATION","MISSING_PROVENANCE");
  if(!values.permissionTags?.length)return fail("PERMISSION_CLASSIFICATION","MISSING_PERMISSION_CLASSIFICATION");
  const payload=safePayload(values.content||null);if(values.memoryType==="DECISION"&&JSON.stringify(payload)!==JSON.stringify(values.content||null))values={...values,content:payload};
  const record=C.assertContract(C.MemoryRecord({subjectRefs:[],workRefs:[],sourceRefs:[],evidenceRefs:[],provenanceRefs:[],tags:[],freshnessClass:"STANDARD",expiryAt:null,validFrom:null,validTo:null,contradictionRefs:[],supersessionRefs:[],content:payload,...values,id:values.id||id(),createdAt:values.createdAt||now(),status:values.status||"ACTIVE",schemaVersion:values.schemaVersion||1}));
  if(record.memoryType==="WORKING"&&(!record.taskRef||!record.expiryAt||record.maxSize===undefined))throw new Error("working_memory_bounds_required");
  if(record.memoryType==="WORKING"&&Buffer.byteLength(JSON.stringify(record.content))>record.maxSize)throw new Error("working_memory_size_exceeded");
  if(memories.has(record.id))throw new Error("memory_id_exists");memories.set(record.id,record);reindex(record);return {ok:true,record};
 }
 function correctMemory(originalId,values){if(!memories.has(originalId))throw new Error("memory_not_found");const result=writeMemory(values);if(result.ok){const relation=C.MemoryRelation({id:id(),fromRef:result.record.id,toRef:originalId,relation:"CORRECTS",createdAt:now()});relations.set(relation.id,relation)}return result}
 function setMemoryStatus(memoryId,status){const original=memories.get(memoryId);if(!original)throw new Error("memory_not_found");const updated=C.assertContract(C.MemoryRecord({...original,status}));memories.set(memoryId,updated);return updated}
 function tombstone(memoryId){const original=memories.get(memoryId);if(!original)throw new Error("memory_not_found");const tomb=C.MemoryRecord({...original,status:"TOMBSTONED",content:null,contentHash:original.contentHash||crypto.createHash("sha256").update(JSON.stringify(original.content)).digest("hex"),tombstonedAt:now()});memories.set(memoryId,tomb);return tomb}
 function retrieve({actor,subjectRefs=[],workRefs=[],memoryTypes=[],scope,taskRef,requireFresh=false,tags=[],includeHistorical=false}){
  const redactions=[];let rows=[...memories.values()].filter(r=>r.status!=="TOMBSTONED"&&(includeHistorical||!["ARCHIVED","SUPERSEDED","EXPIRED"].includes(r.status)));
  rows=rows.filter(r=>{const allowed=canRead(r,actor);if(!allowed)redactions.push({recordId:r.id,reason:"PERMISSION_DENIED",payloadExposed:false});return allowed});
  rows=rows.filter(r=>!scope||r.scope===scope).filter(r=>!memoryTypes.length||memoryTypes.includes(r.memoryType)).filter(r=>!subjectRefs.length||subjectRefs.some(x=>(r.subjectRefs||[]).includes(x))).filter(r=>!workRefs.length||workRefs.some(x=>(r.workRefs||[]).includes(x))).filter(r=>!tags.length||tags.every(x=>(r.tags||[]).includes(x)));
  rows=rows.filter(r=>r.memoryType!=="WORKING"||r.taskRef===taskRef);
  const at=clock();rows=rows.filter(r=>!(r.expiryAt&&new Date(r.expiryAt)<=at)).filter(r=>!requireFresh||freshness(r,at));return {records:rows.map(clone),redactions};
 }
 function proposeClaim(values){const status=values.status||"CANDIDATE";if(status!=="CANDIDATE")throw new Error("claim_must_begin_candidate");const claim=C.assertContract(C.KnowledgeClaim({supportingEvidenceRefs:[],supportingMemoryRefs:[],contradictingRefs:[],derivationRefs:[],confidenceMethod:null,confidenceValue:null,freshnessClass:"STANDARD",validFrom:null,validTo:null,...values,id:values.id||id(),status,createdAt:values.createdAt||now(),updatedAt:values.updatedAt||now(),version:values.version||1}));claims.set(claim.id,claim);return claim}
 function promoteClaim(claimId,{status,validationRuleRef,actorAuthorityRef}){const claim=claims.get(claimId);if(!claim)throw new Error("claim_not_found");if(!["SUPPORTED","VALIDATED"].includes(status))throw new Error("invalid_promotion");if(!(claim.supportingEvidenceRefs.length||claim.supportingMemoryRefs.length))throw new Error("evidence_required");if(status==="VALIDATED"&&(!validationRuleRef||!actorAuthorityRef))throw new Error("validation_authority_required");const updated=C.KnowledgeClaim({...claim,status,validationRuleRef:validationRuleRef||null,validatedByAuthorityRef:actorAuthorityRef||null,updatedAt:now(),version:claim.version+1});claims.set(claimId,updated);return updated}
 function supersedeClaim(oldId,values){const old=claims.get(oldId);if(!old)throw new Error("claim_not_found");const next=proposeClaim(values);claims.set(oldId,C.KnowledgeClaim({...old,status:"SUPERSEDED",updatedAt:now(),version:old.version+1,supersededBy:next.id}));const link=C.MemoryRelation({id:id(),fromRef:next.id,toRef:oldId,relation:"SUPERSEDES",createdAt:now()});relations.set(link.id,link);return next}
 function addRelation(values){const link=C.assertContract(C.MemoryRelation({...values,id:values.id||id(),createdAt:values.createdAt||now()}));relations.set(link.id,link);return link}
 function retrieveClaims({actor,subjectRefs=[],scope,statuses=[],requireFresh=false}){return [...claims.values()].filter(c=>canRead(c,actor)&&(!scope||c.scope===scope)&&(!subjectRefs.length||subjectRefs.includes(c.subjectRef))&&(!statuses.length||statuses.includes(c.status))&&(!requireFresh||freshness(c))).map(clone)}
 function rebuildIndex(){index.clear();for(const record of memories.values())reindex(record);return [...index.entries()].map(([key,value])=>[key,[...value]])}
 function indexLookup(ref){return [...(index.get(ref)||[])].map(memoryId=>clone(memories.get(memoryId)))}
 function acceptCognitiveProposal(result){if(result?.authoritative!==false)throw new Error("authoritative_cognitive_result_forbidden");return {accepted:false,reason:"GOVERNED_ACCEPTANCE_REQUIRED",candidateMemory:result?.content?.candidateMemory||null,candidateKnowledgeClaim:result?.content?.candidateKnowledgeClaim||null}}
 return Object.freeze({writeMemory,correctMemory,setMemoryStatus,tombstone,retrieve,proposeClaim,promoteClaim,supersedeClaim,addRelation,retrieveClaims,rebuildIndex,indexLookup,acceptCognitiveProposal,getMemory:id=>clone(memories.get(id)),getClaim:id=>clone(claims.get(id)),getRelations:()=>[...relations.values()].map(clone),listMemories:()=>[...memories.values()].map(clone),listClaims:()=>[...claims.values()].map(clone),isFresh:freshness});
}
module.exports={createMemorySystem,safePayload};
