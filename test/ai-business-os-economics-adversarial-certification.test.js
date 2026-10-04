"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Scout=require("../src/business-os/scout/contracts");
const Analyst=require("../src/business-os/analyst/assessment");
const EM=require("../src/business-os/experiment-manager");
const O=require("../src/business-os/organization/contracts");
const W=require("../src/business-os/organization/economic-workflow");
const E=require("../src/business-os/economics");

const ORG="org:eco6b",WORK="work:eco6b",PRODUCT="product:alpha",CAMPAIGN="campaign:alpha";
const EXPECTED_AT="2038-02-01T00:00:00.000Z",ACTUAL_AT="2038-03-02T00:00:00.000Z",RECONCILED_AT="2038-03-03T00:00:00.000Z";
const PERIOD={start:"2038-02-01T00:00:00.000Z",end:"2038-03-01T00:00:00.000Z"};
const categories=["REVENUE","REFUND","DISCOUNT","ACQUISITION_COST","FULFILLMENT_COST"];
const amounts={REVENUE:120000,REFUND:5000,DISCOUNT:0,ACQUISITION_COST:25000,FULFILLMENT_COST:30000};
function inputs(prefix,classification="ACTUAL",product=PRODUCT,values=amounts){return categories.map(category=>E.EconomicInput({id:`${prefix}:input:${category}`,organizationId:ORG,productRef:product,campaignRef:CAMPAIGN,currency:"USD",reportingPeriod:PERIOD,version:1,category,classification,amountMinor:values[category],assumptions:classification==="ESTIMATED"?["Pre-experiment estimate."]:[],evidenceRefs:[`${prefix}:evidence:${category}`],source:{system:"ECO6B_FIXTURE",recordRef:`${prefix}:record:${category}`,recordVersion:1,payloadHash:`${prefix}:hash:${category}`,observedAt:classification==="ACTUAL"?"2038-02-28T00:00:00.000Z":EXPECTED_AT}}))}
function evidence(prefix,product=PRODUCT,values=amounts){return categories.map(category=>E.EconomicEvidenceRecord({id:`${prefix}:evidence:${category}`,evidenceType:"OBSERVED_FACT",source:{type:"ACCOUNTING_SYSTEM",system:"ECO6B_FIXTURE",recordRef:`${prefix}:record:${category}`,availability:"AVAILABLE"},actorId:"books:controller",recordedAt:ACTUAL_AT,observedAt:"2038-02-28T00:00:00.000Z",version:1,scope:{organizationId:ORG,productRef:product,campaignRef:CAMPAIGN,currency:"USD",reportingPeriod:PERIOD},claim:{category,classification:"ACTUAL",amountMinor:values[category]},payloadHash:`${prefix}:hash:${category}`,supersededBy:null}))}
const coverage={requiredCostCategories:["ACQUISITION_COST","FULFILLMENT_COST"],units:100,newCustomers:20};
function actualAssessment(prefix="actual",product=PRODUCT,values=amounts){return E.calculateEvidenceBackedAssessment({id:`assessment:${prefix}`,workId:WORK,financialInputs:inputs(prefix,"ACTUAL",product,values),coverage},{clock:()=>ACTUAL_AT,asOf:ACTUAL_AT,evidenceRecords:evidence(prefix,product,values),freshnessPolicies:categories.map(category=>({id:`fresh:${category}`,category,sourceType:"ACCOUNTING_SYSTEM",mode:"HISTORICAL"}))})}
function expectedAssessment(){const a=E.calculateEconomicAssessment({id:"assessment:expected",workId:WORK,financialInputs:inputs("expected","ESTIMATED"),coverage},{clock:()=>EXPECTED_AT});return Object.freeze({...a,provenance:{asOf:EXPECTED_AT,inputs:a.financialInputs.map(x=>({inputId:x.id,accepted:true,trustState:"TRUSTED"}))}})}
function build(){
 const candidate=Scout.OpportunityCandidate({id:"candidate:eco6b",organizationId:ORG,audience:"fitness buyers",problem:"Need attributable acquisition economics",motivation:"Bound a test",customerLanguage:["show value"],productRefs:[PRODUCT],requiredCapabilityRefs:["capability:experiment"],productReadiness:"OPERATIONAL",evidenceRefs:["evidence:opportunity"],contradictions:[],unknowns:[],sourceDiversity:2,intentClassification:"EXPLICIT",geography:"US",recency:"CURRENT",confidence:.9,confidenceBasis:["evidence:opportunity"],historicalOutcomeSummaryRefs:[],recommendedAnalystQuestion:"Can a bounded experiment resolve value?",limitations:["Fixture evidence only."],status:"CANDIDATE",version:1});
 const analyst=Analyst.createAnalystAssessment({id:"analyst:eco6b",organizationId:ORG,candidateRef:candidate.id,inputArtifactRefs:[candidate.id],evidence:[{classification:"VERIFIED_OUTCOME",evidenceRefs:["evidence:opportunity"]}],problemEvidence:.9,productFit:.9,readiness:.9,outcomeStrength:.8,confidence:.8,productReadiness:"OPERATIONAL"});
 const opportunityArtifact=W.sealArtifact({id:candidate.id,artifactType:"OpportunityCandidate",organizationId:ORG,workId:WORK,version:1,producingRoleId:"SMART_SCOUT",status:"ACCEPTED",createdAt:EXPECTED_AT,candidate});
 const analystArtifact=W.sealArtifact({id:analyst.id,artifactType:"AnalystAssessment",organizationId:ORG,workId:WORK,version:1,producingRoleId:"SMART_ANALYST",status:"ACCEPTED",createdAt:EXPECTED_AT,assessment:analyst,upstreamRefs:[W.reference(opportunityArtifact)]});
 let current=EXPECTED_AT,decision;
 const authority={verify({proposal,budgetCeiling}){assert.equal(proposal.id,"proposal:eco6b");assert.equal(budgetCeiling,500);assert.ok(decision);return{actorType:"HUMAN",actorId:"human:owner",authorityRef:"grant:owner",scope:EM.APPROVAL_SCOPE,decisionRef:decision.id,evidenceRefs:["evidence:authenticated-human"]}},check(approval,proposal){return approval.actorType==="HUMAN"&&approval.decisionRef===decision.id&&approval.proposalDigest===EM.proposalDigest(proposal)&&decision.result==="APPROVE"}};
 const manager=EM.createExperimentManager({organizationId:ORG,clock:()=>new Date(current),approvalAuthority:authority});
 const proposal=manager.propose({id:"proposal:eco6b",workId:WORK,question:"Does the bounded offer generate qualified demand?",hypothesis:"The offer generates demand.",variable:"offer",successMetric:"qualified_interest",failureMetric:"rejection",costCeiling:500,minimumUsefulEvidence:1,riskCeiling:"LOW",boundary:"INTERNAL",motivatingEvidenceRefs:[analyst.id],requiredAuthorityRefs:["grant:owner"],stopConditions:["technical_failure"]});
 const proposalArtifact=W.sealArtifact({id:proposal.id,artifactType:"ExperimentProposal",organizationId:ORG,workId:WORK,version:proposal.version,producingRoleId:"EXPERIMENT_MANAGER",status:"PROPOSED",createdAt:proposal.createdAt,managerProposalDigest:EM.proposalDigest(proposal),upstreamRefs:[W.reference(analystArtifact)]});
 const expected=expectedAssessment();
 const expectedArtifact=W.sealArtifact({id:"economic:expected",artifactType:"EconomicAssessment",organizationId:ORG,workId:WORK,version:1,producingRoleId:"ECONOMICS",status:"ACCEPTED",createdAt:EXPECTED_AT,assessmentId:expected.id,assessmentDigest:E.economicArtifactDigest(expected),disposition:"CONTINUE",provenanceStatus:"TRUSTED",upstreamRefs:[W.reference(proposalArtifact)]});
 const artifacts=[opportunityArtifact,analystArtifact,proposalArtifact,expectedArtifact];
 decision=W.createGovernedDecision({id:"decision:eco6b",organizationId:ORG,workId:WORK,decisionType:"AUTHORIZE_EXPERIMENT",result:"APPROVE",economicAssessmentRef:W.reference(expectedArtifact),experimentProposalRef:W.reference(proposalArtifact),chainRefs:artifacts.map(W.reference),decidedAt:EXPECTED_AT,decisionMakerRef:"human:owner",authorityRef:"grant:owner",authorityType:"HUMAN",authorizationScope:"EXPERIMENT_EXECUTION",conditions:[],reason:"Human reviewed the exact chain.",version:1});
 const authorization=W.authorizeExecution({organizationId:ORG,workId:WORK,workflowState:"APPROVED",artifacts,decisions:[decision],now:EXPECTED_AT});
 const approval=manager.approve({proposalId:proposal.id,proposalVersion:proposal.version,budgetCeiling:500},Object.freeze({authenticated:true}));
 const started=manager.start({proposalId:proposal.id,proposalVersion:proposal.version,approvalRef:approval.id,budget:500,boundary:"INTERNAL",idempotencyKey:"eco6b-run"});
 manager.measure({runRef:started.id,metric:"qualified_interest",value:1,sampleRef:"sample:one",evidenceRefs:["evidence:experiment"],observedAt:EXPECTED_AT});
 const experimentResult=manager.complete({runRef:started.id,workId:WORK,evidenceRefs:["evidence:experiment"]});
 const run=manager.getRun(started.id);current=ACTUAL_AT;
 const actual=actualAssessment(),actualArtifact=W.sealArtifact({id:"economic:actual",artifactType:"EconomicAssessment",organizationId:ORG,workId:WORK,version:1,producingRoleId:"ECONOMICS",status:"ACCEPTED",createdAt:ACTUAL_AT,assessmentId:actual.id,assessmentDigest:E.economicArtifactDigest(actual),upstreamRefs:[{artifactType:"ExperimentResult",artifactId:experimentResult.id,version:1,digest:E.economicArtifactDigest(experimentResult),organizationId:ORG,workId:WORK}]});
 const reconciliation=E.createEconomicReconciliation({organizationId:ORG,workId:WORK,proposalArtifact,baselineArtifact:expectedArtifact,baselineAssessment:expected,decision,approval,run,experimentResult,actualArtifact,actualAssessment:actual,authorizedAmountMinor:50000,reservedAmountMinor:50000,asOf:ACTUAL_AT},{clock:()=>RECONCILED_AT,validateExperimentResult:manager.validateResult});
 const observation=E.createEconomicCalibrationObservation({metric:"grossRevenue",baselineArtifact:expectedArtifact,baselineAssessment:expected,decision,actualArtifact,actualAssessment:actual,reconciliation,reconciliationRef:{artifactId:reconciliation.id,version:reconciliation.version,digest:E.economicCalibrationDigest(reconciliation)}});
 return{candidate,analyst,artifacts,proposal,expected,expectedArtifact,decision,authorization,approval,run,experimentResult,manager,actual,actualArtifact,reconciliation,observation};
}

