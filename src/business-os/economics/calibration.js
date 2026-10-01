"use strict";
const crypto=require("node:crypto");
const {isDeepStrictEqual}=require("node:util");
const {EconomicReconciliation,validateEconomicAssessment}=require("./contracts");
const {ECONOMICS_ENGINE_VERSION}=require("./engine");
const {economicArtifactDigest}=require("./reconciliation");
const {reference}=require("../organization/economic-workflow");

const CALIBRATION_MODEL_VERSION="economics-calibration-v1.0.0";
const CALIBRATION_POLICY_VERSION="economics-calibration-policy-v1.0.0";
const SUPPORTED_METRICS=Object.freeze(["contribution","contributionBeforeUnknownCosts","discounts","grossRevenue","knownFixedCost","knownVariableCost","netRevenue","refunds","totalKnownCost"]);
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==="object"?Object.fromEntries(Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>[k,canonical(value[k])])):value;
const digest=value=>crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const freeze=value=>Object.freeze(structuredClone(value));
const fail=code=>{throw new Error(`invalid_economic_calibration:${code}`)};
const requireThat=(condition,code)=>{if(!condition)fail(code)};
const samePeriod=(a,b)=>a?.start===b?.start&&a?.end===b?.end;
const safeNumber=(value,code)=>{requireThat(value<=BigInt(Number.MAX_SAFE_INTEGER)&&value>=BigInt(Number.MIN_SAFE_INTEGER),code);return Number(value)};
const roundedRatio=(numerator,denominator)=>{const negative=(numerator<0n)!==(denominator<0n),n=(numerator<0n?-numerator:numerator)*10000n,d=denominator<0n?-denominator:denominator,q=(n+d/2n)/d;return safeNumber(negative?-q:q,"relative_error_overflow")};
const average=(sum,count,code)=>count?safeNumber((sum<0n?-((-sum+BigInt(count)/2n)/BigInt(count)):(sum+BigInt(count)/2n)/BigInt(count)),code):null;
const artifactSealed=artifact=>artifact&&artifact.digest===digest(Object.fromEntries(Object.entries(artifact).filter(([key])=>key!=="digest")));
const exactRef=(ref,artifact)=>isDeepStrictEqual(ref,reference(artifact));
const timestamps=(...values)=>values.every(value=>typeof value==="string"&&Number.isFinite(Date.parse(value)));
const sideStatus=(expected,actual)=>{
  if(expected.status==="INVALID"||actual.status==="INVALID")return "INVALID";
  if(expected.status==="NOT_APPLICABLE"||actual.status==="NOT_APPLICABLE")return "NOT_APPLICABLE";
  if(expected.status==="PARTIAL"||actual.status==="PARTIAL")return "PARTIAL";
  if(expected.status!=="CALCULATED"||actual.status!=="CALCULATED"||expected.value===null||actual.value===null)return "UNKNOWN";
  return "CALCULATED";
};
function observationReference(observation){return freeze({artifactType:"EconomicCalibrationObservation",artifactId:observation.id,version:observation.version,digest:observation.digest,organizationId:observation.organizationId,workId:observation.workId});}
function createEconomicCalibrationObservation(input={}){
  const {metric,baselineArtifact,baselineAssessment,actualArtifact,actualAssessment,reconciliation,decision}=input;
  requireThat(SUPPORTED_METRICS.includes(metric),`unsupported_metric:${metric}`);
  for(const artifact of [baselineArtifact,baselineAssessment,actualArtifact,actualAssessment,reconciliation,decision])requireThat(artifact&&typeof artifact==="object","required_artifact");
  validateEconomicAssessment(baselineAssessment);validateEconomicAssessment(actualAssessment);EconomicReconciliation(reconciliation);
  requireThat(artifactSealed(baselineArtifact)&&artifactSealed(actualArtifact),"assessment_artifact_digest");
  requireThat(baselineArtifact.artifactType==="EconomicAssessment"&&actualArtifact.artifactType==="EconomicAssessment","assessment_artifact_type");
  requireThat(baselineArtifact.assessmentId===baselineAssessment.id&&baselineArtifact.assessmentDigest===economicArtifactDigest(baselineAssessment),"forecast_binding");
  requireThat(actualArtifact.assessmentId===actualAssessment.id&&actualArtifact.assessmentDigest===economicArtifactDigest(actualAssessment),"actual_binding");
  requireThat(exactRef(reconciliation.baselineEconomicAssessmentRef,baselineArtifact)&&exactRef(reconciliation.actualEconomicAssessmentRef,actualArtifact),"reconciliation_assessment_binding");
  requireThat(reconciliation.id===input.reconciliationRef?.artifactId&&reconciliation.version===input.reconciliationRef?.version&&digest(reconciliation)===input.reconciliationRef?.digest,"reconciliation_binding");
  requireThat(decision.kind==="GovernedDecision"&&decision.id===reconciliation.decisionRef&&decision.result==="APPROVE"&&decision.authorityType==="HUMAN"&&decision.authorizationScope==="EXPERIMENT_EXECUTION"&&exactRef(decision.economicAssessmentRef,baselineArtifact),"operative_expectation");
  requireThat(baselineArtifact.status!=="SUPERSEDED"&&actualArtifact.status!=="SUPERSEDED","superseded_assessment");
  requireThat(baselineAssessment.engineVersion===ECONOMICS_ENGINE_VERSION&&actualAssessment.engineVersion===ECONOMICS_ENGINE_VERSION&&reconciliation.engineVersion===ECONOMICS_ENGINE_VERSION,"engine_version");
  requireThat([baselineAssessment,actualAssessment,reconciliation,baselineArtifact,actualArtifact,decision].every(x=>x.organizationId===reconciliation.organizationId),"organization_mismatch");
  requireThat([baselineAssessment,actualAssessment,reconciliation,baselineArtifact,actualArtifact,decision].every(x=>x.workId===reconciliation.workId),"work_mismatch");
  requireThat(baselineAssessment.productRef===actualAssessment.productRef&&baselineAssessment.campaignRef===actualAssessment.campaignRef,"product_campaign_mismatch");
  requireThat(baselineAssessment.currency===actualAssessment.currency&&samePeriod(baselineAssessment.reportingPeriod,actualAssessment.reportingPeriod)&&samePeriod(reconciliation.reportingPeriod,actualAssessment.reportingPeriod),"currency_or_period_mismatch");
  const expectationAt=input.expectationDesignatedAt||decision.decidedAt,actualAt=actualAssessment.provenance?.asOf,createdAt=reconciliation.createdAt;
  requireThat(timestamps(expectationAt,actualAt,reconciliation.asOf,reconciliation.createdAt,createdAt),"timestamp");
  requireThat(Date.parse(expectationAt)<Date.parse(actualAt),"expectation_not_before_actual");
  requireThat(Date.parse(baselineAssessment.createdAt)<=Date.parse(expectationAt)&&Date.parse(baselineAssessment.provenance?.asOf)<=Date.parse(expectationAt)&&Date.parse(baselineArtifact.createdAt)<=Date.parse(expectationAt)&&Date.parse(actualAt)<=Date.parse(reconciliation.asOf)&&Date.parse(reconciliation.asOf)<=Date.parse(reconciliation.createdAt),"temporal_lineage");
  requireThat(Date.parse(expectationAt)<=Date.parse(createdAt)&&Date.parse(actualAt)<=Date.parse(createdAt),"future_dated_evidence");
  const comparison=reconciliation.metricComparisons.find(item=>item.metric===metric);requireThat(comparison,"missing_metric_comparison");
  const expected=baselineAssessment.metrics[metric],actual=actualAssessment.metrics[metric];
  requireThat(expected&&actual&&isDeepStrictEqual(comparison.expected,{status:expected.status,value:expected.value,unit:expected.unit,missingInputs:[...(expected.missingInputs||[])].sort()})&&isDeepStrictEqual(comparison.actual,{status:actual.status,value:actual.value,unit:actual.unit,missingInputs:[...(actual.missingInputs||[])].sort()}),"metric_binding");
  const status=sideStatus(expected,actual),result={status,value:null,unit:expected.unit},absolute={status,value:null,unit:expected.unit},relative={status,value:null,unit:"BASIS_POINTS"};let direction="NOT_COMPARABLE";
  if(status==="CALCULATED"){
    const error=BigInt(expected.value)-BigInt(actual.value),absoluteValue=error<0n?-error:error;
    result.value=safeNumber(error,"signed_error_overflow");absolute.value=safeNumber(absoluteValue,"absolute_error_overflow");
    if(actual.value===0)relative.status="NOT_APPLICABLE";else relative.value=roundedRatio(error,BigInt(actual.value));
    direction=error>0n?"EXPECTED_ABOVE_ACTUAL":error<0n?"EXPECTED_BELOW_ACTUAL":"EXACT_MATCH";
  }
  const reconciliationRef=freeze({artifactType:"EconomicReconciliation",artifactId:reconciliation.id,version:reconciliation.version,digest:digest(reconciliation),organizationId:reconciliation.organizationId,workId:reconciliation.workId});
  const identity={organizationId:reconciliation.organizationId,workId:reconciliation.workId,productRef:baselineAssessment.productRef,campaignRef:baselineAssessment.campaignRef,currency:baselineAssessment.currency,reportingPeriod:baselineAssessment.reportingPeriod,metric,expectationType:"AUTHORIZED_BASELINE",expectationDesignatedAt:expectationAt,actualAuthoritativeAt:actualAt,baselineEconomicAssessmentRef:reference(baselineArtifact),actualEconomicAssessmentRef:reference(actualArtifact),reconciliationRef,engineVersion:ECONOMICS_ENGINE_VERSION,modelVersion:CALIBRATION_MODEL_VERSION,policyVersion:CALIBRATION_POLICY_VERSION};
  const record={...identity,kind:"EconomicCalibrationObservation",id:`economic-calibration-observation:${digest(identity).slice(0,24)}`,version:1,comparisonStatus:status,expected:{status:expected.status,value:expected.value,unit:expected.unit},actual:{status:actual.status,value:actual.value,unit:actual.unit},signedError:result,absoluteError:absolute,relativeError:relative,direction,limitations:["Calibration measures historical difference; it is not forecasting, probability, causality, recommendation, correction, authorization, or execution."],createdAt};record.digest=digest(record);return freeze(record);
}
function createEconomicCalibrationProfile({cohort,observations=[]}={}){
  requireThat(cohort&&typeof cohort==="object","cohort_required");
  for(const key of ["organizationId","metric","currency","productRef","campaignRef","expectationType","engineVersion","asOf"])requireThat(Object.hasOwn(cohort,key),`cohort_${key}`);requireThat(timestamps(cohort.asOf),"cohort_as_of");
  requireThat(SUPPORTED_METRICS.includes(cohort.metric)&&cohort.engineVersion===ECONOMICS_ENGINE_VERSION,"cohort_metric_or_engine");requireThat(cohort.reportingPeriodSemantics==="EXACT_DURATION_MS","cohort_period_semantics");
  const ids=new Set(),ordered=[...observations].sort((a,b)=>a.id.localeCompare(b.id));for(const o of ordered){requireThat(o?.kind==="EconomicCalibrationObservation"&&o.digest===digest(Object.fromEntries(Object.entries(o).filter(([k])=>k!=="digest"))),"observation_digest");requireThat(!ids.has(o.id),"duplicate_observation");ids.add(o.id);const duration=Date.parse(o.reportingPeriod.end)-Date.parse(o.reportingPeriod.start);requireThat(o.organizationId===cohort.organizationId&&o.metric===cohort.metric&&o.currency===cohort.currency&&o.productRef===cohort.productRef&&o.campaignRef===cohort.campaignRef&&o.expectationType===cohort.expectationType&&o.engineVersion===cohort.engineVersion&&duration===cohort.reportingPeriodDurationMs,"cohort_mismatch");}
  const comparable=ordered.filter(o=>o.comparisonStatus==="CALCULATED"),nonComparable=ordered.length-comparable.length,percentage=comparable.filter(o=>o.relativeError.status==="CALCULATED");let signed=0n,absolute=0n,percentageAbsolute=0n,min=null,max=null;for(const o of comparable){const a=BigInt(o.absoluteError.value);signed+=BigInt(o.signedError.value);absolute+=a;min=min===null||a<min?a:min;max=max===null||a>max?a:max}for(const o of percentage)percentageAbsolute+=BigInt(Math.abs(o.relativeError.value));
  const statistic=(value,count,unit,status=count?"CALCULATED":"NOT_APPLICABLE")=>({status,value,unit,observationCount:count});
  const stats={meanSignedError:statistic(average(signed,comparable.length,"mean_signed_error_overflow"),comparable.length,"MINOR_CURRENCY"),meanAbsoluteError:statistic(average(absolute,comparable.length,"mean_absolute_error_overflow"),comparable.length,"MINOR_CURRENCY"),minimumAbsoluteError:statistic(min===null?null:safeNumber(min,"minimum_absolute_error_overflow"),comparable.length,"MINOR_CURRENCY"),maximumAbsoluteError:statistic(max===null?null:safeNumber(max,"maximum_absolute_error_overflow"),comparable.length,"MINOR_CURRENCY"),meanAbsolutePercentageError:statistic(average(percentageAbsolute,percentage.length,"mape_overflow"),percentage.length,"BASIS_POINTS")};
  requireThat(ordered.every(o=>Date.parse(o.createdAt)<=Date.parse(cohort.asOf)),"observation_after_cohort_as_of");const cohortDefinition=canonical(cohort),refs=ordered.map(observationReference),identity={cohortDefinition,observationRefs:refs,modelVersion:CALIBRATION_MODEL_VERSION,policyVersion:CALIBRATION_POLICY_VERSION};const record={...identity,kind:"EconomicCalibrationProfile",id:`economic-calibration-profile:${digest(identity).slice(0,24)}`,version:1,totalObservationCount:ordered.length,comparableObservationCount:comparable.length,nonComparableObservationCount:nonComparable,percentageErrorObservationCount:percentage.length,directionCounts:{expectedAboveActual:comparable.filter(o=>o.direction==="EXPECTED_ABOVE_ACTUAL").length,expectedBelowActual:comparable.filter(o=>o.direction==="EXPECTED_BELOW_ACTUAL").length,exactMatch:comparable.filter(o=>o.direction==="EXACT_MATCH").length},statistics:stats,authorization:null,recommendation:null,forecast:null,probabilityModel:null,limitations:["Sample size is descriptive and must remain visible.","Zero-actual observations are excluded from MAPE, not treated as zero percentage error.","No observation is removed as an outlier."],createdAt:cohort.asOf};record.digest=digest(record);return freeze(record);
}
class EconomicCalibrationObservationRepository{constructor(){this.records=new Map()}save(record){requireThat(!this.records.has(record.id),"duplicate_observation");requireThat(record.digest===digest(Object.fromEntries(Object.entries(record).filter(([k])=>k!=="digest"))),"observation_digest");this.records.set(record.id,structuredClone(record));return structuredClone(record)}get(id){return structuredClone(this.records.get(id)||null)}}
module.exports={CALIBRATION_MODEL_VERSION,CALIBRATION_POLICY_VERSION,CALIBRATION_SUPPORTED_METRICS:SUPPORTED_METRICS,economicCalibrationDigest:digest,createEconomicCalibrationObservation,createEconomicCalibrationProfile,EconomicCalibrationObservationRepository};
