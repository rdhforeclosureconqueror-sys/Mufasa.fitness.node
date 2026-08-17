'use strict';

const crypto = require('node:crypto');
const { validateYouthFitnessProgram } = require('../planning');
const { validateYouthFitnessSessionBlueprint } = require('../sessions');
const { validateYouthFitnessSessionSafety, SAFETY_DECISIONS } = require('../safety');
const { getApprovedActivity, TRAINING_LEVELS } = require('../activities');
const { PROFILE_STATUSES } = require('../profiles');
const { ADAPTATION_DECISIONS } = require('./constants');
const { validateSessionCompletionResult, validateNextSessionAdjustment } = require('./validator');

const LEVEL_RANK = { [TRAINING_LEVELS.FOUNDATION]: 0, [TRAINING_LEVELS.DEVELOPMENT]: 1, [TRAINING_LEVELS.PROGRESSION]: 2 };
const POLICY_RULE = (rule_id) => Object.freeze({ rule_id, evidence_class: 'CONSERVATIVE_PROGRAM_POLICY' });
const messages = Object.freeze({
  MAINTAIN: 'Great work. We are keeping the next session steady so your body can keep learning.',
  PROGRESS_ONE_VARIABLE: 'You earned a small next step. We are changing one thing at a time.',
  REGRESS: 'We are making the next session a little easier so you can move with control and confidence.',
  REDUCE_VOLUME: 'We are making the next session a little lighter so you can practice with control.',
  REDUCE_IMPACT: 'We are lowering impact for the next session while keeping you on your planned path.',
  REPEAT_OBJECTIVE: 'We will revisit this objective with a steady, manageable next step.',
  REQUIRE_COACH_REVIEW: 'Pain was reported, so an adult or coach should review before continuing.',
  BLOCK_UNTIL_REVIEW: 'An adult or coach needs to review before the next session continues.',
  NO_CHANGE_SKIPPED_SESSION: 'No problem. We will stay on track by returning to the next planned step.',
});

