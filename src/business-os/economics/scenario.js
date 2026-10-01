"use strict";
const {isDeepStrictEqual} = require("node:util");
const {EconomicInput} = require("./contracts");
const {calculateEconomicAssessment, ECONOMICS_ENGINE_VERSION} = require("./engine");
const {economicArtifactDigest, compareEconomicMetric, METRIC_DIRECTIONS} = require("./reconciliation");

const SCENARIO_MODEL_VERSION = "economics-scenario-v1.0.0";
const SCENARIO_POLICY_VERSION = "economics-scenario-policy-v1.0.0";
const TRANSFORMATIONS = Object.freeze(["ABSOLUTE_REPLACEMENT", "ABSOLUTE_DELTA", "PERCENTAGE_DELTA"]);
const text = value => typeof value === "string" && value.trim().length > 0;
const object = value => value && typeof value === "object" && !Array.isArray(value);
const timestamp = value => typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const samePeriod = (a,b) => a?.start === b?.start && a?.end === b?.end;
const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const fail = code => { throw new Error(`invalid_economic_scenario:${code}`); };
const requireThat = (condition, code) => { if (!condition) fail(code); };
const safeAdd = (a,b) => { const result=BigInt(a)+BigInt(b); return result<=BigInt(Number.MAX_SAFE_INTEGER)&&result>=0n?Number(result):null; };
const applyBps = (value,bps) => {
  const numerator=BigInt(value)*BigInt(bps), divisor=10000n;
  const delta=numerator<0n?-((-numerator+divisor/2n)/divisor):(numerator+divisor/2n)/divisor;
  const result=BigInt(value)+delta;
  return result>=0n&&result<=BigInt(Number.MAX_SAFE_INTEGER)?Number(result):null;
};

function EconomicScenario(value={}) {
  requireThat(object(value), "contract");
  for (const key of ["id","organizationId","workId","productRef","name","description","createdBy"]) requireThat(text(value[key]), key);
  requireThat(value.campaignRef === null || text(value.campaignRef), "campaignRef");
  requireThat(Number.isSafeInteger(value.version) && value.version > 0, "version");
  requireThat(value.engineVersion === ECONOMICS_ENGINE_VERSION, "engine_version");
  requireThat(value.policyVersion === SCENARIO_POLICY_VERSION, "policy_version");
  requireThat(value.currency === "USD", "currency");
  requireThat(timestamp(value.createdAt) && samePeriod(value.reportingPeriod,value.reportingPeriod), "timestamp_or_period");
  requireThat(timestamp(value.reportingPeriod?.start) && timestamp(value.reportingPeriod?.end) && Date.parse(value.reportingPeriod.start)<Date.parse(value.reportingPeriod.end), "reporting_period");
  requireThat(["BASELINE","DOWNSIDE","UPSIDE","CUSTOM"].includes(value.type), "type");
  requireThat(value.status === "DEFINED", "status");
  const ref=value.baselineAssessmentRef;
  requireThat(object(ref)&&text(ref.assessmentId)&&Number.isSafeInteger(ref.version)&&ref.version>0&&text(ref.digest)&&ref.engineVersion===value.engineVersion, "baseline_ref");
  requireThat(ref.organizationId===value.organizationId&&ref.workId===value.workId&&ref.productRef===value.productRef&&ref.campaignRef===value.campaignRef&&ref.currency===value.currency&&samePeriod(ref.reportingPeriod,value.reportingPeriod), "baseline_scope");
  requireThat(Array.isArray(value.assumptions)&&value.assumptions.every(text), "assumptions");
  requireThat(Array.isArray(value.overrides), "overrides");
  const targets=new Set();
  for(const override of value.overrides){
    requireThat(object(override)&&text(override.targetInputId)&&text(override.category)&&TRANSFORMATIONS.includes(override.transformationType), "override");
    requireThat(!targets.has(override.targetInputId), "duplicate_override"); targets.add(override.targetInputId);
    requireThat(["ACTUAL","ESTIMATED","UNKNOWN"].includes(override.originalClassification)&&["ESTIMATED","UNKNOWN"].includes(override.scenarioClassification), "override_classification");
    requireThat(override.originalAmountMinor===null||Number.isSafeInteger(override.originalAmountMinor)&&override.originalAmountMinor>=0, "original_amount");
    requireThat(override.scenarioAmountMinor===null||Number.isSafeInteger(override.scenarioAmountMinor)&&override.scenarioAmountMinor>=0, "scenario_amount");
    requireThat(Number.isSafeInteger(override.transformationAmount), "transformation_amount");
    requireThat(override.unit===(override.transformationType==="PERCENTAGE_DELTA"?"BASIS_POINTS":"MINOR_CURRENCY"), "override_unit");
    requireThat(text(override.reason)&&object(override.baselineProvenance)&&Array.isArray(override.baselineProvenance.evidenceRefs), "override_reason_or_provenance");
    if(override.transformationType==="ABSOLUTE_REPLACEMENT")requireThat(override.transformationAmount>=0&&override.scenarioAmountMinor===override.transformationAmount&&override.scenarioClassification==="ESTIMATED", "replacement");
    if(override.originalClassification==="UNKNOWN"&&override.transformationType!=="ABSOLUTE_REPLACEMENT")requireThat(override.scenarioClassification==="UNKNOWN"&&override.scenarioAmountMinor===null, "unknown_delta");
  }
  return freeze(structuredClone({...value,kind:"EconomicScenario",scenarioModelVersion:SCENARIO_MODEL_VERSION,assumptions:[...value.assumptions].sort(),overrides:[...value.overrides].sort((a,b)=>a.targetInputId.localeCompare(b.targetInputId))}));
}

