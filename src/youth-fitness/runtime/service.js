'use strict';

const crypto = require('node:crypto');
const { profiles, planning, sessions, safety, adaptation, activities } = require('..');

const now = () => new Date().toISOString();
const ref = (prefix, value) => `${prefix}-${crypto.createHash('sha256').update(value).digest('hex').slice(0, 12).toUpperCase()}`;
const publicParticipantRef = (subject) => ref('YFPT', subject);
const allActivities = (blueprint) => blueprint.blocks.flatMap((block) => block.activities);
const allowedSafety = (validation) => validation?.ok === true && ['ALLOW', 'ALLOW_WITH_WARNINGS'].includes(validation.decision);

function createYouthProgramService({ repository, clock = now }) {
  function ownedProgram(subject) { return repository.getProgram(subject); }
  function requireProgram(subject) { const value = ownedProgram(subject); if (!value) { const error = new Error('program_not_found'); error.status = 404; throw error; } return value; }
  function enrollment(subject, input = {}) {
    const existing = ownedProgram(subject); if (existing) return existing;
    const participantRef = publicParticipantRef(subject);
    const resolved = profiles.resolveYouthFitnessProfile({ age: 12, goals: ['GENERAL_FITNESS', 'BUILD_CONSISTENCY'], training_experience: 'BEGINNER', equipment: ['BODYWEIGHT', 'WALL', 'BOX_OR_BENCH', 'MAT', 'OPEN_SPACE', 'CONES'], assessment_profile: { baseline_completed: true }, schedule: { sessions_per_week: 3, session_minutes: 40, preferred_days: [] }, ...input, participant_id: undefined, participant_ref: undefined, training_level: undefined }, { participantRef });
    if (!resolved.ok) { const error = new Error(resolved.message); error.status = 422; error.details = resolved; throw error; }
    const planned = planning.planYouthFitnessProgram(resolved.profile, { programLengthWeeks: input.program_length_weeks || 12, desiredStartDate: input.start_date });
    if (!planned.ok) { const error = new Error(planned.message); error.status = 422; throw error; }
    const timestamp = clock();
    return repository.saveProgram(subject, { owner_subject: subject, participant_ref: participantRef, profile: resolved.profile, program: planned.program, program_status: 'ACTIVE', start_date: input.start_date || timestamp.slice(0, 10), current_week: 1, created_at: timestamp, updated_at: timestamp });
  }
  function programSessions(subject, aggregate) { return repository.sessionsForProgram(subject, aggregate.program.program_id); }
  function dashboard(subject) {
    const aggregate = requireProgram(subject); const program = aggregate.program; const records = programSessions(subject, aggregate); const week = program.weeks[aggregate.current_week - 1];
    const completed = records.filter((item) => item.week_number === week.week_number && item.status === 'COMPLETED').length;
    const totalCompleted = records.filter((item) => item.status === 'COMPLETED').length;
    const eligible = program.weeks.slice(0, aggregate.current_week).reduce((sum, item) => sum + item.session_count, 0);
    const nextSlot = week.session_slots.find((slot) => !records.some((item) => item.week_number === week.week_number && item.session_code === slot.session_code && item.status === 'COMPLETED')) || week.session_slots.at(-1);
    const current = records.find((item) => item.week_number === week.week_number && item.session_code === nextSlot.session_code);
    const phase = program.phases.find((item) => item.phase_number === week.phase_number);
    return { title: `${program.program_length_weeks}-Week Foundation Fitness Journey`, goal: 'Build strength, endurance, movement confidence, and consistency.', program_ref: program.program_id, program_version: program.program_version, status: aggregate.program_status, current_phase: phase, current_week: week.week_number, total_weeks: program.program_length_weeks, week: { name: week.name, target: week.session_count, completed, emphasis: week.objectives, sessions: week.session_slots.map((slot) => ({ session_ref: ref('YFSI', `${program.program_id}:${slot.session_id}`), code: slot.session_code, name: slot.name, status: records.find((item) => item.week_number === week.week_number && item.session_code === slot.session_code)?.status || (slot === nextSlot ? 'TODAY' : 'COMING_NEXT') })) }, journey: program.phases.map((item) => ({ phase_id: item.phase_id, title: item.name, start_week: item.start_week, end_week: item.end_week, status: item.phase_number < phase.phase_number ? 'COMPLETED' : item.phase_number === phase.phase_number ? 'CURRENT' : 'FUTURE' })), today: { session_ref: ref('YFSI', `${program.program_id}:${nextSlot.session_id}`), code: nextSlot.session_code, name: nextSlot.name, estimated_minutes: nextSlot.session_minutes, focus: nextSlot.required_domains, action: current?.status === 'IN_PROGRESS' ? 'CONTINUE' : current?.status === 'COMPLETED' ? 'COMPLETE' : 'START' }, consistency: { weekly_completed: completed, weekly_eligible: week.session_count, program_completed: totalCompleted, program_eligible: eligible, percentage: eligible ? Math.round(totalCompleted / eligible * 100) : null }, progress: { sessions_completed: totalCompleted, training_level: aggregate.profile.training_level, comparison: 'SELF_ONLY', baseline: aggregate.profile.assessment_profile.baseline_completed }, education: program.education_sequence.find((item) => item.week_number === week.week_number)?.topic };
  }
  function slotFor(aggregate, sessionRef) { for (const week of aggregate.program.weeks) for (const slot of week.session_slots) if (ref('YFSI', `${aggregate.program.program_id}:${slot.session_id}`) === sessionRef) return { week, slot }; return null; }
  function start(subject, sessionRef) {
    const aggregate = requireProgram(subject); const owned = slotFor(aggregate, sessionRef); if (!owned) return null;
    const existing = repository.getSession(subject, sessionRef); if (existing) return existing;
    const planned = sessions.planYouthFitnessSession(aggregate.profile, aggregate.program, owned.slot);
    const validation = planned.ok ? safety.validateYouthFitnessSessionSafety(aggregate.profile, aggregate.program, planned.session_blueprint) : { ok: false, decision: 'BLOCK', errors: [{ code: planned.error }] };
    const timestamp = clock();
    return repository.saveSession(subject, { session_ref: sessionRef, owner_subject: subject, participant_ref: aggregate.participant_ref, program_id: aggregate.program.program_id, profile_id: aggregate.profile.profile_id, week_number: owned.week.week_number, session_code: owned.slot.session_code, status: allowedSafety(validation) ? 'NOT_STARTED' : 'COACH_REVIEW_REQUIRED', blueprint: planned.session_blueprint || null, blueprint_version: planned.session_blueprint?.version || null, safety_validation: validation, safety_validator_version: validation.validator_version || 1, readiness: null, activity_results: {}, stop_events: [], pain_flag: false, session_result: null, adaptation: null, future_delivery: null, started_at: timestamp, updated_at: timestamp });
  }
  function view(subject, sessionRef) { const item = repository.getSession(subject, sessionRef); if (!item) return null; return { ...item, blueprint: item.readiness && allowedSafety(item.safety_validation) ? item.blueprint : null }; }
  function readiness(subject, sessionRef, input) {
    const energy = Number(input.energy); const soreness = input.soreness; const sleep = input.sleep_quality; const pain = input.pain === true;
    if (!Number.isInteger(energy) || energy < 1 || energy > 5 || !['NONE', 'MILD', 'SIGNIFICANT'].includes(soreness) || !['GOOD', 'FAIR', 'POOR'].includes(sleep) || typeof input.pain !== 'boolean') { const error = new Error('invalid_readiness'); error.status = 422; throw error; }
    return repository.updateSession(subject, sessionRef, (item) => {
      if (item.session_result) return item;
      const aggregate = requireProgram(subject); const profile = { ...aggregate.profile, readiness: { energy, soreness, sleep_quality: sleep, pain }, safety_flags: pain ? ['PAIN_REPORTED_REQUIRES_COACH_REVIEW'] : [], profile_status: pain ? 'COACH_REVIEW_REQUIRED' : 'READY_FOR_PROGRAM_PLANNING' };
      const owned = slotFor(aggregate, sessionRef); const planned = sessions.planYouthFitnessSession(profile, aggregate.program, owned.slot);
      let blueprint = planned.session_blueprint || null; let adjustment = 'NORMAL';
      if (blueprint && !pain && (energy <= 2 || soreness === 'SIGNIFICANT' || sleep === 'POOR')) { blueprint = structuredClone(blueprint); blueprint.blocks.forEach((block) => block.activities.forEach((activity) => { activity.prescription.sets = 1; })); blueprint.safety_flags.push('READINESS_WORKLOAD_REDUCED'); adjustment = soreness === 'SIGNIFICANT' ? 'LOWER_STRESS_COACH_REVIEW' : 'REDUCED_WORKLOAD'; }
      const validation = safety.validateYouthFitnessSessionSafety(profile, aggregate.program, blueprint);
      Object.assign(item, { readiness: { energy, soreness, sleep_quality: sleep, pain, recorded_at: clock() }, readiness_adjustment: adjustment, blueprint, safety_validation: validation, pain_flag: pain, status: allowedSafety(validation) ? 'IN_PROGRESS' : 'COACH_REVIEW_REQUIRED', updated_at: clock() }); return item;
    });
  }
  function recordActivity(subject, sessionRef, activityId, input) { return repository.updateSession(subject, sessionRef, (item) => { if (item.session_result || !allowedSafety(item.safety_validation) || !allActivities(item.blueprint).some((activity) => activity.activity_id === activityId) || !activities.getApprovedActivity(activityId)) return item; const sets = Array.isArray(input.sets) ? input.sets.map((value) => Math.max(0, Number.parseInt(value, 10) || 0)) : []; item.activity_results[activityId] = { activity_id: activityId, completed: input.completed === true, quality_reps: sets, actual_duration_seconds: Math.max(0, Number.parseInt(input.actual_duration_seconds, 10) || 0), effort: input.effort || null, enjoyment: input.enjoyment || null, updated_at: clock() }; item.updated_at = clock(); return item; }); }
  function stopActivity(subject, sessionRef, activityId, input) { return repository.updateSession(subject, sessionRef, (item) => { if (item.session_result || !allActivities(item.blueprint || { blocks: [] }).some((activity) => activity.activity_id === activityId)) return item; const reason = ['TECHNIQUE', 'PAIN', 'TOO_TIRED', 'COACH_STOPPED', 'OTHER_SAFE_REASON'].includes(input.reason) ? input.reason : 'OTHER_SAFE_REASON'; item.stop_events.push({ activity_id: activityId, reason, quality_reps: Math.max(0, Number.parseInt(input.quality_reps, 10) || 0), recorded_at: clock() }); if (reason === 'PAIN') { item.pain_flag = true; item.status = 'COACH_REVIEW_REQUIRED'; } item.updated_at = clock(); return item; }); }
  function finish(subject, sessionRef, input = {}) {
    return repository.updateSession(subject, sessionRef, (item) => {
      if (item.session_result) return item;
      const aggregate = requireProgram(subject); const pain = item.pain_flag || input.pain === true; const completedActivities = Object.values(item.activity_results).filter((result) => result.completed).length; const activityCount = allActivities(item.blueprint).length; const timestamp = clock();
      const result = { session_result_id: ref('YFSR', sessionRef), session_blueprint_id: item.blueprint.session_blueprint_id, program_id: item.program_id, profile_id: item.profile_id, participant_ref: item.participant_ref, week_number: item.week_number, session_code: item.session_code, status: pain ? 'STOPPED_EARLY' : completedActivities ? 'COMPLETED' : 'PARTIAL', completion_quality: pain ? 'PAIN_REPORTED' : completedActivities === activityCount ? 'SUCCESSFUL' : 'INCOMPLETE', completed_blocks: item.blueprint.blocks.filter((block) => block.activities.every((activity) => item.activity_results[activity.activity_id]?.completed)).map((block) => block.block_id), skipped_blocks: item.blueprint.blocks.filter((block) => !block.activities.every((activity) => item.activity_results[activity.activity_id]?.completed)).map((block) => block.block_id), reported_effort: ['EASY', 'MODERATE', 'HARD', 'TOO_HARD'].includes(input.effort) ? input.effort : 'MODERATE', readiness_after: { energy: item.readiness.energy, soreness: item.readiness.soreness, pain }, technique_quality: item.stop_events.some((event) => event.reason === 'TECHNIQUE') ? 'FORM_BREAKDOWN' : 'CONTROLLED', participant_reflection: { enjoyment: input.enjoyment || null, accomplishment: String(input.accomplishment || '').slice(0, 500) }, coach_notes: [], safety_flags: pain ? ['PAIN_REPORTED_REQUIRES_COACH_REVIEW'] : [], completed_at: timestamp, version: 1 };
      const prior = programSessions(subject, aggregate).map((session) => session.session_result).filter(Boolean);
      const decision = adaptation.adaptYouthFitnessProgression(aggregate.profile, aggregate.program, item.blueprint, result, { safetyValidation: item.safety_validation, recentSessionResults: prior });
      const nextWeek = aggregate.program.weeks[item.week_number - 1]; const nextSlot = nextWeek?.session_slots.find((slot) => slot.session_code > item.session_code) || aggregate.program.weeks[item.week_number]?.session_slots[0]; let future = null;
      if (nextSlot) { const planned = sessions.planYouthFitnessSession(aggregate.profile, aggregate.program, nextSlot); const validation = planned.ok ? safety.validateYouthFitnessSessionSafety(aggregate.profile, aggregate.program, planned.session_blueprint) : { ok: false, decision: 'BLOCK' }; future = { session_blueprint_id: planned.session_blueprint?.session_blueprint_id || null, safety_validation: validation, deliverable: allowedSafety(validation), requires_revalidation: decision.future_delivery_requires_phase_6_validation, prepared_at: timestamp }; }
      Object.assign(item, { session_result: result, adaptation: decision, future_delivery: future, status: pain ? 'COACH_REVIEW_REQUIRED' : result.status, updated_at: timestamp }); return item;
    });
  }
  return { enrollment, dashboard, start, view, readiness, recordActivity, stopActivity, finish, publicParticipantRef };
}
module.exports = { createYouthProgramService, publicParticipantRef, allowedSafety };
