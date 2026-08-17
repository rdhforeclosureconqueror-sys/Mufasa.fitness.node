'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { profiles, planning, sessions, activities, safety } = require('../src/youth-fitness');

function fixture(profileOverrides = {}) {
  const profile = profiles.resolveYouthFitnessProfile({ age: 12, goals: ['GENERAL_FITNESS'], training_experience: 'BEGINNER', equipment: ['BODYWEIGHT', 'WALL', 'BOX_OR_BENCH', 'MAT', 'OPEN_SPACE', 'CONES'], ...profileOverrides }, { participantRef: 'pt_safety_participant', profileId: 'YFPF-SAFETY' }).profile;
  const program = planning.planYouthFitnessProgram(profile, { programLengthWeeks: 8 }).program;
  const slot = program.weeks[0].session_slots[0];
  const session = sessions.planYouthFitnessSession(profile, program, slot).session_blueprint;
  return { profile, program, slot, session };
}

const validate = (mutate = () => {}, profileOverrides = {}, options) => {
  const original = fixture(profileOverrides);
  const value = { ...original, profile: structuredClone(original.profile), program: structuredClone(original.program), session: structuredClone(original.session) };
  mutate(value);
  return safety.validateYouthFitnessSessionSafety(value.profile, value.program, value.session, { validatedAt: '2026-08-17T00:00:00.000Z', ...options });
};
const first = (session) => session.blocks.find((block) => block.activities.length).activities[0];
const hasCode = (result, code) => [...result.errors, ...result.warnings].some((item) => item.code === code);

test('valid Phase 5 low-risk blueprint passes with canonical rule results', () => {
  const result = validate();
  assert.equal(result.ok, true);
  assert.equal(result.status, 'SAFE_TO_DELIVER');
  assert.equal(result.decision, 'ALLOW');
  assert.equal(result.validator_version, 1);
  assert.ok(result.rule_results.length > 10);
  assert.ok(result.rule_results.every(({ rule_id }) => /^YT-R-\d{3}$/.test(rule_id)));
});

test('missing upstream inputs and reference mismatches fail closed without raw errors', () => {
  const { profile, program, session } = fixture();
  for (const [args, code] of [
    [[null, program, session], 'safety_profile_missing'],
    [[profile, null, session], 'safety_program_missing'],
    [[profile, program, null], 'safety_session_missing'],
  ]) {
    const result = safety.validateYouthFitnessSessionSafety(...args);
    assert.equal(result.ok, false);
    assert.equal(result.decision, 'BLOCK');
    assert.ok(hasCode(result, code));
    assert.equal(JSON.stringify(result).includes('stack'), false);
  }
  assert.ok(hasCode(validate(({ session: value }) => { value.participant_ref = 'wrong'; }), 'safety_reference_mismatch'));
});

test('unsupported age, invalid band, and invalid training level block; age cannot promote level', () => {
  assert.ok(hasCode(validate(({ profile }) => { profile.age = 18; }), 'safety_unsupported_age'));
  assert.ok(hasCode(validate(({ profile }) => { profile.training_level = 'ADVANCED'; }), 'safety_invalid_training_level'));
  const original = fixture({ age: 17, training_experience: 'NEW' });
  const old = { ...original, profile: structuredClone(original.profile), program: structuredClone(original.program), session: structuredClone(original.session) };
  assert.equal(old.profile.training_level, 'FOUNDATION');
  const advanced = activities.requireApprovedActivity('YF-EX-003');
  const result = safety.validateYouthFitnessSessionSafety(old.profile, old.program, replaceActivity(old.session, advanced));
  assert.ok(hasCode(result, 'safety_training_level_exceeded'));
  assert.notEqual(result.decision, 'ALLOW');
});

function replaceActivity(session, registry) {
  const item = first(session);
  Object.assign(item, { activity_id: registry.activity_id, name: registry.name, activity_type: registry.activity_type, movement_family: registry.movement_families[0], instructions: [...registry.instructions], coaching_cues: [...registry.coaching_cues], common_errors: [...registry.common_errors], stop_conditions: [...registry.stop_conditions], regression: registry.regression_ids[0] || null, progression: registry.progression_ids[0] || null, evidence_tag: { source_ids: [...registry.evidence_tags.source_ids] }, source_rule_ids: [...registry.evidence_tags.rule_ids] });
  return session;
}

