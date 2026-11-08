'use strict';

/**
 * Attribution gate, not a scientific-consensus gate.
 * Historical teachings may be explained accurately without external validation.
 * Medical recommendations are a separate decision, not a reason to erase history.
 */
function evaluateClaim(claim, registry) {
  const reasons = [];
  const source = registry?.sources?.find(s => s.id === claim?.source_id);
  if (!source) reasons.push('SOURCE_NOT_REGISTERED');
  if (source?.source_content_verified !== true && source?.media_verified !== true) reasons.push('SOURCE_CONTENT_NOT_VERIFIED');
  if (typeof claim?.locator !== 'string' || !claim.locator.trim()) reasons.push('SOURCE_LOCATOR_MISSING');
  if (claim?.reviewed !== true) reasons.push('ATTRIBUTION_REVIEW_MISSING');
  if (!['DIRECT_SOURCE','INDEPENDENTLY_EVALUATED_FINDING'].includes(claim?.research_status)) reasons.push('ATTRIBUTION_STATUS_NOT_VERIFIED');
  return { publishable: reasons.length === 0, reasons };
}

function evaluateUse(claim, registry, use = 'historical_explanation') {
  const attribution = evaluateClaim(claim, registry);
  const reasons = [...attribution.reasons];
  if (use !== 'historical_explanation' && use !== 'methodology_comparison') {
    if (claim?.medical_cure_claim === true || claim?.medical_treatment_instruction === true) reasons.push('PERSONALIZED_MEDICAL_RECOMMENDATION_REQUIRES_SEPARATE_REVIEW');
    if (claim?.overrides_product_label === true) reasons.push('PRODUCT_LABEL_OVERRIDE_PROHIBITED');
  }
  return { allowed: reasons.length === 0, reasons };
}

function publicClaims(registry) {
  return (registry?.claims || []).filter(c => evaluateClaim(c, registry).publishable);
}

module.exports = { evaluateClaim, evaluateUse, publicClaims };
