"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const E=require("../src/business-os/economics");

const ORG="org:eco6d",WORK="work:eco6d",AT="2040-02-01T00:00:00.000Z";
const PERIOD={start:"2040-01-01T00:00:00.000Z",end:AT};
const CATEGORIES=["REVENUE","REFUND","DISCOUNT","ACQUISITION_COST","PAYMENT_FEE","FULFILLMENT_COST","FIXED_COST"];
const coverage={requiredCostCategories:["ACQUISITION_COST","PAYMENT_FEE","FULFILLMENT_COST","FIXED_COST"],units:100,newCustomers:20};

function assessment(id,product,amounts,{unknown=[],estimated=[]}={}){
 const financialInputs=CATEGORIES.map(category=>E.EconomicInput({
  id:`${id}:input:${category}`,organizationId:ORG,productRef:product,campaignRef:null,currency:"USD",reportingPeriod:PERIOD,version:1,category,
  classification:unknown.includes(category)?"UNKNOWN":estimated.includes(category)?"ESTIMATED":"ACTUAL",
  amountMinor:unknown.includes(category)?null:amounts[category],assumptions:estimated.includes(category)?["Explicit planning assumption."]:[],
  evidenceRefs:unknown.includes(category)?[]:[`${id}:evidence:${category}`],source:{system:"ECO6D_FIXTURE",recordRef:`${id}:record:${category}`,observedAt:AT}
 }));
 const value=E.calculateEconomicAssessment({id,version:1,workId:WORK,financialInputs,coverage},{clock:()=>AT});
 return Object.freeze({...value,provenance:{asOf:AT,inputs:value.financialInputs.map(x=>({inputId:x.id,accepted:true,trustState:"TRUSTED"}))}});
}
const A=assessment("assessment:a","product:a",{REVENUE:100000,REFUND:0,DISCOUNT:0,ACQUISITION_COST:20000,PAYMENT_FEE:5000,FULFILLMENT_COST:20000,FIXED_COST:10000});
const B=assessment("assessment:b","product:b",{REVENUE:900000,REFUND:0,DISCOUNT:0,ACQUISITION_COST:100000,PAYMENT_FEE:45000,FULFILLMENT_COST:0,FIXED_COST:50000},{unknown:["FULFILLMENT_COST"]});
const C=assessment("assessment:c","product:c",{REVENUE:200000,REFUND:10000,DISCOUNT:10000,ACQUISITION_COST:50000,PAYMENT_FEE:10000,FULFILLMENT_COST:20000,FIXED_COST:20000});

function member(id,a,patch={}){return{id,memberType:"PRODUCT",economicUnitId:`unit:${a.productRef}`,organizationId:ORG,workId:WORK,productRef:a.productRef,campaignRef:null,economicAssessmentRef:E.economicPortfolioAssessmentReference(a),engineVersion:E.ECONOMICS_ENGINE_VERSION,economicView:"ACTUAL",currency:"USD",reportingPeriod:PERIOD,scenarioRef:null,calibrationRef:null,...patch}}
function portfolio(members,patch={}){return{id:"portfolio:eco6d",version:1,organizationId:ORG,workId:WORK,name:"ECO-6D representative portfolio",economicView:"ACTUAL",currency:"USD",reportingPeriod:PERIOD,engineVersion:E.ECONOMICS_ENGINE_VERSION,policyVersion:E.PORTFOLIO_POLICY_VERSION,createdAt:AT,createdBy:"certifier:eco6d",members,limitations:["Fixture has no assertion that upstream shared costs are disjoint."],...patch}}
function run(members=[member("a",A),member("b",B),member("c",C)],assessments=[A,B,C],patch={}){return E.runEconomicPortfolioStudy({portfolio:portfolio(members,patch),economicAssessments:assessments})}

