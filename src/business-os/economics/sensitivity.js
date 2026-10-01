"use strict";
const crypto=require("node:crypto");
const {isDeepStrictEqual}=require("node:util");
const {SCENARIO_MODEL_VERSION,SCENARIO_POLICY_VERSION,SCENARIO_TRANSFORMATIONS,baselineReference,deriveScenarioOverride,createEconomicScenarioResult}=require("./scenario");
const {ECONOMICS_ENGINE_VERSION}=require("./engine");

const SENSITIVITY_MODEL_VERSION="economics-sensitivity-v1.0.0";
const SENSITIVITY_POLICY_VERSION="economics-sensitivity-policy-v1.0.0";
const text=x=>typeof x==="string"&&x.trim().length>0;
const object=x=>x&&typeof x==="object"&&!Array.isArray(x);
const freeze=x=>{if(x&&typeof x==="object"){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
const fail=code=>{throw new Error(`invalid_economic_sensitivity:${code}`)};
const requireThat=(condition,code)=>{if(!condition)fail(code)};
const canonical=x=>Array.isArray(x)?x.map(canonical):object(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=x=>crypto.createHash("sha256").update(JSON.stringify(canonical(x))).digest("hex").slice(0,24);
const samePeriod=(a,b)=>a?.start===b?.start&&a?.end===b?.end;
const numeric=m=>m&&Number.isSafeInteger(m.value)&&(m.status==="CALCULATED"||(m.status==="PARTIAL"&&(m.missingInputs||[]).length===0));
const numericPoint=p=>p&&Number.isSafeInteger(p.value)&&(p.status==="CALCULATED"||(p.status==="PARTIAL"&&(p.missingInputs||[]).length===0));
const ratioBasisPoints=(numerator,denominator)=>{if(!Number.isSafeInteger(numerator)||!Number.isSafeInteger(denominator)||denominator===0)return null;const negative=(numerator<0)!==(denominator<0),n=BigInt(Math.abs(numerator))*10000n,d=BigInt(Math.abs(denominator)),v=(n+d/2n)/d;return v>BigInt(Number.MAX_SAFE_INTEGER)?null:Number(negative?-v:v)};

function axis(value,name){
  requireThat(object(value)&&text(value.targetInputId)&&text(value.category),`${name}_target`);
  requireThat(SCENARIO_TRANSFORMATIONS.includes(value.transformationType),`${name}_transformation`);
  requireThat(Array.isArray(value.points)&&value.points.length>0,`${name}_points`);
  requireThat(value.points.every(Number.isSafeInteger),`${name}_unsafe_point`);
  const points=[...value.points].sort((a,b)=>a-b);
  requireThat(new Set(points).size===points.length,`${name}_duplicate_point`);
  return {...value,points,uncertainty:value.uncertainty===undefined?null:uncertainty(value.uncertainty)};
}
function uncertainty(value){
  requireThat(object(value)&&value.kind==="EXPLICIT_BOUNDED_RANGE", "uncertainty_kind");
  requireThat(text(value.rationale),"uncertainty_rationale");
  requireThat(Array.isArray(value.evidenceRefs)&&value.evidenceRefs.every(text),"uncertainty_evidence");
  return {kind:value.kind,rationale:value.rationale,evidenceRefs:[...new Set(value.evidenceRefs)].sort(),probabilityModel:null};
}
function SensitivityStudy(value={}){
  requireThat(object(value),"contract");
  for(const k of ["id","organizationId","workId","productRef","name","createdBy","targetMetric"])requireThat(text(value[k]),k);
  requireThat(value.campaignRef===null||text(value.campaignRef),"campaignRef");
  requireThat(Number.isSafeInteger(value.version)&&value.version>0,"version");
  requireThat(value.engineVersion===ECONOMICS_ENGINE_VERSION,"engine_version");
  requireThat(value.scenarioModelVersion===SCENARIO_MODEL_VERSION,"scenario_version");
  requireThat(value.policyVersion===SENSITIVITY_POLICY_VERSION,"policy_version");
  requireThat(value.currency==="USD","currency");
  requireThat(text(value.createdAt)&&Number.isFinite(Date.parse(value.createdAt))&&new Date(value.createdAt).toISOString()===value.createdAt,"createdAt");
  requireThat(text(value.reportingPeriod?.start)&&text(value.reportingPeriod?.end)&&Date.parse(value.reportingPeriod.start)<Date.parse(value.reportingPeriod.end),"reporting_period");
  requireThat(object(value.baselineAssessmentRef),"baseline_ref");
  const r=value.baselineAssessmentRef;
  requireThat(text(r.assessmentId)&&Number.isSafeInteger(r.version)&&text(r.digest)&&r.engineVersion===value.engineVersion,"baseline_ref");
  requireThat(r.organizationId===value.organizationId&&r.workId===value.workId&&r.productRef===value.productRef&&r.campaignRef===value.campaignRef&&r.currency===value.currency&&samePeriod(r.reportingPeriod,value.reportingPeriod),"baseline_scope");
  requireThat(["ONE_WAY","TWO_WAY"].includes(value.type),"type");
  const axes=(value.axes||[]).map((x,i)=>axis(x,`axis_${i+1}`)).sort((a,b)=>a.targetInputId.localeCompare(b.targetInputId));
  requireThat(axes.length===(value.type==="ONE_WAY"?1:2),"axis_count");
  requireThat(new Set(axes.map(x=>x.targetInputId)).size===axes.length,"duplicate_axis_target");
  requireThat(Array.isArray(value.thresholds||[])&&(value.thresholds||[]).every(x=>object(x)&&text(x.label)&&Number.isSafeInteger(x.value)),"thresholds");
  return freeze(structuredClone({...value,kind:"EconomicSensitivityStudy",sensitivityModelVersion:SENSITIVITY_MODEL_VERSION,axes,thresholds:[...(value.thresholds||[])].sort((a,b)=>a.value-b.value||a.label.localeCompare(b.label)),limitations:[...(value.limitations||[])].sort()}));
}
function makeOverride(input,axis,amount){
  try{return deriveScenarioOverride(input,{transformationType:axis.transformationType,transformationAmount:amount,reason:`Sensitivity study ${axis.targetInputId} at ${amount}.`})}
  catch{fail(`unsafe_transformation:${input.id}`)}
}
function scenarioDefinition(study,overrides,key){return{id:`sensitivity-scenario:${digest({study:identity(study),key})}`,organizationId:study.organizationId,workId:study.workId,productRef:study.productRef,campaignRef:study.campaignRef,name:`${study.name}: ${key}`,description:"Deterministic sensitivity point derived by ECO-5B through ECO-5A.",version:1,baselineAssessmentRef:study.baselineAssessmentRef,engineVersion:study.engineVersion,policyVersion:SCENARIO_POLICY_VERSION,reportingPeriod:study.reportingPeriod,currency:study.currency,type:"CUSTOM",assumptions:overrides.map(x=>x.reason),overrides,createdAt:study.createdAt,createdBy:study.createdBy,status:"DEFINED"}}
function identity(study){return {baselineAssessmentRef:study.baselineAssessmentRef,engineVersion:study.engineVersion,scenarioModelVersion:study.scenarioModelVersion,policyVersion:study.policyVersion,targetMetric:study.targetMetric,type:study.type,axes:study.axes,thresholds:study.thresholds}}
function resultPoint(study,scenarioResult,coordinates,baselineMetric){
  const target=scenarioResult.assessment.metrics[study.targetMetric];
  const comparison=scenarioResult.comparisons.find(x=>x.metric===study.targetMetric);
  requireThat(target&&comparison,"unsupported_target_metric");
  const absoluteChange=comparison.absoluteDelta.value;
  const relativeChange=comparison.relativeDelta.value;
  return {coordinates,scenarioRef:{id:scenarioResult.scenario.id,version:scenarioResult.scenario.version,assessmentId:scenarioResult.assessment.id},status:target.status,value:target.value,unit:target.unit,missingInputs:[...(target.missingInputs||[])],changeFromBaseline:{status:comparison.absoluteDelta.status,absolute:absoluteChange,relativeStatus:comparison.relativeDelta.status,relativeBasisPoints:relativeChange,direction:absoluteChange===null?"UNRESOLVED":absoluteChange>0?"INCREASE":absoluteChange<0?"DECREASE":"UNCHANGED"},scenarioResult};
}
function summarize(points,baselineMetric){const valid=points.filter(numericPoint);if(!valid.length)return{status:"UNKNOWN",minimum:null,maximum:null,absoluteSpread:null,relativeSpreadBasisPoints:null};const values=valid.map(x=>x.value),minimum=Math.min(...values),maximum=Math.max(...values),spread=maximum-minimum;return{status:valid.some(x=>x.status==="PARTIAL")?"PARTIAL":"CALCULATED",minimum,maximum,absoluteSpread:spread,relativeSpreadBasisPoints:numeric(baselineMetric)?ratioBasisPoints(spread,baselineMetric.value):null};}
function breakpoints(points,thresholds){const ordered=[...points].sort((a,b)=>a.coordinates[0].value-b.coordinates[0].value),out=[];for(const t of thresholds){for(const p of ordered)if(numericPoint(p)&&p.value===t.value)out.push({label:t.label,threshold:t.value,type:"EXACT_TESTED_POINT",point:p.coordinates});for(let i=1;i<ordered.length;i++){const a=ordered[i-1],b=ordered[i];if(!numericPoint(a)||!numericPoint(b)||a.value===t.value||b.value===t.value)continue;if((a.value<t.value&&b.value>t.value)||(a.value>t.value&&b.value<t.value))out.push({label:t.label,threshold:t.value,type:"BETWEEN_TESTED_POINTS",from:{coordinates:a.coordinates,value:a.value},to:{coordinates:b.coordinates,value:b.value},exactCrossing:null})}}return out;}
function runSensitivityStudy({study:definition,baselineAssessment,coverage={}}={}){
  const study=SensitivityStudy(definition),baseline=structuredClone(baselineAssessment);
  requireThat(isDeepStrictEqual(baselineReference(baseline),study.baselineAssessmentRef),"baseline_binding");
  requireThat(baseline.organizationId===study.organizationId&&baseline.workId===study.workId&&baseline.productRef===study.productRef&&baseline.campaignRef===study.campaignRef&&baseline.currency===study.currency&&samePeriod(baseline.reportingPeriod,study.reportingPeriod),"baseline_scope");
  const baselineMetric=baseline.metrics?.[study.targetMetric];requireThat(baselineMetric,"unsupported_target_metric");
  const inputs=new Map(baseline.financialInputs.map(x=>[x.id,x]));for(const a of study.axes){const input=inputs.get(a.targetInputId);requireThat(input&&input.category===a.category,`unknown_or_mismatched_target:${a.targetInputId}`)}
  const combinations=study.type==="ONE_WAY"?study.axes[0].points.map(x=>[x]):study.axes[0].points.flatMap(x=>study.axes[1].points.map(y=>[x,y]));
  const points=combinations.map(values=>{const coordinates=study.axes.map((a,i)=>({targetInputId:a.targetInputId,transformationType:a.transformationType,value:values[i],unit:a.transformationType==="PERCENTAGE_DELTA"?"BASIS_POINTS":"MINOR_CURRENCY"}));const overrides=study.axes.map((a,i)=>makeOverride(inputs.get(a.targetInputId),a,values[i]));const key=coordinates.map(x=>`${x.targetInputId}=${x.value}`).join("|");const scenarioResult=createEconomicScenarioResult({scenario:scenarioDefinition(study,overrides,key),baselineAssessment:baseline,coverage});return resultPoint(study,scenarioResult,coordinates,baselineMetric)});
  const analysis=summarize(points,baselineMetric),thresholdCrossings=study.type==="ONE_WAY"?breakpoints(points,study.thresholds):[];
  requireThat(isDeepStrictEqual(baseline,baselineAssessment),"baseline_mutated");
  const studyDigest=digest(identity(study));
  return freeze({kind:"EconomicSensitivityResult",sensitivityModelVersion:SENSITIVITY_MODEL_VERSION,studyDigest,study,baselineAssessmentRef:study.baselineAssessmentRef,targetMetric:study.targetMetric,baselineMetric:{status:baselineMetric.status,value:baselineMetric.value,unit:baselineMetric.unit},points,analysis,thresholdCrossings,uncertainty:study.axes.map(a=>({targetInputId:a.targetInputId,definition:a.uncertainty})),authorization:null,probabilityModel:null,limitations:["Sensitivity is model response, not prediction, causal effect, authorization, optimization, or capital allocation.","A supplied range is not a probability distribution; no point is claimed to be likely.","Hypothetical is not observed and unknown is not zero."]});
}
function compareSensitivityDrivers(results){
  requireThat(Array.isArray(results)&&results.length>=2,"comparison_results");
  const first=results[0];requireThat(results.every(x=>x?.kind==="EconomicSensitivityResult"&&x.study.type==="ONE_WAY"),"comparison_one_way_only");
  requireThat(results.every(x=>isDeepStrictEqual(x.baselineAssessmentRef,first.baselineAssessmentRef)&&x.targetMetric===first.targetMetric),"incompatible_comparison");
  const drivers=results.map(x=>({studyId:x.study.id,studyDigest:x.studyDigest,targetInputId:x.study.axes[0].targetInputId,testedRange:{transformationType:x.study.axes[0].transformationType,points:x.study.axes[0].points,unit:x.study.axes[0].transformationType==="PERCENTAGE_DELTA"?"BASIS_POINTS":"MINOR_CURRENCY"},status:x.analysis.status,absoluteSpread:x.analysis.absoluteSpread})).sort((a,b)=>(b.absoluteSpread??-1)-(a.absoluteSpread??-1)||a.studyDigest.localeCompare(b.studyDigest));
  return freeze({kind:"EconomicSensitivityDriverComparison",baselineAssessmentRef:first.baselineAssessmentRef,targetMetric:first.targetMetric,drivers,interpretation:"Contextual comparison across only the explicitly supplied tested ranges; it is not universal importance, prioritization, optimization, or authorization."});
}
module.exports={SENSITIVITY_MODEL_VERSION,SENSITIVITY_POLICY_VERSION,SensitivityStudy,runSensitivityStudy,compareSensitivityDrivers};
