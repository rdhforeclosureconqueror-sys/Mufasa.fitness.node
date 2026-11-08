'use strict';

/** Conservative gate for research claims entering member-facing responses. */
function evaluateClaim(claim, registry) {
  const reasons = [];
  const source = registry?.sources?.find(s => s.id === claim?.source_id);
  if (!source) reasons.push('SOURCE_NOT_REGISTERED');
  if (!source?.media_verified) reasons.push('PRIMARY_SOURCE_NOT_VERIFIED');
  if (!claim?.locator || typeof claim.locator !== 'string' || !claim.locator.trim()) reasons.push('SOURCE_LOCATOR_MISSING');
  if (claim?.reviewed !== true) reasons.push('HUMAN_REVIEW_MISSING');
  if (claim?.research_status !== 'DIRECT_SOURCE' && claim?.research_status !== 'INDEPENDENTLY_EVALUATED_FINDING') reasons.push('STATUS_NOT_PUBLISHABLE');
  if (claim?.medical_cure_claim === true || claim?.medical_treatment_instruction === true) reasons.push('MEDICAL_CLAIM_REQUIRES_SEPARATE_REVIEW');
  if (claim?.overrides_product_label === true) reasons.push('PRODUCT_LABEL_OVERRIDE_PROHIBITED');
  return { publishable: reasons.length === 0, reasons };
}

function publicClaims(registry) {
  return (registry?.claims || []).filter(c => evaluateClaim(c, registry).publishable);
}

module.exports = { evaluateClaim, publicClaims };