test("ECO-6D representative three-unit portfolio has exact lineage, additive subtotals, coverage, and immutable sources",()=>{
 const assessments=[A,B,C],before=structuredClone(assessments),result=run(undefined,assessments);
 assert.deepEqual(assessments,before);
 assert.deepEqual(result.memberReferences.map(x=>x.memberId),["a","b","c"]);
 assert.deepEqual(result.memberReferences.map(x=>x.economicAssessmentRef.digest),assessments.map(E.economicPortfolioAssessmentReference).map(x=>x.digest));
 assert.deepEqual([result.metrics.grossRevenue.status,result.metrics.grossRevenue.knownResolvedValue],["CALCULATED",1200000]);
 assert.deepEqual([result.metrics.netRevenue.status,result.metrics.netRevenue.knownResolvedValue],["CALCULATED",1180000]);
 assert.deepEqual([result.metrics.knownFixedCost.status,result.metrics.knownFixedCost.knownResolvedValue],["CALCULATED",80000]);
 assert.deepEqual([result.metrics.contribution.status,result.metrics.contribution.knownResolvedValue],["PARTIAL",125000]);
 assert.deepEqual(result.metrics.contribution.coverage,{declaredMemberCount:3,resolvedMemberCount:2,unresolvedMemberCount:1,invalidMemberCount:0,notApplicableMemberCount:0,unresolvedMemberIds:["b"]});
 assert.match(result.limitations.join(" "),/not necessarily complete portfolio totals/);
 assert.match(result.limitations.join(" "),/invents no allocation/);
});

test("known zero and UNKNOWN remain observably different and partial subtotal is never labeled complete",()=>{
 const zero=assessment("assessment:zero","product:zero",{REVENUE:900000,REFUND:0,DISCOUNT:0,ACQUISITION_COST:100000,PAYMENT_FEE:45000,FULFILLMENT_COST:0,FIXED_COST:50000});
 const complete=run([member("a",A),member("zero",zero)],[A,zero]);
 const incomplete=run([member("a",A),member("b",B)],[A,B]);
 assert.deepEqual([complete.metrics.contribution.status,complete.metrics.contribution.knownResolvedValue],["CALCULATED",750000]);
 assert.deepEqual([incomplete.metrics.contribution.status,incomplete.metrics.contribution.knownResolvedValue],["PARTIAL",45000]);
 assert.deepEqual(incomplete.metrics.contribution.coverage.unresolvedMemberIds,["b"]);
});

test("all metric statuses propagate without UNKNOWN, NOT_APPLICABLE, or PARTIAL becoming zero",()=>{
 const changed=(id,status,value,missingInputs=[])=>{const x=structuredClone(A);x.id=`assessment:${id}`;x.productRef=`product:${id}`;x.metrics.contribution={...x.metrics.contribution,status,value,missingInputs};return x};
 const cases=[
  ["calculated",changed("calculated","CALCULATED",45000),"CALCULATED",45000],
  ["partial",changed("partial","PARTIAL",45000,["FIXED_COST"]),"PARTIAL",null],
  ["unknown",changed("unknown","UNKNOWN",null,["FULFILLMENT_COST"]),"UNKNOWN",null],
  ["invalid",changed("invalid","INVALID",null),"INVALID",null],
  ["na",changed("na","NOT_APPLICABLE",null),"NOT_APPLICABLE",null]
 ];
 for(const [id,a,status,value] of cases){const result=run([member(id,a)],[a]);assert.equal(result.metrics.contribution.status,status);assert.equal(result.metrics.contribution.knownResolvedValue,value)}
 const invalid=cases[3][1],mixed=run([member("a",A),member("invalid",invalid)],[A,invalid]);
 assert.equal(mixed.metrics.contribution.status,"INVALID");
 assert.equal(mixed.metrics.contribution.knownResolvedValue,45000);
 assert.deepEqual(mixed.metrics.contribution.coverage.unresolvedMemberIds,["invalid"]);
});

