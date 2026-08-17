'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { profiles, planning, sessions, safety, adaptation } = require('../src/youth-fitness');

function fixture(overrides = {}) {
  const profile = profiles.resolveYouthFitnessProfile({ age: 12, goals: ['GENERAL_FITNESS'], training_experience: 'BEGINNER', equipment: ['BODYWEIGHT', 'WALL', 'BOX_OR_BENCH', 'MAT', 'OPEN_SPACE', 'CONES'], ...overrides }, { participantRef: 'pt_adaptation', profileId: 'YFPF-ADAPT' }).profile;
  const program = planning.planYouthFitnessProgram(profile, { programLengthWeeks: 8 }).program;
  const blueprint = sessions.planYouthFitnessSession(profile, program, program.weeks[0].session_slots[0]).session_blueprint;
  const validation = safety.validateYouthFitnessSessionSafety(profile, program, blueprint, { validatedAt: '2026-08-17T00:00:00.000Z' });
  const result = { session_result_id: 'YFSR-001', session_blueprint_id: blueprint.session_blueprint_id, program_id: program.program_id, profile_id: profile.profile_id, participant_ref: profile.participant_ref, week_number: 1, session_code: 'A', status: 'COMPLETED', completion_quality: 'SUCCESSFUL', completed_blocks: blueprint.blocks.map(({ block_id }) => block_id), skipped_blocks: [], reported_effort: 'MODERATE', readiness_after: { energy: 3, soreness: 'MILD', pain: false }, technique_quality: 'CONTROLLED', participant_reflection: {}, coach_notes: [], safety_flags: [], completed_at: null, version: 1 };
  return { profile, program, blueprint, validation, result };
}
const adapt = (value, options = {}) => adaptation.adaptYouthFitnessProgression(value.profile, value.program, value.blueprint, value.result, { safetyValidation: value.validation, ...options });

test('one successful completion maintains; repeated qualifying success progresses one variable', () => {
  const value = fixture();
  assert.equal(adapt(value).decision, 'MAINTAIN');
  const prior = structuredClone(value.result);
  prior.session_result_id = 'YFSR-PRIOR';
  prior.safety_validation = value.validation;
  const progressed = adapt(value, { recentSessionResults: [prior] });
  assert.equal(progressed.decision, 'PROGRESS_ONE_VARIABLE');
  assert.equal(progressed.progression.variable_count, 1);
  assert.equal(progressed.next_session_adjustments.length, 1);
  assert.equal(Object.values(progressed.next_session_adjustments[0].change).filter((item) => item !== null).length, 1);
});

test('pain, form breakdown, too-hard effort, fatigue, poor readiness, and soreness never progress', () => {
  for (const mutate of [
    (r) => { r.readiness_after.pain = true; r.completion_quality = 'PAIN_REPORTED'; r.safety_flags.push('PAIN_REPORTED_REQUIRES_COACH_REVIEW'); },
    (r) => { r.completion_quality = 'FORM_BREAKDOWN'; r.technique_quality = 'FORM_BREAKDOWN'; },
    (r) => { r.completion_quality = 'TOO_HARD'; r.reported_effort = 'TOO_HARD'; },
    (r) => { r.completion_quality = 'FATIGUE_LIMITED'; },
    (r) => { r.readiness_after.energy = 1; },
    (r) => { r.readiness_after.soreness = 'SIGNIFICANT'; },
  ]) {
    const value = fixture(); mutate(value.result);
    const output = adapt(value, { recentSessionResults: [fixture().result] });
    assert.notEqual(output.decision, 'PROGRESS_ONE_VARIABLE');
  }
  const pain = fixture(); pain.result.readiness_after.pain = true; pain.result.completion_quality = 'PAIN_REPORTED'; pain.result.safety_flags.push('PAIN_REPORTED_REQUIRES_COACH_REVIEW');
  assert.equal(adapt(pain).decision, 'REQUIRE_COACH_REVIEW');
  assert.doesNotMatch(adapt(pain).participant_message, /diagnos|push through pain/i);
});

test('skipped, incomplete, and safety-blocked sessions are not qualifying or punitive', () => {
  const skipped = fixture(); skipped.result.status = 'SKIPPED'; skipped.result.completion_quality = 'NOT_ASSESSED'; skipped.result.completed_blocks = [];
  const output = adapt(skipped);
  assert.equal(output.decision, 'NO_CHANGE_SKIPPED_SESSION');
  assert.equal(output.progression.qualifying_sessions, 0);
  assert.doesNotMatch(JSON.stringify(output), /punishment|lazy|failed|weak/i);
  for (const [status, quality] of [['PARTIAL', 'INCOMPLETE'], ['BLOCKED_BY_SAFETY', 'NOT_ASSESSED']]) {
    const item = fixture(); item.result.status = status; item.result.completion_quality = quality;
    assert.equal(adaptation.isQualifyingSuccessfulSession(item.result, item.validation), false);
  }
});