function reconciliationInput(x){return{organizationId:ORG,workId:WORK,proposalArtifact:x.artifacts[2],baselineArtifact:x.expectedArtifact,baselineAssessment:x.expected,decision:x.decision,approval:x.approval,run:x.run,experimentResult:x.experimentResult,actualArtifact:x.actualArtifact,actualAssessment:x.actual,authorizedAmountMinor:50000,reservedAmountMinor:50000,asOf:ACTUAL_AT}}

function rejection(run, pattern){assert.throws(run,pattern)}

test("artifact identity mutations, forged digests, scope substitution, and lineage ambiguity fail closed",()=>{
 const x=build(), original=x.artifacts[0], changed=W.sealArtifact({...original,candidate:{...original.candidate,motivation:"attacker changed payload"}});
 assert.equal(changed.id,original.id);assert.notEqual(changed.digest,original.digest);
 for(const artifacts of [
  x.artifacts.map(a=>a.id===original.id?{...original,candidate:changed.candidate}:a),
  x.artifacts.map(a=>a.id===original.id?{...original,digest:"0".repeat(64)}:a),
  x.artifacts.map(a=>a.id===original.id?{...original,organizationId:"org:attacker"}:a),
  x.artifacts.map(a=>a.id===original.id?{...original,workId:"work:attacker"}:a),
  [...x.artifacts,x.artifacts[0]],
 ]) assert.equal(W.authorizeExecution({organizationId:ORG,workId:WORK,workflowState:"APPROVED",artifacts,decisions:[x.decision]}).authorized,false);
 const reordered={...x.decision,chainRefs:[...x.decision.chainRefs].reverse()};
 assert.equal(W.authorizeExecution({organizationId:ORG,workId:WORK,workflowState:"APPROVED",artifacts:x.artifacts,decisions:[reordered]}).authorized,true);
 const duplicated={...x.decision,chainRefs:[...x.decision.chainRefs.slice(0,-1),x.decision.chainRefs[0]]};
 assert.equal(W.authorizeExecution({organizationId:ORG,workId:WORK,workflowState:"APPROVED",artifacts:x.artifacts,decisions:[duplicated]}).authorized,false);
});

