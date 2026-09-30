"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../src/business-os/economics");

const period = {start:"2035-01-01T00:00:00.000Z",end:"2035-02-01T00:00:00.000Z"};
const asOf = "2035-02-02T00:00:00.000Z";
const policy = [{id:"completed-transactions-v1",category:"REVENUE",sourceType:"PAYMENT_PROCESSOR",mode:"HISTORICAL"},{id:"current-pricing-v1",category:"FULFILLMENT_COST",sourceType:"ANALYST_ESTIMATE",mode:"EXPIRING",maxAgeMs:86400000}];
function evidence(category, amountMinor, overrides={}) {
  const classification = overrides.claim?.classification || (amountMinor === null ? "UNKNOWN" : "ACTUAL");
  return E.EconomicEvidenceRecord({id:`evidence:${category}`,evidenceType:classification==="ACTUAL"?"OBSERVED_FACT":"INFERENCE",source:{type:classification==="ACTUAL"?"PAYMENT_PROCESSOR":"ANALYST_ESTIMATE",system:"FIXTURE",recordRef:`record:${category}`,availability:"AVAILABLE"},actorId:"actor:fixture",recordedAt:"2035-02-01T01:00:00.000Z",observedAt:"2035-02-01T00:00:00.000Z",version:1,scope:{organizationId:"org",productRef:"product",campaignRef:"campaign",currency:"USD",reportingPeriod:period},claim:{category,classification,amountMinor},payloadHash:`hash:${category}:1`,supersededBy:null,...overrides});
}
function input(category, amountMinor, overrides={}) {
  const classification = overrides.classification || (amountMinor === null ? "UNKNOWN" : "ACTUAL");
  return E.EconomicInput({id:`input:${category}`,organizationId:"org",productRef:"product",campaignRef:"campaign",currency:"USD",reportingPeriod:period,version:1,category,classification,amountMinor,assumptions:classification==="ESTIMATED"?["Supplier quote extrapolated for the reporting period."]:[],evidenceRefs:classification==="UNKNOWN"?[]:[`evidence:${category}`],source:{system:"FIXTURE",recordRef:`record:${category}`,recordVersion:1,payloadHash:`hash:${category}:1`,observedAt:"2035-02-01T00:00:00.000Z"},...overrides});
}
const validate = (financialInputs, evidenceRecords, extra={}) => E.validateEconomicProvenance({financialInputs,evidenceRecords,asOf,freshnessPolicies:policy,...extra});

test("ECO-3 accepts observed and estimated canonical evidence without changing their classifications", () => {
  const actual=input("REVENUE",50000), estimated=input("FULFILLMENT_COST",12000,{classification:"ESTIMATED"});
  const records=[evidence("REVENUE",50000),evidence("FULFILLMENT_COST",12000,{evidenceType:"INFERENCE",source:{type:"ANALYST_ESTIMATE",system:"FIXTURE",recordRef:"record:FULFILLMENT_COST",availability:"AVAILABLE"},claim:{category:"FULFILLMENT_COST",classification:"ESTIMATED",amountMinor:12000}})];
  const result=validate([estimated,actual],records);
  assert.deepEqual(result.inputs.map(x=>[x.inputId,x.trustState,x.freshnessState]),[["input:FULFILLMENT_COST","ESTIMATED","CURRENT"],["input:REVENUE","HISTORICAL","HISTORICAL"]]);
  assert.equal(actual.classification,"ACTUAL"); assert.equal(estimated.classification,"ESTIMATED");
});

test("UNKNOWN needs no fabricated number or evidence and remains unknown", () => {
  const result=validate([input("REFUND",null)],[]);
  assert.deepEqual(result.inputs[0],{inputId:"input:REFUND",accepted:true,trustState:"UNKNOWN",freshnessState:"UNKNOWN",evidence:[]});
  assert.throws(()=>input("REFUND",null,{amountMinor:0}),/unknown_amount/);
});

