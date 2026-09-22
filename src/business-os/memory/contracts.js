"use strict";

const CONTRACT_VERSION="ai-business-os.memory-context/1.0.0";
const MEMORY_TYPES=Object.freeze(["WORKING","EPISODIC","SEMANTIC","PROCEDURAL","DECISION","DOMAIN"]);
const MEMORY_STATUSES=Object.freeze(["ACTIVE","STALE","SUPERSEDED","DISPUTED","EXPIRED","ARCHIVED","TOMBSTONED"]);
const KNOWLEDGE_STATUSES=Object.freeze(["CANDIDATE","SUPPORTED","VALIDATED","DISPUTED","STALE","SUPERSEDED"]);
const RELATIONS=Object.freeze(["SUPPORTS","CONTRADICTS","SUPERSEDES","DERIVED_FROM","CORRECTS","DUPLICATE_OF"]);
function record(kind,values,required){for(const key of required)if(values[key]===undefined||values[key]===null||values[key]==="")throw new Error(`invalid_${kind}:${key}`);return Object.freeze({contractVersion:CONTRACT_VERSION,kind,...values})}
const MemoryRecord=v=>record("MemoryRecord",v,["id","memoryType","organizationId","scope","createdAt","status","schemaVersion","retentionClass","permissionTags","sensitivityTags"]);
const KnowledgeClaim=v=>record("KnowledgeClaim",v,["id","organizationId","subjectRef","scope","proposition","claimType","status","createdAt","updatedAt","version","permissionTags","sensitivityTags"]);
const MemoryRelation=v=>record("MemoryRelation",v,["id","fromRef","toRef","relation","createdAt"]);
const ContextRequest=v=>record("ContextRequest",v,["id","requestingActorId","purpose","scope","budget","correlationId"]);
const ContextPackage=v=>record("ContextPackage",v,["id","requestId","requestingActorId","items","omissions","redactions","retrievalVersion","createdAt","correlationId"]);
function assertContract(value){if(value.kind==="MemoryRecord"&&(!MEMORY_TYPES.includes(value.memoryType)||!MEMORY_STATUSES.includes(value.status)))throw new Error("invalid_MemoryRecord:enum");if(value.kind==="KnowledgeClaim"&&!KNOWLEDGE_STATUSES.includes(value.status))throw new Error("invalid_KnowledgeClaim:status");if(value.kind==="MemoryRelation"&&!RELATIONS.includes(value.relation))throw new Error("invalid_MemoryRelation:relation");return value}
module.exports={CONTRACT_VERSION,MEMORY_TYPES,MEMORY_STATUSES,KNOWLEDGE_STATUSES,RELATIONS,MemoryRecord,KnowledgeClaim,MemoryRelation,ContextRequest,ContextPackage,assertContract};
