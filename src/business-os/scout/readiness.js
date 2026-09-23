"use strict";
const {SCOUT_PLATINUM_SCENARIOS}=require("./academy");
const GATES=Object.freeze(["SCOUT_PLATINUM_ARCHITECTURE_READY","SCOUT_APPROVED_SOURCE_CONFIGURED","SCOUT_LIVE_SOURCE_VERIFIED","SCOUT_OUTCOME_FEEDBACK_VERIFIED","SCOUT_PLATINUM_CERTIFIED"]);
const hasRefs=value=>Array.isArray(value)&&value.length>0&&value.every(x=>typeof x==="string"&&x.trim());
const acceptedClass=value=>["INDEPENDENT_MARKET","VERIFIED_PROVIDER","LIVE_FIRST_PARTY"].includes(value);
function validAcademyResult(result){return result&&SCOUT_PLATINUM_SCENARIOS.some(x=>x.id===result.scenarioId)&&result.verdict==="PASS"&&Array.isArray(result.assertions)&&result.assertions.length&&result.assertions.every(x=>x.status==="PASS")&&Array.isArray(result.observations)&&result.observations.length&&result.observations.every(x=>hasRefs(x.evidenceRefs))}
function validSourceHealth(record){return record&&record.status==="OPERATIONAL"&&record.authorizationState==="VERIFIED"&&record.paginationCompleteness==="COMPLETE"&&hasRefs(record.evidenceRefs)}
function validLiveEvidence(record){return record&&record.verificationState==="VERIFIED"&&acceptedClass(record.evidenceClassification)&&typeof record.sourceId==="string"&&hasRefs(record.evidenceRefs)}
function validFeedback(record){return record&&record.kind==="ScoutOutcomeFeedback"&&hasRefs(record.experimentRefs)&&hasRefs(record.evidenceRefs)&&record.provenance&&["INDEPENDENT_EXPERIMENT","VERIFIED_CUSTOMER_OUTCOME"].includes(record.provenance.classification)}
function validHumanAcceptance(record){return record&&record.status==="PASS"&&record.actorType==="HUMAN"&&typeof record.actorId==="string"&&record.actorId&&typeof record.authorityRef==="string"&&record.authorityRef&&hasRefs(record.evidenceRefs)}
function scoutReadiness({architectureResults=[],sourceHealth=[],liveEvidence=[],outcomeFeedback=[],humanAcceptance=null}={}){
 const passedIds=new Set(architectureResults.filter(validAcademyResult).map(x=>x.scenarioId));
 const architecture=SCOUT_PLATINUM_SCENARIOS.every(x=>passedIds.has(x.id)),configured=sourceHealth.some(validSourceHealth),live=liveEvidence.some(validLiveEvidence),feedback=outcomeFeedback.some(validFeedback),humanAccepted=validHumanAcceptance(humanAcceptance);
 const gates={SCOUT_PLATINUM_ARCHITECTURE_READY:architecture?"PASS":"BLOCKED",SCOUT_APPROVED_SOURCE_CONFIGURED:configured?"PASS":"BLOCKED",SCOUT_LIVE_SOURCE_VERIFIED:live?"PASS":"BLOCKED",SCOUT_OUTCOME_FEEDBACK_VERIFIED:feedback?"PASS":"BLOCKED"};
 gates.SCOUT_PLATINUM_CERTIFIED=Object.values(gates).every(x=>x==="PASS")&&humanAccepted?"PASS":"BLOCKED";
 return Object.freeze({gates,firstFailure:GATES.find(x=>gates[x]!=="PASS")||null,humanAcceptance:{required:true,status:humanAccepted?"PASS":"PENDING_HUMAN",authority:"AUTHENTICATED_ADMIN_ONLY"},evidenceSummary:{academyScenariosPassed:passedIds.size,academyScenariosRequired:SCOUT_PLATINUM_SCENARIOS.length,operationalSources:sourceHealth.filter(validSourceHealth).length,verifiedLiveRecords:liveEvidence.filter(validLiveEvidence).length,verifiedFeedbackRecords:outcomeFeedback.filter(validFeedback).length},limitations:["Scenario definitions and mocks do not satisfy architecture certification.","Controlled Test A and synthetic evidence cannot establish market demand.","Strings and booleans are not certification evidence."]})
}
module.exports={GATES,scoutReadiness,validAcademyResult,validSourceHealth,validLiveEvidence,validFeedback,validHumanAcceptance};
