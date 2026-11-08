'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateClaim, evaluateUse, publicClaims } = require('../src/milele-wisdom/evidence-gate');
const registry = require('../src/milele-wisdom/research-registry.json');
const source = { id: 'test-recording', media_verified: true };
const safeRegistry = { sources: [source], claims: [] };
const good = { source_id: source.id, locator: '00:12:34', reviewed: true, research_status: 'DIRECT_SOURCE' };
test('unreviewed registry does not publish historical claims', () => assert.deepEqual(publicClaims(registry), []));
test('verified original teaching can be explained without mainstream approval', () => assert.equal(evaluateClaim(good,safeRegistry).publishable,true));
test('unverified recording cannot be attributed as direct speech', () => assert.ok(evaluateClaim(good,{sources:[{...source,media_verified:false}]}).reasons.includes('SOURCE_CONTENT_NOT_VERIFIED')));
test('missing source locator is blocked', () => assert.equal(evaluateClaim({...good,locator:''},safeRegistry).publishable,false));
test('missing attribution review is blocked', () => assert.equal(evaluateClaim({...good,reviewed:false},safeRegistry).publishable,false));
test('Milele hypothesis cannot masquerade as historical quotation', () => assert.equal(evaluateClaim({...good,research_status:'MILELE_HYPOTHESIS'},safeRegistry).publishable,false));
test('historical cure claims can be documented as teachings', () => assert.equal(evaluateUse({...good,medical_cure_claim:true},safeRegistry,'historical_explanation').allowed,true));
test('historical cure claims cannot automatically become personalized treatment advice', () => assert.equal(evaluateUse({...good,medical_cure_claim:true},safeRegistry,'personalized_advice').allowed,false));
test('historical food classifications may be compared', () => assert.equal(evaluateUse({...good,overrides_product_label:true},safeRegistry,'methodology_comparison').allowed,true));
test('nutrition facts cannot be overwritten by historical classification', () => assert.equal(evaluateUse({...good,overrides_product_label:true},safeRegistry,'food_scanner').allowed,false));
test('unregistered source is blocked', () => assert.equal(evaluateClaim({...good,source_id:'missing'},safeRegistry).publishable,false));

test('five page-anchored Afrika written teachings are available for historical explanation', () => {
  const approved = publicClaims(registry).filter(c => c.source_id === 'afrika-written-interview');
  assert.equal(approved.length, 5);
  for (const claim of approved) assert.match(claim.locator, /^p\\. 148/);
});
test('Afrika historical health claim remains explainable but not automatic personalized advice', () => {
  const claim = registry.claims.find(c => c.id === 'AFRIKA-WR-005');
  assert.equal(evaluateUse(claim, registry, 'historical_explanation').allowed, true);
  assert.equal(evaluateUse(claim, registry, 'personalized_advice').allowed, false);
});
