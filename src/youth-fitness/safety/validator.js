'use strict';

const { activities, TRAINING_LEVELS, AGE_PRESENTATION_BANDS, MOVEMENT_FAMILIES, ACTIVITY_TYPES } = require('../activities');
const { resolveAgeBand } = require('../profiles');
const { validateYouthFitnessProgram } = require('../planning');
const { LEVEL_RANK, SESSION_BLOCK_TYPES } = require('../sessions/constants');
const { SAFETY_STATUSES, SAFETY_DECISIONS } = require('./constants');

const VALIDATOR_VERSION = 1;
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const enumHas = (enumeration, value) => Object.values(enumeration).includes(value);
const sameList = (left, right) => Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => item === right[index]);
const flattenActivities = (session) => Array.isArray(session?.blocks) ? session.blocks.flatMap((block) => Array.isArray(block.activities) ? block.activities.map((activity) => ({ activity, block })) : []) : [];

const languageRules = [
  ['safety_medical_claim_detected', /\b(?:diagnos(?:e|ed|is)|tight soleus|weak glute|pelvic dysfunction|cures?|treats?|fix(?:es)? (?:your|the) (?:pain|injury))\b/i],
  ['safety_injury_prediction_claim_detected', /\b(?:predicts?|prevents?) (?:all )?injur(?:y|ies)\b/i],
  ['safety_weight_loss_claim_detected', /\b(?:guarantees? weight loss|weight[- ]loss competition|burn off (?:food|calories)|calorie[- ]compensation)\b/i],
  ['safety_shaming_language_detected', /\b(?:lazy|failed child|punish(?:ment)? (?:exercise|running|push[- ]?ups?|burpees?))\b/i],
  ['safety_prohibited_prescription', /\b(?:1\s*RM|one[- ]rep(?:etition)? max(?:imum)?|maximal lifting|maximal barbell squats?|forced rep(?:etition)?s?|intentional technical failure|power cleans?|snatches?|bench[- ]press testing|powerlifting program|bodybuilding program|punishment running|punishment push[- ]?ups?|punishment burpees?|exercise[- ]to[- ]vomiting|vomit challenge|collapse workout|no pain[, ]+no gain|destroy yourself|push through pain|intentional dehydration|arbitrary water loading|until (?:you cannot move|collapse|you vomit)|as many as possible until failure)\b/i],
];

function actualSessionStrings(session) {
  const found = [];
  const visit = (value, key = '') => {
    if (typeof value === 'string' && !['rule_results', 'validation'].includes(key)) found.push(value);
    else if (Array.isArray(value)) value.forEach((item) => visit(item, key));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([childKey, child]) => visit(child, childKey));
  };
  visit(session);
  return found;
}

