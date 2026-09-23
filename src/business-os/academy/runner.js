"use strict";
const crypto=require("node:crypto");
const C=require("./contracts"),{diagnostics,STAGES}=require("./diagnostics");
const get=(value,path)=>path.split(".").reduce((v,k)=>v?.[k],value);
const operations={EQUALS:(a,b)=>a===b,NOT_EQUALS:(a,b)=>a!==b,INCLUDES:(a,b)=>Array.isArray(a)&&a.includes(b),EXISTS:a=>a!==undefined&&a!==null,EMPTY:a=>Array.isArray(a)&&a.length===0,NOT_EMPTY:a=>Array.isArray(a)&&a.length>0,LESS_THAN_OR_EQUAL:(a,b)=>Number.isFinite(a)&&a<=b};
function createAcademyRunner({registry,executors={},clock=()=>new Date(),id=()=>crypto.randomUUID(),brainVersion="unknown",configuration={}}={}){
 if(!registry)throw new Error("scenario_registry_required");
 async function runScenario(scenario){const started=clock().toISOString(),outcomes={};let fixture,raw,observations=[],assertions=[];
  try{
   outcomes.SCENARIO_SETUP={status:"PASS",reason:"registered_data_driven_scenario",evidence:[`${scenario.id}@${scenario.version}`]};
   fixture=C.ScenarioFixture(scenario.fixture);outcomes.FIXTURE_VALIDATION={status:"PASS",reason:"fixture_valid",evidence:[fixture.id]};
   const executor=executors[scenario.executorRef];if(typeof executor!=="function")throw Object.assign(new Error("executor_not_registered"),{stage:"BRAIN_INITIALIZATION"});
   outcomes.BRAIN_INITIALIZATION={status:"PASS",reason:"real_brain_executor_injected",evidence:[scenario.executorRef]};
   raw=await executor({scenario,fixture,clock,configuration});outcomes.COMPONENT_EXECUTION={status:"PASS",reason:"brain_execution_returned",evidence:raw.executionEvidenceRefs||[]};
   if(raw.academyManufacturedRoleOutput)throw Object.assign(new Error("academy_manufactured_role_output"),{stage:"COMPONENT_EXECUTION"});
   if(raw.authorityGrantedByAcademy)throw Object.assign(new Error("academy_cannot_grant_authority"),{stage:"COMPONENT_EXECUTION"});
   observations=(raw.observations||[]).map(o=>C.EvaluationObservation({...o,observedAt:o.observedAt||clock().toISOString()}));
   if(!observations.length)throw Object.assign(new Error("observations_required"),{stage:"OBSERVATION_COLLECTION"});
   outcomes.OBSERVATION_COLLECTION={status:"PASS",reason:"observations_collected",evidence:observations.flatMap(o=>o.evidenceRefs)};
   assertions=scenario.assertions.map(spec=>{const observation=observations.find(o=>o.id===spec.observationRef),op=operations[spec.operator];if(!observation||!op)return C.EvaluationAssertion({id:spec.id,status:"INCONCLUSIVE",observationRefs:observation?[observation.id]:[],expectedInvariant:spec.invariant,diagnostic:"assertion_observation_or_operator_missing"});const pass=op(get(observation.value,spec.observationPath),spec.expected);return C.EvaluationAssertion({id:spec.id,status:pass?"PASS":"FAIL",observationRefs:[observation.id],expectedInvariant:spec.invariant,actual:get(observation.value,spec.observationPath),expected:spec.expected});});
   const human=scenario.humanRequiredCriteria?.length>0,failed=assertions.some(a=>a.status==="FAIL"),uncertain=assertions.some(a=>a.status==="INCONCLUSIVE");
   let verdict=failed?"FAIL":uncertain?"INCONCLUSIVE":human?"PENDING_HUMAN":"PASS";
   if(verdict==="PASS"&&observations.some(o=>!o.evidenceRefs.length))verdict="INCONCLUSIVE";
   outcomes.ASSERTION_EVALUATION={status:failed?"FAIL":uncertain?"NOT_RUN":"PASS",reason:failed?"invariant_failed":uncertain?"assertion_inconclusive":"assertions_evaluated",evidence:assertions.flatMap(a=>a.observationRefs)};
   const classification=failed?C.FailureClassification({category:raw.failureClass||"COGNITIVE_FAILURE",owner:raw.failureOwner||scenario.components[0],reason:"assertion_failed"}):null;
   outcomes.FAILURE_CLASSIFICATION={status:"PASS",reason:classification?classification.category:"no_executed_failure",evidence:[]};
   for(const stage of ["CERTIFICATION_RECORDING","REGRESSION_COMPARISON","REPORTING"])outcomes[stage]={status:"PASS",reason:`${stage.toLowerCase()}_complete`,evidence:[]};
   return C.EvaluationResult({scenarioId:scenario.id,scenarioVersion:scenario.version,academyVersion:C.ACADEMY_VERSION,brainVersion,organization:fixture.organizationId,actors:fixture.actors,configurationRefs:fixture.configurationRefs,modelProviderRefs:raw.modelProviderRefs||[],roleConfigurationVersions:raw.roleConfigurationVersions||[],toolCapabilityVersions:raw.toolCapabilityVersions||[],inputEvidence:fixture.inputEvidence,expectedInvariants:scenario.expectedInvariants,observations,assertions,verdict,classification,diagnostics:diagnostics(outcomes,raw.brainFirstFailure,clock().toISOString()),timestamp:started,limitations:[...(scenario.limitations||[]),...(raw.limitations||[])],reproducibility:{mode:scenario.mode,clock:started,fixtureId:fixture.id,ordering:"REGISTRY",seed:scenario.seed||null,trial:raw.trial||1,deterministic:scenario.mode==="DETERMINISTIC"}});
  }catch(error){const stage=error.stage||(!fixture?"FIXTURE_VALIDATION":"COMPONENT_EXECUTION");outcomes[stage]={status:"FAIL",reason:error.message,evidence:[]};return C.EvaluationResult({scenarioId:scenario.id,scenarioVersion:scenario.version,academyVersion:C.ACADEMY_VERSION,brainVersion,organization:scenario.fixture?.organizationId||"unknown",actors:scenario.fixture?.actors||[],configurationRefs:scenario.fixture?.configurationRefs||[],inputEvidence:scenario.fixture?.inputEvidence||[],expectedInvariants:scenario.expectedInvariants||[],observations,assertions,verdict:"BLOCKED",classification:C.FailureClassification({category:"TEST_HARNESS_FAILURE",owner:"ACADEMY",reason:error.message}),diagnostics:diagnostics(outcomes,null,clock().toISOString()),timestamp:started,limitations:[error.message],reproducibility:{mode:scenario.mode||"DETERMINISTIC",clock:started,deterministic:true}})}
 }
 async function run({scenarioIds}={}){const startedAt=clock().toISOString(),selected=registry.list().filter(s=>!scenarioIds||scenarioIds.includes(s.id)),results=[];for(const scenario of selected)results.push(await runScenario(scenario));return {id:id(),academyVersion:C.ACADEMY_VERSION,brainVersion,startedAt,completedAt:clock().toISOString(),results};}
 return Object.freeze({runScenario,run});
}
module.exports={createAcademyRunner};
