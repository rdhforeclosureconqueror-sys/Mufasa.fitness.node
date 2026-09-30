"use strict";
const crypto = require("node:crypto");
const {EconomicInput, ECONOMICS_SCHEMA_VERSION, INPUT_CATEGORIES} = require("./contracts");
const {EconomicAssessment} = require("../organization/contracts");

const ECONOMICS_ENGINE_VERSION = "economics-v2.0.0";
const COST_CATEGORIES = Object.freeze(["ACQUISITION_COST", "PAYMENT_FEE", "FULFILLMENT_COST", "VARIABLE_COST", "LABOR_COST", "FIXED_COST", "ALLOCATED_COST"]);
const VARIABLE_CATEGORIES = Object.freeze(["ACQUISITION_COST", "PAYMENT_FEE", "FULFILLMENT_COST", "VARIABLE_COST", "LABOR_COST"]);
const FIXED_CATEGORIES = Object.freeze(["FIXED_COST", "ALLOCATED_COST"]);
const sorted = values => [...values].sort((a, b) => a.id.localeCompare(b.id));
const dollars = minor => minor === null ? null : minor / 100;
const sum = values => {
  let total = 0n;
  for (const value of values) total += BigInt(value);
  return total <= BigInt(Number.MAX_SAFE_INTEGER) && total >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(total) : null;
};
const roundedQuotient = (numerator, denominator) => {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) return null;
  const negative = numerator < 0, absolute = BigInt(Math.abs(numerator)), divisor = BigInt(denominator);
  const result = (absolute + divisor / 2n) / divisor;
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(negative ? -result : result);
};
const roundedRatio = (numerator, denominator, scale) => {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) return null;
  const negative = numerator < 0, divisor = BigInt(denominator);
  const scaled = BigInt(Math.abs(numerator)) * BigInt(scale);
  const result = (scaled + divisor / 2n) / divisor;
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(negative ? -result : result);
};
function requireThat(condition, code) { if (!condition) throw new Error(`invalid_economics_engine:${code}`); }
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function metric(value, unit, status, formula, inputs, missingInputs, calculatedAt) {
  return {value, unit, status, formula, inputs, missingInputs: [...missingInputs].sort(), engineVersion: ECONOMICS_ENGINE_VERSION, calculatedAt};
}
function validateCount(value, name, optional = true) {
  if (value === null || value === undefined) { requireThat(optional, name); return null; }
  requireThat(Number.isSafeInteger(value) && value >= 0, name); return value;
}
function calculateEconomicAssessment(request = {}, {clock = () => new Date().toISOString()} = {}) {
  requireThat(request.engineVersion === undefined || request.engineVersion === ECONOMICS_ENGINE_VERSION, "engine_version");
  requireThat(Array.isArray(request.financialInputs) && request.financialInputs.length > 0, "financial_inputs");
  const inputs = sorted(request.financialInputs.map(EconomicInput));
  const first = inputs[0], calculatedAt = clock();
  requireThat(typeof calculatedAt === "string" && new Date(calculatedAt).toISOString() === calculatedAt, "calculated_at");
  for (const item of inputs) requireThat(item.organizationId === first.organizationId && item.productRef === first.productRef && item.campaignRef === first.campaignRef && item.currency === first.currency && item.reportingPeriod.start === first.reportingPeriod.start && item.reportingPeriod.end === first.reportingPeriod.end, "mixed_scope_currency_or_period");
  const ids = new Set(), sourceKeys = new Set();
  for (const item of inputs) {
    const sourceKey = JSON.stringify([item.source.system, item.source.recordRef, item.category]);
    requireThat(!ids.has(item.id) && !sourceKeys.has(sourceKey), "duplicate_input"); ids.add(item.id); sourceKeys.add(sourceKey);
  }
  const coverage = request.coverage || {};
  const requiredCosts = coverage.requiredCostCategories || COST_CATEGORIES;
  requireThat(Array.isArray(requiredCosts) && requiredCosts.every(x => COST_CATEGORIES.includes(x)) && new Set(requiredCosts).size === requiredCosts.length, "required_cost_categories");
  const units = validateCount(coverage.units, "units"), newCustomers = validateCount(coverage.newCustomers, "new_customers");
  const byCategory = Object.fromEntries(INPUT_CATEGORIES.map(category => [category, inputs.filter(x => x.category === category)]));
  let derivedPaymentFee = null;
  if (coverage.paymentFeeSchedule !== undefined) {
    const schedule = coverage.paymentFeeSchedule;
    requireThat(schedule && typeof schedule === "object" && !Array.isArray(schedule), "payment_fee_schedule");
    requireThat(Number.isSafeInteger(schedule.fixedMinor) && schedule.fixedMinor >= 0, "payment_fee_fixed");
    requireThat(Number.isSafeInteger(schedule.basisPoints) && schedule.basisPoints >= 0 && schedule.basisPoints <= 10000, "payment_fee_percentage");
    requireThat(Number.isSafeInteger(schedule.transactionCount) && schedule.transactionCount >= 0, "payment_fee_transactions");
    requireThat(!byCategory.PAYMENT_FEE.length, "payment_fee_double_count");
    const revenueForFee = sum(byCategory.REVENUE.filter(x => x.classification !== "UNKNOWN").map(x => x.amountMinor));
    if (revenueForFee !== null && !byCategory.REVENUE.some(x => x.classification === "UNKNOWN")) {
      const fixed = BigInt(schedule.fixedMinor) * BigInt(schedule.transactionCount);
      const percentage = (BigInt(revenueForFee) * BigInt(schedule.basisPoints) + 5000n) / 10000n;
      const total = fixed + percentage;
      derivedPaymentFee = total <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(total) : null;
      requireThat(derivedPaymentFee !== null, "payment_fee_overflow");
    }
  }
  const missingCosts = requiredCosts.filter(category => !byCategory[category].length && !(category === "PAYMENT_FEE" && derivedPaymentFee !== null)).map(category => `category:${category}`);
  const unknownCosts = inputs.filter(x => x.classification === "UNKNOWN" && COST_CATEGORIES.includes(x.category)).map(x => x.id);
  const missingRevenue = byCategory.REVENUE.length ? [] : ["category:REVENUE"];
  const known = category => [...byCategory[category].filter(x => x.classification !== "UNKNOWN").map(x => x.amountMinor), ...(category === "PAYMENT_FEE" && derivedPaymentFee !== null ? [derivedPaymentFee] : [])];
  const categoryTotal = category => sum(known(category));
  const hasEstimate = categories => categories.some(category => byCategory[category].some(x => x.classification === "ESTIMATED"));
  const completeness = categories => categories.flatMap(category => byCategory[category].some(x => x.classification === "UNKNOWN") ? byCategory[category].filter(x => x.classification === "UNKNOWN").map(x => x.id) : (!byCategory[category].length ? [`category:${category}`] : []));
  const gross = categoryTotal("REVENUE"), refunds = categoryTotal("REFUND"), discounts = categoryTotal("DISCOUNT");
  requireThat(gross !== null && refunds !== null && discounts !== null, "revenue_total_overflow");
  const revenueMissing = [...missingRevenue, ...completeness(["REVENUE", "REFUND", "DISCOUNT"])];
  const net = gross === null || revenueMissing.length ? null : sum([gross, -refunds, -discounts]);
  const knownVariable = sum(VARIABLE_CATEGORIES.flatMap(known)), knownFixed = sum(FIXED_CATEGORIES.flatMap(known));
  requireThat(knownVariable !== null && knownFixed !== null, "cost_total_overflow");
  const knownCost = knownVariable === null || knownFixed === null ? null : sum([knownVariable, knownFixed]);
  const costMissing = [...missingCosts, ...unknownCosts];
  const contributionBeforeUnknown = net === null || knownCost === null ? null : sum([net, -knownCost]);
  const trueContribution = costMissing.length ? null : contributionBeforeUnknown;
  const completeStatus = categories => hasEstimate(categories) ? "PARTIAL" : "CALCULATED";
  const metrics = {};
  const put = (name, value, unit, status, formula, used, missing = []) => { metrics[name] = metric(value, unit, status, formula, used, missing, calculatedAt); };
  put("grossRevenue", revenueMissing.length ? null : gross, "MINOR_CURRENCY", revenueMissing.length ? "UNKNOWN" : completeStatus(["REVENUE"]), "sum(REVENUE)", {inputIds: byCategory.REVENUE.map(x => x.id)}, revenueMissing);
  put("refunds", refunds, "MINOR_CURRENCY", completeStatus(["REFUND"]), "sum(REFUND)", {inputIds: byCategory.REFUND.map(x => x.id)});
  put("discounts", discounts, "MINOR_CURRENCY", completeStatus(["DISCOUNT"]), "sum(DISCOUNT)", {inputIds: byCategory.DISCOUNT.map(x => x.id)});
  put("netRevenue", net, "MINOR_CURRENCY", net === null ? "UNKNOWN" : completeStatus(["REVENUE", "REFUND", "DISCOUNT"]), "grossRevenue-refunds-discounts", {grossRevenue:gross, refunds, discounts}, revenueMissing);
  put("knownVariableCost", knownVariable, "MINOR_CURRENCY", "CALCULATED", "sum(known variable costs)", {categories: VARIABLE_CATEGORIES});
  put("knownFixedCost", knownFixed, "MINOR_CURRENCY", "CALCULATED", "sum(known fixed and allocated costs)", {categories: FIXED_CATEGORIES});
  put("totalKnownCost", knownCost, "MINOR_CURRENCY", knownCost === null ? "INVALID" : "CALCULATED", "knownVariableCost+knownFixedCost", {knownVariable, knownFixed});
  put("contributionBeforeUnknownCosts", contributionBeforeUnknown, "MINOR_CURRENCY", contributionBeforeUnknown === null ? "UNKNOWN" : (costMissing.length ? "PARTIAL" : completeStatus(COST_CATEGORIES)), "netRevenue-totalKnownCost", {netRevenue:net, totalKnownCost:knownCost}, revenueMissing);
  put("contribution", trueContribution, "MINOR_CURRENCY", trueContribution === null ? "UNKNOWN" : completeStatus(requiredCosts), "netRevenue-totalCost", {netRevenue:net, totalKnownCost:knownCost}, [...revenueMissing, ...costMissing]);
  const ratio = (numerator, denominator) => denominator > 0 ? roundedRatio(numerator, denominator, 10000) : null;
  put("contributionMargin", trueContribution === null ? null : ratio(trueContribution, net), "BASIS_POINTS", trueContribution === null || !(net > 0) ? (net === 0 ? "NOT_APPLICABLE" : "UNKNOWN") : completeStatus(requiredCosts), "contribution/netRevenue", {contribution:trueContribution, netRevenue:net}, [...costMissing, ...(net === 0 ? ["nonzero:netRevenue"] : revenueMissing)]);
  const perUnit = (value, count) => count > 0 && value !== null ? roundedQuotient(value, count) : null;
  for (const [name,value] of [["unitRevenue",net],["unitCost",costMissing.length?null:knownCost],["unitContribution",trueContribution]]) put(name, perUnit(value, units), "MINOR_CURRENCY_PER_UNIT", units === 0 ? "NOT_APPLICABLE" : value === null || units === null ? "UNKNOWN" : completeStatus(requiredCosts), `${name.replace("unit", "").toLowerCase()}/units`, {value, units}, units === null ? ["units"] : units === 0 ? ["nonzero:units"] : value === null ? costMissing : []);
  const variableContribution = net === null || knownVariable === null ? null : sum([net, -knownVariable]);
  const unitVariableContribution = perUnit(variableContribution, units);
  const breakEven = unitVariableContribution > 0 && !costMissing.length ? Math.ceil(knownFixed / unitVariableContribution) : null;
  put("breakEvenUnits", breakEven, "UNITS", units === 0 ? "NOT_APPLICABLE" : breakEven === null ? "UNKNOWN" : completeStatus(requiredCosts), "ceil(knownFixedCost/unitContributionBeforeFixedCost)", {knownFixedCost:knownFixed, unitContributionBeforeFixedCost:unitVariableContribution}, breakEven === null ? [...costMissing, ...(unitVariableContribution <= 0 ? ["positive:unitContributionBeforeFixedCost"] : []), ...(units === null ? ["units"] : [])] : []);
  const acquisition = categoryTotal("ACQUISITION_COST");
  const acquisitionMissing = completeness(["ACQUISITION_COST"]);
  put("cac", newCustomers > 0 && !acquisitionMissing.length ? roundedQuotient(acquisition, newCustomers) : null, "MINOR_CURRENCY_PER_CUSTOMER", newCustomers === 0 ? "NOT_APPLICABLE" : newCustomers === null || acquisitionMissing.length ? "UNKNOWN" : completeStatus(["ACQUISITION_COST"]), "acquisitionCost/newCustomers", {acquisitionCost:acquisition,newCustomers}, newCustomers === null ? ["newCustomers"] : newCustomers === 0 ? ["nonzero:newCustomers"] : acquisitionMissing);
  put("roas", acquisition > 0 && net !== null && !acquisitionMissing.length ? ratio(net, acquisition) : null, "BASIS_POINTS", acquisitionMissing.length ? "UNKNOWN" : acquisition === 0 ? "NOT_APPLICABLE" : acquisition === null || net === null ? "UNKNOWN" : completeStatus(["REVENUE","REFUND","DISCOUNT","ACQUISITION_COST"]), "netRevenue/acquisitionCost", {netRevenue:net,acquisitionCost:acquisition}, acquisitionMissing.length ? acquisitionMissing : acquisition === 0 ? ["nonzero:acquisitionCost"] : revenueMissing);
  put("roi", knownCost > 0 && trueContribution !== null ? ratio(trueContribution, knownCost) : null, "BASIS_POINTS", knownCost === 0 ? "NOT_APPLICABLE" : trueContribution === null ? "UNKNOWN" : completeStatus(requiredCosts), "contribution/totalCost", {contribution:trueContribution,totalCost:knownCost}, knownCost === 0 ? ["nonzero:totalCost"] : costMissing);
  put("cashRequirement", null, "MINOR_CURRENCY", "UNKNOWN", "requires cash-timing inputs (deferred)", {}, ["cashTiming"]);
  const lineage = Object.entries(metrics).map(([name, value]) => ({metric:name,status:value.status,value:value.value,unit:value.unit,formula:value.formula,inputs:value.inputs,missingInputs:value.missingInputs,engineVersion:value.engineVersion,calculatedAt:value.calculatedAt}));
  const evidenceRefs = [...new Set(inputs.flatMap(x => x.evidenceRefs))].sort();
  const digest = crypto.createHash("sha256").update(JSON.stringify(canonical({engineVersion:ECONOMICS_ENGINE_VERSION, inputs, coverage}))).digest("hex").slice(0,24);
  const estimatedCost = sum(COST_CATEGORIES.flatMap(category => byCategory[category].filter(x=>x.classification==="ESTIMATED").map(x=>x.amountMinor)));
  return EconomicAssessment({id:request.id || `economic:${digest}`, organizationId:first.organizationId, workId:request.workId, productRef:first.productRef, campaignRef:first.campaignRef, currency:first.currency, reportingPeriod:first.reportingPeriod, version:request.version || 1, economicsSchemaVersion:ECONOMICS_SCHEMA_VERSION, engineVersion:ECONOMICS_ENGINE_VERSION, financialInputs:inputs, knownCost:dollars(knownCost), estimatedCost:dollars(estimatedCost), unknownCosts:[...new Set([...unknownCosts,...missingCosts])].sort(), expectedValue:{classification:"UNKNOWN",amount:null}, actualValue:net === null || hasEstimate(["REVENUE","REFUND","DISCOUNT"]) ? {classification:"UNKNOWN",amount:null} : {classification:"OBSERVED",amount:dollars(net)}, grossContribution:trueContribution === null ? {classification:"UNKNOWN",amount:null} : {classification:hasEstimate(requiredCosts)?"ESTIMATED":"OBSERVED",amount:dollars(trueContribution),...(hasEstimate(requiredCosts)?{assumptions:["Contains estimated EconomicInput values."]}:{})}, capacityCost:{classification:"UNKNOWN",amount:null}, riskExposure:costMissing.length?"UNKNOWN":trueContribution < 0?"HIGH":"LOW", breakEvenAssumptions:[], sensitivity:[], disposition:costMissing.length||revenueMissing.length?"NEEDS_MORE_EVIDENCE":trueContribution < 0?"REVISE":"CONTINUE", evidenceRefs, limitations:[...(costMissing.length?[`Contribution is unknown; missing costs: ${costMissing.join(", ")}.`]:[]),"Input source trust and cash timing are outside ECO-2."], metrics, calculationLineage:lineage, createdAt:calculatedAt});
}
module.exports = {ECONOMICS_ENGINE_VERSION, COST_CATEGORIES, calculateEconomicAssessment};
