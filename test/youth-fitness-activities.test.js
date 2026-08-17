'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const youthFitness = require('../src/youth-fitness');

const { activities } = youthFitness;

test('defines the canonical activity enums', () => {
  assert.deepEqual(Object.values(activities.MOVEMENT_FAMILIES), ['SQUAT', 'HINGE', 'PUSH', 'PULL', 'SINGLE_LEG', 'TRUNK', 'CARRY', 'LOCOMOTION', 'JUMP_LAND', 'MOBILITY', 'CONDITIONING', 'BREATHING_RECOVERY', 'MOVEMENT_GAME']);
  assert.deepEqual(Object.values(activities.TRAINING_LEVELS), ['FOUNDATION', 'DEVELOPMENT', 'PROGRESSION']);
  assert.deepEqual(Object.values(activities.IMPACT_LEVELS), ['NONE', 'LOW', 'MODERATE', 'HIGH']);
  assert.equal(Object.isFrozen(activities.EQUIPMENT), true);
});

test('loads distinct, approved exercise and game projections', () => {
  assert.equal(activities.exercises.length, 12);
  assert.equal(activities.games.length, 3);
  assert.equal(activities.activities.length, 15);
  assert.ok(activities.exercises.every((item) => item.activity_type === 'EXERCISE'));
  assert.ok(activities.games.every((item) => item.activity_type === 'GAME' && item.movement_families.includes('MOVEMENT_GAME')));
  assert.ok(activities.activities.every((item) => item.approval.status === 'APPROVED'));
});

test('requires complete coaching, safety, equipment, and evidence metadata', () => {
  for (const item of activities.activities) {
    for (const field of ['instructions', 'coaching_cues', 'common_errors', 'stop_conditions', 'equipment']) assert.ok(item[field].length, `${item.activity_id}.${field}`);
    assert.ok(item.evidence_tags.source_ids.every((id) => youthFitness.evidence.evidenceSources.some((source) => source.source_id === id)));
    assert.ok(item.evidence_tags.rule_ids.every((id) => youthFitness.evidence.youthFitnessRules.some((rule) => rule.rule_id === id)));
    assert.equal(Object.isFrozen(item), true);
  }
});

test('models training level independently from age presentation', () => {
  assert.equal(activities.requireApprovedActivity('YF-EX-001').minimum_training_level, 'FOUNDATION');
  assert.equal(activities.requireApprovedActivity('YF-EX-003').minimum_training_level, 'DEVELOPMENT');
  assert.equal(activities.requireApprovedActivity('YF-EX-010').minimum_training_level, 'DEVELOPMENT');
  assert.equal(activities.requireApprovedActivity('YF-GM-001').minimum_training_level, 'FOUNDATION');
  assert.deepEqual(activities.requireApprovedActivity('YF-EX-001').age_presentation_bands, ['10_12', '13_15', '16_17']);
});

test('approved lookup fails closed', () => {
  assert.equal(activities.getApprovedActivity('YF-EX-999'), null);
  assert.throws(() => activities.requireApprovedActivity('YF-EX-999'), /not in the approved youth registry/);
});

test('rejects unknown enum values and incomplete approvals', () => {
  const base = activities.activities[0];
  assert.throws(() => activities.validateActivity({ ...base, movement_families: ['INVENTED'] }), /Invalid movement_families/);
  assert.throws(() => activities.validateActivity({ ...base, equipment: ['INVENTED'] }), /Invalid equipment/);
  assert.throws(() => activities.validateActivity({ ...base, impact_level: 'INVENTED' }), /Invalid impact_level/);
  assert.throws(() => activities.validateActivity({ ...base, approval: { status: 'APPROVED', version: 1 } }), /approved_by/);
});

test('rejects broken activity relationships and invalid games', () => {
  const base = activities.activities[0];
  assert.throws(() => activities.validateActivityRegistry([{ ...base, progression_ids: ['YF-EX-999'] }]), /Unknown activity relationship/);
  assert.throws(() => activities.validateActivity({ ...activities.games[0], movement_families: ['LOCOMOTION'] }), /MOVEMENT_GAME/);
});

test('documents the Phase 2 boundary and completion ledger', () => {
  const docs = path.join(__dirname, '..', 'docs', 'youth-fitness-program-engine');
  assert.equal(fs.existsSync(path.join(docs, 'ACTIVITY_REGISTRIES.md')), true);
  assert.match(fs.readFileSync(path.join(docs, 'ACTIVITY_REGISTRIES.md'), 'utf8'), /Training levels.*chronological age/s);
  assert.match(fs.readFileSync(path.join(docs, 'PHASE_STATUS.md'), 'utf8'), /PHASE_2_COMPLETE/);
  assert.match(fs.readFileSync(path.join(docs, 'DECISIONS.md'), 'utf8'), /Approval lookup fails closed/);
});