test("input and evidence mutations cannot retain trusted assessment lineage",()=>{
 const canonicalInputs=inputs("attack"), records=evidence("attack"), options={clock:()=>ACTUAL_AT,asOf:ACTUAL_AT,evidenceRecords:records,freshnessPolicies:categories.map(category=>({id:`fresh:${category}`,category,sourceType:"ACCOUNTING_SYSTEM",mode:"HISTORICAL"}))};
 const assessment=E.calculateEvidenceBackedAssessment({id:"assessment:attack",workId:WORK,financialInputs:canonicalInputs,coverage},options);
 const sourceSnapshot=structuredClone(records[0]);assert.throws(()=>{records[0].claim.amountMinor=1},TypeError);
 assert.deepEqual(assessment.provenance.inputs.find(v=>v.inputId===canonicalInputs[0].id).evidence[0].claim,sourceSnapshot.claim);
 const attacks=[
  [{...canonicalInputs[0],amountMinor:canonicalInputs[0].amountMinor+1},sourceSnapshot],
  [{...canonicalInputs[0],source:{...canonicalInputs[0].source,payloadHash:"forged"}},sourceSnapshot],
  [canonicalInputs[0],{...sourceSnapshot,id:canonicalInputs[1].evidenceRefs[0]}],
  [canonicalInputs[0],{...sourceSnapshot,scope:{...sourceSnapshot.scope,organizationId:"org:attacker"}}],
  [canonicalInputs[0],{...sourceSnapshot,scope:{...sourceSnapshot.scope,productRef:"product:attacker"}}],
  [canonicalInputs[0],{...sourceSnapshot,scope:{...sourceSnapshot.scope,campaignRef:"campaign:attacker"}}],
  [canonicalInputs[0],{...sourceSnapshot,version:2}],
  [canonicalInputs[0],{...sourceSnapshot,source:{...sourceSnapshot.source,recordRef:"wrong-upstream"}}],
 ];
 for(const [input,record] of attacks) rejection(()=>E.validateEconomicProvenance({financialInputs:[input],evidenceRecords:[record],asOf:ACTUAL_AT,freshnessPolicies:options.freshnessPolicies}),/invalid_economic_provenance/);
});

