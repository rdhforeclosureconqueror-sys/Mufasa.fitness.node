"use strict";

// ECO-GOLD architecture certification fixture. All facts are deterministic and synthetic.
const test = require("node:test");
const assert = require("node:assert/strict");
const Scout = require("../src/business-os/scout/contracts");
const Analyst = require("../src/business-os/analyst/contracts");
const Economics = require("../src/business-os/economics");
const Experiment = require("../src/business-os/experiment-manager");
const Organization = require("../src/business-os/organization/contracts");
const Workflow = require("../src/business-os/organization/economic-workflow");
const {createExperimentFixture} = require("../src/business-os/experiment-manager/academy-fixtures");

const ORG = "academy-experiment", WORK = "work", PRODUCT = "synthetic-product", CAMPAIGN = "synthetic-campaign";
const PERIOD = Object.freeze({start:"2035-01-01T00:00:00.000Z",end:"2035-02-01T00:00:00.000Z"});
const AS_OF = "2035-02-03T00:00:00.000Z", CREATED = "2035-02-04T00:00:00.000Z";
const CATEGORIES = ["REVENUE","REFUND","DISCOUNT","ACQUISITION_COST","PAYMENT_FEE","FULFILLMENT_COST"];

function input(prefix, category, amountMinor, classification = "ACTUAL", patch = {}) {
  const unknown = classification === "UNKNOWN";
  return Economics.EconomicInput({id:`${prefix}:input:${category}`,organizationId:ORG,productRef:PRODUCT,campaignRef:CAMPAIGN,currency:"USD",reportingPeriod:PERIOD,version:1,category,classification,amountMinor:unknown?null:amountMinor,assumptions:classification==="ESTIMATED"?["Synthetic forecast assumption."]:[],evidenceRefs:unknown?[]:[`${prefix}:evidence:${category}`],source:{system:"GOLD_SYNTHETIC_FIXTURE",recordRef:`${prefix}:record:${category}`,recordVersion:1,payloadHash:`${prefix}:hash:${category}`,observedAt:"2035-01-31T00:00:00.000Z"},...patch});
}
function evidence(prefix, category, amountMinor, patch = {}) {
  return Economics.EconomicEvidenceRecord({id:`${prefix}:evidence:${category}`,evidenceType:"OBSERVED_FACT",source:{type:"ACCOUNTING_SYSTEM",system:"GOLD_SYNTHETIC_FIXTURE",recordRef:`${prefix}:record:${category}`,availability:"AVAILABLE"},actorId:"synthetic-books",recordedAt:"2035-02-02T00:00:00.000Z",observedAt:"2035-01-31T00:00:00.000Z",version:1,scope:{organizationId:ORG,productRef:PRODUCT,campaignRef:CAMPAIGN,currency:"USD",reportingPeriod:PERIOD},claim:{category,classification:"ACTUAL",amountMinor},payloadHash:`${prefix}:hash:${category}`,supersededBy:null,...patch});
}
function assessment(prefix, values, {unknown=[], reverse=false, newCustomers=10, estimated=false} = {}) {
  const inputs = CATEGORIES.map(category => input(prefix,category,values[category]||0,unknown.includes(category)?"UNKNOWN":estimated?"ESTIMATED":"ACTUAL"));
  const records = CATEGORIES.filter(category=>!unknown.includes(category)).map(category=>evidence(prefix,category,values[category]||0,{claim:{category,classification:estimated?"ESTIMATED":"ACTUAL",amountMinor:values[category]||0},evidenceType:estimated?"INFERENCE":"OBSERVED_FACT",...(estimated?{source:{type:"ANALYST_ESTIMATE",system:"GOLD_SYNTHETIC_FIXTURE",recordRef:`${prefix}:record:${category}`,availability:"AVAILABLE"}}:{})}));
  const request={id:`${prefix}:assessment`,workId:WORK,financialInputs:reverse?[...inputs].reverse():inputs,coverage:{requiredCostCategories:["ACQUISITION_COST","PAYMENT_FEE","FULFILLMENT_COST"],newCustomers}};
  return Economics.calculateEvidenceBackedAssessment(request,{clock:()=>AS_OF,asOf:AS_OF,evidenceRecords:reverse?[...records].reverse():records,freshnessPolicies:CATEGORIES.map(category=>({id:`historical:${category}`,category,sourceType:"ACCOUNTING_SYSTEM",mode:"HISTORICAL"}))});
}
const forecastValues={REVENUE:90000,REFUND:0,DISCOUNT:0,ACQUISITION_COST:20000,PAYMENT_FEE:3000,FULFILLMENT_COST:10000};
const actualValues={REVENUE:62000,REFUND:0,DISCOUNT:0,ACQUISITION_COST:15000,PAYMENT_FEE:2000,FULFILLMENT_COST:8000};

