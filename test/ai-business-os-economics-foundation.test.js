"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const E = require("../src/business-os/economics");
const {EconomicAssessment} = require("../src/business-os/organization/contracts");
const {createControlledLiveService} = require("../src/business-os/real-world/controlled-live");
const {createCommandCenterService} = require("../src/business-os/command/service");

const reportingPeriod = {start: "2035-01-01T00:00:00.000Z", end: "2035-01-02T00:00:00.000Z"};
const unknown = () => ({classification: "UNKNOWN", amount: null});
function input(overrides = {}) {
  return E.EconomicInput({id: "payment:1", organizationId: "org", productRef: "push-up", campaignRef: "campaign:1",
    reportingPeriod, currency: "USD", version: 1, category: "REVENUE", classification: "ACTUAL", amountMinor: 5000,
    assumptions: [], evidenceRefs: ["provider:receipt"],
    source: {system: "FIXTURE", recordRef: "transaction:1", observedAt: "2035-01-02T00:00:00.000Z"}, ...overrides});
}
function assessment(overrides = {}) {
  return {id: "economic:1", organizationId: "org", workId: "work:1", productRef: "push-up", campaignRef: "campaign:1",
    currency: "USD", reportingPeriod, version: 1, economicsSchemaVersion: E.ECONOMICS_SCHEMA_VERSION,
    financialInputs: [input()], knownCost: 0, estimatedCost: 0, unknownCosts: ["delivery-cost-not-supplied"],
    expectedValue: unknown(), actualValue: {classification: "OBSERVED", amount: 50}, grossContribution: unknown(),
    capacityCost: unknown(), riskExposure: "UNKNOWN", breakEvenAssumptions: [], sensitivity: [], disposition: "NEEDS_MORE_EVIDENCE",
    evidenceRefs: ["provider:receipt"], limitations: ["Synthetic test; sources have not been independently verified."],
    createdAt: "2035-01-02T01:00:00.000Z", ...overrides};
}

test("ECO-0 calculates USD contribution, explicit zero and losses in cents", () => {
  const values = {settled: 50, fees: 1.75, fulfillmentCost: 12.35, refunded: 5, acquisitionSpend: 3.9};
  assert.equal(E.observedContribution(values).amount, 27);
  assert.equal(E.observedContribution({...values, settled: 0}).amount, -23);
  assert.deepEqual(E.observedContribution(Object.fromEntries(Object.keys(values).map(k => [k, 0]))),
    {currency: "USD", amount: 0, classification: "OBSERVED", unknownFields: [], invalidFields: []});
});

test("ECO-0 never substitutes zero for missing amounts", () => {
  const values = {settled: 50, fees: 0, fulfillmentCost: 0, refunded: 0, acquisitionSpend: 0};
  for (const field of Object.keys(values)) for (const missing of [null, undefined]) {
    const result = E.observedContribution({...values, [field]: missing});
    assert.equal(result.amount, null);
    assert.equal(result.classification, "UNKNOWN");
    assert.deepEqual(result.unknownFields, [field]);
  }
});

test("ECO-0 rejects coercion, non-finite amounts, precision loss and overflow", () => {
  for (const value of ["0", "", false, [], {}, NaN, Infinity, -1, .001, Number.MAX_VALUE]) {
    assert.equal(E.observedContribution({settled: 50, fees: value, fulfillmentCost: 0, refunded: 0, acquisitionSpend: 0}).classification, "INVALID");
  }
  const large = 90000000000000;
  assert.equal(E.observedContribution({settled: 0, fees: large, fulfillmentCost: large, refunded: 0, acquisitionSpend: 0}).classification, "INVALID");
});

test("ECO-1 uses the canonical assessment and freezes a snapshot of financial inputs", () => {
  const values = assessment();
  const result = EconomicAssessment(values);
  assert.equal(result.kind, "EconomicAssessment");
  assert.equal(result.contractVersion, "ai-business-os.organization/1.0.0");
  assert.equal(result.economicsSchemaVersion, E.ECONOMICS_SCHEMA_VERSION);
  values.reportingPeriod = {...reportingPeriod, end: "2036-01-02T00:00:00.000Z"};
  assert.equal(result.reportingPeriod.end, reportingPeriod.end);
  assert.throws(() => result.financialInputs.push(input()), TypeError);
  assert.throws(() => { result.financialInputs[0].amountMinor = 0; }, TypeError);
});