test("missing, unregistered, duplicate and reused evidence fail closed", () => {
  assert.throws(()=>E.EconomicInput({...input("REVENUE",1),evidenceRefs:[]}),/evidenceRefs/);
  assert.throws(()=>validate([input("REVENUE",1)],[]),/evidence_not_registered/);
  assert.throws(()=>validate([input("REVENUE",1,{evidenceRefs:["evidence:REVENUE","evidence:REVENUE"]})],[evidence("REVENUE",1)]),/duplicate_evidence_ref/);
  assert.throws(()=>validate([input("REVENUE",1,{source:{...input("REVENUE",1).source,recordRef:"wrong"}})],[evidence("REVENUE",1)]),/source_mismatch/);
});

test("organization, product, campaign, period and currency isolation fail closed", () => {
  const patches=[{organizationId:"other"},{productRef:"other"},{campaignRef:"other"},{reportingPeriod:{start:period.start,end:"2035-03-01T00:00:00.000Z"}},{currency:"EUR"}];
  for(const patch of patches) assert.throws(()=>validate([input("REVENUE",1)],[evidence("REVENUE",1,{scope:{...evidence("REVENUE",1).scope,...patch}})]),/scope_mismatch|period_or_currency/);
});

test("malformed/future timestamps, unsupported sources and unavailable sources fail closed", () => {
  assert.throws(()=>evidence("REVENUE",1,{observedAt:"yesterday"}),/timestamp/);
  assert.throws(()=>evidence("REVENUE",1,{source:{type:"STRIPE",system:"x",recordRef:"x",availability:"AVAILABLE"}}),/source/);
  assert.throws(()=>validate([input("REVENUE",1)],[evidence("REVENUE",1,{observedAt:"2035-02-03T00:00:00.000Z"})]),/future_observation/);
  assert.throws(()=>validate([input("REVENUE",1)],[evidence("REVENUE",1,{source:{type:"PAYMENT_PROCESSOR",system:"FIXTURE",recordRef:"record:REVENUE",availability:"UNAVAILABLE"}})]),/source_unavailable/);
});

test("ACTUAL cannot be supported by an estimate and ESTIMATED requires assumptions", () => {
  const estimatedEvidence=evidence("REVENUE",1,{evidenceType:"INFERENCE",claim:{category:"REVENUE",classification:"ESTIMATED",amountMinor:1}});
  assert.throws(()=>validate([input("REVENUE",1)],[estimatedEvidence]),/actual_not_observed/);
  assert.throws(()=>input("FULFILLMENT_COST",1,{classification:"ESTIMATED",assumptions:[]}),/estimate_assumptions/);
});

test("stale pricing is rejected while completed historical transactions remain valid", () => {
  const stale=input("FULFILLMENT_COST",100,{classification:"ESTIMATED",source:{system:"FIXTURE",recordRef:"record:FULFILLMENT_COST",recordVersion:1,payloadHash:"hash:FULFILLMENT_COST:1",observedAt:"2035-01-01T00:00:00.000Z"}});
  const staleEvidence=evidence("FULFILLMENT_COST",100,{evidenceType:"INFERENCE",observedAt:"2035-01-01T00:00:00.000Z",source:{type:"ANALYST_ESTIMATE",system:"FIXTURE",recordRef:"record:FULFILLMENT_COST",availability:"AVAILABLE"},claim:{category:"FULFILLMENT_COST",classification:"ESTIMATED",amountMinor:100}});
  assert.throws(()=>validate([stale],[staleEvidence]),/input_not_accepted/);
  assert.equal(validate([input("REVENUE",100)],[evidence("REVENUE",100)]).inputs[0].freshnessState,"HISTORICAL");
});

test("superseded and changed evidence versions are detectable", () => {
  assert.throws(()=>validate([input("REVENUE",1)],[evidence("REVENUE",1,{supersededBy:"evidence:new"})]),/superseded/);
  assert.throws(()=>validate([input("REVENUE",1,{source:{...input("REVENUE",1).source,payloadHash:"tampered"}})],[evidence("REVENUE",1)]),/evidence_version_mismatch/);
  const newer=evidence("REVENUE",1,{id:"evidence:new",version:2,payloadHash:"hash:new"});
  assert.throws(()=>validate([input("REVENUE",1)],[evidence("REVENUE",1),newer]),/superseded/);
});