const failure = (error, message, field) => ({ ok: false, error, message, field, version: 1 });
const activityItems = (session) => session.blocks.flatMap((block) => block.activities || []);
function isCanonicalProfile(profile) {
  return profile && typeof profile === 'object' && profile.version === 1 && typeof profile.profile_id === 'string' && typeof profile.participant_ref === 'string' && Object.values(PROFILE_STATUSES).includes(profile.profile_status) && Array.isArray(profile.equipment);
}
function isQualifyingSuccessfulSession(result, safetyValidation) {
  return result.status === 'COMPLETED' && ['SUCCESSFUL', 'SUCCESSFUL_WITH_WARNINGS', 'TOO_EASY'].includes(result.completion_quality) && !result.readiness_after.pain && !result.safety_flags.includes('PAIN_REPORTED_REQUIRES_COACH_REVIEW') && ['CONTROLLED', 'ACCEPTABLE'].includes(result.technique_quality) && result.reported_effort !== 'TOO_HARD' && safetyValidation?.ok === true && !['BLOCK', 'REGENERATE', 'REGRESS_OR_REDUCE', 'REQUIRE_COACH_REVIEW'].includes(safetyValidation.decision);
}
function adjustment(type, scope, reason, change, activityId = null) {
  return Object.freeze({ adjustment_type: type, target: { scope, activity_id: activityId }, change: { sets_delta: null, reps_delta: null, duration_seconds_delta: null, rest_seconds_delta: null, activity_substitution: null, ...change }, reason_code: reason, requires_safety_revalidation: true });
}
function eligibleRelation(session, profile, direction) {
  for (const item of activityItems(session)) {
    const source = getApprovedActivity(item.activity_id);
    if (!source) continue;
    const ids = direction === 'progression' ? source.progression_ids : source.regression_ids;
    for (const id of ids) {
      const candidate = getApprovedActivity(id);
      if (candidate && LEVEL_RANK[candidate.minimum_training_level] <= LEVEL_RANK[profile.training_level] && candidate.equipment.every((equipment) => profile.equipment.includes(equipment))) return { source: item.activity_id, candidate: id };
    }
  }
  return null;
}
function decide(profile, session, result, safetyValidation, recent, history, threshold) {
  const pain = result.readiness_after.pain || result.completion_quality === 'PAIN_REPORTED' || result.safety_flags.includes('PAIN_REPORTED_REQUIRES_COACH_REVIEW');
  if (!safetyValidation.ok || [SAFETY_DECISIONS.BLOCK, SAFETY_DECISIONS.REGENERATE, SAFETY_DECISIONS.REGRESS_OR_REDUCE].includes(safetyValidation.decision)) return { decision: 'BLOCK_UNTIL_REVIEW', reasons: ['safety_validation_failed'], rules: ['YT-R-015'], review: true, adjustments: [] };
  if (pain) return { decision: 'REQUIRE_COACH_REVIEW', reasons: ['pain_reported'], rules: ['YT-R-002', 'YT-R-015'], review: true, adjustments: [adjustment('REDUCE_VOLUME', 'SESSION', 'pain_requires_review', { sets_delta: -1 })] };
  if (result.status === 'SKIPPED') return { decision: 'NO_CHANGE_SKIPPED_SESSION', reasons: ['session_skipped_neutral'], rules: ['YT-R-008'], review: false, adjustments: [] };
  if (result.completion_quality === 'FORM_BREAKDOWN' || result.technique_quality === 'FORM_BREAKDOWN') {
    const relation = eligibleRelation(session, profile, 'regression');
    return { decision: relation ? 'REGRESS' : 'REPEAT_OBJECTIVE', reasons: ['technique_control_lost'], rules: ['YT-R-001', 'YT-R-008'], review: false, adjustments: [relation ? adjustment('REGRESS_ACTIVITY', 'ACTIVITY', 'form_breakdown', { activity_substitution: relation.candidate }, relation.source) : adjustment('REPEAT_OBJECTIVE', 'SESSION', 'form_breakdown', {})] };
  }
  const lowReadiness = result.reported_effort === 'TOO_HARD' || ['TOO_HARD', 'FATIGUE_LIMITED'].includes(result.completion_quality) || result.readiness_after.energy <= 2 || result.readiness_after.soreness === 'SIGNIFICANT' || (recent.sleep_quality === 'POOR' && (recent.energy || result.readiness_after.energy) <= 2);
  if (lowReadiness) return { decision: 'REDUCE_VOLUME', reasons: ['fatigue_or_readiness_limited'], rules: ['YT-R-009'], review: history.filter((item) => ['TOO_HARD', 'FATIGUE_LIMITED', 'INCOMPLETE'].includes(item.completion_quality)).length >= 2, adjustments: [adjustment('REDUCE_VOLUME', 'SESSION', 'fatigue_or_readiness_limited', { sets_delta: -1, rest_seconds_delta: 30 })] };
  const repeatedImpact = recent.high_impact_recently === true || (Array.isArray(recent.recent_stress_tags) && recent.recent_stress_tags.filter((tag) => tag === 'IMPACT').length > 0);
  if (repeatedImpact) return { decision: 'REDUCE_IMPACT', reasons: ['recent_impact_workload'], rules: ['YT-R-009'], review: false, adjustments: [adjustment('REDUCE_IMPACT', 'SESSION', 'recent_impact_workload', {})] };
  const qualifying = history.filter((item) => isQualifyingSuccessfulSession(item, item.safety_validation || safetyValidation)).length + (isQualifyingSuccessfulSession(result, safetyValidation) ? 1 : 0);
  if (qualifying >= threshold) {
    const relation = eligibleRelation(session, profile, 'progression');
    const next = relation ? adjustment('PROGRESS_ACTIVITY', 'ACTIVITY', 'qualifying_success_threshold_met', { activity_substitution: relation.candidate }, relation.source) : adjustment('INCREASE_REPS', 'ACTIVITY', 'qualifying_success_threshold_met', { reps_delta: 1 }, activityItems(session)[0]?.activity_id || null);
    return { decision: 'PROGRESS_ONE_VARIABLE', reasons: [relation ? 'approved_progression_path' : 'volume_progression_only'], rules: ['YT-R-006', 'YT-R-007'], review: false, adjustments: [next] };
  }
  return { decision: 'MAINTAIN', reasons: ['qualifying_success_threshold_not_met'], rules: ['YT-R-007'], review: false, adjustments: [] };
}

