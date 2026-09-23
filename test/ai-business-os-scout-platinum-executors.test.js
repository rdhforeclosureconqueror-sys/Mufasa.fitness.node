"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const Scout=require("../src/business-os/scout");
const Academy=require("../src/business-os/academy");
const Organization=require("../src/business-os/organization/contracts");

const fixed=()=>new Date("2030-01-01T00:00:00.000Z");
const feedback=()=>Scout.ScoutOutcomeFeedback({id:"feedback:1",organizationId:"org",opportunityFamily:"pushup",experimentRefs:["experiment:1"],audience:"adults",product:"pushup",resultClassification:"VERIFIED_CONVERSION",qualifiedInterestCount:10,conversionCount:3,completionCount:2,continuationCount:1,refundClassification:"NONE",revenueClassification:"AGGREGATE_VERIFIED",contributionClassification:"POSITIVE_VERIFIED",evidenceRefs:["experiment:evidence"],confidence:.9,limitations:["small sample"],observationWindow:{start:"2029-12-01",end:"2029-12-31"},provenance:{classification:"INDEPENDENT_EXPERIMENT"},version:1});
const acceptance=()=>Scout.ScoutHumanAcceptance({id:"acceptance:1",organizationId:"org",actorType:"HUMAN",actorId:"admin:1",authorityRef:"grant:1",authenticationEvidenceRefs:["auth:session"],recordedBy:"AUTHENTICATED_ADMIN_BOUNDARY",scope:"SCOUT_PLATINUM",status:"PASS",acceptedAt:"2030-01-01",evidenceRefs:["acceptance:evidence"],version:1});

test("all 24 Scout scenarios execute through production decision logic and canonical Academy",async()=>{
 const run=await Scout.runScoutPlatinumArchitecture({clock:fixed,id:()=>"run:1"});
 assert.equal(run.results.length,24);
 assert.ok(run.results.every(x=>x.verdict==="PASS"));
 assert.ok(run.results.every(x=>x.observations[0].source==="SMART_SCOUT_PRODUCTION_DECISION_ENGINE"));
 assert.ok(run.results.every(x=>x.observations[0].evidenceRefs.some(ref=>ref==="scout-policy:SCOUT_REASONING_POLICY_V1")));
});

test("architecture evidence passes while external and human gates remain blocked",async()=>{
 const report=await Scout.buildScoutCertificationReport({clock:fixed,id:()=>"run:1"});
 assert.equal(report.architecture.passed,24);
 assert.equal(report.readiness.gates.SCOUT_PLATINUM_ARCHITECTURE_READY,"PASS");
 assert.equal(report.readiness.gates.SCOUT_LIVE_SOURCE_VERIFIED,"BLOCKED");
 assert.equal(report.readiness.gates.SCOUT_OUTCOME_FEEDBACK_VERIFIED,"BLOCKED");
 assert.equal(report.readiness.gates.SCOUT_PLATINUM_CERTIFIED,"BLOCKED");
 assert.equal(report.certified,false);
});

test("Academy catches an executor that returns the wrong production decision",async()=>{
 const registry=Academy.createScenarioRegistry();Scout.registerScoutPlatinumScenarios(registry);
 const executors={...Scout.createScoutPlatinumExecutors()};
 executors["scout-platinum:fresh-first-party-search"]=()=>({observations:[{id:"observation.scout.platinum.fresh-first-party-search",type:"STRUCTURED_BEHAVIOR",source:"BROKEN_EXECUTOR",value:{decision:"NEEDS_MORE_EVIDENCE"},evidenceRefs:["broken:evidence"]}],executionEvidenceRefs:["broken"]});
 const result=await Academy.createAcademyRunner({registry,executors,clock:fixed}).runScenario(registry.get("scout.platinum.fresh-first-party-search","1.0.0"));
 assert.equal(result.verdict,"FAIL");
});