test('unknown, free-text, AI, unapproved, and unavailable activities are rejected', () => {
  assert.ok(hasCode(validate(({ session }) => { first(session).activity_id = 'YF-EX-999'; }), 'safety_activity_unknown'));
  assert.ok(hasCode(validate(({ session }) => { delete first(session).activity_id; first(session).source = 'FREE_TEXT'; }), 'safety_activity_unknown'));
  assert.ok(hasCode(validate(({ session }) => { first(session).ai_generated = true; }), 'safety_ai_generated_activity_detected'));
  const original = activities.requireApprovedActivity(first(fixture().session).activity_id);
  const draft = { ...original, approval: { ...original.approval, status: 'DRAFT' } };
  assert.ok(hasCode(validate(() => {}, {}, { activityLookup: () => draft }), 'safety_activity_unapproved'));
  const unavailable = { ...original, available: false };
  assert.ok(hasCode(validate(() => {}, {}, { activityLookup: () => unavailable }), 'safety_activity_unavailable'));
});

test('equipment mismatch and advanced activity require regeneration or regression', () => {
  const equipment = validate(({ profile }) => { profile.equipment = ['BODYWEIGHT']; });
  assert.ok(hasCode(equipment, 'safety_equipment_unavailable'));
  assert.equal(equipment.decision, 'REGENERATE');
  const result = validate(({ session }) => replaceActivity(session, activities.requireApprovedActivity('YF-EX-003')));
  assert.ok(hasCode(result, 'safety_training_level_exceeded'));
  assert.equal(result.decision, 'REGRESS_OR_REDUCE');
});

test('hard prohibited automatic prescriptions and unsafe effort language block', () => {
  const phrases = ['Test a 1RM today.', 'Use maximal lifting.', 'Do forced repetitions.', 'Perform power cleans.', 'Perform snatches.', 'Complete bench-press testing.', 'Do punishment burpees.', 'Continue until you vomit.', 'Use a collapse workout.', 'Push through pain.', 'No pain no gain.', 'Destroy yourself.', 'Use intentional dehydration.', 'Use arbitrary water loading.'];
  for (const phrase of phrases) {
    const result = validate(({ session }) => { session.participant_notes.push(phrase); });
    assert.ok(hasCode(result, 'safety_prohibited_prescription'), phrase);
    assert.notEqual(result.decision, 'ALLOW');
  }
  const educational = validate(({ session }) => { session.participant_notes.push('Do not use 1RM testing; it is prohibited.'); });
  assert.equal(educational.ok, true);
});

test('prescription bounds, rest, quality stop rule, and instruction completeness fail closed', () => {
  for (const mutate of [
    (item) => { item.prescription.sets = 9; },
    (item) => { item.prescription.rest_seconds = null; },
    (item) => { item.prescription.quality_rule = 'Work hard.'; },
  ]) assert.equal(validate(({ session }) => mutate(first(session))).ok, false);
  for (const mutate of [
    (item) => { item.instructions = []; },
    (item) => { item.coaching_cues = []; },
    (item) => { item.common_errors = []; },
    (item) => { item.stop_conditions = []; },
    (item) => { item.evidence_tag = null; },
  ]) assert.ok(hasCode(validate(({ session }) => mutate(first(session))), 'safety_instruction_missing'));
});

test('pain is non-diagnostic and requires coach review', () => {
  const result = validate(() => {}, { readiness: { energy: 3, soreness: 'MILD', sleep_quality: 'FAIR', pain: true } });
  assert.equal(result.ok, true);
  assert.equal(result.status, 'COACH_REVIEW_REQUIRED');
  assert.equal(result.decision, 'REQUIRE_COACH_REVIEW');
  assert.equal(result.coach_review_required, true);
  assert.doesNotMatch(JSON.stringify(fixture({ readiness: { energy: 3, soreness: 'MILD', sleep_quality: 'FAIR', pain: true } }).session), /diagnos/i);
});