function adaptYouthFitnessProgression(profile, program, sessionBlueprint, sessionResult, options = {}) {
  if (!isCanonicalProfile(profile)) return failure('invalid_profile', 'A valid canonical youth fitness profile is required.', 'profile');
  const programCheck = validateYouthFitnessProgram(program);
  if (!programCheck.ok) return failure('invalid_program', programCheck.message, 'program');
  const sessionCheck = validateYouthFitnessSessionBlueprint(sessionBlueprint);
  if (!sessionCheck.ok) return failure('invalid_session_blueprint', sessionCheck.message, 'session_blueprint');
  const resultCheck = validateSessionCompletionResult(sessionResult);
  if (!resultCheck.ok) return failure(resultCheck.error, resultCheck.message, resultCheck.field);
  const refs = [program, sessionBlueprint, sessionResult];
  if (refs.some((item) => item.participant_ref !== profile.participant_ref || item.profile_id !== profile.profile_id) || sessionBlueprint.program_id !== program.program_id || sessionResult.program_id !== program.program_id || sessionResult.session_blueprint_id !== sessionBlueprint.session_blueprint_id || sessionResult.week_number !== sessionBlueprint.week_number || sessionResult.session_code !== sessionBlueprint.session_code) return failure('reference_mismatch', 'Profile, program, blueprint, and completion references must match.', 'references');
  const ownedSlot = program.weeks?.[sessionBlueprint.week_number - 1]?.session_slots?.some((slot) => slot.session_code === sessionBlueprint.session_code);
  if (!ownedSlot) return failure('session_not_in_program', 'Completed session does not belong to the program roadmap.', 'session_blueprint');
  const safetyValidation = options.safetyValidation || validateYouthFitnessSessionSafety(profile, program, sessionBlueprint, options.safetyOptions);
  if (!safetyValidation || typeof safetyValidation.ok !== 'boolean' || !Object.values(SAFETY_DECISIONS).includes(safetyValidation.decision)) return failure('invalid_safety_validation', 'A canonical Phase 6 safety validation is required.', 'safety_validation');
  const history = Array.isArray(options.recentSessionResults) ? options.recentSessionResults.filter((item) => validateSessionCompletionResult(item).ok) : [];
  const recent = options.recentTrainingSummary && typeof options.recentTrainingSummary === 'object' ? options.recentTrainingSummary : profile.recent_training_summary || {};
  const outcome = decide(profile, sessionBlueprint, sessionResult, safetyValidation, recent, history, Number.isInteger(options.minimumQualifyingSessions) && options.minimumQualifyingSessions >= 2 ? options.minimumQualifyingSessions : 2);
  for (const item of outcome.adjustments) if (!validateNextSessionAdjustment(item).ok) return failure('invalid_generated_adjustment', 'Generated adjustment failed validation.', 'next_session_adjustments');
  return Object.freeze({ ok: true, adaptation_id: `YFAD-${crypto.createHash('sha256').update(`${sessionResult.session_result_id}:${outcome.decision}`).digest('hex').slice(0, 12).toUpperCase()}`, decision: ADAPTATION_DECISIONS[outcome.decision], reason_codes: outcome.reasons, next_session_adjustments: outcome.adjustments, progression: { qualifying_sessions: history.filter((item) => isQualifyingSuccessfulSession(item, item.safety_validation || safetyValidation)).length + (isQualifyingSuccessfulSession(sessionResult, safetyValidation) ? 1 : 0), variable_count: outcome.decision === 'PROGRESS_ONE_VARIABLE' ? 1 : 0 }, regression: { applied: ['REGRESS', 'REDUCE_VOLUME', 'REDUCE_IMPACT', 'REPEAT_OBJECTIVE'].includes(outcome.decision) }, safety_flags: [...new Set(sessionResult.safety_flags)], coach_review_required: outcome.review, participant_message: messages[outcome.decision] || messages.MAINTAIN, coach_notes: ['The program roadmap remains unchanged; execution may adapt.', 'Any adjusted future blueprint requires Phase 6 validation before delivery.'], rules_applied: outcome.rules.map(POLICY_RULE), future_delivery_requires_phase_6_validation: true, roadmap_change_required: outcome.decision === 'BLOCK_UNTIL_REVIEW', version: 1 });
}

module.exports = { isQualifyingSuccessfulSession, adaptYouthFitnessProgression, participantMessages: messages };