test("Google connectors stay blocked without verified human configuration",async()=>{
 for(const create of [Scout.createGoogleSearchConsoleSource,Scout.createGoogleAnalyticsSource]){
  const source=create({organizationId:"org",fetchImpl:async()=>{throw new Error("must_not_call")},accessToken:"secret"});
  const result=await source.read({});
  assert.equal(result.status,"HUMAN_CONFIGURATION_REQUIRED");
  assert.equal(result.firstFailure,"SOURCE_AUTHORIZED");
 }
});

test("official Google read result creates canonical health and live evidence without leaking token",async()=>{
 const fetchImpl=async(url,options)=>({ok:true,status:200,json:async()=>url.includes("searchAnalytics")?{rows:[{keys:["push up challenge"],clicks:4,impressions:100}]}:{rowCount:1,rows:[{dimensionValues:[{value:"Organic Search"}],metricValues:[{value:"4"}]}]}});
 const source=Scout.createGoogleSearchConsoleSource({organizationId:"org",fetchImpl,accessToken:"top-secret-token",siteUrl:"sc-domain:example.com",authorizationVerified:true,resourceVerified:true,clock:fixed});
 const read=await source.read({startDate:"2029-12-01",endDate:"2029-12-31"});
 assert.equal(read.status,"READ");assert.equal(read.records.length,1);
 const evidence=Scout.verifiedGoogleEvidence({organizationId:"org",sourceId:"GOOGLE_SEARCH_CONSOLE",readResult:read,clock:fixed});
 assert.equal(evidence.health.kind,"ScoutSourceHealth");
 assert.equal(evidence.liveEvidence.kind,"ScoutLiveEvidence");
 assert.equal(JSON.stringify(evidence).includes("top-secret-token"),false);
});

test("hand-authored or synthetic provider-shaped records cannot satisfy live evidence provenance",()=>{
 const forged={status:"READ",records:[{aggregate:true}],evidenceRefs:["ga4:forged"],providerMetadata:{observedAt:"2030-01-01T00:00:00.000Z"}};
 assert.throws(()=>Scout.verifiedGoogleEvidence({organizationId:"org",sourceId:"GA4",readResult:forged,clock:fixed}),/verified_google_read_required/);
});

test("complete canonical external evidence can certify only with explicit human acceptance",async()=>{
 const source=Scout.createGoogleAnalyticsSource({organizationId:"org",fetchImpl:async()=>({ok:true,status:200,json:async()=>({rowCount:1,rows:[{dimensionValues:[{value:"Organic Search"}],metricValues:[{value:"4"}]}]})}),accessToken:"test-token",propertyId:"123",authorizationVerified:true,resourceVerified:true,clock:fixed});
 const read=await source.read({});
 const external=Scout.verifiedGoogleEvidence({organizationId:"org",sourceId:"GA4",readResult:read,clock:fixed});
 const withoutHuman=await Scout.buildScoutCertificationReport({sourceHealth:[external.health],liveEvidence:[external.liveEvidence],outcomeFeedback:[feedback()],clock:fixed,id:()=>"run:1"});
 assert.equal(withoutHuman.readiness.gates.SCOUT_PLATINUM_CERTIFIED,"BLOCKED");
 const complete=await Scout.buildScoutCertificationReport({sourceHealth:[external.health],liveEvidence:[external.liveEvidence],outcomeFeedback:[feedback()],humanAcceptance:acceptance(),clock:fixed,id:()=>"run:1"});
 assert.equal(complete.readiness.gates.SCOUT_PLATINUM_CERTIFIED,"PASS");
 assert.equal(complete.certified,true);
});

