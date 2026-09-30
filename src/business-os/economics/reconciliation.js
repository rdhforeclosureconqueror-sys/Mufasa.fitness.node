"use strict";
const crypto = require("node:crypto");
const {isDeepStrictEqual} = require("node:util");
const {EconomicReconciliation, METRIC_STATUSES} = require("./contracts");
const {ECONOMICS_ENGINE_VERSION} = require("./engine");
const {reference} = require("../organization/economic-workflow");

const RECONCILIATION_POLICY_VERSION = "economics-reconciliation-v1.0.0";
const DIRECTIONS = Object.freeze({grossRevenue:"HIGHER_IS_BETTER",refunds:"LOWER_IS_BETTER",discounts:"LOWER_IS_BETTER",netRevenue:"HIGHER_IS_BETTER",knownVariableCost:"LOWER_IS_BETTER",knownFixedCost:"LOWER_IS_BETTER",totalKnownCost:"LOWER_IS_BETTER",contribution:"HIGHER_IS_BETTER",contributionMargin:"HIGHER_IS_BETTER",unitRevenue:"HIGHER_IS_BETTER",unitCost:"LOWER_IS_BETTER",unitContribution:"HIGHER_IS_BETTER",breakEvenUnits:"LOWER_IS_BETTER",cac:"LOWER_IS_BETTER",roas:"HIGHER_IS_BETTER",roi:"HIGHER_IS_BETTER"});
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])])) : value;
const hash = value => crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const fail = code => { throw new Error(`invalid_economic_reconciliation:${code}`); };
const requireThat = (condition, code) => { if (!condition) fail(code); };
const samePeriod = (a,b) => a?.start === b?.start && a?.end === b?.end;
const exactRef = (ref, artifact, type) => ref?.artifactType === type && isDeepStrictEqual(ref,reference(artifact));
const sealed = artifact => {const value={...artifact};delete value.digest;return typeof artifact.digest==="string"&&artifact.digest===hash(value);};
const safeSubtract = (actual, expected) => { const value=BigInt(actual)-BigInt(expected); return value<=BigInt(Number.MAX_SAFE_INTEGER)&&value>=BigInt(Number.MIN_SAFE_INTEGER)?Number(value):null; };
const basisPoints = (variance, expected) => { if(expected===0)return null;const negative=(variance<0)!==(expected<0),n=BigInt(Math.abs(variance))*10000n,d=BigInt(Math.abs(expected)),v=(n+d/2n)/d;return v>BigInt(Number.MAX_SAFE_INTEGER)?null:Number(negative?-v:v); };
function compare(metric, expected, actual) {
  requireThat(expected && actual && METRIC_STATUSES.includes(expected.status) && METRIC_STATUSES.includes(actual.status), `metric_shape:${metric}`);
  requireThat(expected.unit === actual.unit, `metric_unit:${metric}`);
  const side = item => ({status:item.status,value:item.value,unit:item.unit,missingInputs:[...(item.missingInputs||[])].sort()});
  const result={metric,direction:DIRECTIONS[metric],expected:side(expected),actual:side(actual),absoluteVariance:{status:"UNKNOWN",value:null,unit:expected.unit},relativeVariance:{status:"UNKNOWN",value:null,unit:"BASIS_POINTS"},comparisonStatus:"UNKNOWN"};
  if(expected.status==="INVALID"||actual.status==="INVALID"){result.absoluteVariance.status=result.relativeVariance.status=result.comparisonStatus="INVALID";return result;}
  if(expected.status==="NOT_APPLICABLE"||actual.status==="NOT_APPLICABLE"){result.absoluteVariance.status=result.relativeVariance.status=result.comparisonStatus="NOT_APPLICABLE";return result;}
  if(expected.value===null||actual.value===null||["UNKNOWN"].includes(expected.status)||["UNKNOWN"].includes(actual.status))return result;
  requireThat(Number.isSafeInteger(expected.value)&&Number.isSafeInteger(actual.value),`metric_value:${metric}`);
  const variance=safeSubtract(actual.value,expected.value);requireThat(variance!==null,`variance_overflow:${metric}`);
  const partial=expected.status==="PARTIAL"||actual.status==="PARTIAL";
  result.absoluteVariance={status:partial?"PARTIAL":"CALCULATED",value:variance,unit:expected.unit};
  if(expected.value===0)result.relativeVariance={status:"NOT_APPLICABLE",value:null,unit:"BASIS_POINTS"};
  else {const relative=basisPoints(variance,expected.value);requireThat(relative!==null,`relative_variance_overflow:${metric}`);result.relativeVariance={status:partial?"PARTIAL":"CALCULATED",value:relative,unit:"BASIS_POINTS"};}
  if(partial)result.comparisonStatus="PARTIAL";
  else if(variance===0)result.comparisonStatus="ON_PLAN";
  else result.comparisonStatus=(DIRECTIONS[metric]==="HIGHER_IS_BETTER"?variance>0:variance<0)?"FAVORABLE":"UNFAVORABLE";
  return result;
}
function createEconomicReconciliation(input={}, {clock=()=>new Date().toISOString()}={}) {
  const {organizationId,workId,proposalArtifact,baselineArtifact,baselineAssessment,decision,approval,run,experimentResult,actualArtifact,actualAssessment,authorizedAmountMinor,reservedAmountMinor}=input;
  for(const value of [proposalArtifact,baselineArtifact,baselineAssessment,decision,approval,run,experimentResult,actualArtifact,actualAssessment])requireThat(value&&typeof value==="object","required_artifact");
  requireThat([proposalArtifact,baselineArtifact,baselineAssessment,decision,approval,run,experimentResult,actualArtifact,actualAssessment].every(x=>x.organizationId===organizationId),"organization_mismatch");
  requireThat([proposalArtifact,baselineArtifact,baselineAssessment,decision,experimentResult,actualArtifact,actualAssessment].every(x=>x.workId===workId),"work_mismatch");
  requireThat(proposalArtifact.artifactType==="ExperimentProposal"&&baselineArtifact.artifactType==="EconomicAssessment"&&actualArtifact.artifactType==="EconomicAssessment","artifact_type");
  requireThat(sealed(proposalArtifact)&&sealed(baselineArtifact)&&sealed(actualArtifact),"artifact_digest");
  requireThat(exactRef(decision.experimentProposalRef,proposalArtifact,"ExperimentProposal")&&exactRef(decision.economicAssessmentRef,baselineArtifact,"EconomicAssessment"),"decision_lineage");
  requireThat(decision.kind==="GovernedDecision"&&decision.result==="APPROVE"&&decision.authorityType==="HUMAN"&&decision.authorizationScope==="EXPERIMENT_EXECUTION","decision_not_authorizing");
  requireThat(approval.kind==="ExperimentApproval"&&approval.status==="APPROVED"&&approval.decisionRef===decision.id,"approval_lineage");
  requireThat(run.kind==="ExperimentRun"&&run.approvalRef===approval.id&&run.proposalRef===proposalArtifact.id&&run.proposalVersion===proposalArtifact.version&&!['CANCELLED'].includes(run.status),"run_lineage");
  requireThat(experimentResult.kind==="ExperimentResult"&&experimentResult.runRef===run.id&&experimentResult.proposalRef===run.proposalRef&&experimentResult.proposalVersion===run.proposalVersion,"result_lineage");
  requireThat(["SUPPORTED","NOT_SUPPORTED","INCONCLUSIVE","TECHNICAL_FAILURE","POLICY_BLOCKED"].includes(experimentResult.resultClass),"result_class");
  requireThat(baselineArtifact.status!=="SUPERSEDED"&&actualArtifact.status!=="SUPERSEDED","superseded_assessment");
  requireThat(baselineArtifact.assessmentId===baselineAssessment.id&&baselineArtifact.assessmentDigest===hash(baselineAssessment)&&actualArtifact.assessmentId===actualAssessment.id&&actualArtifact.assessmentDigest===hash(actualAssessment),"assessment_artifact_lineage");
  requireThat(baselineAssessment.kind==="EconomicAssessment"&&actualAssessment.kind==="EconomicAssessment"&&baselineAssessment.engineVersion===ECONOMICS_ENGINE_VERSION&&actualAssessment.engineVersion===ECONOMICS_ENGINE_VERSION,"assessment_engine");
  requireThat(actualAssessment.provenance&&actualAssessment.provenance.inputs.every(x=>x.accepted&&!["CONFLICTED","STALE","INSUFFICIENT"].includes(x.trustState))&&actualAssessment.provenance.asOf,"actual_provenance");
  requireThat(samePeriod(baselineAssessment.reportingPeriod,actualAssessment.reportingPeriod),"reporting_period_mismatch");
  requireThat(Date.parse(actualAssessment.provenance.asOf)<=Date.parse(input.asOf||actualAssessment.provenance.asOf),"future_actual_evidence");
  requireThat(Number.isSafeInteger(authorizedAmountMinor)&&authorizedAmountMinor>=0&&Number.isSafeInteger(reservedAmountMinor)&&reservedAmountMinor>=0&&reservedAmountMinor<=authorizedAmountMinor,"budget_amounts");
  const names=Object.keys(DIRECTIONS).filter(name=>baselineAssessment.metrics[name]&&actualAssessment.metrics[name]).sort();
  const metricComparisons=names.map(name=>compare(name,baselineAssessment.metrics[name],actualAssessment.metrics[name]));
  const invalid=metricComparisons.some(x=>x.comparisonStatus==="INVALID"), comparable=metricComparisons.filter(x=>["FAVORABLE","UNFAVORABLE","ON_PLAN","PARTIAL"].includes(x.comparisonStatus));
  const status=invalid?"INVALID":!comparable.length?"INSUFFICIENT_ACTUALS":comparable.length===metricComparisons.length&&!comparable.some(x=>x.comparisonStatus==="PARTIAL")?"RECONCILED":"PARTIALLY_RECONCILED";
  const createdAt=clock();requireThat(Number.isFinite(Date.parse(createdAt)),"created_at");
  const identity={organizationId,workId,proposalRef:decision.experimentProposalRef,runRef:run.id,experimentResultRef:experimentResult.id,baselineEconomicAssessmentRef:decision.economicAssessmentRef,actualEconomicAssessmentRef:reference(actualArtifact),decisionRef:decision.id,policyVersion:RECONCILIATION_POLICY_VERSION};
  return EconomicReconciliation({...identity,id:`economic-reconciliation:${hash(identity).slice(0,24)}`,reportingPeriod:baselineAssessment.reportingPeriod,metricComparisons,status,experimentResultClass:experimentResult.resultClass,budget:{authorizedAmountMinor,reservedAmountMinor,actualSpendMinor:null,unusedAuthorizationMinor:null},limitations:["Variance reports what changed; it does not establish causality.","Reservation release and financial settlement are outside ECO-4B."],createdAt,version:1,engineVersion:ECONOMICS_ENGINE_VERSION,policyVersion:RECONCILIATION_POLICY_VERSION});
}
class EconomicReconciliationRepository {
  constructor(){this.records=new Map();}
  save(record){const existing=this.records.get(record.id);if(existing&&!isDeepStrictEqual(existing,record))fail("reconciliation_immutable");if(existing)fail("duplicate_reconciliation_identity");this.records.set(record.id,structuredClone(record));return structuredClone(record);}
  get(id){return structuredClone(this.records.get(id)||null);}
}
module.exports={RECONCILIATION_POLICY_VERSION,METRIC_DIRECTIONS:DIRECTIONS,economicArtifactDigest:hash,compareEconomicMetric:compare,createEconomicReconciliation,EconomicReconciliationRepository};
