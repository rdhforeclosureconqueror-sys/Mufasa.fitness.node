'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const youthFitness = require('../src/youth-fitness');

const { profiles, planning, sessions, activities } = youthFitness;
function fixture(profileOverrides = {}) {
  const profile = profiles.resolveYouthFitnessProfile({ age: 12, goals: ['GENERAL_FITNESS'], training_experience: 'BEGINNER', equipment: ['BODYWEIGHT', 'WALL', 'BOX_OR_BENCH', 'MAT', 'OPEN_SPACE', 'CONES'], ...profileOverrides }, { participantRef: 'pt_session_participant', profileId: 'YFPF-SESSION' }).profile;
  const program = planning.planYouthFitnessProgram(profile, { programLengthWeeks: 8 }).program;
  return { profile, program, slot: program.weeks[0].session_slots[0] };
}

test('plans a program-bound executable Foundation blueprint with canonical blocks', () => {
  const { profile, program, slot } = fixture();
  const result = sessions.planYouthFitnessSession(profile, program, slot);
  assert.equal(result.ok, true);
  const blueprint = result.session_blueprint;
  assert.equal(blueprint.program_id, program.program_id);
  assert.equal(blueprint.participant_ref, profile.participant_ref);
  assert.equal(blueprint.week_number, 1);
  assert.equal(blueprint.session_code, 'A');
  assert.equal(blueprint.estimated_minutes, slot.session_minutes);
  assert.ok(blueprint.blocks.length > 0);
  assert.deepEqual(new Set(blueprint.blocks.map(({ block_type }) => block_type)), new Set(Object.values(sessions.SESSION_BLOCK_TYPES)));
  for (const type of ['READINESS', 'DYNAMIC_WARMUP', 'SKILL_MOVEMENT_LEARNING', 'STRENGTH_ENDURANCE', 'CONDITIONING_GAME', 'MOBILITY_ACTIVE_RECOVERY', 'BREATHING_RECOVERY', 'REFLECTION_TRACKING']) assert.ok(blueprint.blocks.some((block) => block.block_type === type));
  assert.ok(blueprint.reflection_prompts.length > 0);
  assert.equal(blueprint.education_message.claim_review.allowed, true);
});

test('selects only approved registry records with complete safe output metadata', () => {
  const { profile, program, slot } = fixture();
  const selected = sessions.planYouthFitnessSession(profile, program, slot).session_blueprint.blocks.flatMap((block) => block.activities);
  assert.ok(selected.length >= 3);
  for (const item of selected) {
    assert.ok(activities.getApprovedActivity(item.activity_id));
    assert.ok(item.instructions.length && item.coaching_cues.length && item.stop_conditions.length);
    assert.ok(item.source_rule_ids.length && item.evidence_tag.source_ids.length);
    assert.ok(item.prescription.sets <= 2);
    assert.ok(item.prescription.rest_seconds >= 30 && item.prescription.rest_seconds <= 90);
    assert.match(item.prescription.quality_rule, /technique/i);
  }
  assert.doesNotMatch(JSON.stringify(selected), /maximal lifting|train to failure|punishment|powerlifting|bodybuilding/i);
});

test('bodyweight-only profiles remain feasible and never receive equipment they lack', () => {
  const { profile, program, slot } = fixture({ equipment: ['BODYWEIGHT'] });
  const result = sessions.planYouthFitnessSession(profile, program, slot);
  assert.equal(result.ok, true);
  for (const item of result.session_blueprint.blocks.flatMap((block) => block.activities)) assert.ok(activities.requireApprovedActivity(item.activity_id).equipment.every((equipment) => equipment === 'BODYWEIGHT'));
  assert.ok(result.session_blueprint.validation.warnings.some(({ code }) => code === 'MOVEMENT_TARGET_UNAVAILABLE'));
});

test('fails closed for invalid upstream objects and orphan or copied slots', () => {
  const { profile, program, slot } = fixture();
  assert.equal(sessions.planYouthFitnessSession({}, program, slot).error, 'invalid_profile');
  assert.equal(sessions.planYouthFitnessSession(profile, {}, slot).error, 'invalid_program');
  assert.equal(sessions.planYouthFitnessSession(profile, program, structuredClone(slot)).error, 'orphan_session_slot');
  const mismatch = structuredClone(profile);
  mismatch.participant_ref = 'different';
  assert.equal(sessions.planYouthFitnessSession(mismatch, program, slot).error, 'profile_program_mismatch');
});