function baselineReference(assessment){
  return freeze({assessmentId:assessment.id,version:assessment.version,digest:economicArtifactDigest(assessment),engineVersion:assessment.engineVersion,organizationId:assessment.organizationId,workId:assessment.workId,productRef:assessment.productRef,campaignRef:assessment.campaignRef,currency:assessment.currency,reportingPeriod:assessment.reportingPeriod});
}

function applyOverride(input, override, scenario){
  requireThat(override.category===input.category&&override.originalClassification===input.classification&&override.originalAmountMinor===input.amountMinor, `baseline_input_mismatch:${input.id}`);
  requireThat(isDeepStrictEqual([...override.baselineProvenance.evidenceRefs].sort(),[...input.evidenceRefs].sort()), `baseline_provenance_mismatch:${input.id}`);
  let amount=null, classification="UNKNOWN";
  if(override.transformationType==="ABSOLUTE_REPLACEMENT") amount=override.transformationAmount;
  else if(input.classification!=="UNKNOWN") amount=override.transformationType==="ABSOLUTE_DELTA"?safeAdd(input.amountMinor,override.transformationAmount):applyBps(input.amountMinor,override.transformationAmount);
  requireThat(amount!==null||input.classification==="UNKNOWN", `unsafe_transformation:${input.id}`);
  if(amount!==null) classification="ESTIMATED";
  requireThat(amount===override.scenarioAmountMinor&&classification===override.scenarioClassification, `declared_result_mismatch:${input.id}`);
  const assumptionRef=`scenario:${scenario.id}:v${scenario.version}:${input.id}`;
  return EconomicInput({...input,id:assumptionRef,version:scenario.version,classification,amountMinor:amount,assumptions:[...input.assumptions,override.reason],evidenceRefs:classification==="UNKNOWN"?[]:[assumptionRef],source:{system:"SCENARIO_ASSUMPTION",recordRef:assumptionRef,recordVersion:scenario.version,payloadHash:economicArtifactDigest({scenarioId:scenario.id,scenarioVersion:scenario.version,override}),observedAt:scenario.createdAt}});
}

