'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { profiles, planning } = require('../src/youth-fitness');

const raw = (overrides = {}) => ({ age: 12, goals: ['GENERAL_FITNESS'], training_experience: 'BEGINNER', ...overrides });
const profile = (overrides = {}, options = {}) => profiles.resolveYouthFitnessProfile(raw(overrides), { participantRef: 'pt_opaque_reference', profileId: options.profileId || 'YFPF-TEST' }).profile;
const plan = (profileOverrides = {}, options = {}) => planning.planYouthFitnessProgram(profile(profileOverrides), options);

test('valid Foundation input produces an identified default 12-week draft', () => {
  const result = plan();
  assert.equal(result.ok, true);
  assert.equal(result.program.participant_ref, 'pt_opaque_reference');
  assert.equal(result.program.profile_id, 'YFPF-TEST');
  assert.equal(result.program.program_length_weeks, 12);
  assert.equal(result.program.training_level, 'FOUNDATION');
  assert.equal(result.program.status, 'DRAFT');
});

test('supports 8, 12, and 32-week phase architectures and rejects other lengths', () => {
  for (const [length, count] of [[8, 3], [12, 3], [32, 4]]) {
    const program = plan({}, { programLengthWeeks: length }).program;
    assert.equal(program.weeks.length, length);
    assert.equal(program.phases.length, count);
    assert.equal(program.phases[0].start_week, 1);
    assert.equal(program.phases.at(-1).end_week, length);
  }
  assert.equal(plan({}, { programLengthWeeks: 10 }).error, 'unsupported_program_length');
});

test('phases cover non-overlapping contiguous weeks and every week owns schedule-matched slots', () => {
  const program = plan({ schedule: { sessions_per_week: 2, session_minutes: 30 } }).program;
  const covered = program.phases.flatMap((phase) => Array.from({ length: phase.end_week - phase.start_week + 1 }, (_, index) => phase.start_week + index));
  assert.deepEqual(covered, Array.from({ length: 12 }, (_, index) => index + 1));
  assert.equal(new Set(covered).size, 12);
  program.weeks.forEach((week, index) => {
    assert.equal(week.week_number, index + 1);
    assert.equal(week.session_count, 2);
    assert.equal(week.session_slots.length, 2);
    assert.ok(program.phases.some((phase) => phase.phase_number === week.phase_number && week.week_number >= phase.start_week && week.week_number <= phase.end_week));
  });
});

test('session slots contain broad targets but no activity selections or workouts', () => {
  const program = plan().program;
  for (const slot of program.weeks.flatMap((week) => week.session_slots)) {
    assert.ok(slot.broad_objectives.length > 0);
    assert.ok(slot.movement_family_targets.length > 0);
    assert.ok(slot.activity_type_targets.length > 0);
    assert.equal('exercise_id' in slot, false);
    assert.equal('game_id' in slot, false);
    assert.equal('activity_id' in slot, false);
    assert.equal('workout' in slot, false);
  }
  assert.equal(planning.containsProhibitedOutput(program), false);
});

test('goals alter emphasis without removing balanced development', () => {
  const stronger = plan({ goals: ['GET_STRONGER'] }).program;
  assert.ok(stronger.emphasis.includes('STRENGTH_ENDURANCE'));
  assert.ok(stronger.emphasis.includes('BALANCED_DEVELOPMENT'));
  const endurance = plan({ goals: ['IMPROVE_ENDURANCE'] }).program;
  assert.ok(endurance.emphasis.includes('AEROBIC_CAPACITY'));
  assert.ok(endurance.weeks[0].session_slots.some((slot) => slot.required_domains.includes('STRENGTH')));
  assert.ok(endurance.weeks[0].session_slots.some((slot) => slot.required_domains.includes('MOBILITY')));
  const consistency = plan({ goals: ['BUILD_CONSISTENCY'] }).program;
  assert.ok(consistency.emphasis.includes('LOW_BARRIER_COMPLETION'));
  assert.equal(consistency.consistency_expectation.language_policy, 'non_shaming');
});