test("contradictory sources return a structured conflict rather than selecting a winner", () => {
  const other=evidence("REVENUE",65000,{id:"evidence:other",source:{type:"ACCOUNTING_SYSTEM",system:"BOOKS",recordRef:"invoice-total",availability:"AVAILABLE"},payloadHash:"hash:other"});
  assert.throws(()=>validate([input("REVENUE",50000)],[evidence("REVENUE",50000),other]),error=>error.details.state==="CONFLICTED"&&error.details.conflicts[0].claims.length===2);
});

test("duplicate evidence and duplicate source versions fail closed", () => {
  const record=evidence("REVENUE",1);
  assert.throws(()=>validate([input("REVENUE",1)],[record,record]),/duplicate_evidence/);
  assert.throws(()=>validate([input("REVENUE",1)],[record,evidence("REVENUE",1,{id:"copy"})]),/duplicate_source_record/);
});

test("accepted assessments snapshot evidence and trace every metric to source records", () => {
  const values=[input("REVENUE",1000),input("REFUND",null),input("DISCOUNT",null),input("FULFILLMENT_COST",0)];
  const records=[evidence("REVENUE",1000),evidence("FULFILLMENT_COST",0,{source:{type:"PAYMENT_PROCESSOR",system:"FIXTURE",recordRef:"record:FULFILLMENT_COST",availability:"AVAILABLE"}})];
  const result=E.calculateEvidenceBackedAssessment({workId:"work",financialInputs:values,coverage:{requiredCostCategories:["FULFILLMENT_COST"]}},{clock:()=>asOf,asOf,evidenceRecords:records,freshnessPolicies:policy});
  assert.equal(result.provenance.registryDigest.length,64);
  const gross=result.calculationLineage.find(line=>line.metric==="grossRevenue");
  assert.deepEqual(gross.sourceTrace.map(trace=>trace.inputId),["input:REVENUE"]);
  const cash=result.calculationLineage.find(line=>line.metric==="cashRequirement");
  assert.deepEqual(cash.sourceTrace,[]);
  records[0]={...records[0],payloadHash:"changed"};
  assert.equal(result.provenance.inputs.find(x=>x.inputId==="input:REVENUE").evidence[0].payloadHash,"hash:REVENUE:1");
});

test("evidence ordering and serialized replay are deterministic", () => {
  const values=[input("REVENUE",100),input("REFUND",null)]; const records=[evidence("REVENUE",100)];
  const first=validate(values,records), second=validate([...values].reverse(),[...records].reverse());
  assert.deepEqual(second,first); assert.deepEqual(JSON.parse(JSON.stringify(first)),first);
});


test("future recordedAt evidence fails the as-of audit", () => {
  assert.throws(()=>validate([input("REVENUE",1)],[evidence("REVENUE",1,{recordedAt:"2035-02-03T00:00:00.000Z"})]),/future_recording/);
});

test("metric source lineage contains only inputs relevant to that metric", () => {
  const values=[input("REVENUE",1000),input("REFUND",0),input("DISCOUNT",0),input("ACQUISITION_COST",100),input("FULFILLMENT_COST",0)];
  const records=values.map(value=>evidence(value.category,value.amountMinor,{source:{type:"PAYMENT_PROCESSOR",system:"FIXTURE",recordRef:`record:${value.category}`,availability:"AVAILABLE"}}));
  const policies=values.map(value=>({id:`historical:${value.category}`,category:value.category,sourceType:"PAYMENT_PROCESSOR",mode:"HISTORICAL"}));
  const result=E.calculateEvidenceBackedAssessment({workId:"work",financialInputs:values,coverage:{requiredCostCategories:["ACQUISITION_COST","FULFILLMENT_COST"],newCustomers:2}},{clock:()=>asOf,asOf,evidenceRecords:records,freshnessPolicies:policies});
  const cac=result.calculationLineage.find(line=>line.metric==="cac");
  assert.deepEqual(cac.sourceTrace.map(x=>x.inputId),["input:ACQUISITION_COST"]);
  const gross=result.calculationLineage.find(line=>line.metric==="grossRevenue");
  assert.deepEqual(gross.sourceTrace.map(x=>x.inputId),["input:REVENUE"]);
  const cash=result.calculationLineage.find(line=>line.metric==="cashRequirement");
  assert.deepEqual(cash.sourceTrace,[]);
});