test('failed Phase 6 validation blocks future delivery and all adjustments require revalidation', () => {
  const value = fixture(); value.validation = { ...value.validation, ok: false, decision: 'BLOCK' };
  const output = adapt(value);
  assert.equal(output.decision, 'BLOCK_UNTIL_REVIEW');
  assert.equal(output.future_delivery_requires_phase_6_validation, true);
  assert.ok(output.next_session_adjustments.every(({ requires_safety_revalidation }) => requires_safety_revalidation));
});

test('recent impact reduces impact and repeated stress cannot trigger impact progression', () => {
  const value = fixture();
  const output = adapt(value, { recentTrainingSummary: { high_impact_recently: true, recent_stress_tags: ['IMPACT'] }, recentSessionResults: [fixture().result] });
  assert.equal(output.decision, 'REDUCE_IMPACT');
  assert.equal(output.next_session_adjustments[0].adjustment_type, 'REDUCE_IMPACT');
});

test('registry paths respect approval, equipment, and training level and never invent relations', () => {
  const value = fixture();
  const prior = structuredClone(value.result); prior.safety_validation = value.validation;
  const output = adapt(value, { recentSessionResults: [prior] });
  const substitution = output.next_session_adjustments[0].change.activity_substitution;
  if (substitution) assert.ok(require('../src/youth-fitness').activities.getApprovedActivity(substitution));
  const bodyweight = fixture({ equipment: ['BODYWEIGHT'] });
  const other = structuredClone(bodyweight.result); other.safety_validation = bodyweight.validation;
  const safe = adapt(bodyweight, { recentSessionResults: [other] });
  assert.equal(safe.next_session_adjustments.length, 1);
  assert.notEqual(safe.next_session_adjustments[0].change.activity_substitution, 'YF-EX-003');
  assert.equal(bodyweight.profile.training_level, 'FOUNDATION');
});

test('completion and adjustment models reject unknown or unsafe combinations', () => {
  const value = fixture();
  for (const [field, unknown, error] of [['status', 'UNKNOWN', 'unknown_completion_status'], ['completion_quality', 'UNKNOWN', 'unknown_completion_quality']]) {
    const copy = structuredClone(value.result); copy[field] = unknown;
    assert.equal(adaptation.validateSessionCompletionResult(copy).error, error);
  }
  const blocked = structuredClone(value.result); blocked.status = 'BLOCKED_BY_SAFETY';
  assert.equal(adaptation.validateSessionCompletionResult(blocked).error, 'safety_block_cannot_be_successful');
  const validAdjustment = { adjustment_type: 'REDUCE_VOLUME', target: { scope: 'SESSION', activity_id: null }, change: { sets_delta: -1 }, reason_code: 'fatigue', requires_safety_revalidation: true };
  assert.equal(adaptation.validateNextSessionAdjustment(validAdjustment).ok, true);
});

test('invalid upstream inputs and reference mismatches fail closed', () => {
  const value = fixture();
  assert.equal(adaptation.adaptYouthFitnessProgression({}, value.program, value.blueprint, value.result).error, 'invalid_profile');
  assert.equal(adaptation.adaptYouthFitnessProgression(value.profile, {}, value.blueprint, value.result).error, 'invalid_program');
  assert.equal(adaptation.adaptYouthFitnessProgression(value.profile, value.program, value.blueprint, {}).error, 'missing_session_result_id');
  const mismatch = structuredClone(value.result); mismatch.participant_ref = 'other';
  assert.equal(adaptation.adaptYouthFitnessProgression(value.profile, value.program, value.blueprint, mismatch).error, 'reference_mismatch');
});

test('engine is deterministic, traceable, non-shaming, AI-free, and does not mutate inputs', () => {
  const value = fixture(); const before = structuredClone(value);
  const first = adapt(value); const second = adapt(value);
  assert.deepEqual(first, second);
  assert.deepEqual(value, before);
  assert.ok(first.rules_applied.length && first.rules_applied.every((rule) => rule.evidence_class === 'CONSERVATIVE_PROGRAM_POLICY'));
  assert.doesNotMatch(first.participant_message, /lazy|failed|punishment|no pain no gain|destroy/i);
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/youth-fitness/adaptation/engine.js'), 'utf8');
  assert.doesNotMatch(source, /openai|anthropic|aiCoach|fetch\(|axios|generateWorkout/i);
});

test('Phase 7 documentation and status point to Phase 8', () => {
  const docs = path.join(__dirname, '..', 'docs/youth-fitness-program-engine');
  assert.equal(fs.existsSync(path.join(docs, 'PROGRESSION_REGRESSION_ADAPTATION.md')), true);
  const status = fs.readFileSync(path.join(docs, 'PHASE_STATUS.md'), 'utf8');
  assert.match(status, /PHASE_7_COMPLETE/);
  assert.match(status, /Phase 8 — Pocket PT Youth Program UI/);
});