test("ECO-1 enforces input identity, currency, period, source and classifications", () => {
  for (const patch of [
    {id: ""}, {organizationId: ""}, {campaignRef: undefined}, {currency: "EUR"}, {version: 0},
    {reportingPeriod: {...reportingPeriod, end: reportingPeriod.start}}, {source: {}}, {evidenceRefs: []},
    {source: {system: "x", recordRef: "y", observedAt: "yesterday"}}, {category: "CLICKS"},
    {classification: "ACTUAL", amountMinor: "5000"}, {amountMinor: .5}, {amountMinor: -1},
    {classification: "UNKNOWN", amountMinor: 0}, {classification: "ESTIMATED", assumptions: []},
    {economicsSchemaVersion: "unsupported"}, {kind: "PaymentSettlement"},
  ]) assert.throws(() => input(patch), /invalid_economics/);
  assert.equal(input({classification: "UNKNOWN", amountMinor: null}).amountMinor, null);
  assert.equal(input({classification: "ESTIMATED", assumptions: ["Ten expected buyers at USD 5."]}).classification, "ESTIMATED");
  assert.equal(input({campaignRef: null}).campaignRef, null);
});

test("ECO-1 rejects duplicate records and incompatible assessment inputs", () => {
  for (const patch of [
    {economicsSchemaVersion: undefined}, {economicsSchemaVersion: "next"}, {kind: "SalesProposal"},
    {financialInputs: [input(), input({id: "second-id"})]},
    {financialInputs: [input({organizationId: "other"})]}, {financialInputs: [input({productRef: "other"})]},
    {financialInputs: [input({campaignRef: null})]},
    {financialInputs: [input({reportingPeriod: {...reportingPeriod, end: "2035-01-03T00:00:00.000Z"}})]},
    {createdAt: "2035-01-01T12:00:00.000Z"}, {evidenceRefs: ["unrelated"]},
    {knownCost: "0"}, {estimatedCost: -1}, {disposition: "CERTIFIED"},
  ]) assert.throws(() => EconomicAssessment(assessment(patch)), /invalid_economics/);
});

test("ECO-1 preserves unknowns and cannot relabel forecasts as observed contribution", () => {
  assert.throws(() => EconomicAssessment(assessment({actualValue: {classification: "ESTIMATED", amount: 50}})), /actualValue/);
  assert.throws(() => EconomicAssessment(assessment({grossContribution: {classification: "UNKNOWN", amount: 0}})), /unknown_amount/);
  assert.throws(() => EconomicAssessment(assessment({grossContribution: {classification: "OBSERVED", amount: 50}})), /contribution_coverage|incomplete_contribution/);
  assert.throws(() => EconomicAssessment(assessment({disposition: "CONTINUE"})), /unknown_cannot_continue/);
  const missing = input({id: "fee:missing", category: "PAYMENT_FEE", classification: "UNKNOWN", amountMinor: null});
  assert.throws(() => EconomicAssessment(assessment({financialInputs: [missing]})), /unknown_cost_omitted/);
  const result = EconomicAssessment(assessment({financialInputs: [missing], unknownCosts: [missing.id], actualValue: unknown()}));
  assert.equal(result.grossContribution.amount, null);
  const estimated = input({classification: "ESTIMATED", assumptions: ["Forecast only"]});
  assert.throws(() => EconomicAssessment(assessment({financialInputs: [estimated], unknownCosts: [], grossContribution: {classification: "OBSERVED", amount: 50}})), /actual_revenue_required|contribution_coverage/);
  assert.throws(() => EconomicAssessment(assessment({financialInputs: [estimated]})), /actual_revenue_required/);
});

test("legacy EconomicAssessment consumers remain compatible", () => {
  const values = assessment();
  delete values.economicsSchemaVersion; delete values.financialInputs;
  values.expectedValue = 50;
  assert.equal(EconomicAssessment(values).expectedValue, 50);
});

function liveFixture({payment = true, settlementAmount = 50} = {}) {
  const s = createControlledLiveService({clock: () => new Date("2035-01-01T12:00:00.000Z"), priceIdProvider: () => "fixture-price"});
  s.create({participantUserId: "fixture"});
  s.authorize({actor: {userId: "fixture-admin", role: "admin"}, validUntil: "2035-01-02T00:00:00.000Z"});
  const step = (to, evidence = {}) => s.transition({participantUserId: "fixture", to, evidence, priceId: "fixture-price"});
  for (const state of ["CONTROLLED_IDENTITY_VERIFIED", "ENTRY_READY", "TRIAL_STARTED", "CHALLENGE_PROVISIONED", "ACCESS_QA", "ENGAGEMENT_OBSERVATION", "CONTINUATION_OFFER_PREPARED", "OFFER_ELIGIBLE", "CHECKOUT_AVAILABLE", "PAYMENT_OBSERVATION"]) step(state, {pass: true});
  if (payment) {
    s.transition({participantUserId: "fixture", to: "PAYMENT_SETTLED", amount: settlementAmount, webhookVerified: true, eventId: "fixture-event"});
    if (s.snapshot().testAState === "STOPPED") return {s, step};
    step("CONTINUATION_PROVISIONED"); step("DELIVERY_QA", {pass: true});
  } else step("DECLINED");
  step("OUTCOME_CAPTURED");
  return {s, step};
}