function validateYouthFitnessSessionSafety(profile, program, sessionBlueprint, options = {}) {
  const results = [];
  const errors = [];
  const warnings = [];
  const requiredActions = new Set();
  const blockedReasons = new Set();
  const add = (ruleId, name, status, severity, message, code, action) => {
    results.push({ rule_id: ruleId, name, status, severity, message, evidence_class: 'CONSERVATIVE_PROGRAM_POLICY' });
    if (status === 'FAIL') {
      errors.push({ code, message });
      blockedReasons.add(code);
      if (action) requiredActions.add(action);
    } else if (status === 'WARN') {
      warnings.push({ code, message });
      if (action) requiredActions.add(action);
    }
  };
  const pass = (id, name, message) => add(id, name, 'PASS', 'HARD', message);
  const fail = (id, name, message, code, action = 'BLOCK_DELIVERY') => add(id, name, 'FAIL', 'HARD', message, code, action);
  const warn = (id, name, message, code, action) => add(id, name, 'WARN', 'WARNING', message, code, action);

  const profileValid = profile && typeof profile === 'object' && text(profile.profile_id) && text(profile.participant_ref);
  if (!profileValid) fail('YT-R-015', 'Canonical profile required', 'A valid resolved Youth Fitness Profile is required.', 'safety_profile_missing');
  else pass('YT-R-015', 'Canonical profile required', 'Resolved profile identity is present.');

  const programValidation = program ? validateYouthFitnessProgram(program) : { ok: false };
  if (!program) fail('YT-R-016', 'Canonical program required', 'A Youth Fitness Program is required.', 'safety_program_missing');
  else if (!programValidation.ok) fail('YT-R-016', 'Canonical program required', 'The Youth Fitness Program is not valid for delivery.', 'safety_program_invalid');
  else pass('YT-R-016', 'Canonical program required', 'Program structure is valid.');

  if (!sessionBlueprint || typeof sessionBlueprint !== 'object' || Array.isArray(sessionBlueprint)) fail('YT-R-017', 'Session blueprint required', 'A Phase 5 session blueprint is required.', 'safety_session_missing');
  else pass('YT-R-017', 'Session blueprint required', 'Session blueprint is present.');

  if (profileValid && program && sessionBlueprint) {
    const refsAgree = profile.participant_ref === program.participant_ref && profile.participant_ref === sessionBlueprint.participant_ref && profile.profile_id === program.profile_id && profile.profile_id === sessionBlueprint.profile_id && program.program_id === sessionBlueprint.program_id;
    if (!refsAgree) fail('YT-R-018', 'Identity references agree', 'Profile, program, and session references do not agree.', 'safety_reference_mismatch');
    else pass('YT-R-018', 'Identity references agree', 'Profile, program, and session references agree.');
    const week = Array.isArray(program.weeks) ? program.weeks.find((item) => item.week_number === sessionBlueprint.week_number) : null;
    const slot = week?.session_slots?.find((item) => item.session_code === sessionBlueprint.session_code);
    if (!week || !slot) fail('YT-R-019', 'Session belongs to program', 'The referenced week and session slot do not exist in the program.', 'safety_reference_mismatch');
    else pass('YT-R-019', 'Session belongs to program', 'The blueprint belongs to a canonical program slot.');
  }

  if (profileValid) {
    if (!Number.isInteger(profile.age) || profile.age < 10 || profile.age > 17 || resolveAgeBand(profile.age) !== profile.age_band || sessionBlueprint?.age_band !== profile.age_band) fail('YT-R-020', 'Supported age and band', 'Participant age or age band is unsupported or inconsistent.', 'safety_unsupported_age');
    else pass('YT-R-020', 'Supported age and band', 'Age and age band are supported and coherent.');
    if (!enumHas(TRAINING_LEVELS, profile.training_level) || program?.training_level !== profile.training_level || sessionBlueprint?.training_level !== profile.training_level) fail('YT-R-021', 'Canonical training level', 'Training level is missing, unsupported, or inconsistent.', 'safety_invalid_training_level');
    else pass('YT-R-021', 'Canonical training level', 'Training level is canonical and consistent.');
  }

  const selected = flattenActivities(sessionBlueprint);
  if (sessionBlueprint && (!Array.isArray(sessionBlueprint.blocks) || !sessionBlueprint.blocks.length || sessionBlueprint.blocks.some((block) => !enumHas(SESSION_BLOCK_TYPES, block.block_type)))) fail('YT-R-022', 'Canonical session structure', 'Session blocks are missing or include an unknown type.', 'safety_validation_incomplete', 'REGENERATE_SESSION');
  else if (sessionBlueprint) pass('YT-R-022', 'Canonical session structure', 'Session block structure is recognized.');

  for (const [{ activity, block }, index] of selected.map((item, index) => [item, index])) {
    const fieldName = `activity ${index + 1}`;
    if (!text(activity.activity_id) || activity.source === 'FREE_TEXT' || activity.ai_generated === true) {
      fail('YT-R-023', 'Registry-backed activity', `${fieldName} is not a registry-backed activity.`, activity.ai_generated ? 'safety_ai_generated_activity_detected' : 'safety_activity_unknown', 'REGENERATE_SESSION');
      continue;
    }
    const registry = typeof options.activityLookup === 'function' ? options.activityLookup(activity.activity_id) : activities.find((item) => item.activity_id === activity.activity_id);
    if (!registry) { fail('YT-R-023', 'Registry-backed activity', `${fieldName} does not exist in the approved registry.`, 'safety_activity_unknown', 'REGENERATE_SESSION'); continue; }
    if (registry.approval?.status !== 'APPROVED') { fail('YT-R-024', 'Administrative approval', `${fieldName} is not administrator approved.`, 'safety_activity_unapproved', 'REGENERATE_SESSION'); continue; }
    if (registry.active === false || registry.available === false || registry.approval?.status === 'RETIRED') { fail('YT-R-025', 'Activity availability', `${fieldName} is unavailable.`, 'safety_activity_unavailable', 'REGENERATE_SESSION'); continue; }
    if (activity.name !== registry.name || activity.activity_type !== registry.activity_type || activity.block_type !== block.block_type || !registry.movement_families.includes(activity.movement_family) || !enumHas(ACTIVITY_TYPES, activity.activity_type) || !enumHas(MOVEMENT_FAMILIES, activity.movement_family)) fail('YT-R-026', 'Registry metadata integrity', `${fieldName} overrides or misstates registry metadata.`, 'safety_activity_registry_mismatch', 'REGENERATE_SESSION');
    else pass('YT-R-026', 'Registry metadata integrity', `${fieldName} matches registry identity and classification.`);
    if (!sameList(activity.instructions, registry.instructions) || !sameList(activity.coaching_cues, registry.coaching_cues) || !sameList(activity.common_errors, registry.common_errors) || !sameList(activity.stop_conditions, registry.stop_conditions) || activity.regression !== (registry.regression_ids[0] || null) || activity.progression !== (registry.progression_ids[0] || null) || !sameList(activity.evidence_tag?.source_ids, registry.evidence_tags.source_ids) || !sameList(activity.source_rule_ids, registry.evidence_tags.rule_ids)) fail('YT-R-026', 'Registry safety-content integrity', `${fieldName} overrides approved safety content or provenance.`, 'safety_activity_registry_mismatch', 'REGENERATE_SESSION');
    else pass('YT-R-026', 'Registry safety-content integrity', `${fieldName} retains approved safety content and provenance.`);
    if (!enumHas(TRAINING_LEVELS, registry.minimum_training_level) || !enumHas(TRAINING_LEVELS, profile?.training_level) || LEVEL_RANK[registry.minimum_training_level] > LEVEL_RANK[profile.training_level]) fail('YT-R-027', 'Activity training-level eligibility', `${fieldName} exceeds the participant training level.`, 'safety_training_level_exceeded', 'REGRESS_OR_REDUCE');
    else pass('YT-R-027', 'Activity training-level eligibility', `${fieldName} is eligible for the participant training level.`);
    if (!Array.isArray(profile?.equipment) || !registry.equipment.every((item) => profile.equipment.includes(item))) fail('YT-R-028', 'Available equipment', `${fieldName} requires equipment absent from the profile.`, 'safety_equipment_unavailable', 'REGENERATE_SESSION');
    else pass('YT-R-028', 'Available equipment', `${fieldName} equipment is available.`);

    const p = activity.prescription;
    const repsValid = p?.reps === null || (typeof p?.reps === 'string' && /^\d{1,2}(?:-\d{1,2})?$/.test(p.reps) && Math.max(...p.reps.split('-').map(Number)) <= 12);
    const durationValid = p?.duration_seconds === null || (Number.isInteger(p?.duration_seconds) && p.duration_seconds >= 10 && p.duration_seconds <= 180);
    if (!p || ![1, 2].includes(p.sets) || !repsValid || !durationValid || !Number.isInteger(p.rest_seconds) || p.rest_seconds < 30 || p.rest_seconds > 90 || !text(p.quality_rule)) fail('YT-R-029', 'Conservative prescription bounds', `${fieldName} has a malformed or out-of-bounds prescription.`, 'safety_prescription_out_of_bounds', 'REGRESS_OR_REDUCE');
    else pass('YT-R-029', 'Conservative prescription bounds', `${fieldName} prescription is within Phase 5 conservative bounds.`);
    if (!p || !text(p.quality_rule) || !/stop|technique|quality/i.test(p.quality_rule)) fail('YT-R-030', 'Technical stop rule', `${fieldName} is missing a technical-quality stop rule.`, 'safety_stop_rule_missing', 'REGENERATE_SESSION');
    else pass('YT-R-030', 'Technical stop rule', `${fieldName} has a technical-quality rule.`);
    if (!Array.isArray(activity.instructions) || !activity.instructions.length || !Array.isArray(activity.coaching_cues) || activity.coaching_cues.length < 2 || activity.coaching_cues.length > 4 || !Array.isArray(activity.common_errors) || !activity.common_errors.length || !Array.isArray(activity.stop_conditions) || !activity.stop_conditions.length || !activity.evidence_tag?.source_ids?.length || !activity.source_rule_ids?.length) fail('YT-R-031', 'Instruction completeness', `${fieldName} is missing required participant-facing instructions, cues, errors, stop conditions, or provenance.`, 'safety_instruction_missing', 'REGENERATE_SESSION');
    else pass('YT-R-031', 'Instruction completeness', `${fieldName} participant-facing safety content is complete.`);
  }

  const strings = actualSessionStrings(sessionBlueprint);
  for (const [code, pattern] of languageRules) {
    const unsafe = strings.find((value) => pattern.test(value) && !/\b(?:do not|don't|avoid|without|must not|stop for|prohibited|never)\b/i.test(value));
    if (unsafe) fail('YT-R-032', 'Prohibited prescriptions and language', 'Session contains unsafe prescription or claims language.', code);
  }
  if (sessionBlueprint && !errors.some(({ code }) => languageRules.some(([candidate]) => candidate === code))) pass('YT-R-032', 'Prohibited prescriptions and language', 'No prohibited prescription or unsafe claim language was detected.');

  if (profileValid && sessionBlueprint) {
    if (profile.readiness?.pain === true) {
      if (sessionBlueprint.status !== 'COACH_REVIEW_REQUIRED' || !sessionBlueprint.safety_flags?.includes('PAIN_REPORTED_REQUIRES_COACH_REVIEW') || !strings.some((value) => /adult|coach|review/i.test(value))) fail('YT-R-033', 'Non-diagnostic pain handling', 'Reported pain was not routed to explicit coach review.', 'safety_pain_requires_review');
      else warn('YT-R-033', 'Non-diagnostic pain handling', 'Pain was reported; supervising-adult review is required before delivery.', 'safety_pain_requires_review', 'COACH_REVIEW');
    } else pass('YT-R-033', 'Non-diagnostic pain handling', 'No pain flag requires escalation.');
    if (profile.readiness?.sleep_quality === 'POOR' && profile.readiness?.energy <= 2 && !sessionBlueprint.safety_flags?.some((flag) => /REDUCED|RECOVERY/.test(flag))) warn('YT-R-034', 'Readiness workload mismatch', 'Poor sleep and low energy are present without documented workload reduction.', 'safety_readiness_reduction_recommended', 'REGRESS_OR_REDUCE');
    if (profile.readiness?.soreness === 'SIGNIFICANT' && !sessionBlueprint.safety_flags?.some((flag) => /REDUCED|RECOVERY/.test(flag))) warn('YT-R-034', 'Readiness workload mismatch', 'Significant soreness requires review of related session stress.', 'safety_significant_soreness', 'COACH_REVIEW');
    const recentImpact = profile.recent_training_summary?.high_impact_recently === true || profile.recent_training_summary?.recent_stress_tags?.includes('IMPACT');
    const impactItems = selected.map(({ activity }) => activities.find((item) => item.activity_id === activity.activity_id)).filter((item) => item && ['MODERATE', 'HIGH'].includes(item.impact_level));
    if (recentImpact && impactItems.length) warn('YT-R-035', 'Recent impact management', 'Recent impact is followed by avoidable moderate/high-impact activity.', 'safety_recent_impact_conflict', 'REGRESS_OR_REDUCE');
    else pass('YT-R-035', 'Recent impact management', 'No unresolved recent-impact conflict was found.');
    const jumpSeconds = selected.reduce((sum, { activity }) => {
      const item = activities.find(({ activity_id }) => activity_id === activity.activity_id);
      return sum + (item?.impact_level === 'HIGH' || item?.movement_families.includes('JUMP_LAND') ? (activity.prescription?.duration_seconds || 0) * (activity.prescription?.sets || 0) : 0);
    }, 0);
    if ((profile.readiness?.energy <= 2 || profile.readiness?.sleep_quality === 'POOR') && jumpSeconds > 180) fail('YT-R-036', 'Impact under severe fatigue', 'High jump volume is not permitted with severe fatigue indicators.', 'safety_recent_impact_conflict', 'REGRESS_OR_REDUCE');
  }

  if (!sessionBlueprint?.education_message || sessionBlueprint.education_message.claim_review?.allowed !== true) fail('YT-R-037', 'Claim-reviewed education', 'Education content is missing or has not passed claim inspection.', 'safety_validation_incomplete', 'REGENERATE_SESSION');
  else pass('YT-R-037', 'Claim-reviewed education', 'Education content carries an allowed claim review.');

  let status = SAFETY_STATUSES.SAFE_TO_DELIVER;
  let decision = SAFETY_DECISIONS.ALLOW;
  if (errors.length) {
    const invalidCodes = new Set(['safety_profile_missing', 'safety_program_missing', 'safety_program_invalid', 'safety_session_missing', 'safety_reference_mismatch', 'safety_unsupported_age', 'safety_invalid_training_level']);
    const regenerateCodes = new Set(['safety_activity_unknown', 'safety_activity_unapproved', 'safety_activity_unavailable', 'safety_equipment_unavailable', 'safety_instruction_missing', 'safety_validation_incomplete', 'safety_ai_generated_activity_detected']);
    if (errors.some(({ code }) => invalidCodes.has(code))) { status = SAFETY_STATUSES.INVALID_SESSION; decision = SAFETY_DECISIONS.BLOCK; }
    else if (errors.some(({ code }) => regenerateCodes.has(code))) { status = SAFETY_STATUSES.REGENERATE_REQUIRED; decision = SAFETY_DECISIONS.REGENERATE; }
    else if (errors.some(({ code }) => ['safety_training_level_exceeded', 'safety_prescription_out_of_bounds', 'safety_recent_impact_conflict'].includes(code))) { status = SAFETY_STATUSES.BLOCKED_UNSAFE; decision = SAFETY_DECISIONS.REGRESS_OR_REDUCE; }
    else { status = SAFETY_STATUSES.BLOCKED_UNSAFE; decision = SAFETY_DECISIONS.BLOCK; }
  } else if (warnings.some(({ code }) => ['safety_pain_requires_review', 'safety_significant_soreness'].includes(code))) { status = SAFETY_STATUSES.COACH_REVIEW_REQUIRED; decision = SAFETY_DECISIONS.REQUIRE_COACH_REVIEW; }
  else if (warnings.length) { status = SAFETY_STATUSES.SAFE_WITH_WARNINGS; decision = SAFETY_DECISIONS.ALLOW_WITH_WARNINGS; }

  return Object.freeze({ ok: errors.length === 0, status, decision, errors, warnings, coach_review_required: decision === SAFETY_DECISIONS.REQUIRE_COACH_REVIEW, required_actions: [...requiredActions], blocked_reasons: [...blockedReasons], rule_results: results, validated_at: options.validatedAt || new Date().toISOString(), validator_version: VALIDATOR_VERSION });
}

module.exports = { VALIDATOR_VERSION, validateYouthFitnessSessionSafety };
