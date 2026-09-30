"use strict";
const {usdCents} = require("./contribution");
const ECONOMICS_SCHEMA_VERSION = "ai-business-os.economics/1.0.0";
const INPUT_CLASSIFICATIONS = Object.freeze(["ACTUAL", "ESTIMATED", "UNKNOWN"]);
const INPUT_CATEGORIES = Object.freeze(["REVENUE", "REFUND", "DISCOUNT", "ACQUISITION_COST", "PAYMENT_FEE", "FULFILLMENT_COST", "VARIABLE_COST", "LABOR_COST", "FIXED_COST", "ALLOCATED_COST", "TRANSFER"]);
const METRIC_STATUSES = Object.freeze(["CALCULATED", "PARTIAL", "UNKNOWN", "INVALID", "NOT_APPLICABLE"]);
const RECONCILIATION_STATUSES = Object.freeze(["RECONCILED", "PARTIALLY_RECONCILED", "INSUFFICIENT_ACTUALS", "NON_COMPARABLE", "INVALID"]);
const COMPARISON_STATUSES = Object.freeze(["FAVORABLE", "UNFAVORABLE", "ON_PLAN", "PARTIAL", "UNKNOWN", "NOT_APPLICABLE", "INVALID"]);
const text = value => typeof value === "string" && value.trim().length > 0;
const list = value => Array.isArray(value) && value.every(text);
const object = value => value && typeof value === "object" && !Array.isArray(value);
function requireThat(condition, code) { if (!condition) throw new Error(`invalid_economics:${code}`); }
function timestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function period(value) {
  requireThat(object(value) && timestamp(value.start) && timestamp(value.end) && Date.parse(value.start) < Date.parse(value.end), "reporting_period");
}
function freeze(value) {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function validateInput(value) {
  requireThat(object(value), "input");
  requireThat(value.kind === "EconomicInput" && value.economicsSchemaVersion === ECONOMICS_SCHEMA_VERSION, "input_version");
  for (const key of ["id", "organizationId", "productRef"]) requireThat(text(value[key]), key);
  requireThat(value.campaignRef === null || text(value.campaignRef), "campaignRef");
  requireThat(Number.isSafeInteger(value.version) && value.version > 0, "version");
  requireThat(value.currency === "USD", "unsupported_currency");
  period(value.reportingPeriod);
  requireThat(INPUT_CATEGORIES.includes(value.category), "category");
  requireThat(INPUT_CLASSIFICATIONS.includes(value.classification), "classification");
  if (value.classification === "UNKNOWN") requireThat(value.amountMinor === null, "unknown_amount_must_be_null");
  else requireThat(Number.isSafeInteger(value.amountMinor) && value.amountMinor >= 0, "amountMinor");
  requireThat(list(value.assumptions), "assumptions");
  if (value.classification === "ESTIMATED") requireThat(value.assumptions.length > 0, "estimate_assumptions");
  requireThat(list(value.evidenceRefs), "evidenceRefs");
  if (value.classification !== "UNKNOWN") requireThat(value.evidenceRefs.length > 0, "evidenceRefs");
  requireThat(object(value.source) && text(value.source.system) && text(value.source.recordRef) && timestamp(value.source.observedAt), "source");
  return value;
}
function EconomicInput(value = {}) {
  requireThat(object(value), "input");
  requireThat(value.kind === undefined || value.kind === "EconomicInput", "input_kind");
  requireThat(value.economicsSchemaVersion === undefined || value.economicsSchemaVersion === ECONOMICS_SCHEMA_VERSION, "input_version");
  const record = structuredClone({...value, kind: "EconomicInput", economicsSchemaVersion: ECONOMICS_SCHEMA_VERSION});
  validateInput(record);
  return freeze(record);
}

// This extends Organization.EconomicAssessment; it is not a second assessment or ledger.
function validateEconomicAssessment(value) {
  requireThat(value.economicsSchemaVersion === ECONOMICS_SCHEMA_VERSION, "assessment_version");
  requireThat(value.kind === "EconomicAssessment" && value.contractVersion === "ai-business-os.organization/1.0.0", "assessment_contract");
  for (const key of ["id", "organizationId", "workId", "productRef"]) requireThat(text(value[key]), key);
  requireThat(value.campaignRef === null || text(value.campaignRef), "campaignRef");
  requireThat(Number.isSafeInteger(value.version) && value.version > 0, "version");
  requireThat(value.currency === "USD", "unsupported_currency");
  period(value.reportingPeriod);
  requireThat(timestamp(value.createdAt), "createdAt");
  requireThat(Array.isArray(value.financialInputs) && value.financialInputs.length > 0, "financialInputs");
  requireThat(list(value.evidenceRefs) && value.evidenceRefs.length > 0, "evidenceRefs");
  for (const key of ["unknownCosts", "limitations", "breakEvenAssumptions"]) requireThat(list(value[key]), key);
  const ids = new Set(), sources = new Set();
  for (const input of value.financialInputs) {
    validateInput(input);
    requireThat(input.organizationId === value.organizationId && input.productRef === value.productRef && input.campaignRef === value.campaignRef, "input_scope");
    requireThat(input.currency === value.currency && input.reportingPeriod.start === value.reportingPeriod.start && input.reportingPeriod.end === value.reportingPeriod.end, "input_period_or_currency");
    requireThat(Date.parse(input.source.observedAt) <= Date.parse(value.createdAt), "future_source");
    requireThat(input.evidenceRefs.every(ref => value.evidenceRefs.includes(ref)), "input_evidence_missing");
    const sourceKey = JSON.stringify([input.source.system, input.source.recordRef, input.category]);
    requireThat(!ids.has(input.id) && !sources.has(sourceKey), "duplicate_input");
    ids.add(input.id); sources.add(sourceKey);
    if (input.classification === "UNKNOWN" && (input.category.endsWith("COST") || input.category === "PAYMENT_FEE")) {
      requireThat(value.unknownCosts.includes(input.id), "unknown_cost_omitted");
    }
  }
  for (const key of ["knownCost", "estimatedCost"]) requireThat(usdCents(value[key]) !== null, key);
  for (const key of ["actualValue", "grossContribution", "capacityCost", "expectedValue"]) {
    const item = value[key];
    const allowed = key === "actualValue" ? ["UNKNOWN", "OBSERVED"] : key === "expectedValue" ? ["UNKNOWN", "ESTIMATED"] : ["UNKNOWN", "OBSERVED", "ESTIMATED"];
    requireThat(object(item) && allowed.includes(item.classification), key);
    if (item.classification === "UNKNOWN") requireThat(item.amount === null, `${key}_unknown_amount`);
    else {
      requireThat(typeof item.amount === "number" && usdCents(["grossContribution", "actualValue"].includes(key) ? Math.abs(item.amount) : item.amount) !== null, `${key}_amount`);
      if (item.classification === "ESTIMATED") requireThat(list(item.assumptions) && item.assumptions.length > 0, `${key}_assumptions`);
    }
  }
  requireThat(["CONTINUE", "REVISE", "PAUSE", "REJECT", "NEEDS_MORE_EVIDENCE", "ESCALATE"].includes(value.disposition), "disposition");
  requireThat(["LOW", "MEDIUM", "HIGH", "UNKNOWN"].includes(value.riskExposure), "riskExposure");
  requireThat(Array.isArray(value.sensitivity), "sensitivity");
  if (Object.hasOwn(value, "engineVersion") || Object.hasOwn(value, "metrics") || Object.hasOwn(value, "calculationLineage")) {
    requireThat(text(value.engineVersion), "engineVersion");
    requireThat(object(value.metrics) && Array.isArray(value.calculationLineage), "calculation_output");
    for (const [name, metric] of Object.entries(value.metrics)) {
      requireThat(text(name) && object(metric) && METRIC_STATUSES.includes(metric.status), `metric:${name}`);
      requireThat(metric.value === null || Number.isSafeInteger(metric.value), `metric_value:${name}`);
      requireThat(text(metric.unit), `metric_unit:${name}`);
      if (["UNKNOWN", "INVALID", "NOT_APPLICABLE"].includes(metric.status)) requireThat(metric.value === null, `metric_null:${name}`);
    }
    const names = new Set(Object.keys(value.metrics));
    for (const item of value.calculationLineage) {
      requireThat(object(item) && names.has(item.metric) && item.status === value.metrics[item.metric].status, "lineage_metric");
      requireThat(text(item.formula) && item.engineVersion === value.engineVersion && timestamp(item.calculatedAt), "lineage_identity");
      requireThat(object(item.inputs) && list(item.missingInputs), "lineage_inputs");
    }
  }
  if (value.actualValue.classification === "OBSERVED") {
    requireThat(value.financialInputs.some(x => x.category === "REVENUE" && x.classification === "ACTUAL"), "actual_revenue_required");
  }
  if (value.grossContribution.classification === "OBSERVED" && !value.engineVersion) {
    for (const category of ["REVENUE", "REFUND", "ACQUISITION_COST", "PAYMENT_FEE", "FULFILLMENT_COST"]) {
      requireThat(value.financialInputs.some(x => x.category === category && x.classification === "ACTUAL"), `contribution_coverage:${category}`);
    }
  }
  if (value.engineVersion && value.grossContribution.classification !== "UNKNOWN") {
    requireThat(value.metrics.contribution.value === Math.round(value.grossContribution.amount * 100), "engine_contribution_mismatch");
  }
  if (value.unknownCosts.length || value.financialInputs.some(x => x.classification === "UNKNOWN" && x.category !== "TRANSFER")) {
    requireThat(value.grossContribution.classification === "UNKNOWN", "incomplete_contribution");
    requireThat(value.disposition !== "CONTINUE", "unknown_cannot_continue");
  }
  if (value.financialInputs.some(x => x.classification === "ESTIMATED" && x.category !== "TRANSFER")) {
    requireThat(value.grossContribution.classification !== "OBSERVED", "estimated_is_not_observed");
  }
  return freeze(structuredClone(value));
}

function EconomicReconciliation(value = {}) {
  requireThat(value.kind === undefined || value.kind === "EconomicReconciliation", "reconciliation_kind");
  for (const field of ["id","organizationId","workId","proposalRef","runRef","experimentResultRef","baselineEconomicAssessmentRef","actualEconomicAssessmentRef","decisionRef","reportingPeriod","asOf","metricComparisons","status","limitations","createdAt","version","engineVersion","policyVersion"]) requireThat(value[field] !== undefined, `reconciliation_${field}`);
  for (const field of ["id","organizationId","workId","decisionRef","engineVersion","policyVersion"]) requireThat(text(value[field]), `reconciliation_${field}`);
  period(value.reportingPeriod);
  requireThat(timestamp(value.asOf) && timestamp(value.createdAt), "reconciliation_timestamp");
  requireThat(Number.isSafeInteger(value.version) && value.version > 0, "reconciliation_version");
  requireThat(RECONCILIATION_STATUSES.includes(value.status), "reconciliation_status");
  requireThat(object(value.runRef) && text(value.runRef.runId) && text(value.runRef.digest) && text(value.runRef.status) && text(value.runRef.proposalRef) && Number.isSafeInteger(value.runRef.proposalVersion), "reconciliation_run_ref");
  for (const ref of [value.proposalRef,value.experimentResultRef,value.baselineEconomicAssessmentRef,value.actualEconomicAssessmentRef]) requireThat(object(ref) && text(ref.artifactType) && text(ref.artifactId) && Number.isSafeInteger(ref.version) && ref.version > 0 && text(ref.digest) && ref.organizationId === value.organizationId && ref.workId === value.workId, "reconciliation_artifact_ref");
  requireThat(Array.isArray(value.metricComparisons) && value.metricComparisons.every(item => item && text(item.metric) && text(item.direction) && COMPARISON_STATUSES.includes(item.comparisonStatus) && object(item.expected) && object(item.actual) && object(item.absoluteVariance) && object(item.relativeVariance)), "metric_comparisons");
  requireThat(Array.isArray(value.limitations) && value.limitations.every(text), "reconciliation_limitations");
  return Object.freeze(structuredClone({...value,kind:"EconomicReconciliation",contractVersion:ECONOMICS_SCHEMA_VERSION}));
}
module.exports = {ECONOMICS_SCHEMA_VERSION, INPUT_CLASSIFICATIONS, INPUT_CATEGORIES, METRIC_STATUSES, RECONCILIATION_STATUSES, COMPARISON_STATUSES, EconomicInput, validateEconomicAssessment, EconomicReconciliation};