function organizationalChain(managerProposal, baseline) {
  const opportunityContract=Scout.OpportunityCandidate({id:"opportunity:gold",organizationId:ORG,audience:"synthetic owners",problem:"Unvalidated acquisition channel",motivation:"Lower acquisition cost",customerLanguage:["help me start"],productRefs:[PRODUCT],requiredCapabilityRefs:["internal-experiment"],productReadiness:"OPERATIONAL",evidenceRefs:["scout:evidence:gold"],contradictions:[],unknowns:["profitability"],sourceDiversity:1,intentClassification:"EXPLICIT_INTENT",geography:"SYNTHETIC",recency:"CURRENT",confidence:0.7,confidenceBasis:"Synthetic observed signal",historicalOutcomeSummaryRefs:[],recommendedAnalystQuestion:"Is evidence sufficient for a bounded test?",limitations:["Synthetic certification evidence."],status:"SEND_TO_ANALYST",version:1});
  const opportunity=Workflow.sealArtifact({...opportunityContract,artifactType:"OpportunityCandidate",workId:WORK,producingRoleId:"SMART_SCOUT"});
  const analystContract=Analyst.AnalystAssessment({id:"analyst:gold",organizationId:ORG,candidateRef:opportunity.id,evidenceRefs:["scout:evidence:gold"],analysis:{judgment:"SUFFICIENT_TO_TEST_NOT_PROFITABILITY"},disposition:"ADVANCE_TO_EXPERIMENT",confidence:0.72,limitations:["Profitability is not proven."],provenance:{synthetic:true},version:1});
  const analyst=Workflow.sealArtifact({...analystContract,artifactType:"AnalystAssessment",workId:WORK,producingRoleId:"SMART_ANALYST",status:"ACCEPTED",upstreamRefs:[Workflow.reference(opportunity)]});
  const proposal=Workflow.sealArtifact({...managerProposal,artifactType:"ExperimentProposal",producingRoleId:"EXPERIMENT_MANAGER",managerProposalDigest:Experiment.proposalDigest(managerProposal),upstreamRefs:[Workflow.reference(analyst)]});
  const economic=Workflow.sealArtifact({id:"economic-artifact:forecast",artifactType:"EconomicAssessment",organizationId:ORG,workId:WORK,version:1,assessmentId:baseline.id,assessmentDigest:Economics.economicArtifactDigest(baseline),producingRoleId:"ECONOMICS",status:"ACCEPTED",createdAt:AS_OF,disposition:baseline.disposition,provenanceStatus:"TRUSTED",upstreamRefs:[Workflow.reference(proposal)]});
  return {opportunityContract,analystContract,opportunity,analyst,proposal,economic,artifacts:[opportunity,analyst,proposal,economic]};
}
function governed(chain, id="governed:gold") {
  const refs=chain.artifacts.map(Workflow.reference);
  return Workflow.createGovernedDecision({id,organizationId:ORG,workId:WORK,decisionType:"AUTHORIZE_EXPERIMENT",result:"APPROVE",economicAssessmentRef:refs[3],experimentProposalRef:refs[2],chainRefs:refs,decidedAt:AS_OF,decisionMakerRef:"human:owner",authorityRef:"approval-grant",authorityType:"HUMAN",authorizationScope:"EXPERIMENT_EXECUTION",conditions:["USD 500 ceiling"],reason:"Human review of exact synthetic chain",version:1});
}
function terminalExperiment(resultClass="SUPPORTED") {
  const f=createExperimentFixture({proposal:{costCeiling:500},grant:{constraints:{budgetCeiling:500}}});
  const approval=f.manager.approve({...f.approvalInput,budgetCeiling:500},f.session);
  const run=f.manager.start({proposalId:f.p.id,proposalVersion:1,approvalRef:approval.id,budget:500,boundary:"INTERNAL",idempotencyKey:"gold-run"});
  if(resultClass==="SUPPORTED") f.manager.measure({runRef:run.id,metric:"conversion",value:1,sampleRef:"gold:sample",evidenceRefs:["gold:experiment-evidence"]});
  else if(resultClass==="NOT_SUPPORTED") f.manager.measure({runRef:run.id,metric:"rejection",value:1,sampleRef:"gold:sample",evidenceRefs:["gold:experiment-evidence"]});
  const result=f.manager.complete({runRef:run.id,evidenceRefs:["gold:experiment-evidence"]});
  return {...f,approval,run:f.manager.getRun(run.id),result};
}
function reconciliationFixture({resultClass="SUPPORTED",baseline=assessment("forecast",forecastValues),actual=assessment("actual",actualValues)}={}) {
  const x=terminalExperiment(resultClass), chain=organizationalChain(x.p,baseline), decision=governed(chain,x.approval.decisionRef);
  const actualArtifact=Workflow.sealArtifact({id:"economic-artifact:actual",artifactType:"EconomicAssessment",organizationId:ORG,workId:WORK,version:1,assessmentId:actual.id,assessmentDigest:Economics.economicArtifactDigest(actual),producingRoleId:"ECONOMICS",status:"ACCEPTED",createdAt:AS_OF});
  const result=x.result;
  return {organizationId:ORG,workId:WORK,proposalArtifact:chain.proposal,baselineArtifact:chain.economic,baselineAssessment:baseline,decision,approval:x.approval,run:x.run,experimentResult:result,actualArtifact,actualAssessment:actual,authorizedAmountMinor:50000,reservedAmountMinor:50000,asOf:AS_OF,chain,x};
}
const reconcile=f=>Economics.createEconomicReconciliation(f,{clock:()=>CREATED,validateExperimentResult:result=>f.x.manager.validateResult(result)});
const reconciliationInput=f=>Object.fromEntries(["organizationId","workId","proposalArtifact","baselineArtifact","baselineAssessment","decision","approval","run","experimentResult","actualArtifact","actualAssessment","authorizedAmountMinor","reservedAmountMinor","asOf"].map(key=>[key,structuredClone(f[key])]));
const metric=(r,name)=>r.metricComparisons.find(item=>item.metric===name);

