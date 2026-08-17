'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { profiles } = require('../src/youth-fitness');

const participantOptions = { participantRef: 'pt_opaque_reference' };
const minimal = (overrides = {}) => ({ age: 12, goals: ['GENERAL_FITNESS'], training_experience: 'BEGINNER', ...overrides });
const resolve = (overrides = {}, options = participantOptions) => profiles.resolveYouthFitnessProfile(minimal(overrides), options);

test('resolves a valid minimal Foundation profile without planning output', () => {
  const result = resolve();
  assert.equal(result.ok, true);
  assert.equal(result.profile.training_level, 'FOUNDATION');
  assert.equal(result.profile.profile_status, 'READY_FOR_PROGRAM_PLANNING');
  assert.match(result.profile.profile_id, /^YFPF-/);
  assert.equal('program' in result.profile, false);
  assert.equal('session' in result.profile, false);
  assert.equal('workout' in result.profile, false);
});

test('resolves every supported age boundary to presentation only', () => {
  for (const [age, band] of [[10, '10_12'], [12, '10_12'], [13, '13_15'], [15, '13_15'], [16, '16_17'], [17, '16_17']]) {
    const result = resolve({ age, training_experience: 'NEW' });
    assert.equal(result.profile.age_band, band);
    assert.equal(result.profile.training_level, 'FOUNDATION');
  }
});

test('rejects missing, non-numeric, and unsupported ages with safe failures', () => {
  const missing = profiles.resolveYouthFitnessProfile({ goals: ['GENERAL_FITNESS'], training_experience: 'NEW' }, participantOptions);
  assert.deepEqual({ ok: missing.ok, error: missing.error, field: missing.field }, { ok: false, error: 'missing_age', field: 'age' });
  assert.equal(resolve({ age: '12' }).error, 'invalid_age');
  for (const age of [9, 18]) {
    const result = resolve({ age });
    assert.equal(result.error, 'unsupported_age');
    assert.equal(result.profile_status, 'UNSUPPORTED');
  }
});

test('requires server-resolved participant identity and ignores browser participant_ref', () => {
  const failure = profiles.resolveYouthFitnessProfile(minimal({ participant_ref: 'browser-id' }));
  assert.equal(failure.error, 'unresolved_participant');
  const result = profiles.resolveYouthFitnessProfile(minimal({ participant_ref: 'browser-id' }), { participantRef: 'server-ref' });
  assert.equal(result.profile.participant_ref, 'server-ref');
});

test('accepts recognized unique goals and rejects missing or unsafe/unknown goals', () => {
  assert.deepEqual(resolve({ goals: ['GET_STRONGER', 'IMPROVE_ENDURANCE', 'GET_STRONGER'] }).profile.goals, ['GET_STRONGER', 'IMPROVE_ENDURANCE']);
  assert.equal(resolve({ goals: [] }).error, 'missing_goals');
  for (const goal of ['LOSE_WEIGHT_FAST', 'GET_SKINNY', 'BURN_CALORIES', 'PUNISHMENT_CONDITIONING', 'MAX_STRENGTH', 'BODYBUILDING', 'POWERLIFTING', 'INVENTED']) assert.equal(resolve({ goals: [goal] }).error, 'invalid_goals');
});

test('validates experience and conservatively downgrades unsupported advancement', () => {
  assert.equal(resolve({ training_experience: 'INTERMEDIATE' }).error, 'invalid_training_experience');
  assert.equal(resolve({ age: 17, training_experience: 'NEW', training_level: 'PROGRESSION' }).profile.training_level, 'FOUNDATION');
  assert.equal(resolve({ training_experience: 'EXPERIENCED', training_level: 'PROGRESSION' }).profile.warnings[0].code, 'TRAINING_LEVEL_DOWNGRADED');
  assert.equal(resolve({ training_level: 'ELITE' }).error, 'invalid_training_level');
  assert.equal(resolve({ training_experience: 'EXPERIENCED', training_level: 'DEVELOPMENT', competency_evidence: { maximum_training_level: 'DEVELOPMENT' } }).profile.training_level, 'DEVELOPMENT');
});