function createEconomicScenarioResult({scenario:definition,baselineAssessment,coverage={}}={}){
  const scenario=EconomicScenario(definition), baseline=structuredClone(baselineAssessment);
  requireThat(baseline.engineVersion===scenario.engineVersion, "baseline_engine_version");
  requireThat(isDeepStrictEqual(baselineReference(baseline),scenario.baselineAssessmentRef), "baseline_binding");
  requireThat(baseline.organizationId===scenario.organizationId&&baseline.workId===scenario.workId&&baseline.productRef===scenario.productRef&&baseline.campaignRef===scenario.campaignRef&&baseline.currency===scenario.currency&&samePeriod(baseline.reportingPeriod,scenario.reportingPeriod), "baseline_scope");
  const inputs=new Map(baseline.financialInputs.map(input=>[input.id,input]));
  for(const override of scenario.overrides)requireThat(inputs.has(override.targetInputId), `unknown_target:${override.targetInputId}`);
  const byTarget=new Map(scenario.overrides.map(override=>[override.targetInputId,override]));
  const scenarioInputs=baseline.financialInputs.map(input=>byTarget.has(input.id)?applyOverride(input,byTarget.get(input.id),scenario):EconomicInput(input));
  const assessment=calculateEconomicAssessment({id:`scenario-assessment:${scenario.id}:v${scenario.version}`,version:scenario.version,workId:scenario.workId,engineVersion:scenario.engineVersion,financialInputs:scenarioInputs,coverage},{clock:()=>scenario.createdAt});
  const comparisons=Object.keys(baseline.metrics).filter(metric=>assessment.metrics[metric]&&METRIC_DIRECTIONS[metric]).sort().map(metric=>{
    const baselineMetric=baseline.metrics[metric], scenarioMetric=assessment.metrics[metric];
    // Reconciliation treats unlike PARTIAL dependencies as historically non-comparable. A scenario is
    // intentionally hypothetical, so its numeric estimate remains comparable while retaining PARTIAL status.
    const normalized=item=>item.status==="PARTIAL"?{...item,status:"CALCULATED",missingInputs:[]}:item;
    const compared=compareEconomicMetric(metric,normalized(baselineMetric),normalized(scenarioMetric));
    const hypotheticalPartial=baselineMetric.status==="PARTIAL"||scenarioMetric.status==="PARTIAL";
    const absoluteDelta=hypotheticalPartial&&compared.absoluteVariance.value!==null?{...compared.absoluteVariance,status:"PARTIAL"}:compared.absoluteVariance;
    const relativeDelta=hypotheticalPartial&&compared.relativeVariance.value!==null?{...compared.relativeVariance,status:"PARTIAL"}:compared.relativeVariance;
    return {metric,direction:compared.direction,baseline:{status:baselineMetric.status,value:baselineMetric.value,unit:baselineMetric.unit,missingInputs:[...(baselineMetric.missingInputs||[])].sort()},scenario:{status:scenarioMetric.status,value:scenarioMetric.value,unit:scenarioMetric.unit,missingInputs:[...(scenarioMetric.missingInputs||[])].sort()},absoluteDelta,relativeDelta,interpretation:compared.comparisonStatus==="ON_PLAN"?"UNCHANGED":compared.comparisonStatus};
  });
  requireThat(isDeepStrictEqual(baseline,baselineAssessment), "baseline_mutated");
  return freeze({kind:"EconomicScenarioResult",scenarioModelVersion:SCENARIO_MODEL_VERSION,policyVersion:scenario.policyVersion,scenario,baselineAssessmentRef:scenario.baselineAssessmentRef,scenarioInputs,assessment,comparisons,limitations:["Conditional decision support only; this scenario is not a forecast, actual, prediction, recommendation, authorization, or permission to execute.","Hypothetical inputs are not ECO-3 observed evidence and cannot alter reconciliation history."]});
}

module.exports={SCENARIO_MODEL_VERSION,SCENARIO_POLICY_VERSION,SCENARIO_TRANSFORMATIONS:TRANSFORMATIONS,EconomicScenario,baselineReference,createEconomicScenarioResult};
