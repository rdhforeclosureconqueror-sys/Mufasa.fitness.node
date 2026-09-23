"use strict";
const CONTRACT_VERSION="ai-business-os.closed-world-simulation/1.0.0";
const ACTIONS=Object.freeze(["OBSERVE_MARKET","INSPECT_OPPORTUNITY","RUN_SYNTHETIC_EXPERIMENT","MAKE_SYNTHETIC_OFFER","ACCEPT_SYNTHETIC_ORDER","ALLOCATE_CAPACITY","PRODUCE_SYNTHETIC_OUTPUT","REQUEST_QA","DELIVER_SYNTHETIC_OUTPUT","ISSUE_SYNTHETIC_REFUND","CANCEL_WORK"]);
const OUTCOMES=Object.freeze(["OFFERED","ACCEPTED","ORDERED","IN_PRODUCTION","QA_REJECTED","QA_PASSED","DELIVERED","CUSTOMER_ACCEPTED","REFUNDED","CANCELLED"]);
const ECONOMIC_STATES=Object.freeze(["PROJECTED","QUOTED","COMMITTED","INCURRED","PENDING","SETTLED","REFUNDED"]);
const FAILURE_CLASSES=Object.freeze(["BRAIN_FAILURE","POLICY_AUTHORITY_FAILURE","TECHNICAL_FAILURE","PRODUCTION_FAILURE","QA_FAILURE","DELIVERY_FAILURE","MEASUREMENT_FAILURE","MARKET_RESULT","CUSTOMER_CANCELLATION","ECONOMIC_UNCERTAINTY","SIMULATION_HARNESS_FAILURE"]);
function record(kind,v,required){for(const k of required)if(v?.[k]===undefined||v[k]===null||v[k]==="")throw new Error(`invalid_${kind}:${k}`);return Object.freeze({contractVersion:CONTRACT_VERSION,kind,...v})}
const define=(kind,required)=>v=>record(kind,v,required);
const SimulationScenario=define("SimulationScenario",["id","version","worldVersion","probabilityModelVersion","seed","startTime","startingCash","customers","opportunities","capabilities","capacity","scheduledEvents"]);
const WorldEvent=define("WorldEvent",["id","type","at","sequence","payload"]);
const SimulationAction=define("SimulationAction",["id","type","actorRef","workRef","at","payload","correlationId","causationId","authority"]);
const SimulationObservation=define("SimulationObservation",["id","type","at","observable","evidenceRefs"]);
const SimulationLedgerEntry=define("SimulationLedgerEntry",["id","type","classification","amount","at","reference","idempotencyKey"]);
const SyntheticObligation=define("SyntheticObligation",["id","customerRef","offerRef","status","acceptanceCriteria","deadline","price","refundTerms","productionRequirements","qaRequirements"]);
const SimulationCheckpoint=define("SimulationCheckpoint",["id","cycleNumber","worldState","clock","randomState","eventCursor"]);
const SimulationReport=define("SimulationReport",["runId","scenarioRef","cycles","metrics","reconciliation","diagnostics","gate"]);
module.exports={CONTRACT_VERSION,ACTIONS,OUTCOMES,ECONOMIC_STATES,FAILURE_CLASSES,SimulationScenario,WorldEvent,SimulationAction,SimulationObservation,SimulationLedgerEntry,SyntheticObligation,SimulationCheckpoint,SimulationReport};