test("caller-declared authority is validated only as supplied registry content",()=>{
 const claimed=inputs("declared")[0], record=evidence("declared")[0];
 const result=E.validateEconomicProvenance({financialInputs:[claimed],evidenceRecords:[record],asOf:ACTUAL_AT,freshnessPolicies:[{id:"history",category:"REVENUE",sourceType:"ACCOUNTING_SYSTEM",mode:"HISTORICAL"}]});
 assert.equal(result.inputs[0].trustState,"HISTORICAL");
 assert.equal(result.inputs[0].evidence[0].source.system,"ECO6B_FIXTURE");
 assert.equal(Object.hasOwn(result.inputs[0].evidence[0],"cryptographicallyAuthenticated"),false);
});

test("truth statuses cannot be relabeled or completed with fabricated values",()=>{
 rejection(()=>E.EconomicInput({...inputs("unknown")[0],classification:"UNKNOWN",amountMinor:0,evidenceRefs:[]}),/unknown_amount/);
 rejection(()=>E.EconomicInput({...inputs("negative")[0],amountMinor:-1}),/amountMinor/);
 rejection(()=>E.EconomicInput({...inputs("overflow")[0],amountMinor:Number.MAX_SAFE_INTEGER+1}),/amountMinor/);
 rejection(()=>E.EconomicInput({...inputs("currency")[0],currency:"EUR"}),/unsupported_currency/);
 const metric=(status,value=null,missingInputs=[])=>({status,value,unit:"MINOR_CURRENCY",missingInputs});
 assert.equal(E.compareEconomicMetric("grossRevenue",metric("UNKNOWN"),metric("CALCULATED",0)).comparisonStatus,"UNKNOWN");
 assert.equal(E.compareEconomicMetric("grossRevenue",metric("PARTIAL",1,["missing"]),metric("CALCULATED",1)).comparisonStatus,"PARTIAL");
 assert.equal(E.compareEconomicMetric("grossRevenue",metric("INVALID"),metric("UNKNOWN")).comparisonStatus,"INVALID");
 assert.equal(E.compareEconomicMetric("grossRevenue",metric("NOT_APPLICABLE"),metric("CALCULATED",1)).comparisonStatus,"NOT_APPLICABLE");
 assert.equal(E.compareEconomicMetric("roi",metric("CALCULATED",1),metric("CALCULATED",2)).relativeVariance.value,10000);
});

