"use strict";
const crypto=require("node:crypto");
const {isDeepStrictEqual}=require("node:util");
const {ECONOMICS_ENGINE_VERSION}=require("./engine");
const {economicArtifactDigest}=require("./reconciliation");
const {SCENARIO_MODEL_VERSION}=require("./scenario");
const {CALIBRATION_MODEL_VERSION}=require("./calibration");

const PORTFOLIO_MODEL_VERSION="economics-portfolio-v1.0.0";
const PORTFOLIO_POLICY_VERSION="economics-portfolio-policy-v1.0.0";
const ECONOMIC_VIEWS=Object.freeze(["ACTUAL","EXPECTED_BASELINE","SCENARIO"]);
const MEMBER_TYPES=Object.freeze(["PRODUCT","OFFER","SERVICE","CAMPAIGN","ECONOMIC_UNIT"]);
const ADDITIVE_METRICS=Object.freeze(["contribution","contributionBeforeUnknownCosts","discounts","grossRevenue","knownFixedCost","knownVariableCost","netRevenue","refunds","totalKnownCost"]);
const NON_AGGREGATED_METRICS=Object.freeze(["breakEvenUnits","cac","contributionMargin","roas","roi","unitContribution","unitCost","unitRevenue"]);
const text=x=>typeof x==="string"&&x.trim().length>0;
const object=x=>x&&typeof x==="object"&&!Array.isArray(x);
const freeze=x=>{if(x&&typeof x==="object"){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
const fail=code=>{throw new Error(`invalid_economic_portfolio:${code}`)};
const requireThat=(ok,code)=>{if(!ok)fail(code)};
const canonical=x=>Array.isArray(x)?x.map(canonical):object(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=x=>crypto.createHash("sha256").update(JSON.stringify(canonical(x))).digest("hex");
const samePeriod=(a,b)=>a?.start===b?.start&&a?.end===b?.end;
const safeSum=values=>{const n=values.reduce((a,x)=>a+BigInt(x),0n);return n>=BigInt(Number.MIN_SAFE_INTEGER)&&n<=BigInt(Number.MAX_SAFE_INTEGER)?Number(n):null};
const assessmentReference=a=>freeze({assessmentId:a.id,version:a.version,digest:economicArtifactDigest(a),engineVersion:a.engineVersion,organizationId:a.organizationId,workId:a.workId,productRef:a.productRef,campaignRef:a.campaignRef,currency:a.currency,reportingPeriod:a.reportingPeriod});
const scenarioReference=r=>freeze({scenarioId:r.scenario.id,version:r.scenario.version,digest:economicArtifactDigest(r),scenarioModelVersion:r.scenarioModelVersion,baselineAssessmentRef:r.baselineAssessmentRef});
const calibrationReference=p=>freeze({profileId:p.id,version:p.version,digest:p.digest,calibrationModelVersion:p.modelVersion,organizationId:p.cohortDefinition.organizationId,productRef:p.cohortDefinition.productRef,campaignRef:p.cohortDefinition.campaignRef,currency:p.cohortDefinition.currency,engineVersion:p.cohortDefinition.engineVersion});

function EconomicPortfolioDefinition(value={}){
 requireThat(object(value),"contract");
 for(const k of ["id","organizationId","name","createdBy"])requireThat(text(value[k]),k);
 requireThat(value.workId===null||text(value.workId),"workId");
 requireThat(Number.isSafeInteger(value.version)&&value.version>0,"version");
 requireThat(ECONOMIC_VIEWS.includes(value.economicView),"economic_view");
 requireThat(value.currency==="USD","currency");
 requireThat(value.engineVersion===ECONOMICS_ENGINE_VERSION,"engine_version");
 requireThat(value.policyVersion===PORTFOLIO_POLICY_VERSION,"policy_version");
 requireThat(text(value.createdAt)&&new Date(value.createdAt).toISOString()===value.createdAt,"created_at");
 requireThat(text(value.reportingPeriod?.start)&&text(value.reportingPeriod?.end)&&Date.parse(value.reportingPeriod.start)<Date.parse(value.reportingPeriod.end),"reporting_period");
 requireThat(Array.isArray(value.limitations)&&value.limitations.every(text),"limitations");
 requireThat(Array.isArray(value.members),"members");
 const ids=new Set(),units=new Set(),scopes=new Set(),assessments=new Set();
 const members=value.members.map(member=>{
  requireThat(object(member)&&text(member.id)&&!ids.has(member.id),"duplicate_or_invalid_member_id");ids.add(member.id);
  requireThat(MEMBER_TYPES.includes(member.memberType),`leaf_member_type:${member.id}`);
  requireThat(member.organizationId===value.organizationId&&(value.workId===null||member.workId===value.workId),`member_scope:${member.id}`);
  for(const k of ["workId","productRef","economicUnitId"])requireThat(text(member[k]),`member_${k}:${member.id}`);
  requireThat(member.campaignRef===null||text(member.campaignRef),`member_campaign:${member.id}`);
  requireThat(member.currency===value.currency&&samePeriod(member.reportingPeriod,value.reportingPeriod)&&member.engineVersion===value.engineVersion&&member.economicView===value.economicView,`member_compatibility:${member.id}`);
  requireThat(object(member.economicAssessmentRef),`assessment_ref:${member.id}`);
  const unitKey=JSON.stringify([member.organizationId,member.workId,member.productRef,member.campaignRef,member.economicUnitId,member.reportingPeriod]);
  const scopeKey=JSON.stringify([member.organizationId,member.workId,member.productRef,member.campaignRef,member.reportingPeriod]);
  const assessmentKey=JSON.stringify([member.economicAssessmentRef.assessmentId,member.economicAssessmentRef.version,member.economicAssessmentRef.digest]);
  requireThat(!assessments.has(assessmentKey),`duplicate_assessment:${member.id}`);assessments.add(assessmentKey);
  requireThat(!units.has(unitKey),`overlapping_economic_unit:${member.id}`);units.add(unitKey);
  requireThat(!scopes.has(scopeKey),`overlapping_product_campaign_period:${member.id}`);scopes.add(scopeKey);
  if(value.economicView==="SCENARIO")requireThat(object(member.scenarioRef),`scenario_ref:${member.id}`);else requireThat(member.scenarioRef===null,`non_scenario_lineage:${member.id}`);
  requireThat(member.calibrationRef===null||object(member.calibrationRef),`calibration_ref:${member.id}`);
  return structuredClone(member);
 });
 members.sort((a,b)=>a.id.localeCompare(b.id));
 return freeze({...structuredClone(value),kind:"EconomicPortfolioDefinition",portfolioModelVersion:PORTFOLIO_MODEL_VERSION,members});
}

function bind(definition,{economicAssessments=[],scenarioResults=[],calibrationProfiles=[]}){
 const assessmentIds=new Set(),scenarioIds=new Set(),profileIds=new Set();
 for(const a of economicAssessments){requireThat(a?.kind==="EconomicAssessment"&&!assessmentIds.has(a.id),"duplicate_supplied_assessment");assessmentIds.add(a.id)}
 for(const s of scenarioResults){requireThat(s?.kind==="EconomicScenarioResult"&&!scenarioIds.has(s.scenario?.id),"duplicate_supplied_scenario");scenarioIds.add(s.scenario.id)}
 for(const p of calibrationProfiles){const raw={...p};delete raw.digest;requireThat(p?.kind==="EconomicCalibrationProfile"&&p.digest===digest(raw)&&!profileIds.has(p.id),"duplicate_or_mutated_supplied_calibration");profileIds.add(p.id)}
 return new Map(definition.members.map(member=>{
  let assessment,scenario=null;
  if(definition.economicView==="SCENARIO"){
   scenario=scenarioResults.find(x=>x.scenario.id===member.scenarioRef.scenarioId);
   requireThat(scenario&&scenario.scenarioModelVersion===SCENARIO_MODEL_VERSION&&isDeepStrictEqual(member.scenarioRef,scenarioReference(scenario)),`scenario_binding:${member.id}`);
   assessment=scenario.assessment;
  }else assessment=economicAssessments.find(x=>x.id===member.economicAssessmentRef.assessmentId);
  requireThat(assessment&&isDeepStrictEqual(member.economicAssessmentRef,assessmentReference(assessment)),`assessment_binding:${member.id}`);
  requireThat(assessment.engineVersion===definition.engineVersion&&assessment.organizationId===member.organizationId&&assessment.workId===member.workId&&assessment.productRef===member.productRef&&assessment.campaignRef===member.campaignRef&&assessment.currency===member.currency&&samePeriod(assessment.reportingPeriod,member.reportingPeriod),`assessment_scope:${member.id}`);
  if(definition.economicView==="ACTUAL")requireThat(assessment.provenance?.inputs?.length===assessment.financialInputs.length&&assessment.provenance.inputs.every(x=>x.accepted&&!['CONFLICTED','STALE','INSUFFICIENT'].includes(x.trustState))&&assessment.financialInputs.every(x=>x.classification==="ACTUAL"||x.classification==="UNKNOWN"),`actual_provenance:${member.id}`);
  if(definition.economicView==="EXPECTED_BASELINE")requireThat(assessment.financialInputs.some(x=>x.classification==="ESTIMATED"),`expected_provenance:${member.id}`);
  if(scenario)requireThat(isDeepStrictEqual(member.economicAssessmentRef,assessmentReference(assessment)),`scenario_assessment_binding:${member.id}`);
  let calibration=null;
  if(member.calibrationRef){calibration=calibrationProfiles.find(x=>x.id===member.calibrationRef.profileId);requireThat(calibration&&calibration.modelVersion===CALIBRATION_MODEL_VERSION&&isDeepStrictEqual(member.calibrationRef,calibrationReference(calibration)),`calibration_binding:${member.id}`);requireThat(calibration.cohortDefinition.organizationId===member.organizationId&&calibration.cohortDefinition.productRef===member.productRef&&calibration.cohortDefinition.campaignRef===member.campaignRef&&calibration.cohortDefinition.currency===member.currency&&calibration.cohortDefinition.engineVersion===member.engineVersion,`calibration_scope:${member.id}`)}
  return [member.id,{assessment,scenario,calibration}];
 }));
}

function aggregateMetric(name,members,bound){
 const rows=members.map(m=>({memberId:m.id,metric:bound.get(m.id).assessment.metrics[name]}));
 requireThat(rows.every(x=>x.metric&&x.metric.unit==="MINOR_CURRENCY"&&["CALCULATED","PARTIAL","UNKNOWN","INVALID","NOT_APPLICABLE"].includes(x.metric.status)),`metric_semantics:${name}`);
 const resolved=rows.filter(x=>["CALCULATED","PARTIAL"].includes(x.metric.status)&&Number.isSafeInteger(x.metric.value)&&!(x.metric.status==="PARTIAL"&&x.metric.missingInputs?.length));
 const unresolvedPartial=rows.filter(x=>x.metric.status==="PARTIAL"&&!resolved.includes(x));
 requireThat(rows.every(x=>!["CALCULATED","PARTIAL"].includes(x.metric.status)||x.metric.value===null||Number.isSafeInteger(x.metric.value)),`metric_value:${name}`);
 const invalid=rows.filter(x=>x.metric.status==="INVALID"),unresolved=rows.filter(x=>x.metric.status==="UNKNOWN"),notApplicable=rows.filter(x=>x.metric.status==="NOT_APPLICABLE");
 const value=safeSum(resolved.map(x=>x.metric.value));requireThat(value!==null,`aggregate_overflow:${name}`);
 let status;if(!rows.length)status="NOT_APPLICABLE";else if(invalid.length)status="INVALID";else if(unresolvedPartial.length)status="PARTIAL";else if(unresolved.length)status=resolved.length?"PARTIAL":"UNKNOWN";else if(resolved.some(x=>x.metric.status==="PARTIAL"))status="PARTIAL";else if(!resolved.length)status="NOT_APPLICABLE";else if(notApplicable.length)status="PARTIAL";else status="CALCULATED";
 return {metric:name,status,knownResolvedValue:resolved.length?value:null,unit:"MINOR_CURRENCY",coverage:{declaredMemberCount:rows.length,resolvedMemberCount:resolved.length,unresolvedMemberCount:unresolved.length+unresolvedPartial.length,invalidMemberCount:invalid.length,notApplicableMemberCount:notApplicable.length,unresolvedMemberIds:[...unresolved,...unresolvedPartial,...invalid].map(x=>x.memberId).sort()},resolvedMembers:resolved.map(x=>({memberId:x.memberId,status:x.metric.status,value:x.metric.value}))};
}
const share=(value,total)=>{requireThat(Number.isSafeInteger(value)&&value>=0&&Number.isSafeInteger(total)&&total>0,"composition_nonnegative_denominator");const n=BigInt(value)*10000n,d=BigInt(total),v=(n+d/2n)/d;requireThat(v<=BigInt(Number.MAX_SAFE_INTEGER),"share_overflow");return Number(v)};
function runEconomicPortfolioStudy({portfolio:input,economicAssessments=[],scenarioResults=[],calibrationProfiles=[]}={}){
 const portfolio=EconomicPortfolioDefinition(input),snapshots=[input,economicAssessments,scenarioResults,calibrationProfiles].map(x=>structuredClone(x)),bound=bind(portfolio,{economicAssessments,scenarioResults,calibrationProfiles});
 const metrics=Object.fromEntries(ADDITIVE_METRICS.map(name=>[name,aggregateMetric(name,portfolio.members,bound)]));
 const revenue=metrics.grossRevenue;requireThat(revenue.knownResolvedValue===null||revenue.knownResolvedValue>=0,"composition_nonnegative_denominator");const composition=revenue.knownResolvedValue===null||revenue.knownResolvedValue===0?{metric:"grossRevenue",denominator:"KNOWN_RESOLVED_GROSS_REVENUE",status:"NOT_APPLICABLE",knownResolvedDenominator:revenue.knownResolvedValue,memberShares:[]}:{metric:"grossRevenue",denominator:"KNOWN_RESOLVED_GROSS_REVENUE",status:revenue.status,knownResolvedDenominator:revenue.knownResolvedValue,memberShares:revenue.resolvedMembers.map(x=>({memberId:x.memberId,status:x.status,shareBasisPoints:share(x.value,revenue.knownResolvedValue),numerator:x.value}))};
 const memberReferences=portfolio.members.map(m=>({memberId:m.id,memberType:m.memberType,economicUnitId:m.economicUnitId,economicAssessmentRef:m.economicAssessmentRef,scenarioRef:m.scenarioRef,calibrationRef:m.calibrationRef}));
 const portfolioIdentity={portfolioId:portfolio.id,portfolioVersion:portfolio.version,organizationId:portfolio.organizationId,workId:portfolio.workId,economicView:portfolio.economicView,currency:portfolio.currency,reportingPeriod:portfolio.reportingPeriod,engineVersion:portfolio.engineVersion,policyVersion:portfolio.policyVersion,members:memberReferences};
 const portfolioDigest=digest(portfolioIdentity),result={kind:"EconomicPortfolioResult",id:`economic-portfolio-result:${portfolioDigest.slice(0,24)}`,version:1,portfolioRef:{id:portfolio.id,version:portfolio.version},portfolioDigest,portfolioModelVersion:PORTFOLIO_MODEL_VERSION,policyVersion:portfolio.policyVersion,organizationId:portfolio.organizationId,workId:portfolio.workId,economicView:portfolio.economicView,currency:portfolio.currency,reportingPeriod:portfolio.reportingPeriod,engineVersion:portfolio.engineVersion,memberCount:portfolio.members.length,memberReferences,metrics,nonAggregatedMetrics:NON_AGGREGATED_METRICS,composition,scenarioContext:portfolio.economicView==="SCENARIO"?portfolio.members.map(m=>({memberId:m.id,scenarioRef:m.scenarioRef,interpretation:"MEMBER_HYPOTHETICAL_ONLY"})):[],calibrationContext:portfolio.members.filter(m=>m.calibrationRef).map(m=>({memberId:m.id,calibrationRef:m.calibrationRef,modifiesEconomics:false})),limitations:[...portfolio.limitations,"Known resolved aggregates are not necessarily complete portfolio totals.","Shared costs are included only where an upstream assessment already allocated them; this layer invents no allocation.","Member shares use known resolved gross revenue only and are descriptive, not rankings or recommendations.","Portfolio economics is not accounting consolidation, capital allocation, authorization, reservation, spending, or execution."],authorization:null,reservation:null,spend:null,execution:null,createdAt:portfolio.createdAt};
 result.digest=digest(result);requireThat(isDeepStrictEqual(snapshots[0],input)&&isDeepStrictEqual(snapshots[1],economicAssessments)&&isDeepStrictEqual(snapshots[2],scenarioResults)&&isDeepStrictEqual(snapshots[3],calibrationProfiles),"source_mutation");return freeze(result);
}
module.exports={PORTFOLIO_MODEL_VERSION,PORTFOLIO_POLICY_VERSION,PORTFOLIO_ECONOMIC_VIEWS:ECONOMIC_VIEWS,PORTFOLIO_MEMBER_TYPES:MEMBER_TYPES,PORTFOLIO_ADDITIVE_METRICS:ADDITIVE_METRICS,PORTFOLIO_NON_AGGREGATED_METRICS:NON_AGGREGATED_METRICS,EconomicPortfolioDefinition,economicPortfolioAssessmentReference:assessmentReference,economicPortfolioScenarioReference:scenarioReference,economicPortfolioCalibrationReference:calibrationReference,runEconomicPortfolioStudy};
