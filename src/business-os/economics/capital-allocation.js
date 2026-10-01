"use strict";
const crypto=require("node:crypto");
const {isDeepStrictEqual}=require("node:util");
const {ECONOMICS_ENGINE_VERSION}=require("./engine");
const {economicArtifactDigest}=require("./reconciliation");
const {SCENARIO_MODEL_VERSION}=require("./scenario");
const {SENSITIVITY_MODEL_VERSION}=require("./sensitivity");

const CAPITAL_ALLOCATION_MODEL_VERSION="economics-capital-allocation-v1.0.0";
const CAPITAL_ALLOCATION_POLICY_VERSION="economics-capital-allocation-policy-v1.0.0";
const MAX_CAPITAL_ALLOCATION_CANDIDATES=12;
const MAX_CAPITAL_ALLOCATION_COMBINATIONS=4096;
const CONSTRAINT_TYPES=Object.freeze(["TOTAL_CAPITAL_LIMIT","MINIMUM_COMMITMENT","MAXIMUM_COMMITMENT","REQUIRED","MUTUALLY_EXCLUSIVE","DEPENDENCY"]);
const ADDITIVE_METRICS=Object.freeze(["contribution","contributionBeforeUnknownCosts","discounts","grossRevenue","knownFixedCost","knownVariableCost","netRevenue","refunds","totalKnownCost"]);
const text=x=>typeof x==="string"&&x.trim().length>0;
const object=x=>x&&typeof x==="object"&&!Array.isArray(x);
const freeze=x=>{if(x&&typeof x==="object"){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
const fail=code=>{throw new Error(`invalid_capital_allocation:${code}`)};
const requireThat=(ok,code)=>{if(!ok)fail(code)};
const canonical=x=>Array.isArray(x)?x.map(canonical):object(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=x=>crypto.createHash("sha256").update(JSON.stringify(canonical(x))).digest("hex");
const samePeriod=(a,b)=>a?.start===b?.start&&a?.end===b?.end;
const safeSum=values=>{const n=values.reduce((a,x)=>a+BigInt(x),0n);return n>=BigInt(Number.MIN_SAFE_INTEGER)&&n<=BigInt(Number.MAX_SAFE_INTEGER)?Number(n):null};
const assessmentReference=a=>freeze({assessmentId:a.id,version:a.version,digest:economicArtifactDigest(a),engineVersion:a.engineVersion,organizationId:a.organizationId,workId:a.workId,productRef:a.productRef,campaignRef:a.campaignRef,currency:a.currency,reportingPeriod:a.reportingPeriod});
const scenarioReference=r=>freeze({scenarioId:r.scenario.id,version:r.scenario.version,digest:economicArtifactDigest(r),scenarioModelVersion:r.scenarioModelVersion,baselineAssessmentRef:r.baselineAssessmentRef});
const sensitivityReference=r=>freeze({studyId:r.study.id,version:r.study.version,digest:economicArtifactDigest(r),studyDigest:r.studyDigest,sensitivityModelVersion:r.sensitivityModelVersion,baselineAssessmentRef:r.baselineAssessmentRef});

function CapitalAllocationStudy(value={}){
  requireThat(object(value),"contract");
  for(const k of ["id","organizationId","name","createdBy"])requireThat(text(value[k]),k);
  requireThat(value.workId===null||text(value.workId),"workId");
  requireThat(Number.isSafeInteger(value.version)&&value.version>0,"version");
  requireThat(value.currency==="USD","currency");
  requireThat(Number.isSafeInteger(value.availableCapitalMinor)&&value.availableCapitalMinor>=0,"available_capital");
  requireThat(value.engineVersion===ECONOMICS_ENGINE_VERSION,"engine_version");
  requireThat(value.policyVersion===CAPITAL_ALLOCATION_POLICY_VERSION,"policy_version");
  requireThat(text(value.createdAt)&&Number.isFinite(Date.parse(value.createdAt))&&new Date(value.createdAt).toISOString()===value.createdAt,"createdAt");
  requireThat(text(value.allocationPeriod?.start)&&text(value.allocationPeriod?.end)&&Date.parse(value.allocationPeriod.start)<Date.parse(value.allocationPeriod.end),"allocation_period");
  requireThat(Array.isArray(value.limitations)&&value.limitations.every(text),"limitations");
  requireThat(Array.isArray(value.candidates)&&value.candidates.length<=MAX_CAPITAL_ALLOCATION_CANDIDATES,"candidate_limit");
  const ids=new Set();
  const candidates=value.candidates.map(c=>{
    requireThat(object(c)&&text(c.id)&&!ids.has(c.id),"duplicate_or_invalid_candidate");ids.add(c.id);
    requireThat(c.organizationId===value.organizationId&&(value.workId===null||c.workId===value.workId),`candidate_scope:${c.id}`);
    requireThat(text(c.workId)&&text(c.productRef)&&(c.campaignRef===null||text(c.campaignRef)),`candidate_identity:${c.id}`);
    requireThat(Number.isSafeInteger(c.requiredCapitalMinor)&&c.requiredCapitalMinor>=0,`required_capital:${c.id}`);
    requireThat(c.fundingSemantics==="ALL_OR_NOTHING",`funding_semantics:${c.id}`);
    requireThat(object(c.economicAssessmentRef),`assessment_ref:${c.id}`);
    requireThat(c.economicsSource==="BASELINE"||c.economicsSource==="SCENARIO",`economics_source:${c.id}`);
    requireThat(c.scenarioRef===null||object(c.scenarioRef),`scenario_ref:${c.id}`);
    requireThat(c.sensitivityRef===null||object(c.sensitivityRef),`sensitivity_ref:${c.id}`);
    requireThat(c.economicsSource!=="SCENARIO"||c.scenarioRef,`scenario_required:${c.id}`);
    return structuredClone(c);
  }).sort((a,b)=>a.id.localeCompare(b.id));
  requireThat(Array.isArray(value.constraints),"constraints");
  const constraintIds=new Set(),constraintSemantics=new Set();
  const constraints=value.constraints.map(c=>{requireThat(object(c)&&text(c.id)&&!constraintIds.has(c.id),"duplicate_or_invalid_constraint");constraintIds.add(c.id);requireThat(CONSTRAINT_TYPES.includes(c.type),`constraint_type:${c.id}`);const copy=structuredClone(c),semantic=digest(Object.fromEntries(Object.entries(copy).filter(([k])=>k!=="id")));requireThat(!constraintSemantics.has(semantic),"duplicate_constraint");constraintSemantics.add(semantic);return copy}).sort((a,b)=>a.id.localeCompare(b.id));
  validateConstraints(constraints,new Set(candidates.map(c=>c.id)));
  return freeze({...structuredClone(value),kind:"CapitalAllocationStudy",capitalAllocationModelVersion:CAPITAL_ALLOCATION_MODEL_VERSION,candidates,constraints,limitations:[...value.limitations].sort()});
}

function validateConstraints(constraints,candidates){
  const known=(id,code)=>requireThat(text(id)&&candidates.has(id),code);
  const graph=new Map([...candidates].map(id=>[id,[]]));
  for(const c of constraints){
    if(c.type==="TOTAL_CAPITAL_LIMIT")requireThat(Object.keys(c).every(k=>["id","type"].includes(k)),`total_capital_shape:${c.id}`);
    if(["REQUIRED","MINIMUM_COMMITMENT","MAXIMUM_COMMITMENT"].includes(c.type))known(c.candidateId,`unknown_candidate:${c.id}`);
    if(["MINIMUM_COMMITMENT","MAXIMUM_COMMITMENT"].includes(c.type))requireThat(Number.isSafeInteger(c.amountMinor)&&c.amountMinor>=0,`commitment_amount:${c.id}`);
    if(c.type==="MUTUALLY_EXCLUSIVE"){requireThat(Array.isArray(c.candidateIds)&&c.candidateIds.length>=2&&new Set(c.candidateIds).size===c.candidateIds.length,`mutual_exclusion:${c.id}`);c.candidateIds.forEach(id=>known(id,`unknown_candidate:${c.id}`));c.candidateIds.sort()}
    if(c.type==="DEPENDENCY"){known(c.candidateId,`unknown_candidate:${c.id}`);known(c.dependsOnCandidateId,`unknown_dependency:${c.id}`);requireThat(c.candidateId!==c.dependsOnCandidateId,`self_dependency:${c.id}`);graph.get(c.candidateId).push(c.dependsOnCandidateId)}
  }
  const visiting=new Set(),visited=new Set();
  const walk=id=>{if(visiting.has(id))fail("dependency_cycle");if(visited.has(id))return;visiting.add(id);graph.get(id).forEach(walk);visiting.delete(id);visited.add(id)};
  [...candidates].sort().forEach(walk);
}

function bindArtifacts(study,economicAssessments,scenarioResults,sensitivityResults){
  requireThat(Array.isArray(economicAssessments)&&Array.isArray(scenarioResults)&&Array.isArray(sensitivityResults),"artifact_collections");
  const unique=(items,key,code)=>{const map=new Map();for(const x of items){const id=key(x);requireThat(text(id)&&!map.has(id),code);map.set(id,x)}return map};
  const assessments=unique(economicAssessments,x=>x?.id,"duplicate_assessment_artifact");
  const scenarios=unique(scenarioResults,x=>x?.scenario?.id,"duplicate_scenario_artifact");
  const sensitivities=unique(sensitivityResults,x=>x?.study?.id,"duplicate_sensitivity_artifact");
  return new Map(study.candidates.map(c=>{
    const base=assessments.get(c.economicAssessmentRef.assessmentId);
    requireThat(base?.kind==="EconomicAssessment"&&base.engineVersion===study.engineVersion,`assessment_engine:${c.id}`);
    requireThat(isDeepStrictEqual(assessmentReference(base),c.economicAssessmentRef),`assessment_binding:${c.id}`);
    requireThat(base.organizationId===c.organizationId&&base.workId===c.workId&&base.productRef===c.productRef&&base.campaignRef===c.campaignRef&&base.currency===study.currency,`assessment_scope:${c.id}`);
    requireThat(samePeriod(base.reportingPeriod,study.allocationPeriod),`reporting_period:${c.id}`);
    let selected=base,scenario=null,sensitivity=null;
    if(c.scenarioRef){scenario=scenarios.get(c.scenarioRef.scenarioId);requireThat(scenario?.kind==="EconomicScenarioResult"&&scenario.scenarioModelVersion===SCENARIO_MODEL_VERSION&&isDeepStrictEqual(scenarioReference(scenario),c.scenarioRef),`scenario_binding:${c.id}`);requireThat(isDeepStrictEqual(scenario.baselineAssessmentRef,c.economicAssessmentRef),`scenario_lineage:${c.id}`);requireThat(scenario.scenario.organizationId===c.organizationId&&scenario.scenario.workId===c.workId&&scenario.scenario.productRef===c.productRef&&scenario.scenario.campaignRef===c.campaignRef&&scenario.scenario.currency===study.currency&&samePeriod(scenario.scenario.reportingPeriod,study.allocationPeriod),`scenario_scope:${c.id}`);if(c.economicsSource==="SCENARIO")selected=scenario.assessment}
    if(c.sensitivityRef){sensitivity=sensitivities.get(c.sensitivityRef.studyId);requireThat(sensitivity?.kind==="EconomicSensitivityResult"&&sensitivity.sensitivityModelVersion===SENSITIVITY_MODEL_VERSION&&isDeepStrictEqual(sensitivityReference(sensitivity),c.sensitivityRef),`sensitivity_binding:${c.id}`);requireThat(isDeepStrictEqual(sensitivity.baselineAssessmentRef,c.economicAssessmentRef),`sensitivity_lineage:${c.id}`);requireThat(sensitivity.study.organizationId===c.organizationId&&sensitivity.study.workId===c.workId&&sensitivity.study.productRef===c.productRef&&sensitivity.study.campaignRef===c.campaignRef&&sensitivity.study.currency===study.currency&&samePeriod(sensitivity.study.reportingPeriod,study.allocationPeriod),`sensitivity_scope:${c.id}`)}
    requireThat(selected.kind==="EconomicAssessment"&&selected.engineVersion===study.engineVersion&&selected.organizationId===c.organizationId&&selected.workId===c.workId&&selected.productRef===c.productRef&&selected.campaignRef===c.campaignRef&&selected.currency===study.currency&&samePeriod(selected.reportingPeriod,study.allocationPeriod),`selected_economics_scope:${c.id}`);
    return [c.id,{base,selected,scenario,sensitivity}];
  }));
}

function profile(included,bound){
  const metrics={};
  for(const name of ADDITIVE_METRICS){const source=included.map(c=>bound.get(c.id).selected.metrics[name]);const empty=!source.length,unresolved=empty||source.some(m=>!m||m.value===null||["UNKNOWN","INVALID","NOT_APPLICABLE"].includes(m.status));const value=unresolved?null:safeSum(source.map(m=>m.value));requireThat(unresolved||value!==null,`metric_overflow:${name}`);metrics[name]={status:empty?"NOT_APPLICABLE":unresolved?"UNKNOWN":source.some(m=>m.status==="PARTIAL")?"PARTIAL":"CALCULATED",value,unit:"MINOR_CURRENCY",missingCandidates:unresolved&&!empty?included.filter(c=>{const m=bound.get(c.id).selected.metrics[name];return !m||m.value===null||["UNKNOWN","INVALID","NOT_APPLICABLE"].includes(m.status)}).map(c=>c.id):[]}}
  return {status:Object.values(metrics).some(m=>m.status==="UNKNOWN")?"PARTIAL":Object.values(metrics).some(m=>m.status==="PARTIAL")?"PARTIAL":"COMPLETE",metrics,nonAggregatedMetrics:["breakEvenUnits","cac","contributionMargin","roas","roi","unitContribution","unitCost","unitRevenue"],candidateEconomics:included.map(c=>({candidateId:c.id,source:c.economicsSource,assessmentId:bound.get(c.id).selected.id,scenarioRef:c.scenarioRef,sensitivityRef:c.sensitivityRef,uncertaintyContext:bound.get(c.id).sensitivity?{targetMetric:bound.get(c.id).sensitivity.targetMetric,analysis:bound.get(c.id).sensitivity.analysis,uncertainty:bound.get(c.id).sensitivity.uncertainty.map(x=>({targetInputId:x.targetInputId,definition:x.definition?{kind:x.definition.kind,rationale:x.definition.rationale,evidenceRefs:x.definition.evidenceRefs}:null}))}:null}))};
}

function failuresFor(included,study){const ids=new Set(included.map(c=>c.id)),failures=[];const committed=safeSum(included.map(c=>c.requiredCapitalMinor));requireThat(committed!==null,"capital_overflow");if(committed>study.availableCapitalMinor)failures.push({constraintId:"AVAILABLE_CAPITAL",reason:"TOTAL_CAPITAL_EXCEEDED"});for(const c of study.constraints){if(c.type==="REQUIRED"&&!ids.has(c.candidateId))failures.push({constraintId:c.id,reason:"REQUIRED_CANDIDATE_MISSING"});if(c.type==="MUTUALLY_EXCLUSIVE"&&c.candidateIds.filter(id=>ids.has(id)).length>1)failures.push({constraintId:c.id,reason:"MUTUALLY_EXCLUSIVE_CANDIDATES_INCLUDED"});if(c.type==="DEPENDENCY"&&ids.has(c.candidateId)&&!ids.has(c.dependsOnCandidateId))failures.push({constraintId:c.id,reason:"DEPENDENCY_MISSING"});if(c.type==="MINIMUM_COMMITMENT"&&ids.has(c.candidateId)&&study.candidates.find(x=>x.id===c.candidateId).requiredCapitalMinor<c.amountMinor)failures.push({constraintId:c.id,reason:"MINIMUM_COMMITMENT_NOT_MET"});if(c.type==="MAXIMUM_COMMITMENT"&&ids.has(c.candidateId)&&study.candidates.find(x=>x.id===c.candidateId).requiredCapitalMinor>c.amountMinor)failures.push({constraintId:c.id,reason:"MAXIMUM_COMMITMENT_EXCEEDED"})}return {committed,failures}}

function runCapitalAllocationStudy({study:definition,economicAssessments=[],scenarioResults=[],sensitivityResults=[]}={}){
  const study=CapitalAllocationStudy(definition),snapshots=[economicAssessments,scenarioResults,sensitivityResults].map(x=>structuredClone(x)),count=2**study.candidates.length;requireThat(count<=MAX_CAPITAL_ALLOCATION_COMBINATIONS,"combination_limit");
  const bound=bindArtifacts(study,economicAssessments,scenarioResults,sensitivityResults),feasible=[],rejected=[];
  for(let mask=0;mask<count;mask++){const included=study.candidates.filter((_,i)=>mask&(2**i)),excluded=study.candidates.filter((_,i)=>!(mask&(2**i))),{committed,failures}=failuresFor(included,study);const identity={studyId:study.id,studyVersion:study.version,includedCandidateIds:included.map(x=>x.id)};if(failures.length)rejected.push({alternativeId:`allocation:${digest(identity).slice(0,24)}`,includedCandidateIds:identity.includedCandidateIds,failedConstraints:failures});else feasible.push({alternativeId:`allocation:${digest(identity).slice(0,24)}`,includedCandidateIds:identity.includedCandidateIds,excludedCandidateIds:excluded.map(x=>x.id),modeledCapitalCommittedMinor:committed,modeledCapitalRemainingMinor:study.availableCapitalMinor-committed,modeledUtilizationBasisPoints:study.availableCapitalMinor===0?null:Number((BigInt(committed)*10000n+BigInt(study.availableCapitalMinor)/2n)/BigInt(study.availableCapitalMinor)),constraintSatisfaction:"SATISFIED",economicProfile:profile(included,bound),limitations:["Modeled allocation is not authorization, reservation, spending, approval, prediction, or causal evidence."]})}
  requireThat(isDeepStrictEqual(snapshots[0],economicAssessments)&&isDeepStrictEqual(snapshots[1],scenarioResults)&&isDeepStrictEqual(snapshots[2],sensitivityResults),"artifact_mutated");
  const studyDigest=digest(study),empty=study.candidates.length===0;
  return freeze({kind:"CapitalAllocationResult",capitalAllocationModelVersion:CAPITAL_ALLOCATION_MODEL_VERSION,policyVersion:study.policyVersion,studyRef:{id:study.id,version:study.version},studyDigest,availableModeledCapitalMinor:study.availableCapitalMinor,currency:study.currency,status:feasible.length?"FEASIBLE":"INFEASIBLE",economicUsefulness:empty?"NO_CANDIDATES":"CANDIDATES_MODELED",candidateIds:study.candidates.map(x=>x.id),constraints:study.constraints,feasibleAlternatives:feasible,rejectedAlternatives:rejected,diagnostics:feasible.length?[]:[{code:"NO_FEASIBLE_ALTERNATIVES",message:"No candidate combination satisfies every declared constraint."}],authorization:null,reservation:null,spend:null,execution:null,limitations:[...study.limitations,"Available capital is a modeled constraint, not proof of cash, authorization, reservation, or spending.","Feasible does not mean approved; this result selects no winner and makes no recommendation.","Economic assessments and hypothetical scenarios are models, not predictions or causal effects.","Ratios and percentages are not aggregated; unknown is not zero and partial is not complete."]});
}

module.exports={CAPITAL_ALLOCATION_MODEL_VERSION,CAPITAL_ALLOCATION_POLICY_VERSION,MAX_CAPITAL_ALLOCATION_CANDIDATES,MAX_CAPITAL_ALLOCATION_COMBINATIONS,CAPITAL_ALLOCATION_CONSTRAINT_TYPES:CONSTRAINT_TYPES,CAPITAL_ALLOCATION_ADDITIVE_METRICS:ADDITIVE_METRICS,CapitalAllocationStudy,capitalAllocationAssessmentReference:assessmentReference,capitalAllocationScenarioReference:scenarioReference,capitalAllocationSensitivityReference:sensitivityReference,runCapitalAllocationStudy};
