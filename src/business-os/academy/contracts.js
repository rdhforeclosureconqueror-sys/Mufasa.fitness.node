"use strict";

const CONTRACT_VERSION="ai-business-os.brain-academy/1.0.0";
const ACADEMY_VERSION="1.0.0";
const LEVELS=Object.freeze(["CONTRACT","FUNCTION","FAILURE","ADVERSARIAL","INTEGRATED"]);
const VERDICTS=Object.freeze(["PASS","FAIL","BLOCKED","NOT_RUN","NOT_APPLICABLE","INCONCLUSIVE","PENDING_HUMAN"]);
const FAILURE_CLASSES=Object.freeze(["ARCHITECTURAL_FAILURE","COGNITIVE_FAILURE","EVIDENCE_FAILURE","CONTEXT_FAILURE","MEMORY_FAILURE","KNOWLEDGE_FAILURE","PLANNING_FAILURE","AUTHORITY_FAILURE","POLICY_FAILURE","TOOL_FAILURE","VERIFICATION_FAILURE","OPERATIONAL_FAILURE","MEASUREMENT_FAILURE","EXPERIMENT_FAILURE","MARKET_RESULT","ECONOMIC_UNCERTAINTY","QA_FAILURE","LEARNING_FAILURE","MANAGEMENT_FAILURE","TEST_HARNESS_FAILURE","INCONCLUSIVE_EVIDENCE"]);
const DIMENSIONS=Object.freeze(["KERNEL","MODEL_GATEWAY","COGNITIVE_CORE","MEMORY","KNOWLEDGE_EVIDENCE","CONTEXT","TOOLS","CAPABILITIES","PLANNING","EXECUTION","RUNTIME","SMART_SCOUT","SMART_ANALYST","EXPERIMENT_MANAGER","ECONOMICS","SALES","PRODUCTION","INDEPENDENT_QA","LEARNING","MANAGER","REFLECTION","METACOGNITION","AUDIT_EXPLAINABILITY","FIRST_FAILURE","ORGANIZATIONAL_COORDINATION","ACADEMY_INTEGRITY"]);

function frozen(kind,values,required){
 for(const key of required)if(values[key]===undefined||values[key]===null||values[key]==="")throw new Error(`invalid_${kind}:${key}`);
 return Object.freeze({contractVersion:CONTRACT_VERSION,kind,...values});
}
function AcademyScenario(v={}){
 const x=frozen("AcademyScenario",v,["id","version","purpose","level","mode","components","executorRef","expectedInvariants","assertions"]);
 if(!LEVELS.includes(x.level))throw new Error("invalid_AcademyScenario:level");
 if(!["DETERMINISTIC","MODEL_QUALITY"].includes(x.mode))throw new Error("invalid_AcademyScenario:mode");
 if(!x.components.length)throw new Error("invalid_AcademyScenario:components");
 if(!x.expectedInvariants.length)throw new Error("invalid_AcademyScenario:expectedInvariants");
 if(!x.assertions.length)throw new Error("invalid_AcademyScenario:assertions");
 if(x.assertions.some(a=>!a.id||!a.observationPath||!a.operator))throw new Error("invalid_AcademyScenario:assertion");
 if(typeof x.executorRef!=="string")throw new Error("academy_control_flow_forbidden");
 return x;
}
const ScenarioFixture=v=>frozen("ScenarioFixture",v,["id","organizationId","actors","configurationRefs","inputEvidence"]);
const EvaluationObservation=v=>frozen("EvaluationObservation",v,["id","type","source","value","evidenceRefs","observedAt"]);
const EvaluationAssertion=v=>frozen("EvaluationAssertion",v,["id","status","observationRefs","expectedInvariant"]);
const FailureClassification=v=>frozen("FailureClassification",v,["category","owner","reason"]);
const CertificationEvidence=v=>frozen("CertificationEvidence",v,["id","type","source","reference","recordedAt"]);
const EvaluationResult=v=>frozen("EvaluationResult",v,["scenarioId","scenarioVersion","academyVersion","verdict","observations","assertions","timestamp","reproducibility"]);
const CertificationRun=v=>frozen("CertificationRun",v,["id","academyVersion","brainVersion","startedAt","completedAt","results","matrix","gate"]);
const ReflectionRecord=v=>frozen("ReflectionRecord",v,["id","preActionExpectationRef","preActionExpectation","observedOutcomeRefs","observedOutcome","differences","proposals","createdAt"]);
module.exports={CONTRACT_VERSION,ACADEMY_VERSION,LEVELS,VERDICTS,FAILURE_CLASSES,DIMENSIONS,AcademyScenario,ScenarioFixture,EvaluationObservation,EvaluationAssertion,FailureClassification,CertificationEvidence,EvaluationResult,CertificationRun,ReflectionRecord};