test('applies conservative schedule and equipment defaults and validates both models', () => {
  const profile = resolve().profile;
  assert.deepEqual(profile.schedule, { sessions_per_week: 3, session_minutes: 45, preferred_days: [] });
  assert.deepEqual(profile.equipment, ['BODYWEIGHT']);
  assert.equal(resolve({ schedule: { sessions_per_week: 4, session_minutes: 45 } }).error, 'invalid_sessions_per_week');
  assert.equal(resolve({ schedule: { sessions_per_week: 2, session_minutes: 19 } }).error, 'invalid_session_minutes');
  assert.deepEqual(resolve({ equipment: ['BODYWEIGHT', 'BANDS'] }).profile.equipment, ['BODYWEIGHT', 'BANDS']);
  assert.equal(resolve({ equipment: ['BARBELL'] }).error, 'invalid_equipment');
  assert.equal(resolve({ equipment: null }).error, 'invalid_equipment');
});

test('accepts training categories and rejects diagnosis/anatomical labels', () => {
  assert.deepEqual(resolve({ movement_needs: ['TRUNK_CONTROL', 'LANDING_CONTROL'] }).profile.movement_needs, ['TRUNK_CONTROL', 'LANDING_CONTROL']);
  for (const label of ['tight soleus', 'weak glute medius', 'pelvic dysfunction', 'tight lats', 'bad knees']) assert.equal(resolve({ movement_needs: [label] }).error, 'invalid_movement_needs');
});

test('validates readiness and routes reported pain to coach review without diagnosis', () => {
  const valid = resolve({ readiness: { energy: 4, soreness: 'MILD', sleep_quality: 'FAIR', pain: false } });
  assert.equal(valid.ok, true);
  assert.equal(resolve({ readiness: { energy: 0, soreness: 'NONE', sleep_quality: 'GOOD', pain: false } }).error, 'invalid_energy');
  assert.equal(resolve({ readiness: { energy: 3, soreness: 'SEVERE', sleep_quality: 'GOOD', pain: false } }).error, 'invalid_soreness');
  assert.equal(resolve({ readiness: { energy: 3, soreness: 'NONE', sleep_quality: 'EXCELLENT', pain: false } }).error, 'invalid_sleep_quality');
  const pain = resolve({ readiness: { energy: 3, soreness: 'MILD', sleep_quality: 'FAIR', pain: true } }).profile;
  assert.equal(pain.profile_status, 'COACH_REVIEW_REQUIRED');
  assert.deepEqual(pain.safety_flags, ['PAIN_REPORTED_REQUIRES_COACH_REVIEW']);
});

test('initializes and validates assessment and recent-training placeholders', () => {
  const profile = resolve().profile;
  assert.deepEqual(profile.assessment_profile, { baseline_completed: false, fitness_tests: {}, movement_observations: {}, last_assessed_at: null });
  assert.deepEqual(profile.recent_training_summary, { last_session_at: null, recent_stress_tags: [], high_impact_recently: false, sessions_completed_last_7_days: 0 });
  assert.equal(resolve({ recent_training_summary: { recent_stress_tags: ['INVENTED'] } }).error, 'invalid_recent_stress_tags');
});

test('calculates exclusion-aware consistency safely', () => {
  const profile = resolve({ consistency: { eligible_scheduled_sessions: 3, eligible_completed_sessions: 2, excluded_sessions: 1 } }).profile;
  assert.equal(profile.consistency.percentage, 67);
  assert.equal(resolve().profile.consistency.percentage, null);
  assert.equal(resolve({ consistency: { eligible_scheduled_sessions: 2, eligible_completed_sessions: 3, excluded_sessions: 0 } }).error, 'invalid_consistency');
  assert.equal(profiles.calculateConsistencyPercentage({ eligible_scheduled_sessions: 0, eligible_completed_sessions: 0 }), null);
});

test('documents Phase 3 and names Phase 4 as the next phase', () => {
  const docs = path.join(__dirname, '..', 'docs', 'youth-fitness-program-engine');
  assert.equal(fs.existsSync(path.join(docs, 'YOUTH_FITNESS_PROFILE.md')), true);
  assert.match(fs.readFileSync(path.join(docs, 'PHASE_STATUS.md'), 'utf8'), /PHASE_3_COMPLETE/);
  assert.match(fs.readFileSync(path.join(docs, 'PHASE_STATUS.md'), 'utf8'), /Phase 4 — Program Planner/);
});