test("synthetic production contracts preserve departmental ownership through governed execution readiness",()=>{
  const x=terminalExperiment(), baseline=assessment("forecast",forecastValues), chain=organizationalChain(x.p,baseline), decision=governed(chain);
  const authorization=Workflow.authorizeExecution({organizationId:ORG,workId:WORK,workflowState:"APPROVED",artifacts:chain.artifacts,decisions:[decision],now:AS_OF});
  assert.equal(chain.opportunityContract.kind,"OpportunityCandidate");
  assert.equal(chain.analystContract.analysis.judgment,"SUFFICIENT_TO_TEST_NOT_PROFITABILITY");
  assert.deepEqual(chain.artifacts.map(a=>a.producingRoleId),["SMART_SCOUT","SMART_ANALYST","EXPERIMENT_MANAGER","ECONOMICS"]);
  assert.deepEqual(authorization,{authorized:true,code:"AUTHORIZED",workflowState:"READY_FOR_EXECUTION",decisionRef:decision.id,chainRefs:chain.artifacts.map(Workflow.reference)});
  assert.equal(decision.authorityType,"HUMAN");
});

test("production ExperimentApproval binds to the exact manager proposal represented by the sealed workflow artifact",()=>{const f=reconciliationFixture();assert.equal(f.approval.proposalDigest,f.proposalArtifact.managerProposalDigest);assert.doesNotThrow(()=>reconcile(f));});