test("human acceptance requires an authenticated admin and all prior gates",async()=>{
 const source=Scout.createGoogleAnalyticsSource({organizationId:"org",fetchImpl:async()=>({ok:true,status:200,json:async()=>({rowCount:1,rows:[{dimensionValues:[{value:"Organic Search"}],metricValues:[{value:"4"}]}]})}),accessToken:"test-token",propertyId:"123",authorizationVerified:true,resourceVerified:true,clock:fixed});
 const read=await source.read({});
 const external=Scout.verifiedGoogleEvidence({organizationId:"org",sourceId:"GA4",readResult:read,clock:fixed});
 const prior=await Scout.buildScoutCertificationReport({sourceHealth:[external.health],liveEvidence:[external.liveEvidence],outcomeFeedback:[feedback()],clock:fixed,id:()=>"run:1"});
 assert.throws(()=>Scout.createScoutHumanAcceptance({organizationId:"org",actor:{userId:"agent",role:"admin",authenticationEvidenceRefs:[]},authorityRef:"grant:1",evidenceRefs:["review:1"],readiness:prior.readiness,clock:fixed}),/authentication_evidence/);
 const accepted=Scout.createScoutHumanAcceptance({organizationId:"org",actor:{userId:"admin:1",role:"super_admin",authenticationEvidenceRefs:["auth:session"]},authorityRef:"grant:1",evidenceRefs:["review:academy","review:source","review:outcomes"],readiness:prior.readiness,clock:fixed});
 assert.equal(accepted.kind,"ScoutHumanAcceptance");
 assert.equal(accepted.recordedBy,"AUTHENTICATED_ADMIN_BOUNDARY");
});

test("decision engine handles duplicate, private, authority, and outcome boundaries",()=>{
 const duplicate={sourceId:"GA4",sourceResourceRef:"same",normalizedStatement:"same",signalType:"EXPLICIT_INTENT",observedAt:"now",evidenceClassification:"LIVE_FIRST_PARTY",freshnessState:"FRESH"};
 assert.equal(Scout.evaluateScoutDecision({observations:[{...duplicate,id:"1"},{...duplicate,id:"2"}]}).decision,"DEDUPLICATE");
 assert.equal(Scout.evaluateScoutDecision({rawRecord:{email:"private@example.com"}}).decision,"REJECT_AND_REDACT");
 assert.equal(Scout.evaluateScoutDecision({requestedAction:"SPEND_MONEY"}).decision,"DENY");
 assert.equal(Scout.evaluateScoutDecision({toolSuccessOnly:true}).decision,"DENY_CLAIM");
});

test("independent outcome feedback is derived from canonical Experiment and Economics records",()=>{
 const experimentResult=Organization.ExperimentResult({id:"experiment:1",organizationId:"org",workId:"work:1",proposalRef:"proposal:1",resultClass:"VERIFIED_CONVERSION",evidenceRefs:["experiment:evidence"],limitations:["small sample"],status:"ACCEPTED",createdAt:"2030-01-01"});
 const economicAssessment=Organization.EconomicAssessment({id:"economics:1",organizationId:"org",workId:"work:1",knownCost:10,estimatedCost:10,unknownCosts:[],expectedValue:20,actualValue:{classification:"AGGREGATE_VERIFIED",amount:30},grossContribution:{classification:"POSITIVE_VERIFIED",amount:20},capacityCost:{classification:"KNOWN",amount:0},riskExposure:"LOW",breakEvenAssumptions:[],sensitivity:[],disposition:"CONTINUE",evidenceRefs:["economics:evidence"],limitations:[],createdAt:"2030-01-01"});
 const result=Scout.createOutcomeFeedbackFromVerifiedExperiment({experimentResult,economicAssessment,measurements:{qualifiedInterestCount:10,conversionCount:3,completionCount:2,continuationCount:1,refundClassification:"NONE",evidenceRefs:["measurement:evidence"]},audience:"Dallas adults",product:"Push-Up Arena",opportunityFamily:"fitness-competition",observationWindow:{start:"2029-12-01",end:"2029-12-31"},confidence:.8});
 assert.equal(result.kind,"ScoutOutcomeFeedback");
 assert.equal(result.provenance.classification,"INDEPENDENT_EXPERIMENT");
 assert.ok(result.evidenceRefs.includes("economics:evidence"));
 assert.throws(()=>Scout.createOutcomeFeedbackFromVerifiedExperiment({experimentResult,economicAssessment,measurements:{qualifiedInterestCount:1,conversionCount:2,completionCount:0,continuationCount:0},audience:"x",product:"x",opportunityFamily:"x",observationWindow:{}}),/conversion_exceeds/);
});