test("integer aggregation supports losses and safe boundaries and rejects overflow",()=>{
 const loss=assessment("assessment:loss","product:loss",{REVENUE:10000,REFUND:0,DISCOUNT:0,ACQUISITION_COST:20000,PAYMENT_FEE:0,FULFILLMENT_COST:0,FIXED_COST:0});
 const result=run([member("a",A),member("loss",loss)],[A,loss]);
 assert.equal(loss.metrics.contribution.value,-10000);
 assert.equal(result.metrics.contribution.knownResolvedValue,35000);
 const max=structuredClone(A),one=structuredClone(C);max.id="assessment:max";max.productRef="product:max";max.metrics.grossRevenue={...max.metrics.grossRevenue,value:Number.MAX_SAFE_INTEGER};one.id="assessment:one";one.productRef="product:one";one.metrics.grossRevenue={...one.metrics.grossRevenue,value:1};
 assert.throws(()=>run([member("max",max),member("one",one)],[max,one]),/aggregate_overflow:grossRevenue/);
});

test("ratios are neither averaged nor exposed as portfolio certainty",()=>{
 const result=run([member("a",A),member("c",C)],[A,C]);
 assert.equal(A.metrics.contributionMargin.value,4500);
 assert.equal(C.metrics.contributionMargin.value,4444);
 assert.equal(result.metrics.contributionMargin,undefined);
 assert.ok(result.nonAggregatedMetrics.includes("contributionMargin"));
 // Independent weighted reference: 125000 / 280000 = 44.642857%; no unsupported 44.72% average is published.
 assert.equal(result.metrics.contribution.knownResolvedValue,125000);
 assert.equal(result.metrics.netRevenue.knownResolvedValue,280000);
});

test("resolved-revenue concentration is deterministic and explicitly qualified under incomplete coverage",()=>{
 const result=run(),reordered=run([member("c",C),member("b",B),member("a",A)]);
 assert.deepEqual(result,reordered);
 assert.equal(result.composition.status,"CALCULATED");
 assert.equal(result.composition.knownResolvedDenominator,1200000);
 assert.deepEqual(result.composition.memberShares.map(x=>[x.memberId,x.shareBasisPoints]),[["a",833],["b",7500],["c",1667]]);
 const unknownRevenue=assessment("assessment:unknown-revenue","product:unknown-revenue",{REVENUE:0,REFUND:0,DISCOUNT:0,ACQUISITION_COST:0,PAYMENT_FEE:0,FULFILLMENT_COST:0,FIXED_COST:0},{unknown:["REVENUE"]});
 const partial=run([member("a",A),member("u",unknownRevenue)],[A,unknownRevenue]);
 assert.equal(partial.composition.status,"PARTIAL");
 assert.equal(partial.composition.denominator,"KNOWN_RESOLVED_GROSS_REVENUE");
 assert.deepEqual(partial.composition.memberShares.map(x=>x.shareBasisPoints),[10000]);
 const zero=assessment("assessment:no-revenue","product:no-revenue",{REVENUE:0,REFUND:0,DISCOUNT:0,ACQUISITION_COST:0,PAYMENT_FEE:0,FULFILLMENT_COST:0,FIXED_COST:0});
 assert.equal(run([member("zero",zero)],[zero]).composition.status,"NOT_APPLICABLE");
});

test("organization, period, currency, duplicate lineage, and overlapping scope attacks fail closed",()=>{
 const base=member("a",A);
 assert.throws(()=>run([{...base,organizationId:"org:other"}]),/member_scope/);
 assert.throws(()=>run([{...base,currency:"EUR"}]),/member_compatibility/);
 assert.throws(()=>run([{...base,reportingPeriod:{start:PERIOD.start,end:"2040-03-01T00:00:00.000Z"}}]),/member_compatibility/);
 assert.throws(()=>run([base,{...base,id:"alias",economicUnitId:"unit:alias"}],[A]),/duplicate_assessment/);
 assert.throws(()=>run([base,{...member("c",C),id:"overlap",productRef:A.productRef}]),/overlapping_product_campaign_period/);
});