test("forecast, evidence-backed actual, and deterministic variance work when supplied an exact canonical approval",()=>{
  const f=reconciliationFixture();
  // Isolate ECO-4B arithmetic from the independently asserted production-chain blocker above.
  
  const r=reconcile(f), revenue=metric(r,"grossRevenue");
  assert.deepEqual([revenue.expected.value,revenue.actual.value,revenue.absoluteVariance.value,revenue.relativeVariance.value],[90000,62000,-28000,-3111]);
  assert.deepEqual(revenue.actual,["CALCULATED",62000,"MINOR_CURRENCY",[]].reduce((o,v,i)=>(o[["status","value","unit","missingInputs"][i]]=v,o),{}));
  assert.equal(f.actualAssessment.calculationLineage.find(x=>x.metric==="grossRevenue").sourceTrace[0].evidenceRefs[0],"actual:evidence:REVENUE");
  assert.equal(r.experimentResultClass,"SUPPORTED");
  assert.equal(revenue.comparisonStatus,"UNFAVORABLE");
});

test("UNKNOWN is never zero, unlike partial dependencies do not fabricate variance, and zero denominators are not applicable",()=>{
  const unknownForecast=assessment("forecast-unknown-cac",forecastValues,{unknown:["ACQUISITION_COST"]}), actual=assessment("actual-known-cac",actualValues);
  assert.equal(Economics.compareEconomicMetric("cac",unknownForecast.metrics.cac,actual.metrics.cac).absoluteVariance.value,null);
  const missingActual=assessment("actual-unknown-fulfillment",actualValues,{unknown:["FULFILLMENT_COST"]});
  assert.deepEqual([missingActual.metrics.contribution.status,Economics.compareEconomicMetric("contribution",assessment("forecast-complete",forecastValues).metrics.contribution,missingActual.metrics.contribution).absoluteVariance.value],["UNKNOWN",null]);
  const missingBoth=Economics.compareEconomicMetric("contribution",assessment("forecast-missing",forecastValues,{unknown:["FULFILLMENT_COST"]}).metrics.contribution,missingActual.metrics.contribution);
  assert.deepEqual([missingBoth.absoluteVariance.status,missingBoth.absoluteVariance.value],["UNKNOWN",null]);
  const zero=Economics.compareEconomicMetric("grossRevenue",assessment("forecast-zero",{...forecastValues,REVENUE:0}).metrics.grossRevenue,actual.metrics.grossRevenue);
  assert.deepEqual([zero.absoluteVariance.value,zero.relativeVariance.status,zero.relativeVariance.value],[62000,"NOT_APPLICABLE",null]);
  const partial=(value,missingInputs)=>({status:"PARTIAL",value,unit:"MINOR_CURRENCY",missingInputs});
  assert.equal(Economics.compareEconomicMetric("totalKnownCost",partial(10,["a"]),partial(8,["b"])).absoluteVariance.value,null);
  assert.equal(Economics.compareEconomicMetric("totalKnownCost",partial(10,["a"]),partial(8,["a"])).absoluteVariance.value,-2);
});

test("budget, reservation, economic spend, settlement, experiment outcome, and economic outcome remain independent",()=>{
  const f=reconciliationFixture();
  const supported=reconcile(f);
  assert.deepEqual(supported.budget,{authorizedAmountMinor:50000,reservedAmountMinor:50000,actualSpendMinor:null,unusedAuthorizationMinor:null});
  assert.equal(metric(supported,"grossRevenue").comparisonStatus,"UNFAVORABLE");
  const unsupported=reconciliationFixture({resultClass:"NOT_SUPPORTED"});
  const positiveActual=assessment("actual-positive",{...actualValues,REVENUE:100000});unsupported.actualAssessment=positiveActual;unsupported.actualArtifact=Workflow.sealArtifact({...f.actualArtifact,assessmentId:positiveActual.id,assessmentDigest:Economics.economicArtifactDigest(positiveActual),digest:undefined});
  const r=reconcile(unsupported);
  assert.deepEqual([r.experimentResultClass,metric(r,"contribution").comparisonStatus],["NOT_SUPPORTED","FAVORABLE"]);
  assert.equal(r.economicSuccess,undefined);
});

