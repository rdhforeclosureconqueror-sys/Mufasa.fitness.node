"use strict";

const {createScenarioRegistry}=require("../academy/registry");
const {createAcademyRunner}=require("../academy/runner");
const {SCOUT_PLATINUM_SCENARIOS,registerScoutPlatinumScenarios}=require("./academy");
const {evaluateScoutDecision}=require("./decision");

function executeScoutPlatinumScenario({scenario,clock=()=>new Date()}){
 const evaluation=evaluateScoutDecision(scenario.initialState);
 const slug=scenario.id.replace("scout.platinum.","");
 const evidenceRefs=[...(scenario.fixture.inputEvidence||[]),...evaluation.evidenceRefs,`scout-policy:${evaluation.policyRef}`];
 return {
  observations:[{
   id:`observation.scout.platinum.${slug}`,
   type:"STRUCTURED_BEHAVIOR",
   source:"SMART_SCOUT_PRODUCTION_DECISION_ENGINE",
   value:{decision:evaluation.decision,reason:evaluation.reason,redacted:evaluation.redacted},
   evidenceRefs:[...new Set(evidenceRefs)],
   observedAt:clock().toISOString()
  }],
  executionEvidenceRefs:[`scout-executor:${slug}`,`scout-policy:${evaluation.policyRef}`],
  roleConfigurationVersions:["SMART_SCOUT@1"],
  toolCapabilityVersions:[],
  limitations:["Deterministic architecture evidence; this is not live-market, conversion, or profitability evidence."]
 };
}

function createScoutPlatinumExecutors(){
 return Object.freeze(Object.fromEntries(SCOUT_PLATINUM_SCENARIOS.map(scenario=>[
  scenario.executorRef,
  context=>executeScoutPlatinumScenario(context)
 ])));
}

async function runScoutPlatinumArchitecture({clock=()=>new Date(),id,brainVersion="SMART_SCOUT@1"}={}){
 const registry=createScenarioRegistry();
 registerScoutPlatinumScenarios(registry);
 const runner=createAcademyRunner({registry,executors:createScoutPlatinumExecutors(),clock,id,brainVersion});
 return runner.run();
}

module.exports={executeScoutPlatinumScenario,createScoutPlatinumExecutors,runScoutPlatinumArchitecture};
