"use strict";

// ECO-0 is USD-only. Do not infer a currency or treat an absent cost as zero.
function usdCents(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents) || Math.abs(value * 100 - cents) > 1e-7) return null;
  return cents;
}

function observedContribution(values = {}) {
  const fields = ["settled", "fees", "fulfillmentCost", "refunded", "acquisitionSpend"];
  const unknownFields = [], invalidFields = [], amounts = {};
  for (const field of fields) {
    const value = values[field];
    if (value === null || value === undefined) unknownFields.push(field);
    else if ((amounts[field] = usdCents(value)) === null) invalidFields.push(field);
  }
  let amount = null;
  if (!unknownFields.length && !invalidFields.length) {
    const cents = BigInt(amounts.settled) - BigInt(amounts.fees) - BigInt(amounts.fulfillmentCost)
      - BigInt(amounts.refunded) - BigInt(amounts.acquisitionSpend);
    if (cents > BigInt(Number.MAX_SAFE_INTEGER) || cents < BigInt(Number.MIN_SAFE_INTEGER)) invalidFields.push("total");
    else amount = Number(cents) / 100;
  }
  return Object.freeze({currency: "USD", amount,
    classification: invalidFields.length ? "INVALID" : unknownFields.length ? "UNKNOWN" : "OBSERVED",
    unknownFields: Object.freeze(unknownFields), invalidFields: Object.freeze(invalidFields)});
}

function controlledRunContribution(run = {}) {
  return observedContribution({settled: run.payment?.settled, fees: run.payment?.fee,
    refunded: run.payment?.refund, fulfillmentCost: run.economics?.fulfillmentCost,
    acquisitionSpend: run.economics?.acquisitionSpend});
}

module.exports = {usdCents, observedContribution, controlledRunContribution};