test("ACTUAL, EXPECTED_BASELINE, and SCENARIO remain separate and scenario lineage stays hypothetical",()=>{
 const expected=assessment("assessment:expected","product:expected",{REVENUE:100000,REFUND:0,DISCOUNT:0,ACQUISITION_COST:20000,PAYMENT_FEE:5000,FULFILLMENT_COST:20000,FIXED_COST:10000},{estimated:["REVENUE"]});
 const expectedMember=member("expected",expected,{economicView:"EXPECTED_BASELINE"});
 assert.equal(run([expectedMember],[expected],{economicView:"EXPECTED_BASELINE"}).economicView,"EXPECTED_BASELINE");
 assert.throws(()=>run([member("a",A),expectedMember],[A,expected]),/member_compatibility/);
 const override=E.deriveScenarioOverride(expected.financialInputs.find(x=>x.category==="REVENUE"),{transformationType:"ABSOLUTE_REPLACEMENT",transformationAmount:150000,reason:"Bounded hypothesis."});
 const scenario=E.createEconomicScenarioResult({scenario:{id:"scenario:eco6d",version:1,organizationId:ORG,workId:WORK,productRef:expected.productRef,campaignRef:null,name:"Hypothesis",description:"Not observed income",createdBy:"certifier",createdAt:AT,reportingPeriod:PERIOD,currency:"USD",engineVersion:E.ECONOMICS_ENGINE_VERSION,policyVersion:E.SCENARIO_POLICY_VERSION,baselineAssessmentRef:E.baselineReference(expected),type:"CUSTOM",status:"DEFINED",assumptions:["Hypothetical only."],overrides:[override]},baselineAssessment:expected,coverage});
 const scenarioMember=member("scenario",scenario.assessment,{economicView:"SCENARIO",scenarioRef:E.economicPortfolioScenarioReference(scenario)});
 const result=E.runEconomicPortfolioStudy({portfolio:portfolio([scenarioMember],{economicView:"SCENARIO"}),scenarioResults:[scenario]});
 assert.equal(result.scenarioContext[0].interpretation,"MEMBER_HYPOTHETICAL_ONLY");
 assert.equal(result.authorization,null);
 assert.throws(()=>E.runEconomicPortfolioStudy({portfolio:portfolio([{...scenarioMember,scenarioRef:{...scenarioMember.scenarioRef,digest:"forged"}}],{economicView:"SCENARIO"}),scenarioResults:[scenario]}),/scenario_binding/);
});

test("scenario and sensitivity replay preserve baselines, bounded uncertainty, and unresolved inputs",()=>{
 const baseline=assessment("assessment:sensitivity","product:sensitivity",{REVENUE:100000,REFUND:0,DISCOUNT:0,ACQUISITION_COST:20000,PAYMENT_FEE:5000,FULFILLMENT_COST:20000,FIXED_COST:10000},{estimated:["REVENUE"]}),before=structuredClone(baseline);
 const study={id:"sensitivity:eco6d",version:1,organizationId:ORG,workId:WORK,productRef:baseline.productRef,campaignRef:null,name:"Bounded cost range",createdBy:"certifier",createdAt:AT,reportingPeriod:PERIOD,currency:"USD",engineVersion:E.ECONOMICS_ENGINE_VERSION,scenarioModelVersion:E.SCENARIO_MODEL_VERSION,policyVersion:E.SENSITIVITY_POLICY_VERSION,baselineAssessmentRef:E.baselineReference(baseline),targetMetric:"contribution",type:"ONE_WAY",axes:[{targetInputId:`${baseline.id}:input:ACQUISITION_COST`,category:"ACQUISITION_COST",transformationType:"ABSOLUTE_REPLACEMENT",points:[10000,30000],uncertainty:{kind:"EXPLICIT_BOUNDED_RANGE",rationale:"Declared test range.",evidenceRefs:["evidence:range"]}}],thresholds:[],limitations:[]};
 const first=E.runSensitivityStudy({study,baselineAssessment:baseline,coverage}),second=E.runSensitivityStudy({study:structuredClone(study),baselineAssessment:baseline,coverage});
 assert.deepEqual(first,second);assert.deepEqual(baseline,before);assert.deepEqual(first.points.map(x=>x.value),[55000,35000]);
 assert.equal(first.uncertainty[0].definition.probabilityModel,null);assert.equal(first.authorization,null);
 const unknown=assessment("assessment:sensitivity-unknown","product:sensitivity-unknown",{REVENUE:100000,REFUND:0,DISCOUNT:0,ACQUISITION_COST:0,PAYMENT_FEE:5000,FULFILLMENT_COST:20000,FIXED_COST:10000},{unknown:["ACQUISITION_COST"]});
 const relative={...study,id:"sensitivity:unknown",productRef:unknown.productRef,baselineAssessmentRef:E.baselineReference(unknown),axes:[{...study.axes[0],targetInputId:`${unknown.id}:input:ACQUISITION_COST`,transformationType:"PERCENTAGE_DELTA",points:[1000]}]};
 assert.equal(E.runSensitivityStudy({study:relative,baselineAssessment:unknown,coverage}).points[0].status,"UNKNOWN");
});