test("controlled reconciliation and Command Center retain missing costs as unknown", () => {
  for (const evidence of [{}, {stripeFee: 0}, {fulfillmentCost: 0}, {stripeFee: null, fulfillmentCost: null}]) {
    const {s, step} = liveFixture();
    step("ECONOMIC_RECONCILIATION", evidence);
    assert.equal(s.raw().run.payment.settled, 50);
    assert.equal(s.raw().run.economics.netObservedContribution, null);
    assert.equal(s.snapshot().financialExposure.observed.netObservedContribution, null);
    assert.equal(createCommandCenterService({controlledLiveService: s}).economics().netObservedContribution, null);
  }
});

test("controlled reconciliation calculates explicit costs and leaves economic certification pending", () => {
  for (const [evidence, expected] of [[{stripeFee: 0, fulfillmentCost: 0}, 50], [{stripeFee: 1.75, fulfillmentCost: 12.35}, 35.9]]) {
    const {s, step} = liveFixture(); step("ECONOMIC_RECONCILIATION", evidence);
    assert.equal(s.raw().run.economics.netObservedContribution, expected);
    assert.equal(s.snapshot().gates.ECONOMIC_VALIDATION, "NOT_RUN");
  }
  const {s, step} = liveFixture({payment: false}); step("ECONOMIC_RECONCILIATION", {stripeFee: 0, fulfillmentCost: 2});
  assert.equal(s.raw().run.economics.netObservedContribution, -2);
});

test("malformed reconciliation records a first failure without committing bad costs", () => {
  for (const stripeFee of ["0", -1, false, Infinity, .001]) {
    const {s, step} = liveFixture(); step("ECONOMIC_RECONCILIATION", {stripeFee, fulfillmentCost: 0});
    assert.equal(s.snapshot().firstFailure.code, "ECONOMIC_EVIDENCE_INVALID");
    assert.equal(s.raw().run.payment.fee, null);
    assert.equal(s.raw().run.economics.netObservedContribution, null);
  }
});

test("legacy saved contribution is corrected on reads without rewriting historical evidence", t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "economics-"));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const {s, step} = liveFixture(); step("ECONOMIC_RECONCILIATION");
  const legacy = s.raw(); legacy.run.economics.netObservedContribution = 50;
  const filename = path.join(dir, "legacy.json"), original = JSON.stringify(legacy);
  fs.writeFileSync(filename, original);
  const restored = createControlledLiveService({filePath: filename});
  assert.equal(restored.raw().run.economics.netObservedContribution, null);
  assert.deepEqual(restored.raw().evidence, legacy.evidence);
  assert.equal(restored.snapshot().financialExposure.observed.netObservedContribution, null);
  assert.equal(createCommandCenterService({controlledLiveService: restored}).economics().netObservedContribution, null);
  assert.equal(fs.readFileSync(filename, "utf8"), original);
});

// Simulated payment observations only; no external payment/provider is used.
test("malformed and missing settlement amounts cannot become actual revenue", () => {
  for (const settlementAmount of [null, "50", false, -1, .001, Infinity]) {
    const {s} = liveFixture({settlementAmount});
    assert.equal(s.snapshot().firstFailure.code, settlementAmount === Infinity ? "FINANCIAL_EXPOSURE_EXCEEDED" : "ECONOMIC_EVIDENCE_INVALID");
    assert.equal(s.raw().run.payment.settled, 0);
    assert.equal(s.raw().run.payment.chargeCount, 0);
  }
});

test("complete observed financial input coverage is accepted without certifying its source", () => {
  const financialInputs = [["REVENUE", 5000], ["REFUND", 0], ["PAYMENT_FEE", 175], ["FULFILLMENT_COST", 1235], ["ACQUISITION_COST", 0]]
    .map(([category, amountMinor]) => input({id: category, category, amountMinor}));
  const result = EconomicAssessment(assessment({financialInputs, unknownCosts: [], knownCost: 14.1,
    grossContribution: {classification: "OBSERVED", amount: 35.9}, disposition: "CONTINUE"}));
  assert.equal(result.grossContribution.amount, 35.9);
  assert.equal(result.certified, undefined);
});
