"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../src/business-os/economics");

const reportingPeriod = {start:"2035-01-01T00:00:00.000Z",end:"2035-02-01T00:00:00.000Z"};
const at = "2035-02-02T00:00:00.000Z";
function input(category, amountMinor, overrides={}) {
  return E.EconomicInput({id:`input:${category}`,organizationId:"org",productRef:"product",campaignRef:"campaign",reportingPeriod,currency:"USD",version:1,category,classification:amountMinor===null?"UNKNOWN":"ACTUAL",amountMinor,assumptions:[],evidenceRefs:[`evidence:${category}`],source:{system:"FIXTURE",recordRef:`record:${category}`,observedAt:"2035-02-01T00:00:00.000Z"},...overrides});
}
const clock = () => at;
function calculate(financialInputs, coverage={}) { return E.calculateEconomicAssessment({workId:"work",financialInputs,coverage},{clock}); }
const complete = () => [input("REVENUE",100000),input("REFUND",10000),input("DISCOUNT",5000),input("ACQUISITION_COST",15000),input("PAYMENT_FEE",3500),input("FULFILLMENT_COST",25000),input("VARIABLE_COST",0),input("LABOR_COST",5000),input("FIXED_COST",10000),input("ALLOCATED_COST",0)];

test("ECO-2 deterministically calculates revenue, costs, units, contribution, CAC, ROAS, ROI and break-even", () => {
  const result = calculate(complete(),{units:100,newCustomers:10});
  assert.equal(result.engineVersion,E.ECONOMICS_ENGINE_VERSION);
  assert.deepEqual(Object.fromEntries(Object.entries(result.metrics).map(([k,v])=>[k,v.value])),{
    grossRevenue:100000,refunds:10000,discounts:5000,netRevenue:85000,knownVariableCost:48500,knownFixedCost:10000,totalKnownCost:58500,
    contributionBeforeUnknownCosts:26500,contribution:26500,contributionMargin:3118,unitRevenue:850,unitCost:585,unitContribution:265,
    breakEvenUnits:28,cac:1500,roas:56667,roi:4530,cashRequirement:null
  });
  assert.equal(result.grossContribution.amount,265);
  assert.equal(result.disposition,"CONTINUE");
  assert.equal(result.calculationLineage.length,Object.keys(result.metrics).length);
  assert.ok(result.calculationLineage.every(x=>x.engineVersion===E.ECONOMICS_ENGINE_VERSION&&x.calculatedAt===at));
});

test("unknown is never zero and partial knowledge reports a bounded subtotal", () => {
  const values = complete().map(x=>x.category==="FULFILLMENT_COST"?input("FULFILLMENT_COST",null):x);
  const result = calculate(values,{units:100,newCustomers:10});
  assert.equal(result.metrics.totalKnownCost.value,33500);
  assert.equal(result.metrics.contributionBeforeUnknownCosts.value,51500);
  assert.equal(result.metrics.contributionBeforeUnknownCosts.status,"PARTIAL");
  assert.equal(result.metrics.contribution.value,null);
  assert.equal(result.metrics.contributionMargin.value,null);
  assert.equal(result.metrics.roi.value,null);
  assert.equal(result.grossContribution.amount,null);
  assert.deepEqual(result.unknownCosts,["input:FULFILLMENT_COST"]);
  assert.match(result.limitations[0],/FULFILLMENT_COST/);
});

test("missing cost differs from evidenced zero and required coverage is explicit", () => {
  const requiredCostCategories=["PAYMENT_FEE","FULFILLMENT_COST"];
  const base=[input("REVENUE",1000),input("PAYMENT_FEE",0)];
  const missing=calculate(base,{requiredCostCategories});
  assert.equal(missing.metrics.contribution.status,"UNKNOWN");
  assert.ok(missing.metrics.contribution.missingInputs.includes("category:FULFILLMENT_COST"));
  const zero=calculate([...base,input("FULFILLMENT_COST",0)],{requiredCostCategories});
  assert.equal(zero.metrics.contribution.value,1000);
  assert.equal(zero.metrics.contribution.status,"CALCULATED");
});

test("fixed, percentage, and combined processing fees use deterministic half-up minor-unit rounding", () => {
  const base=[input("REVENUE",1001),input("FULFILLMENT_COST",0)];
  const requiredCostCategories=["PAYMENT_FEE","FULFILLMENT_COST"];
  for(const [schedule,expected] of [[{fixedMinor:30,basisPoints:0,transactionCount:2},60],[{fixedMinor:0,basisPoints:250,transactionCount:1},25],[{fixedMinor:30,basisPoints:250,transactionCount:2},85]]) {
    const result=calculate(base,{requiredCostCategories,paymentFeeSchedule:schedule});
    assert.equal(result.metrics.totalKnownCost.value,expected);
  }
  assert.throws(()=>calculate([...base,input("PAYMENT_FEE",1)],{requiredCostCategories,paymentFeeSchedule:{fixedMinor:0,basisPoints:1,transactionCount:1}}),/payment_fee_double_count/);
});

