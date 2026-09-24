"use strict";
const {createAnalystAssessment}=require("./assessment");
const {createConstitutionalKernel}=require("../kernel/kernel");
const {createRoleConfigurationRegistry}=require("../organization/roles");
const {createOrganizationalCoordinator}=require("../organization/coordinator");

function createAnalystRuntimeInvoker({clock=()=>new Date()}={}){
 return async function analystRuntimeInvoker({work,assignment,role,input={}}){
  if(role.id!=="SMART_ANALYST")throw new Error("smart_analyst_role_required");
  const assessment=createAnalystAssessment({organizationId:work.organizationId,candidateRef:input.candidateRef||work.inputArtifactRefs[0],inputArtifactRefs:work.inputArtifactRefs,...input});
  return Object.freeze({runRef:`analyst-runtime:${work.id}:${assessment.version}`,assessment,artifacts:[{id:`artifact:${assessment.id}`,artifactType:"AnalystAssessment",organizationId:work.organizationId,workId:work.id,producingRoleId:role.id,producingRoleVersion:role.version,producingActorRef:assignment.actorRef,sourceEvidenceRefs:assessment.evidenceRefs,provenance:{inputRefs:work.inputArtifactRefs,assessmentRef:assessment.id,policyRef:assessment.provenance.policyRef},status:"PROPOSED",version:assessment.version,limitations:assessment.limitations,applicableScope:["internal-analysis"],createdAt:clock().toISOString()}]});
 };
}
function createIntegrationEvidence({execution,artifact,grantRef,assignmentRef,eventTypes=[]}={}){
 if(execution?.work?.state!=="COMPLETED"||!execution.artifactRefs?.includes(artifact?.id))throw new Error("completed_coordinator_execution_required");
 if(artifact.producingRoleId!=="SMART_ANALYST"||!artifact.sourceEvidenceRefs?.length||!artifact.provenance?.inputRefs?.length)throw new Error("validated_analyst_artifact_required");
 if(!grantRef||!assignmentRef||!eventTypes.includes("ROLE_ASSIGNED")||!eventTypes.includes("WORK_COMPLETED"))throw new Error("coordinator_authority_trace_required");
 return Object.freeze({kind:"AnalystIntegrationEvidence",status:"PASS",sharedRuntime:true,coordinator:true,grantRef,assignmentRef,workRef:execution.work.id,evidenceRefs:artifact.sourceEvidenceRefs,artifactRefs:[artifact.id],eventTypes:Object.freeze([...eventTypes]),limitations:["Internal governed coordinator evidence only; not live Platinum certification."]});
}
async function verifyAnalystInternalIntegration({clock=()=>new Date(),runtimeInvoker=createAnalystRuntimeInvoker({clock})}={}){
 let sequence=0;const id=()=>`analyst-integration:${++sequence}`,organizationId="analyst-integration",actorId="analyst-integration-agent",grantRef="grant:analyst-integration";
 const kernel=createConstitutionalKernel({clock,id});
 kernel.registerActor({id:"analyst-integration-issuer",type:"HUMAN",status:"ACTIVE"});
 kernel.registerActor({id:actorId,type:"AI_AGENT",status:"ACTIVE"});
 kernel.issueGrant({id:grantRef,issuerActorId:"analyst-integration-issuer",subjectActorId:actorId,actionScopes:["organization.assign"],resourceScopes:[`organization:${organizationId}`],constraints:{}});
 const roleRegistry=createRoleConfigurationRegistry({organizationId});roleRegistry.registerDefaults();
 const coordinator=createOrganizationalCoordinator({organizationId,roleRegistry,runtimeInvoker,kernel,clock,id});
 coordinator.objective({id:"objective:analyst-integration",organizationId,objective:"Verify governed Analyst coordinator execution",successCriteria:["Attributable assessment artifact"],priority:"HIGH",scope:["internal-certification"],budget:{currency:"USD",maxCost:0},riskBoundary:"LOW",authorityRefs:[grantRef],evidenceRefs:["internal:fixture"],status:"ACTIVE"});
 const work=coordinator.createWork({id:"work:analyst-integration",organizationId,objectiveRef:"objective:analyst-integration",missionType:"ASSESS_EVIDENCE",eligibleRoleIds:["SMART_ANALYST"],inputArtifactRefs:["candidate:integration"],dependencyWorkRefs:[],authorityRefs:[grantRef],policyRefs:["ANALYST_REASONING_POLICY_V1"],budget:{currency:"USD",maxCost:0},riskBoundary:"LOW",correlationId:"analyst-integration",causationId:"objective:analyst-integration",idempotencyKey:"create:analyst-integration"});
 const assignment=coordinator.assign(work.id,{roleId:"SMART_ANALYST",actorRef:actorId,authorityRefs:[grantRef]});
 const execution=await coordinator.execute(assignment.id,{evidence:[{classification:"VERIFIED_OUTCOME",evidenceRefs:["internal:verified-fixture"]}],problemEvidence:.9,productFit:.9,readiness:.9,outcomeStrength:.9,confidence:.8});
 const artifact=coordinator.getArtifact(execution.artifactRefs[0]);
 return createIntegrationEvidence({execution,artifact,grantRef,assignmentRef:assignment.id,eventTypes:coordinator.events().map(event=>event.type)});
}
module.exports={createAnalystRuntimeInvoker,createIntegrationEvidence,verifyAnalystInternalIntegration};
