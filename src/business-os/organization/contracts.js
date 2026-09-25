"use strict";
const CONTRACT_VERSION="ai-business-os.organization/1.0.0";
const WORK_STATES=Object.freeze(["CREATED","ELIGIBLE","ASSIGNED","RUNNING","BLOCKED","COMPLETED","FAILED","CANCELLED"]);
const ARTIFACT_STATUSES=Object.freeze(["CANDIDATE","PROPOSED","REVIEW_REQUIRED","ACCEPTED","REJECTED","SUPERSEDED"]);
const QA_VERDICTS=Object.freeze(["PASS","FAIL","BLOCKED","INSUFFICIENT_EVIDENCE"]);
const ECONOMIC_DISPOSITIONS=Object.freeze(["CONTINUE","REVISE","PAUSE","REJECT","NEEDS_MORE_EVIDENCE","ESCALATE"]);
const ANALYST_DISPOSITIONS=Object.freeze(["REJECT","NEEDS_MORE_EVIDENCE","EXPERIMENT_CANDIDATE","ECONOMIC_REVIEW","SALES_CANDIDATE","ESCALATE"]);
function record(kind,v,required){for(const key of required)if(v[key]===undefined||v[key]===null||v[key]==="")throw new Error(`invalid_${kind}:${key}`);return Object.freeze({contractVersion:CONTRACT_VERSION,kind,...v})}
const define=(kind,required)=>v=>record(kind,v||{},required);
const OrganizationalObjective=define("OrganizationalObjective",["id","organizationId","objective","successCriteria","priority","scope","budget","riskBoundary","authorityRefs","evidenceRefs","status","version","createdAt"]);
const OrganizationalWorkItem=define("OrganizationalWorkItem",["id","organizationId","objectiveRef","missionType","state","version","eligibleRoleIds","inputArtifactRefs","dependencyWorkRefs","authorityRefs","policyRefs","budget","riskBoundary","correlationId","causationId","createdAt"]);
const RoleAssignment=define("RoleAssignment",["id","organizationId","workId","roleId","roleVersion","actorRef","assignedAt","status"]);
const WorkArtifact=define("WorkArtifact",["id","artifactType","organizationId","workId","missionRunRef","producingRoleId","producingRoleVersion","producingActorRef","createdAt","sourceEvidenceRefs","provenance","status","version","limitations","correlationId","causationId","applicableScope"]);
const RoleFinding=define("RoleFinding",["id","artifactRef","findingType","statement","evidenceRefs","classification","createdAt"]);
const RoleRecommendation=define("RoleRecommendation",["id","artifactRef","disposition","rationale","evidenceRefs","limitations","createdAt"]);
const RoleDecisionProposal=define("RoleDecisionProposal",["id","artifactRef","proposedDecision","requiredAuthorityRefs","evidenceRefs","status","createdAt"]);
const HandoffRecord=define("HandoffRecord",["id","organizationId","fromWorkRef","artifactRefs","toWorkRef","eligibilityReason","createdAt"]);
const ReviewRecord=define("ReviewRecord",["id","organizationId","artifactRef","reviewerRoleId","reviewerActorRef","verdict","evidenceRefs","createdAt"]);
const ManagementDirective=define("ManagementDirective",["id","organizationId","objectiveRef","directive","workRefs","authorityRefs","status","createdAt"]);
const LearningProposal=define("LearningProposal",["id","organizationId","workId","proposalType","expectedOutcome","actualOutcome","evidenceRefs","governanceRequired","status","createdAt"]);
const ExperimentProposal=define("ExperimentProposal",["id","organizationId","workId","question","hypothesis","motivatingEvidenceRefs","variable","successMetric","failureMetric","minimumUsefulEvidence","costCeiling","riskCeiling","boundary","confounders","limitations","stopConditions","requiredAuthorityRefs","expectedInformationGain","status","createdAt"]);
const ExperimentResult=define("ExperimentResult",["id","organizationId","workId","proposalRef","resultClass","evidenceRefs","limitations","status","createdAt"]);
const economicAssessmentRecord=define("EconomicAssessment",["id","organizationId","workId","knownCost","estimatedCost","unknownCosts","expectedValue","actualValue","grossContribution","capacityCost","riskExposure","breakEvenAssumptions","sensitivity","disposition","evidenceRefs","limitations","createdAt"]);
function EconomicAssessment(value={}){const assessment=economicAssessmentRecord(value);if(Object.hasOwn(value,"economicsSchemaVersion")||Object.hasOwn(value,"financialInputs"))return require("../economics/contracts").validateEconomicAssessment(assessment);return assessment;}
const QAAssessment=define("QAAssessment",["id","organizationId","workId","artifactInspectedRef","artifactVersion","acceptanceCriteria","evidenceExaminedRefs","failures","limitations","requiredRemediation","verdict","producingRoleId","createdAt"]);
module.exports={CONTRACT_VERSION,WORK_STATES,ARTIFACT_STATUSES,QA_VERDICTS,ECONOMIC_DISPOSITIONS,ANALYST_DISPOSITIONS,OrganizationalObjective,OrganizationalWorkItem,RoleAssignment,WorkArtifact,RoleFinding,RoleRecommendation,RoleDecisionProposal,HandoffRecord,ReviewRecord,ManagementDirective,LearningProposal,ExperimentProposal,ExperimentResult,EconomicAssessment,QAAssessment};