test("capital feasibility remains descriptive, enumerates infeasibility, and grants no spending authority",()=>{
 const candidate=(id,a,capital)=>({id,organizationId:ORG,workId:WORK,productRef:a.productRef,campaignRef:null,economicAssessmentRef:E.capitalAllocationAssessmentReference(a),requiredCapitalMinor:capital,fundingSemantics:"ALL_OR_NOTHING",economicsSource:"BASELINE",scenarioRef:null,sensitivityRef:null});
 const study={id:"capital:eco6d",version:1,organizationId:ORG,workId:WORK,name:"Constraint study",allocationPeriod:PERIOD,currency:"USD",availableCapitalMinor:100000,candidates:[candidate("a",A,60000),candidate("c",C,60000)],constraints:[{id:"required-a",type:"REQUIRED",candidateId:"a"}],policyVersion:E.CAPITAL_ALLOCATION_POLICY_VERSION,engineVersion:E.ECONOMICS_ENGINE_VERSION,createdAt:AT,createdBy:"certifier",limitations:[]};
 const result=E.runCapitalAllocationStudy({study,economicAssessments:[A,C]});
 assert.equal(result.status,"FEASIBLE");assert.ok(result.rejectedAlternatives.some(x=>x.failedConstraints.some(y=>y.reason==="TOTAL_CAPITAL_EXCEEDED")));
 assert.deepEqual({authorization:result.authorization,reservation:result.reservation,spend:result.spend,execution:result.execution},{authorization:null,reservation:null,spend:null,execution:null});
 for(const forbidden of ["optimalPortfolio","recommendedAlternative","spendingInstruction"])assert.ok(!JSON.stringify(result).includes(forbidden));
});

test("canonical replay binds content digests and leaves calibration context descriptive",()=>{
 const profile={kind:"EconomicCalibrationProfile",id:"profile:eco6d",version:1,modelVersion:E.CALIBRATION_MODEL_VERSION,cohortDefinition:{organizationId:ORG,productRef:A.productRef,campaignRef:null,currency:"USD",engineVersion:E.ECONOMICS_ENGINE_VERSION},totalObservationCount:2,statistics:{meanSignedError:{status:"CALCULATED",value:-1000},meanAbsoluteError:{status:"CALCULATED",value:3000}}};profile.digest=E.economicCalibrationDigest(profile);
 const calibrated=member("a",A,{calibrationRef:E.economicPortfolioCalibrationReference(profile)}),uncalibrated=run([member("a",A)],[A]);
 const withProfile=E.runEconomicPortfolioStudy({portfolio:portfolio([calibrated]),economicAssessments:[A],calibrationProfiles:[profile]});
 assert.equal(withProfile.calibrationContext[0].modifiesEconomics,false);assert.equal(withProfile.metrics.contribution.knownResolvedValue,uncalibrated.metrics.contribution.knownResolvedValue);
 assert.deepEqual(withProfile,E.runEconomicPortfolioStudy({portfolio:structuredClone(portfolio([calibrated])),economicAssessments:[A],calibrationProfiles:[profile]}));
 const changed=structuredClone(A);changed.metrics.grossRevenue.value++;
 assert.throws(()=>E.runEconomicPortfolioStudy({portfolio:portfolio([member("a",A)]),economicAssessments:[changed]}),/assessment_binding/);
});