test("replay, input ordering, immutable records, and timestamp metadata are deterministic",()=>{
  const a=assessment("ordered",actualValues), b=assessment("ordered",actualValues,{reverse:true});
  assert.deepEqual(a,b);
  const f=reconciliationFixture({baseline:a,actual:b});
  const first=reconcile(f), replay=reconcile(reconciliationInput(f));assert.deepEqual(first,replay);
  const repo=new Economics.EconomicReconciliationRepository();repo.save(first);const copy=repo.get(first.id);copy.status="INVALID";assert.deepEqual(repo.get(first.id),first);assert.throws(()=>repo.save(first),/duplicate_reconciliation_identity/);
  assert.notEqual(Economics.calculateEconomicAssessment({id:"timestamp-a",workId:WORK,financialInputs:a.financialInputs,coverage:{requiredCostCategories:["ACQUISITION_COST","PAYMENT_FEE","FULFILLMENT_COST"],newCustomers:10}},{clock:()=>AS_OF}).createdAt,CREATED);
});

test("adversarial ECO-GOLD matrix fails closed at production boundaries",async t=>{
  const cases=[];
  const workflowCase=(name,mutate,code)=>cases.push([name,()=>{const x=terminalExperiment(),c=organizationalChain(x.p,assessment(`forecast-${name}`,forecastValues,{estimated:true})),d=structuredClone(governed(c));mutate(c,d);const r=Workflow.authorizeExecution({organizationId:ORG,workId:WORK,workflowState:"APPROVED",artifacts:c.artifacts,decisions:[d],now:AS_OF});assert.equal(r.code,code);}]);
  workflowCase("wrong organization",c=>{c.artifacts[0]=Workflow.sealArtifact({...c.artifacts[0],organizationId:"other",digest:undefined});},"ORGANIZATION_MISMATCH");
  workflowCase("wrong work",c=>{c.artifacts[1]=Workflow.sealArtifact({...c.artifacts[1],workId:"other",digest:undefined});},"WORK_MISMATCH");
  workflowCase("wrong Scout opportunity ancestry",c=>{c.artifacts[1]=Workflow.sealArtifact({...c.artifacts[1],upstreamRefs:[],digest:undefined});},"UPSTREAM_REFERENCE_MISMATCH");
  workflowCase("wrong Analyst artifact ancestry",c=>{c.artifacts[2]=Workflow.sealArtifact({...c.artifacts[2],upstreamRefs:[],digest:undefined});},"UPSTREAM_REFERENCE_MISMATCH");
  workflowCase("mutated proposal",c=>{c.artifacts[2]={...c.artifacts[2],hypothesis:"mutated"};},"ARTIFACT_DIGEST_MISMATCH");
  workflowCase("superseded baseline",c=>{c.artifacts[3]=Workflow.sealArtifact({...c.artifacts[3],status:"SUPERSEDED",digest:undefined});},"ARTIFACT_BLOCKED");
  workflowCase("Scout cannot substitute for Analyst",c=>{c.artifacts[1]=Workflow.sealArtifact({...c.artifacts[1],producingRoleId:"SMART_SCOUT",digest:undefined});},"ROLE_SEPARATION_VIOLATION");
  workflowCase("Economics cannot authorize",(c,d)=>{d.authorityType="AI_AGENT";},"DECISION_DOES_NOT_AUTHORIZE");
  workflowCase("stale approval",(c,d)=>{d.expiresAt="2035-01-01T00:00:00.000Z";},"DECISION_EXPIRED");
  workflowCase("wrong governance decision",(c,d)=>{d.result="REJECT";},"DECISION_DOES_NOT_AUTHORIZE");
  workflowCase("approval for another proposal",(c,d)=>{d.experimentProposalRef=d.economicAssessmentRef;},"DECISION_CHAIN_MISMATCH");
  for(const [name,run] of cases)await t.test(name,run);

  const reconciliationMutations=[
    ["wrong ExperimentProposal",f=>f.proposalArtifact={...f.proposalArtifact,id:"other"}], ["wrong proposal version",f=>f.run={...f.run,proposalVersion:2}],
    ["wrong EconomicAssessment baseline",f=>f.baselineArtifact={...f.baselineArtifact,assessmentId:"other"}], ["mutated baseline",f=>f.baselineAssessment={...f.baselineAssessment,id:"mutated"}],
    ["budget above authorization",f=>f.reservedAmountMinor=50001], ["wrong ExperimentRun",f=>f.run={...f.run,proposalRef:"other"}], ["non-terminal run",f=>f.run={...f.run,status:"RUNNING"}], ["canceled run",f=>f.run={...f.run,status:"CANCELLED"}],
    ["wrong ExperimentResult",f=>f.experimentResult={...f.experimentResult,proposalRef:"other"}], ["result for another run",f=>f.experimentResult={...f.experimentResult,runRef:"other"}],
    ["wrong actual EconomicAssessment",f=>f.actualArtifact={...f.actualArtifact,assessmentId:"other"}], ["mutated actual assessment",f=>f.actualAssessment={...f.actualAssessment,id:"other"}], ["cross-org evidence injection",f=>f.actualAssessment={...f.actualAssessment,organizationId:"other"}], ["cross-work injection",f=>f.actualAssessment={...f.actualAssessment,workId:"other"}],
    ["wrong reporting period",f=>f.actualAssessment={...f.actualAssessment,reportingPeriod:{...PERIOD,end:"2035-03-01T00:00:00.000Z"}}], ["future evidence contamination",f=>f.asOf="2035-02-01T00:00:00.000Z"], ["reconciliation mutation",f=>f.actualArtifact={...f.actualArtifact,digest:"tampered"}]
  ];
  for(const [name,mutate] of reconciliationMutations)await t.test(name,()=>{const f=reconciliationFixture();mutate(f);assert.throws(()=>reconcile(f),/invalid_economic_reconciliation/);});
  await t.test("mutated ExperimentResult is rejected by authoritative Experiment Manager validation",()=>{const f=reconciliationFixture();const original=reconcile(f);f.experimentResult={...f.experimentResult,resultClass:"INCONCLUSIVE"};assert.throws(()=>reconcile(f),/experiment_result_not_authoritative/);assert.equal(original.experimentResultClass,"SUPPORTED");});
  await t.test("proposal mutation and proposal version are immutable in Experiment Manager",()=>{const x=createExperimentFixture();assert.throws(()=>x.manager.propose({...x.input,id:x.p.id}),/immutable/);assert.throws(()=>x.manager.start({proposalId:x.p.id,proposalVersion:2,approvalRef:"none",budget:1,boundary:"INTERNAL",idempotencyKey:"x"}),/proposal_not_found/);});
  await t.test("Experiment Manager cannot declare profitability",()=>{const x=terminalExperiment();assert.equal(x.result.profit,undefined);assert.equal(x.result.economicSuccess,undefined);});
  for(const [name,flag,expected] of [["technical experiment failure","technicalFailure","TECHNICAL_FAILURE"],["policy-blocked experiment result","policyBlocked","POLICY_BLOCKED"]])await t.test(name,()=>{const x=createExperimentFixture({proposal:{costCeiling:500},grant:{constraints:{budgetCeiling:500}}});const {run}=x.start();const result=x.manager.complete({runRef:run.id,[flag]:true,evidenceRefs:["failure:evidence"]});assert.equal(result.resultClass,expected);});
  await t.test("inconclusive experiment result",()=>{const x=createExperimentFixture({proposal:{costCeiling:500},grant:{constraints:{budgetCeiling:500}}});const {run}=x.start();assert.equal(x.manager.complete({runRef:run.id}).resultClass,"INCONCLUSIVE");});
  await t.test("stale actual evidence",()=>{const i=input("stale","REVENUE",1),e=evidence("stale","REVENUE",1);assert.throws(()=>Economics.validateEconomicProvenance({financialInputs:[i],evidenceRecords:[e],asOf:AS_OF,freshnessPolicies:[{id:"fresh",category:"REVENUE",sourceType:"ACCOUNTING_SYSTEM",mode:"EXPIRING",maxAgeMs:1}]}),/input_not_accepted/);});
  await t.test("conflicting and duplicate actual revenue evidence",()=>{const i=input("conflict","REVENUE",1),e=evidence("conflict","REVENUE",1),other=evidence("other","REVENUE",2,{source:{...e.source,recordRef:"other"},scope:e.scope});assert.throws(()=>Economics.validateEconomicProvenance({financialInputs:[i],evidenceRecords:[e,other],asOf:AS_OF}),/conflicted/);assert.throws(()=>Economics.validateEconomicProvenance({financialInputs:[i],evidenceRecords:[e,e],asOf:AS_OF}),/duplicate_evidence/);});
});