test('poor readiness, soreness, and recent impact produce conservative warnings', () => {
  const poor = validate(() => {}, { readiness: { energy: 1, soreness: 'NONE', sleep_quality: 'POOR', pain: false } });
  assert.ok(hasCode(poor, 'safety_readiness_reduction_recommended'));
  assert.equal(poor.decision, 'ALLOW_WITH_WARNINGS');
  const sore = validate(() => {}, { readiness: { energy: 3, soreness: 'SIGNIFICANT', sleep_quality: 'GOOD', pain: false } });
  assert.ok(hasCode(sore, 'safety_significant_soreness'));
  assert.equal(sore.decision, 'REQUIRE_COACH_REVIEW');
  const original = fixture({ recent_training_summary: { high_impact_recently: true, recent_stress_tags: ['IMPACT'], sessions_completed_last_7_days: 1 } });
  const recent = { ...original, profile: structuredClone(original.profile), program: structuredClone(original.program), session: structuredClone(original.session) };
  replaceActivity(recent.session, activities.requireApprovedActivity('YF-EX-010'));
  recent.profile.training_level = recent.program.training_level = recent.session.training_level = 'DEVELOPMENT';
  recent.profile.equipment.push('OPEN_SPACE');
  const impact = safety.validateYouthFitnessSessionSafety(recent.profile, recent.program, recent.session);
  assert.ok(hasCode(impact, 'safety_recent_impact_conflict'));
});

test('unsafe medical, injury, weight-loss, and shaming claims are detected', () => {
  for (const [phrase, code] of [
    ['This diagnoses a weak glute.', 'safety_medical_claim_detected'],
    ['This movement predicts injury.', 'safety_injury_prediction_claim_detected'],
    ['This guarantees weight loss.', 'safety_weight_loss_claim_detected'],
    ['You are a lazy failed child.', 'safety_shaming_language_detected'],
  ]) assert.ok(hasCode(validate(({ session }) => { session.coach_notes.push(phrase); }), code));
});

test('validator does not mutate inputs and implementation has no AI calls or side effects', () => {
  const value = fixture();
  const before = structuredClone(value);
  safety.validateYouthFitnessSessionSafety(value.profile, value.program, value.session);
  assert.deepEqual(value, before);
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/youth-fitness/safety/validator.js'), 'utf8');
  assert.doesNotMatch(source, /openai|anthropic|aiCoach|fetch\(|axios|Leader Within/i);
  assert.doesNotMatch(source, /(?:profile|program|sessionBlueprint)\.[a-z_]+\s*=(?!=)/i);
});

test('unknown structure fails closed and hard failures never allow', () => {
  const result = validate(({ session }) => { session.blocks[0].block_type = 'UNKNOWN'; });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'REGENERATE_REQUIRED');
  assert.notEqual(result.decision, 'ALLOW');
  assert.ok(result.required_actions.length);
  assert.ok(result.blocked_reasons.length);
});

test('composed planner and validator helper returns blueprint and decision', () => {
  const { profile, program, slot } = fixture();
  const result = safety.planAndValidateYouthFitnessSession(profile, program, slot, { validation: { validatedAt: '2026-08-17T00:00:00.000Z' } });
  assert.equal(result.ok, true);
  assert.equal(result.validation.status, 'SAFE_TO_DELIVER');
  assert.equal(result.session_blueprint.program_id, program.program_id);
});

test('Phase 6 documentation and ledger point to Phase 7', () => {
  const docs = path.join(__dirname, '..', 'docs', 'youth-fitness-program-engine');
  assert.equal(fs.existsSync(path.join(docs, 'FINAL_SAFETY_VALIDATOR.md')), true);
  const status = fs.readFileSync(path.join(docs, 'PHASE_STATUS.md'), 'utf8');
  assert.match(status, /PHASE_6_COMPLETE/);
  assert.match(status, /Phase 7 — Progression, Regression & Adaptation/);
});