test("governance, approval, run, and budget mutations provide no execution authority",()=>{
 const x=build();
 rejection(()=>O.GovernedDecision({...x.decision,authorityType:"AI_AGENT"}),/human_authority/);
 for(const decision of [{...x.decision,result:"REJECT"},{...x.decision,economicAssessmentRef:{...x.decision.economicAssessmentRef,digest:"forged"}},{...x.decision,id:"decision:reused",experimentProposalRef:{...x.decision.experimentProposalRef,artifactId:"proposal:other"}}])
  assert.equal(W.authorizeExecution({organizationId:ORG,workId:WORK,workflowState:"APPROVED",artifacts:x.artifacts,decisions:[decision]}).authorized,false);
 rejection(()=>x.manager.start({proposalId:x.proposal.id,proposalVersion:1,approvalRef:"approval:forged",budget:1,boundary:"INTERNAL",idempotencyKey:"forged"}),/approved_matching_authority/);
 rejection(()=>x.manager.start({proposalId:x.proposal.id,proposalVersion:1,approvalRef:x.approval.id,budget:501,boundary:"INTERNAL",idempotencyKey:"over"}),/budget|cumulative/);
 assert.deepEqual({actualSpend:x.reconciliation.budget.actualSpendMinor,authorization:x.observation.authorization},{actualSpend:null,authorization:undefined});
});

test("Experiment Manager rejects forged, replayed, cross-scope, incomplete, and post-retrieval-mutated results",()=>{
 const x=build(), valid=x.experimentResult;
 for(const attack of [{...valid,id:"forged"},{...valid,resultClass:"NOT_SUPPORTED"},{...valid,organizationId:"org:other"},{...valid,runRef:"run:other"},{...valid,proposalRef:"proposal:other"}]) rejection(()=>x.manager.validateResult(attack),/stored_experiment_result_required/);
 const retrieved=x.manager.getResult(valid.runRef);retrieved.resultClass="NOT_SUPPORTED";assert.equal(x.manager.getResult(valid.runRef).resultClass,valid.resultClass);
 const incomplete={...valid,runRef:"run:incomplete"};rejection(()=>x.manager.validateResult(incomplete),/stored_experiment_result_required/);
 const base=reconciliationInput(x);
 rejection(()=>E.createEconomicReconciliation(base,{}),/validator_required/);
 rejection(()=>E.createEconomicReconciliation(base,{validateExperimentResult:()=>({...valid,id:"unrelated"})}),/not_authoritative/);
 rejection(()=>E.createEconomicReconciliation({...base,experimentResult:{...valid,runRef:"run:replayed"}},{validateExperimentResult:x.manager.validateResult}),/not_authoritative/);
});

test("reconciliation and calibration bind immutable decisions, results, assessments, periods, and currencies",()=>{
 const x=build(),base=reconciliationInput(x),validator={clock:()=>RECONCILED_AT,validateExperimentResult:x.manager.validateResult};
 for(const patch of [
  {decision:{...x.decision,id:"decision:modified"}},
  {actualAssessment:{...x.actual,currency:"EUR"}},
  {actualAssessment:{...x.actual,reportingPeriod:{...PERIOD,end:"2038-04-01T00:00:00.000Z"}}},
  {actualAssessment:{...x.actual,metrics:{...x.actual.metrics,grossRevenue:{...x.actual.metrics.grossRevenue,value:null,status:"UNKNOWN"}}}},
  {experimentResult:{...x.experimentResult,id:"forged"}},
 ]) rejection(()=>E.createEconomicReconciliation({...base,...patch},validator),/invalid_economic_reconciliation/);
 const forged={...x.reconciliation,status:"INVALID"};
 rejection(()=>E.createEconomicCalibrationObservation({metric:"grossRevenue",baselineArtifact:x.expectedArtifact,baselineAssessment:x.expected,decision:x.decision,actualArtifact:x.actualArtifact,actualAssessment:x.actual,reconciliation:forged,reconciliationRef:{artifactId:x.reconciliation.id,version:x.reconciliation.version,digest:E.economicCalibrationDigest(x.reconciliation)}}),/reconciliation_binding/);
 assert.equal(x.observation.comparisonStatus,"PARTIAL");assert.equal(x.observation.probability,undefined);assert.equal(x.observation.forecastCorrection,undefined);
});

test("identical canonical inputs replay deterministic identities and outputs",()=>{
 const a=build(),b=build();
 for(const key of ["expectedArtifact","decision","approval","run","experimentResult","actualArtifact","reconciliation","observation"]) assert.deepEqual(a[key],b[key],key);
 assert.notStrictEqual(a.experimentResult,b.experimentResult);assert.notStrictEqual(a.actual,b.actual);
});
