"use strict";

const CONTRACT_VERSION="ai-business-os.constitution/1.0.0";
const ACTOR_TYPES=Object.freeze(["HUMAN","SERVICE","SYSTEM","AI_AGENT","MODEL_RUNTIME","EXTERNAL_PRINCIPAL"]);
const EVIDENCE_TYPES=Object.freeze(["OBSERVED_FACT","DERIVED_ATTRIBUTE","INFERENCE","HYPOTHESIS","DECISION","KNOWLEDGE"]);
const DIAGNOSTIC_STATUSES=Object.freeze(["PASS","FAIL","BLOCKED","NOT_RUN","PENDING","NOT_APPLICABLE"]);
const POLICY_OUTCOMES=Object.freeze(["ALLOW","DENY","REQUIRE_HUMAN"]);

function record(kind,values,required=[]){
 for(const key of required)if(values[key]===undefined||values[key]===null||values[key]==="")throw new Error(`invalid_${kind}:${key}`);
 return Object.freeze({contractVersion:CONTRACT_VERSION,kind,...values});
}
const define=(kind,required)=>(values={})=>record(kind,values,required);
const Actor=define("Actor",["id","type","status","createdAt"]);
const StructuredIntent=define("StructuredIntent",["id","actorId","actionType","resourceScope","payloadHash","createdAt","correlationId"]);
const AuthorityGrant=define("AuthorityGrant",["id","subjectActorId","actionScopes","resourceScopes","issuerActorId","issuedAt","status","version"]);
const PolicyDefinition=define("PolicyDefinition",["id","scope","createdAt"]);
const PolicyVersion=define("PolicyVersion",["id","definitionId","version","rules","createdAt"]);
const PolicyDecision=define("PolicyDecision",["id","policyVersionId","actorId","grantId","intentId","outcome","reasonCodes","evaluatedAt"]);
const Work=define("Work",["id","state","version","allowedTransitions","createdAt"]);
const WorkItem=define("WorkItem",["id","workId","state","version","createdAt"]);
const StateTransition=define("StateTransition",["id","workId","from","to","expectedVersion","actorId","intentId","outcome","createdAt"]);
const EvidenceRecord=define("EvidenceRecord",["id","evidenceType","source","actorId","recordedAt","version","scope","payloadHash"]);
const ProvenanceLink=define("ProvenanceLink",["id","fromId","toId","relation","createdAt"]);
const AuditEvent=define("AuditEvent",["id","eventType","actorId","outcome","reason","correlationId","timestamp"]);
const EventEnvelope=define("EventEnvelope",["id","eventType","schemaVersion","producer","subjectId","timestamp","correlationId","idempotencyKey"]);
const OutboxRecord=define("OutboxRecord",["id","eventId","idempotencyKey","state","attempts","maxAttempts","createdAt"]);
const DiagnosticCheck=define("DiagnosticCheck",["id","status","order","dependencies"]);
const FirstFailure=define("FirstFailure",["checkId","derivedAt"]);
const KillSwitch=define("KillSwitch",["id","scopeType","scopeValue","active","issuerActorId","reason","changedAt"]);

function assertEnums(value){
 if(value.kind==="Actor"&&!ACTOR_TYPES.includes(value.type))throw new Error("invalid_Actor:type");
 if(value.kind==="EvidenceRecord"&&!EVIDENCE_TYPES.includes(value.evidenceType))throw new Error("invalid_EvidenceRecord:evidenceType");
 if(value.kind==="PolicyDecision"&&!POLICY_OUTCOMES.includes(value.outcome))throw new Error("invalid_PolicyDecision:outcome");
 if(value.kind==="DiagnosticCheck"&&!DIAGNOSTIC_STATUSES.includes(value.status))throw new Error("invalid_DiagnosticCheck:status");
 return value;
}

module.exports={CONTRACT_VERSION,ACTOR_TYPES,EVIDENCE_TYPES,DIAGNOSTIC_STATUSES,POLICY_OUTCOMES,Actor,StructuredIntent,AuthorityGrant,PolicyDefinition,PolicyVersion,PolicyDecision,Work,WorkItem,StateTransition,EvidenceRecord,ProvenanceLink,AuditEvent,EventEnvelope,OutboxRecord,DiagnosticCheck,FirstFailure,KillSwitch,assertEnums};