test('validator rejects unknown/unavailable activities, level and equipment mismatches', () => {
  const { profile, program, slot } = fixture();
  const blueprint = sessions.planYouthFitnessSession(profile, program, slot).session_blueprint;
  const activity = blueprint.blocks.flatMap((block) => block.activities)[0];
  const unknown = structuredClone(blueprint);
  unknown.blocks.find((block) => block.activities.length).activities[0].activity_id = 'YF-EX-999';
  assert.equal(sessions.validateYouthFitnessSessionBlueprint(unknown).error, 'activity_not_approved_or_available');
  const equipment = structuredClone(blueprint);
  equipment.available_equipment = ['BODYWEIGHT'];
  assert.equal(sessions.validateYouthFitnessSessionBlueprint(equipment).error, 'equipment_mismatch');
  const development = activities.requireApprovedActivity('YF-EX-003');
  const above = structuredClone(blueprint);
  const target = above.blocks.find((block) => block.activities.length).activities[0];
  Object.assign(target, { activity_id: development.activity_id, name: development.name, activity_type: development.activity_type, movement_family: development.movement_families[0], instructions: [...development.instructions], coaching_cues: [...development.coaching_cues], common_errors: [...development.common_errors], stop_conditions: [...development.stop_conditions], evidence_tag: { source_ids: [...development.evidence_tags.source_ids] }, source_rule_ids: [...development.evidence_tags.rule_ids] });
  above.available_equipment = [...new Set([...above.available_equipment, ...development.equipment])];
  assert.equal(sessions.validateYouthFitnessSessionBlueprint(above).error, 'activity_above_training_level');
  assert.ok(activity);
});

test('validator rejects malformed blocks, missing identity, incomplete coaching, and diagnosis language', () => {
  const { profile, program, slot } = fixture();
  const blueprint = sessions.planYouthFitnessSession(profile, program, slot).session_blueprint;
  for (const [mutate, error] of [
    [(copy) => { delete copy.participant_ref; }, 'missing_participant_ref'],
    [(copy) => { copy.blocks[0].block_type = 'INVENTED'; }, 'invalid_block_type'],
    [(copy) => { copy.blocks.find((block) => block.activities.length).activities[0].instructions = []; }, 'missing_instructions'],
    [(copy) => { copy.blocks.find((block) => block.activities.length).activities[0].coaching_cues = []; }, 'missing_coaching_cues'],
    [(copy) => { copy.blocks.find((block) => block.activities.length).activities[0].stop_conditions = []; }, 'missing_stop_conditions'],
    [(copy) => { copy.coach_notes.push('This diagnoses and fixes your injury.'); }, 'medical_diagnosis_language'],
  ]) {
    const copy = structuredClone(blueprint);
    mutate(copy);
    assert.equal(sessions.validateYouthFitnessSessionBlueprint(copy).error, error);
  }
});

test('pain creates non-diagnostic coach review and recent impact filters moderate impact', () => {
  const readiness = { energy: 3, soreness: 'MILD', sleep_quality: 'FAIR', pain: true };
  const recent_training_summary = { last_session_at: null, recent_stress_tags: ['IMPACT', 'HIGH'], high_impact_recently: true, sessions_completed_last_7_days: 1 };
  const { profile, program, slot } = fixture({ readiness, recent_training_summary });
  const blueprint = sessions.planYouthFitnessSession(profile, program, slot).session_blueprint;
  assert.equal(blueprint.status, 'COACH_REVIEW_REQUIRED');
  assert.ok(blueprint.safety_flags.includes('PAIN_REPORTED_REQUIRES_COACH_REVIEW'));
  assert.match(blueprint.coach_notes[0], /Supervising adult should review/);
  assert.doesNotMatch(JSON.stringify(blueprint), /diagnos|push through pain/i);
  assert.ok(blueprint.validation.warnings.some(({ code }) => code === 'RECENT_IMPACT_CONSERVATIVE_FILTER'));
  assert.ok(blueprint.blocks.flatMap((block) => block.activities).every((item) => !['MODERATE', 'HIGH'].includes(activities.requireApprovedActivity(item.activity_id).impact_level)));
});

test('age changes presentation only and planner does not mutate upstream objects', () => {
  const young = fixture({ age: 10 });
  const older = fixture({ age: 17 });
  const beforeProfile = structuredClone(young.profile);
  const beforeProgram = structuredClone(young.program);
  const youngBlueprint = sessions.planYouthFitnessSession(young.profile, young.program, young.slot).session_blueprint;
  const olderBlueprint = sessions.planYouthFitnessSession(older.profile, older.program, older.slot).session_blueprint;
  assert.notEqual(youngBlueprint.name, olderBlueprint.name);
  assert.equal(youngBlueprint.training_level, olderBlueprint.training_level);
  assert.deepEqual(young.profile, beforeProfile);
  assert.deepEqual(young.program, beforeProgram);
});

test('implementation is deterministic, registry-bound, and contains no AI generation', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/youth-fitness/sessions/planner.js'), 'utf8');
  assert.doesNotMatch(source, /openai|anthropic|aiCoach|generateWorkout|free.?text.?exercise/i);
  const first = fixture();
  const second = fixture();
  assert.equal(sessions.planYouthFitnessSession(first.profile, first.program, first.slot).session_blueprint.session_blueprint_id, sessions.planYouthFitnessSession(second.profile, second.program, second.slot).session_blueprint.session_blueprint_id);
});

test('Phase 5 documentation and ledger point explicitly to Phase 6', () => {
  const docs = path.join(__dirname, '..', 'docs/youth-fitness-program-engine');
  assert.equal(fs.existsSync(path.join(docs, 'SESSION_PLANNER.md')), true);
  const status = fs.readFileSync(path.join(docs, 'PHASE_STATUS.md'), 'utf8');
  assert.match(status, /PHASE_5_COMPLETE/);
  assert.match(status, /Phase 6 — Final Safety Validator/);
});
