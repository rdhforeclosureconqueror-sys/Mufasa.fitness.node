"use strict";
const crypto = require("node:crypto");
const {EconomicInput} = require("./contracts");
const {calculateEconomicAssessment} = require("./engine");
const {EconomicAssessment} = require("../organization/contracts");
const {EvidenceRecord, assertEnums} = require("../kernel/contracts");

const ECONOMIC_EVIDENCE_VERSION = "ai-business-os.economic-evidence/1.0.0";
const SOURCE_TYPES = Object.freeze(["PAYMENT_PROCESSOR", "ADVERTISING_PLATFORM", "ANALYTICS_PLATFORM", "CRM", "ACCOUNTING_SYSTEM", "COMMERCE_SYSTEM", "INTERNAL_LEDGER", "HUMAN_ENTRY", "ANALYST_ESTIMATE", "EXPERIMENT_RESULT", "SCOUT_OBSERVATION", "EXTERNAL_DATASET"]);
const FRESHNESS_STATES = Object.freeze(["CURRENT", "STALE", "HISTORICAL", "UNKNOWN"]);
const TRUST_STATES = Object.freeze(["VERIFIED", "SUPPORTED", "ESTIMATED", "STALE", "HISTORICAL", "CONFLICTED", "INSUFFICIENT", "UNKNOWN"]);
const text = value => typeof value === "string" && value.trim().length > 0;
const object = value => value && typeof value === "object" && !Array.isArray(value);
const timestamp = value => typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const period = value => object(value) && timestamp(value.start) && timestamp(value.end) && Date.parse(value.start) < Date.parse(value.end);
const fail = (code, details) => { const error = new Error(`invalid_economic_provenance:${code}`); if (details) error.details = freeze(structuredClone(details)); throw error; };
const requireThat = (condition, code) => { if (!condition) fail(code); };
const canonical = value => Array.isArray(value) ? value.map(canonical) : object(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

function EconomicEvidenceRecord(value = {}) {
  const record = assertEnums(EvidenceRecord({...value, economicEvidenceVersion: ECONOMIC_EVIDENCE_VERSION}));
  requireThat(record.economicEvidenceVersion === ECONOMIC_EVIDENCE_VERSION, "version");
  requireThat(object(record.source) && SOURCE_TYPES.includes(record.source.type) && text(record.source.system) && text(record.source.recordRef), "source");
  requireThat(["AVAILABLE", "UNAVAILABLE"].includes(record.source.availability), "source_availability");
  requireThat(timestamp(record.recordedAt) && timestamp(record.observedAt), "timestamp");
  requireThat(Number.isSafeInteger(record.version) && record.version > 0, "record_version");
  requireThat(object(record.scope) && text(record.scope.organizationId) && text(record.scope.productRef), "scope");
  requireThat(record.scope.campaignRef === null || text(record.scope.campaignRef), "campaign_scope");
  requireThat(record.scope.currency === "USD" && period(record.scope.reportingPeriod), "period_or_currency");
  requireThat(object(record.claim) && text(record.claim.category) && ["ACTUAL", "ESTIMATED", "UNKNOWN"].includes(record.claim.classification), "claim");
  if (record.claim.classification === "UNKNOWN") requireThat(record.claim.amountMinor === null, "unknown_amount_must_be_null");
  else requireThat(Number.isSafeInteger(record.claim.amountMinor) && record.claim.amountMinor >= 0, "claim_amount");
  requireThat(record.supersededBy === null || text(record.supersededBy), "supersededBy");
  requireThat(text(record.payloadHash), "payloadHash");
  return freeze(structuredClone(record));
}

function registryRecords(records) {
  const values = records instanceof Map ? [...records.values()] : Array.isArray(records) ? records : fail("evidence_registry");
  const ids = new Set(), sourceVersions = new Set();
  return values.map(value => {
    const record = EconomicEvidenceRecord(value);
    requireThat(!ids.has(record.id), "duplicate_evidence"); ids.add(record.id);
    const key = JSON.stringify([record.source.system, record.source.recordRef, record.version]);
    requireThat(!sourceVersions.has(key), "duplicate_source_record"); sourceVersions.add(key);
    return record;
  });
}
function sameScope(record, input) {
  const scope = record.scope;
  return scope.organizationId === input.organizationId && scope.productRef === input.productRef && scope.campaignRef === input.campaignRef && scope.currency === input.currency && scope.reportingPeriod.start === input.reportingPeriod.start && scope.reportingPeriod.end === input.reportingPeriod.end;
}
function sameFact(a, b) {
  return a.claim.category === b.claim.category && a.scope.organizationId === b.scope.organizationId && a.scope.productRef === b.scope.productRef && a.scope.campaignRef === b.scope.campaignRef && a.scope.currency === b.scope.currency && a.scope.reportingPeriod.start === b.scope.reportingPeriod.start && a.scope.reportingPeriod.end === b.scope.reportingPeriod.end;
}
function freshness(record, input, asOf, policies) {
  const policy = policies.find(item => (!item.category || item.category === input.category) && (!item.sourceType || item.sourceType === record.source.type));
  if (!policy) return "UNKNOWN";
  requireThat(text(policy.id) && ["EXPIRING", "HISTORICAL"].includes(policy.mode), "freshness_policy");
  if (policy.mode === "HISTORICAL") return Date.parse(input.reportingPeriod.end) <= Date.parse(asOf) ? "HISTORICAL" : "UNKNOWN";
  requireThat(Number.isSafeInteger(policy.maxAgeMs) && policy.maxAgeMs >= 0, "freshness_max_age");
  return Date.parse(asOf) - Date.parse(record.observedAt) <= policy.maxAgeMs ? "CURRENT" : "STALE";
}

function validateEconomicProvenance({financialInputs, evidenceRecords, asOf, freshnessPolicies = []} = {}) {
  requireThat(timestamp(asOf), "as_of");
  requireThat(Array.isArray(financialInputs) && financialInputs.length > 0, "financial_inputs");
  requireThat(Array.isArray(freshnessPolicies), "freshness_policies");
  const inputs = financialInputs.map(EconomicInput).sort((a,b) => a.id.localeCompare(b.id));
  const records = registryRecords(evidenceRecords).sort((a,b) => a.id.localeCompare(b.id));
  const byId = new Map(records.map(record => [record.id, record]));
  const results = [], conflicts = [];
  for (const input of inputs) {
    if (input.classification === "UNKNOWN") {
      requireThat(input.amountMinor === null, "unknown_amount_must_be_null");
      results.push({inputId:input.id, accepted:true, trustState:"UNKNOWN", freshnessState:"UNKNOWN", evidence:[]});
      continue;
    }
    requireThat(new Set(input.evidenceRefs).size === input.evidenceRefs.length, `duplicate_evidence_ref:${input.id}`);
    requireThat(input.evidenceRefs.length > 0, `missing_evidence:${input.id}`);
    const supporting = input.evidenceRefs.map(ref => byId.get(ref) || fail(`evidence_not_registered:${ref}`));
    for (const record of supporting) {
      requireThat(record.source.availability === "AVAILABLE", `source_unavailable:${record.id}`);
      requireThat(sameScope(record, input), `scope_mismatch:${record.id}`);
      requireThat(record.claim.category === input.category && record.claim.amountMinor === input.amountMinor, `claim_mismatch:${record.id}`);
      requireThat(record.source.system === input.source.system && record.source.recordRef === input.source.recordRef, `source_mismatch:${record.id}`);
      requireThat(input.source.recordVersion === record.version && input.source.payloadHash === record.payloadHash, `evidence_version_mismatch:${record.id}`);
      requireThat(Date.parse(record.observedAt) <= Date.parse(asOf), `future_observation:${record.id}`);
      requireThat(Date.parse(record.recordedAt) <= Date.parse(asOf), `future_recording:${record.id}`);
      requireThat(record.supersededBy === null && !records.some(other => other.source.system === record.source.system && other.source.recordRef === record.source.recordRef && other.version > record.version), `superseded:${record.id}`);
      if (input.classification === "ACTUAL") requireThat(record.evidenceType === "OBSERVED_FACT" && record.claim.classification === "ACTUAL", `actual_not_observed:${record.id}`);
      if (input.classification === "ESTIMATED") requireThat(record.claim.classification === "ESTIMATED", `estimate_classification:${record.id}`);
    }
    if (input.classification === "ESTIMATED") requireThat(input.assumptions.length > 0, `estimate_assumptions:${input.id}`);
    const competing = records.filter(record => sameFact(record, supporting[0]) && record.source.availability === "AVAILABLE" && record.supersededBy === null);
    const contradictory = competing.filter(record => record.claim.amountMinor !== input.amountMinor || record.claim.classification !== supporting[0].claim.classification);
    if (contradictory.length) conflicts.push({inputId:input.id, reason:"COMPETING_EVIDENCE_CANNOT_BE_AUTOMATICALLY_RESOLVED", evidenceRefs:[...new Set([...supporting,...contradictory].map(x=>x.id))].sort(), claims:[...supporting,...contradictory].map(x=>({evidenceRef:x.id,classification:x.claim.classification,amountMinor:x.claim.amountMinor,source:x.source})).sort((a,b)=>a.evidenceRef.localeCompare(b.evidenceRef))});
    const states = supporting.map(record => freshness(record, input, asOf, freshnessPolicies));
    const freshnessState = states.includes("STALE") ? "STALE" : states.includes("CURRENT") ? "CURRENT" : states.every(x=>x==="HISTORICAL") ? "HISTORICAL" : "UNKNOWN";
    const trustState = contradictory.length ? "CONFLICTED" : freshnessState === "STALE" ? "STALE" : input.classification === "ESTIMATED" ? "ESTIMATED" : freshnessState === "HISTORICAL" ? "HISTORICAL" : freshnessState === "CURRENT" ? "VERIFIED" : supporting.length ? "SUPPORTED" : "INSUFFICIENT";
    results.push({inputId:input.id,accepted:!["CONFLICTED","STALE","INSUFFICIENT"].includes(trustState),trustState,freshnessState,evidence:supporting.map(record=>({evidenceRef:record.id,evidenceType:record.evidenceType,source:record.source,observedAt:record.observedAt,recordedAt:record.recordedAt,version:record.version,payloadHash:record.payloadHash,claim:record.claim,scope:record.scope})).sort((a,b)=>a.evidenceRef.localeCompare(b.evidenceRef))});
  }
  if (conflicts.length) fail(`conflicted:${conflicts.map(x=>x.inputId).join(",")}`, {state:"CONFLICTED", conflicts});
  requireThat(results.every(result => result.accepted), `input_not_accepted:${results.filter(x=>!x.accepted).map(x=>x.inputId).join(",")}`);
  return freeze({version:ECONOMIC_EVIDENCE_VERSION,asOf,policyRefs:freshnessPolicies.map(x=>x.id).sort(),inputs:results,conflicts,registryDigest:digest(records)});
}

const METRIC_INPUT_CATEGORIES = Object.freeze({
  grossRevenue:["REVENUE"], refunds:["REFUND"], discounts:["DISCOUNT"],
  netRevenue:["REVENUE","REFUND","DISCOUNT"],
  knownVariableCost:["ACQUISITION_COST","PAYMENT_FEE","FULFILLMENT_COST","VARIABLE_COST","LABOR_COST"],
  knownFixedCost:["FIXED_COST","ALLOCATED_COST"],
  totalKnownCost:["ACQUISITION_COST","PAYMENT_FEE","FULFILLMENT_COST","VARIABLE_COST","LABOR_COST","FIXED_COST","ALLOCATED_COST"],
  contributionBeforeUnknownCosts:["REVENUE","REFUND","DISCOUNT","ACQUISITION_COST","PAYMENT_FEE","FULFILLMENT_COST","VARIABLE_COST","LABOR_COST","FIXED_COST","ALLOCATED_COST"],
  contribution:["REVENUE","REFUND","DISCOUNT","ACQUISITION_COST","PAYMENT_FEE","FULFILLMENT_COST","VARIABLE_COST","LABOR_COST","FIXED_COST","ALLOCATED_COST"],
  contributionMargin:["REVENUE","REFUND","DISCOUNT","ACQUISITION_COST","PAYMENT_FEE","FULFILLMENT_COST","VARIABLE_COST","LABOR_COST","FIXED_COST","ALLOCATED_COST"],
  unitRevenue:["REVENUE","REFUND","DISCOUNT"],
  unitCost:["ACQUISITION_COST","PAYMENT_FEE","FULFILLMENT_COST","VARIABLE_COST","LABOR_COST","FIXED_COST","ALLOCATED_COST"],
  unitContribution:["REVENUE","REFUND","DISCOUNT","ACQUISITION_COST","PAYMENT_FEE","FULFILLMENT_COST","VARIABLE_COST","LABOR_COST","FIXED_COST","ALLOCATED_COST"],
  breakEvenUnits:["REVENUE","REFUND","DISCOUNT","ACQUISITION_COST","PAYMENT_FEE","FULFILLMENT_COST","VARIABLE_COST","LABOR_COST","FIXED_COST","ALLOCATED_COST"],
  cac:["ACQUISITION_COST"],
  roas:["REVENUE","REFUND","DISCOUNT","ACQUISITION_COST"],
  roi:["REVENUE","REFUND","DISCOUNT","ACQUISITION_COST","PAYMENT_FEE","FULFILLMENT_COST","VARIABLE_COST","LABOR_COST","FIXED_COST","ALLOCATED_COST"],
  cashRequirement:[]
});

function calculateEvidenceBackedAssessment(request = {}, options = {}) {
  const asOf = options.asOf || options.clock?.();
  const provenance = validateEconomicProvenance({financialInputs:request.financialInputs,evidenceRecords:options.evidenceRecords,asOf,freshnessPolicies:options.freshnessPolicies || []});
  const assessment = calculateEconomicAssessment(request,{clock:options.clock});
  const enriched = structuredClone(assessment);
  enriched.provenance = provenance;
  const canonicalInputs = request.financialInputs.map(EconomicInput);
  const provenanceById = new Map(provenance.inputs.map(input => [input.inputId,input]));
  enriched.calculationLineage = enriched.calculationLineage.map(item => {
    const categories = METRIC_INPUT_CATEGORIES[item.metric] || [];
    const relevantIds = canonicalInputs.filter(input => categories.includes(input.category)).map(input => input.id).sort();
    const sourceTrace = relevantIds.map(inputId => {
      const input = provenanceById.get(inputId);
      return {inputId,trustState:input.trustState,freshnessState:input.freshnessState,evidenceRefs:input.evidence.map(x=>x.evidenceRef)};
    });
    return {...item,sourceTrace};
  });
  return EconomicAssessment(enriched);
}

module.exports = {ECONOMIC_EVIDENCE_VERSION, SOURCE_TYPES, FRESHNESS_STATES, TRUST_STATES, EconomicEvidenceRecord, validateEconomicProvenance, calculateEvidenceBackedAssessment};