test('age changes presentation but never promotes an inexperienced participant', () => {
  const younger = plan({ age: 10, training_experience: 'NEW' }).program;
  const older = plan({ age: 17, training_experience: 'NEW' }).program;
  assert.equal(younger.age_presentation.style, 'EXPLORATION_AND_GAMES');
  assert.equal(older.age_presentation.style, 'MATURE_TRAINING_FRAME');
  assert.equal(older.training_level, 'FOUNDATION');
});

test('education and assessment metadata are complete and claim-inspected', () => {
  const program = plan().program;
  assert.equal(program.education_sequence.length, 12);
  assert.ok(program.education_sequence.every((lesson) => lesson.claim_review.allowed));
  assert.deepEqual(program.assessment_schedule.checkpoints.map((point) => point.week), [0, 4, 8, 12]);
  assert.equal(program.assessment_schedule.execution_in_phase_4, false);
});

test('pain and baseline flags carry forward while coach-review output stays draft', () => {
  const result = plan({ readiness: { energy: 3, soreness: 'MILD', sleep_quality: 'FAIR', pain: true } });
  assert.equal(result.ok, true);
  assert.ok(result.program.safety_flags.includes('PAIN_REPORTED_REQUIRES_COACH_REVIEW'));
  assert.ok(result.program.safety_flags.includes('BASELINE_NOT_COMPLETED'));
  assert.equal(result.program.status, 'DRAFT');
  assert.match(result.program.planner_notes[0], /coach review/i);
});

test('raw input goes through the canonical resolver and cannot supply its own identity', () => {
  assert.equal(planning.planYouthFitnessProgram(raw()).error, 'unresolved_participant');
  const result = planning.planYouthFitnessProgram(raw({ participant_ref: 'browser-ref' }), { participantRef: 'trusted-ref' });
  assert.equal(result.ok, true);
  assert.equal(result.program.participant_ref, 'trusted-ref');
  assert.equal(planning.planYouthFitnessProgram(raw({ age: 18 }), { participantRef: 'trusted-ref' }).error, 'unsupported_age');
  assert.equal(planning.planYouthFitnessProgram(raw({ goals: ['POWERLIFTING'] }), { participantRef: 'trusted-ref' }).error, 'invalid_goals');
  assert.equal(planning.planYouthFitnessProgram({ profile_id: 'fake', participant_ref: 'fake', version: 1, profile_status: 'READY_FOR_PROGRAM_PLANNING' }).error, 'invalid_resolved_profile');
});

test('program validator accepts planner output and fails closed on structural violations', () => {
  const program = plan().program;
  assert.equal(planning.validateYouthFitnessProgram(program).ok, true);
  const orphan = structuredClone(program);
  orphan.weeks[0].phase_number = 99;
  assert.equal(planning.validateYouthFitnessProgram(orphan).error, 'orphan_week');
  const overlap = structuredClone(program);
  overlap.phases[1].start_week = 4;
  assert.equal(planning.validateYouthFitnessProgram(overlap).error, 'overlapping_phases');
  for (const prohibited of ['exercise_id', 'game_id', 'activity_id']) {
    const selected = structuredClone(program);
    selected.weeks[0].session_slots[0][prohibited] = 'NOT-ALLOWED';
    assert.equal(planning.validateYouthFitnessProgram(selected).error, 'prohibited_generation_output');
  }
  const workout = structuredClone(program);
  workout.weeks[0].workout = {};
  assert.equal(planning.validateYouthFitnessProgram(workout).error, 'prohibited_generation_output');
});

test('planner implementation is deterministic and contains no AI or approved-activity lookup', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/youth-fitness/planning/planner.js'), 'utf8');
  assert.doesNotMatch(source, /openai|anthropic|aiCoach|generateWorkout|requireApprovedActivity/i);
  assert.doesNotMatch(source, /exercise_id|game_id|activity_id/);
  assert.equal(plan().program.program_id, plan().program.program_id);
});

test('Phase 4 documentation names Phase 5 as next phase', () => {
  const docs = path.join(__dirname, '..', 'docs/youth-fitness-program-engine');
  assert.equal(fs.existsSync(path.join(docs, 'PROGRAM_PLANNER.md')), true);
  const status = fs.readFileSync(path.join(docs, 'PHASE_STATUS.md'), 'utf8');
  assert.match(status, /PHASE_4_COMPLETE/);
  assert.match(status, /Phase 5 — Session Planner/);
});
