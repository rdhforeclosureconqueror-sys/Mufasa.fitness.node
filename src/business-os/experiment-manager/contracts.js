"use strict";
const CONTRACT_VERSION="ai-business-os.experiment-manager/1.0.0";
const PROPOSAL_STATES=Object.freeze(["DRAFT","REVIEW_REQUIRED","APPROVED","REJECTED","SUPERSEDED"]);
const RUN_STATES=Object.freeze(["AUTHORIZED","RUNNING","COMPLETED","STOPPED","FAILED"]);
const RESULT_CLASSES=Object.freeze(["SUPPORTED","NOT_SUPPORTED","INCONCLUSIVE","TECHNICAL_FAILURE","POLICY_BLOCKED"]);
function record(kind,value,required){for(const key of required)if(value?.[key]===undefined||value[key]===null||value[key]==="")throw new Error(`invalid_${kind}:${key}`);return Object.freeze({contractVersion:CONTRACT_VERSION,kind,...structuredClone(value)})}
const ExperimentProposal=value=>record("ExperimentProposal",value,["id","organizationId","workId","question","hypothesis","variable","successMetric","failureMetric","minimumUsefulEvidence","costCeiling","riskCeiling","boundary","stopConditions","requiredAuthorityRefs","status","version","createdAt"]);
const ExperimentApproval=value=>record("ExperimentApproval",value,["id","organizationId","proposalRef","proposalVersion","actorType","actorId","authorityRef","scope","budgetCeiling","status","approvedAt"]);
const ExperimentRun=value=>record("ExperimentRun",value,["id","organizationId","proposalRef","proposalVersion","approvalRef","budget","boundary","status","idempotencyKey","startedAt"]);
const ExperimentMeasurement=value=>record("ExperimentMeasurement",value,["id","runRef","metric","presence","evidenceRefs","recordedAt"]);
const ExperimentResult=value=>record("ExperimentResult",value,["id","organizationId","workId","proposalRef","proposalVersion","runRef","resultClass","measurements","evidenceRefs","limitations","status","createdAt"]);
module.exports={CONTRACT_VERSION,PROPOSAL_STATES,RUN_STATES,RESULT_CLASSES,ExperimentProposal,ExperimentApproval,ExperimentRun,ExperimentMeasurement,ExperimentResult};
