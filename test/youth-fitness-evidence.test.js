'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const evidence = require('../src/youth-fitness/evidence');

test('defines canonical evidence classes and claim strengths', () => {
  assert.deepEqual(Object.values(evidence.EVIDENCE_CLASSES), ['EVIDENCE_CONSENSUS', 'VALIDATED_TEST_PROTOCOL', 'RESEARCH_SUPPORTED', 'CONSERVATIVE_PROGRAM_POLICY', 'COACH_CONFIGURABLE']);
  assert.deepEqual(Object.values(evidence.CLAIM_STRENGTHS), ['CONSENSUS', 'SUPPORTED', 'PROGRAM_POLICY', 'CONFIGURABLE']);
  assert.equal(evidence.isEvidenceClass('invented'), false);
  assert.equal(evidence.isClaimStrength('invented'), false);
});

test('rejects invalid evidence classes and claim strengths', () => {
  const sourceIds = new Set(['SRC001']);
  const rule = { rule_id: 'YT-R-999', name: 'Test', category: 'TEST', description: 'Test rule.', evidence_class: 'BOGUS', claim_strength: 'PROGRAM_POLICY', source_ids: ['SRC001'], hard_rule: true, admin_override: false, active: true, evidence_version: 1 };
  assert.throws(() => evidence.validateYouthFitnessRule(rule, sourceIds), /Invalid evidence class/);
  assert.throws(() => evidence.validateYouthFitnessRule({ ...rule, evidence_class: 'CONSERVATIVE_PROGRAM_POLICY', claim_strength: 'BOGUS' }, sourceIds), /Invalid claim strength/);
});

test('loads complete, bounded evidence sources', () => {
  assert.equal(evidence.evidenceSources.length, 10);
  for (const source of evidence.evidenceSources) {
    assert.ok(source.supports.length);
    assert.ok(source.does_not_establish.length);
    assert.equal(evidence.isEvidenceClass(source.evidence_class_default), true);
  }
});

test('loads rules and validates every evidence link', () => {
  assert.equal(evidence.youthFitnessRules.length, 15);
  const ids = new Set(evidence.evidenceSources.map((source) => source.source_id));
  for (const rule of evidence.youthFitnessRules) {
    assert.equal(evidence.isEvidenceClass(rule.evidence_class), true);
    assert.equal(evidence.isClaimStrength(rule.claim_strength), true);
    assert.equal(rule.hard_rule, true);
    assert.equal(rule.admin_override, false);
    assert.ok(rule.source_ids.every((id) => ids.has(id)));
  }
  assert.throws(() => evidence.validateYouthFitnessRule({ ...evidence.youthFitnessRules[0], rule_id: 'YT-R-999', source_ids: ['SRC999'] }, ids), /Unknown evidence source/);
});

test('keeps conservative policy distinguishable from consensus', () => {
  for (const rule of evidence.youthFitnessRules.filter((item) => item.evidence_class === 'CONSERVATIVE_PROGRAM_POLICY')) {
    assert.equal(rule.claim_strength, 'PROGRAM_POLICY');
  }
  assert.throws(() => evidence.validateYouthFitnessRule({ ...evidence.youthFitnessRules[0], rule_id: 'YT-R-999', claim_strength: 'CONSENSUS' }, new Set(evidence.evidenceSources.map((source) => source.source_id))), /PROGRAM_POLICY/);
});

test('contains the required safety and assessment rules', () => {
  const rules = new Map(evidence.youthFitnessRules.map((rule) => [rule.rule_id, rule]));
  for (const id of ['YT-R-002', 'YT-R-003', 'YT-R-012', 'YT-R-013', 'YT-R-015']) assert.ok(rules.has(id));
});

test('presentation claim policy rejects known overclaims', () => {
  assert.equal(evidence.inspectPresentationClaim('Appropriately designed youth resistance training can support fitness.').allowed, true);
  assert.equal(evidence.inspectPresentationClaim('This program guarantees weight loss.').allowed, false);
  assert.equal(evidence.inspectPresentationClaim('This movement screen predicts injury.').allowed, false);
});

test('Phase 1 documentation and ledger obligations exist', () => {
  const docs = path.join(__dirname, '..', 'docs', 'youth-fitness-program-engine');
  for (const file of ['EVIDENCE_ARCHITECTURE.md', 'RULE_MODEL.md', 'CLAIMS_POLICY.md', 'PHASE_STATUS.md', 'DECISIONS.md', 'DEFERRED.md']) assert.equal(fs.existsSync(path.join(docs, file)), true);
  assert.match(fs.readFileSync(path.join(docs, 'PHASE_STATUS.md'), 'utf8'), /Phase 2 — Approved Exercise \+ Game Registries/);
  assert.match(fs.readFileSync(path.join(docs, 'DECISIONS.md'), 'utf8'), /does_not_establish/);
  assert.match(fs.readFileSync(path.join(docs, 'DEFERRED.md'), 'utf8'), /Full admin evidence editor/);
});
