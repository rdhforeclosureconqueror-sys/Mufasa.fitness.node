"use strict";
const CONTRACT_VERSION="ai-business-os.analyst/1.0.0";
const DISPOSITIONS=Object.freeze(["ADVANCE_TO_EXPERIMENT","REQUEST_EVIDENCE","HOLD","REJECT","ESCALATE_CONTRADICTION"]);
const EVIDENCE_CLASSES=Object.freeze(["VERIFIED_OUTCOME","LIVE_FIRST_PARTY","VERIFIED_PROVIDER","HUMAN_APPROVED_RESEARCH","CONTROLLED_VALIDATION","SYNTHETIC","UNVERIFIED"]);
function record(kind,value,required){for(const key of required)if(value?.[key]===undefined||value[key]===null||value[key]==="")throw new Error(`invalid_${kind}:${key}`);return Object.freeze({contractVersion:CONTRACT_VERSION,kind,...value})}
const AnalystAssessment=value=>record("AnalystAssessment",value,["id","organizationId","candidateRef","evidenceRefs","analysis","disposition","confidence","limitations","provenance","version"]);
const AnalystEvidenceRequest=value=>record("AnalystEvidenceRequest",value,["id","organizationId","candidateRef","questions","reason","status","version"]);
const AnalystLiveEvidence=value=>record("AnalystLiveEvidence",value,["id","organizationId","sourceRef","verificationState","evidenceClassification","evidenceRefs","provenance","version"]);
const AnalystHumanAcceptance=value=>record("AnalystHumanAcceptance",value,["id","organizationId","actorType","actorId","authorityRef","authenticationEvidenceRefs","identityVerificationRef","authorityVerificationRef","recordedBy","scope","status","acceptedAt","evidenceRefs","version"]);
module.exports={CONTRACT_VERSION,DISPOSITIONS,EVIDENCE_CLASSES,AnalystAssessment,AnalystEvidenceRequest,AnalystLiveEvidence,AnalystHumanAcceptance};
