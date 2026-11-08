const test = require('node:test');
const assert = require('node:assert/strict');
const registry = require('../src/milele-wisdom/research-registry.json');
test('Milele research registry has unique public sources and no unsupported claims', () => {
  assert.equal(registry.version, 1);
  assert.ok(registry.sources.length >= 2);
  assert.equal(new Set(registry.sources.map(s => s.id)).size, registry.sources.length);
  for (const s of registry.sources) {
    assert.match(s.url, /^https:\/\//);
    assert.equal(typeof s.media_verified, 'boolean');
  }
  for (const claim of registry.claims) {
    assert.ok(registry.sources.some(s => s.id === claim.source_id));
    assert.ok(claim.locator);
    assert.equal(claim.reviewed, true);
  }
  assert.equal(registry.publication_policy.requires_primary_source_verified, true);
  assert.equal(registry.publication_policy.unverified_cure_claims_allowed, false);
  assert.equal(registry.publication_policy.allow_hypotheses_to_override_product_labels, false);
});