test("zero denominators and incomplete denominators are truthful", () => {
  const result=calculate(complete(),{units:0,newCustomers:0});
  for(const name of ["unitRevenue","unitCost","unitContribution","breakEvenUnits","cac"]) assert.equal(result.metrics[name].status,"NOT_APPLICABLE");
  const zeroRevenue=calculate(complete().map(x=>["REVENUE","REFUND","DISCOUNT"].includes(x.category)?input(x.category,0):x),{units:1,newCustomers:1});
  assert.equal(zeroRevenue.metrics.contributionMargin.value,null);
  assert.equal(zeroRevenue.metrics.contributionMargin.status,"NOT_APPLICABLE");
  const noCounts=calculate(complete());
  assert.equal(noCounts.metrics.cac.status,"UNKNOWN");
  assert.equal(noCounts.metrics.unitRevenue.status,"UNKNOWN");
});

test("losses and refunds are legitimate results while negative inputs are invalid", () => {
  const result=calculate(complete().map(x=>x.category==="REFUND"?input("REFUND",150000):x),{units:100,newCustomers:10});
  assert.ok(result.metrics.contribution.value<0);
  assert.equal(result.riskExposure,"HIGH");
  assert.equal(result.disposition,"REVISE");
  assert.throws(()=>input("REFUND",-1),/amountMinor/);
});

test("estimated inputs remain partial rather than observed", () => {
  const values=complete().map(x=>x.category==="LABOR_COST"?input("LABOR_COST",5000,{classification:"ESTIMATED",assumptions:["Owner time allowance"]}):x);
  const result=calculate(values,{units:100,newCustomers:10});
  assert.equal(result.metrics.contribution.status,"PARTIAL");
  assert.equal(result.grossContribution.classification,"ESTIMATED");
  assert.equal(result.estimatedCost,50);
});

test("mixed currency/scope, malformed numbers, duplicates, versions, and overflow fail closed", () => {
  assert.throws(()=>input("REVENUE","100"),/amountMinor/);
  assert.throws(()=>input("REVENUE",NaN),/amountMinor/);
  assert.throws(()=>input("REVENUE",Infinity),/amountMinor/);
  assert.throws(()=>input("REVENUE",1,{currency:"EUR"}),/unsupported_currency/);
  assert.throws(()=>calculate([input("REVENUE",1),input("REFUND",0,{organizationId:"other"})]),/mixed_scope/);
  assert.throws(()=>calculate([input("REVENUE",1),input("REVENUE",2)]),/duplicate_input/);
  assert.throws(()=>E.calculateEconomicAssessment({engineVersion:"economics-v3",workId:"work",financialInputs:[input("REVENUE",1)]},{clock}),/engine_version/);
  const large=Number.MAX_SAFE_INTEGER;
  const result=calculate([input("REVENUE",large),input("REFUND",large),input("FULFILLMENT_COST",large)],{requiredCostCategories:["FULFILLMENT_COST"],units:1});
  assert.equal(result.metrics.netRevenue.value,0);
  assert.equal(result.metrics.contribution.value,-large);
  assert.throws(()=>calculate([input("REVENUE",large),input("REFUND",large),input("REFUND",large,{id:"refund:2",source:{system:"FIXTURE",recordRef:"refund:2",observedAt:"2035-02-01T00:00:00.000Z"}})]),/revenue_total_overflow/);
});

test("same canonical input and engine version replays deterministically independent of input order", () => {
  const request={workId:"work",financialInputs:complete(),coverage:{units:100,newCustomers:10}};
  const meaningful=value=>{const copy=structuredClone(value);delete copy.createdAt;for(const metric of Object.values(copy.metrics))delete metric.calculatedAt;for(const item of copy.calculationLineage)delete item.calculatedAt;return copy;};
  const first=E.calculateEconomicAssessment(request,{clock:()=>"2035-02-02T00:00:00.000Z"});
  for(let i=0;i<20;i++) assert.deepEqual(meaningful(E.calculateEconomicAssessment({...request,financialInputs:[...request.financialInputs].reverse()},{clock:()=>`2035-02-${String(3+i).padStart(2,"0")}T00:00:00.000Z`})),meaningful(first));
  const replay=E.calculateEconomicAssessment(JSON.parse(JSON.stringify(request)),{clock});
  assert.deepEqual(replay,first);
});


test("unknown refunds and discounts make net revenue and contribution unknown", () => {
  for (const category of ["REFUND","DISCOUNT"]) {
    const values=complete().map(x=>x.category===category?input(category,null):x);
    const result=calculate(values,{units:100,newCustomers:10});
    assert.equal(result.metrics.netRevenue.value,null);
    assert.equal(result.metrics.netRevenue.status,"UNKNOWN");
    assert.equal(result.metrics.contribution.value,null);
    assert.equal(result.grossContribution.classification,"UNKNOWN");
  }
});

test("unknown acquisition cost never becomes zero CAC or zero-spend ROAS", () => {
  const values=complete().map(x=>x.category==="ACQUISITION_COST"?input("ACQUISITION_COST",null):x);
  const result=calculate(values,{units:100,newCustomers:10});
  assert.equal(result.metrics.cac.value,null);
  assert.equal(result.metrics.cac.status,"UNKNOWN");
  assert.ok(result.metrics.cac.missingInputs.includes("input:ACQUISITION_COST"));
  assert.equal(result.metrics.roas.value,null);
  assert.equal(result.metrics.roas.status,"UNKNOWN");
  assert.ok(result.metrics.roas.missingInputs.includes("input:ACQUISITION_COST"));
});
