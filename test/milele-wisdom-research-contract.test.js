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
  assert.ok(s.includes('contemporary_official_brand_interpretation_not_original_speech'));
  assert.ok(s.includes('drsebis.com/pages/african-bio-mineral-balance'));
  assert.ok(!s.includes('SEBI-OFFICIAL-001'));
});

test('nutrition guide defaults to short conversational answers with optional depth', () => {
  assert.match(RESEARCH_CONTRACT, /under 110 words/);
  assert.match(RESEARCH_CONTRACT, /light, original/);
  assert.match(RESEARCH_CONTRACT, /RESPONSE_MODE:DEEP/);
});

test('alkalinity guidance honors historical framework without false blood pH claims', () => {
  assert.match(RESEARCH_CONTRACT, /central place in the historical framework/);
  assert.match(RESEARCH_CONTRACT, /blood pH is tightly regulated/);
  assert.match(RESEARCH_CONTRACT, /Do not mock, trivialize/);
  assert.match(RESEARCH_CONTRACT, /verified attributed records only/);
});

test('eczema answers separate historical food framework from medical claims', () => {
  assert.match(RESEARCH_CONTRACT, /not an established treatment plan/);
  assert.match(RESEARCH_CONTRACT, /blanket avoidance of all nuts/);
});

test('systems investigations generate testable biological hypotheses', () => {
  assert.match(RESEARCH_CONTRACT, /SYSTEMS INVESTIGATION/);
  assert.match(RESEARCH_CONTRACT, /bromide participates in peroxidasin-mediated collagen IV/);
  assert.match(RESEARCH_CONTRACT, /Do not stop at 'not proven'/);
});

test('research engine labels educated guesses and refuses invented references',()=>{
 assert.match(RESEARCH_CONTRACT,/our working hypothesis/);
 assert.match(RESEARCH_CONTRACT,/RESPONSE_MODE:REFERENCES/);
 assert.match(RESEARCH_CONTRACT,/Never fabricate a citation/);
});
