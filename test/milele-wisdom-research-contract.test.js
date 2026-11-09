'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { RESEARCH_CONTRACT, buildResearchRequest, buildResearchInstructions } = require('../src/milele-wisdom/research-contract');

test('contract preserves provenance and separates history from clinical advice', () => {
  assert.match(RESEARCH_CONTRACT, /Source verification establishes attribution/);
  assert.match(RESEARCH_CONTRACT, /never overwrite them/);
  assert.match(RESEARCH_CONTRACT, /HYPOTHESIS/);
});

test('request is server-side and does not persist responses', () => {
  const r = buildResearchRequest('How does the mineral framework work?', { model: 'test-model' });
  assert.equal(r.model, 'test-model');
  assert.equal(r.store, false);
  assert.equal(r.input, 'How does the mineral framework work?');
  assert.ok(r.instructions.includes('Natural Systems Discovery Engine'));
});

test('rejects blank and oversized questions', () => {
  assert.throws(() => buildResearchRequest(' '), TypeError);
  assert.throws(() => buildResearchRequest('a'.repeat(4001)), RangeError);
});

test('only certified source records enter prompt', () => {
  const s = buildResearchInstructions();
  assert.ok(!s.includes('SEBI-CAND-001'));
  assert.ok(!s.includes('SEBI-OFFICIAL-001'));
});
