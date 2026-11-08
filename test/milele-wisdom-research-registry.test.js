const test = require('node:test');
const assert = require('node:assert/strict');
const registry = require('../src/milele-wisdom/research-registry.json');
const { evaluateClaim } = require('../src/milele-wisdom/evidence-gate');
test('Milele research registry preserves verified teachings and provisional leads distinctly', () => {
  assert.equal(registry.version, 1);
  assert.ok(registry.sources.length >= 2);
  assert.equal(new Set(registry.sources.map(s => s.id)).size, registry.sources.length);
  for (const s of registry.sources) {
    assert.match(s.url, /^https:\/\//);
    assert.equal(typeof s.media_verified, 'boolean');
  }
  assert.equal(new Set(registry.claims.map(c => c.id)).size, registry.claims.length);
  for (const claim of registry.claims) {
    assert.ok(registry.sources.some(s => s.id === claim.source_id));
    if (['THIRD_PARTY_TRANSCRIPT_CANDIDATE', 'OFFICIAL_SITE_INTERPRETATION'].includes(claim.research_status)) {
      assert.equal(claim.reviewed, false);
      assert.equal(evaluateClaim(claim, registry).publishable, false);
    } else {
      assert.ok(claim.locator);
      assert.equal(claim.reviewed, true);
    }
  }
  assert.equal(registry.publication_policy.western_scientific_approval_required, false);
  assert.equal(registry.publication_policy.historical_attribution_requires_source_verification, true);
  assert.equal(registry.publication_policy.personalized_treatment_requires_separate_review, true);
  assert.equal(registry.publication_policy.product_label_facts_must_not_be_fabricated, true);
});
