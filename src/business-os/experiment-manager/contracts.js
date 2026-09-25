"use strict";
const Organization=require("../organization/contracts");
const CONTRACT_VERSION="ai-business-os.experiment-manager/1.1.0";
const PROPOSAL_STATES=Object.freeze(["REVIEW_REQUIRED"]);
const RUN_STATES=Object.freeze(["RUNNING","PAUSED","COMPLETED","STOPPED","CANCELLED"]);
const RESULT_CLASSES=Object.freeze(["SUPPORTED","NOT_SUPPORTED","INCONCLUSIVE","TECHNICAL_FAILURE","POLICY_BLOCKED"]);
function record(kind,value,required){for(const key of required)if(value?.[key]===undefined||value[key]===null||value[key]==="")throw new Error(`invalid_${kind}:${key}`);if(value.kind&&value.kind!==kind)throw new Error(`invalid_${kind}:kind`);return Object.freeze({...structuredClone(value),contractVersion:CONTRACT_VERSION,kind})}
function ExperimentProposal(value){if(value.kind&&value.kind!=="ExperimentProposal")throw new Error("invalid_proposal_kind");const p=Organization.ExperimentProposal({...structuredClone(value),kind:"ExperimentProposal",contractVersion:Organization.CONTRACT_VERSION});if(!Number.isSafeInteger(p.version)||p.version<1)throw new Error("invalid_proposal_version");if(!PROPOSAL_STATES.includes(p.status))throw new Error("invalid_proposal_status");return p}
const ExperimentApproval=value=>record("ExperimentApproval",value,["id","organizationId","proposalRef","proposalVersion","proposalDigest","actorType","actorId","authorityRef","scope","budgetCeiling","decisionRef","evidenceRefs","status","approvedAt"]);
function ExperimentRun(value){if(!RUN_STATES.includes(value.status))throw new Error("invalid_run_status");return record("ExperimentRun",value,["id","organizationId","proposalRef","proposalVersion","approvalRef","budget","boundary","status","idempotencyKey","startedAt","history"])}
const ExperimentMeasurement=value=>record("ExperimentMeasurement",value,["id","runRef","metric","presence","evidenceRefs","recordedAt"]);
function ExperimentResult(value){if(value.kind&&value.kind!=="ExperimentResult")throw new Error("invalid_result_kind");if(!RESULT_CLASSES.includes(value.resultClass))throw new Error("invalid_result_class");for(const key of ["proposalVersion","runRef","measurements"])if(value[key]===undefined)throw new Error(`invalid_result:${key}`);return Organization.ExperimentResult({...structuredClone(value),kind:"ExperimentResult",contractVersion:Organization.CONTRACT_VERSION})}
module.exports={CONTRACT_VERSION,PROPOSAL_STATES,RUN_STATES,RESULT_CLASSES,ExperimentProposal,ExperimentApproval,ExperimentRun,ExperimentMeasurement,ExperimentResult};
