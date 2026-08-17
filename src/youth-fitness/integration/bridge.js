'use strict';

const crypto = require('node:crypto');

const CONTRACT_VERSION = '1';
const MOVEMENT_SOURCES = Object.freeze({ LOCAL: 'LOCAL', POCKETPT: 'POCKETPT' });
const ref = (prefix, value) => `${prefix}-${crypto.createHash('sha256').update(value).digest('hex').slice(0, 16).toUpperCase()}`;
const timestamp = () => new Date().toISOString();

function forbidden() { const error = new Error('bridge_access_denied'); error.status = 404; throw error; }
function canRead(context, mapping) {
  if (!context || context.organization_id !== mapping.organization_id) return false;
  return context.subject === mapping.pocketpt_subject || (context.role === 'LEADER_WITHIN_FACILITATOR' && context.permissions?.includes('LEADER_WITHIN_PARTICIPANT_READ'));
}

function createLeaderWithinPocketPtBridge({ repository, youthProgramService, clock = timestamp, launchPath = '/pocketpt/my-program' }) {
  const audit = (type, details) => repository.audit({ event_id: ref('YFAE', `${type}:${details.integration_id}:${details.assignment_id || ''}:${clock()}`), event_type: type, occurred_at: clock(), ...details });

  function connect(context, input) {
    if (!context?.subject || context.role !== 'INTEGRATION_ADMIN' || context.organization_id !== input.organization_id) forbidden();
    const existing = repository.getMappingByEnrollment(input.leader_within_enrollment_id);
    if (existing) {
      if (existing.organization_id !== context.organization_id || existing.pocketpt_subject !== input.pocketpt_subject || existing.leader_within_participant_id !== input.leader_within_participant_id) forbidden();
      return existing;
    }
    const now = clock();
    const mapping = { integration_id: ref('LWPT', `${input.organization_id}:${input.leader_within_enrollment_id}`), leader_within_participant_id: input.leader_within_participant_id, leader_within_enrollment_id: input.leader_within_enrollment_id, leader_id: input.leader_id, pocketpt_participant_id: youthProgramService.publicParticipantRef(input.pocketpt_subject), pocketpt_subject: input.pocketpt_subject, youth_fitness_profile_id: null, organization_id: input.organization_id, status: 'ACTIVE', created_at: now, updated_at: now };
    repository.saveMapping(mapping); audit('INTEGRATION_CONNECTED', { integration_id: mapping.integration_id, organization_id: mapping.organization_id }); return mapping;
  }

  function mappingFor(context, enrollmentId) { const mapping = repository.getMappingByEnrollment(enrollmentId); if (!mapping || mapping.status !== 'ACTIVE' || !canRead(context, mapping)) forbidden(); return mapping; }

  function assign(context, input) {
    const mapping = mappingFor(context, input.leader_within_enrollment_id);
    if (context.role !== 'LEADER_WITHIN_FACILITATOR' || !context.permissions?.includes('LEADER_WITHIN_MOVEMENT_ASSIGN')) forbidden();
    const existing = repository.getAssignment(input.leader_within_enrollment_id, input.mission_id); if (existing) return existing;
    let dashboard;
    try { dashboard = youthProgramService.dashboard(mapping.pocketpt_subject); } catch (error) { if (error.message === 'program_not_found') return null; throw error; }
    const session = youthProgramService.start(mapping.pocketpt_subject, dashboard.today.session_ref); if (!session) return null;
    const now = clock(); const assignment = { assignment_id: ref('LWMA', `${mapping.integration_id}:${input.mission_id}`), integration_id: mapping.integration_id, leader_within_enrollment_id: input.leader_within_enrollment_id, mission_id: input.mission_id, movement_source: MOVEMENT_SOURCES.POCKETPT, fitness_program_id: dashboard.program_ref, fitness_session_ref: session.session_ref, status: 'ACTIVE', created_at: now, updated_at: now };
    repository.saveAssignment(assignment); audit('MOVEMENT_ASSIGNMENT_CREATED', { integration_id: mapping.integration_id, assignment_id: assignment.assignment_id, organization_id: mapping.organization_id }); return assignment;
  }

  function stateFor(mapping, assignment) {
    if (!assignment) return { connection_status: 'PROGRAM_READY', movement_status: 'NOT_ASSIGNED', launch_available: false, completed_at: null };
    const credit = repository.getCredit(assignment.assignment_id); if (credit) return { connection_status: 'ACTION_COMPLETED', movement_status: 'COMPLETED', launch_available: false, completed_at: credit.completed_at };
    const session = youthProgramService.view(mapping.pocketpt_subject, assignment.fitness_session_ref);
    if (!session) return { connection_status: 'ACTION_UNAVAILABLE', movement_status: 'UNAVAILABLE', launch_available: false, completed_at: null };
    if (session.session_result?.status === 'COMPLETED') {
      const saved = repository.saveCreditOnce({ credit_id: ref('LWMC', assignment.assignment_id), assignment_id: assignment.assignment_id, session_result_id: session.session_result.session_result_id, completed_at: session.session_result.completed_at, credited_at: clock(), contract_version: CONTRACT_VERSION });
      audit('LEADER_WITHIN_MOVEMENT_CREDITED', { integration_id: mapping.integration_id, assignment_id: assignment.assignment_id, organization_id: mapping.organization_id });
      return { connection_status: 'ACTION_COMPLETED', movement_status: 'COMPLETED', launch_available: false, completed_at: saved.completed_at };
    }
    if (session.pain_flag || session.status === 'COACH_REVIEW_REQUIRED') return { connection_status: 'SAFETY_HOLD', movement_status: 'SAFETY_HOLD', launch_available: false, completed_at: null };
    if (!session.readiness) return { connection_status: 'ACTION_AVAILABLE', movement_status: 'NOT_STARTED', launch_available: true, completed_at: null };
    return { connection_status: 'ACTION_IN_PROGRESS', movement_status: 'IN_PROGRESS', launch_available: true, completed_at: null };
  }

  function projection(context, { leader_within_enrollment_id, mission_id, required = true }) {
    let mapping;
    try { mapping = mappingFor(context, leader_within_enrollment_id); } catch (error) { throw error; }
    let state;
    try {
      const assignment = repository.getAssignment(leader_within_enrollment_id, mission_id);
      if (!assignment) {
        try { youthProgramService.dashboard(mapping.pocketpt_subject); state = stateFor(mapping, null); }
        catch (error) { state = error.message === 'program_not_found' ? { connection_status: 'CONNECTED_NO_PROFILE', movement_status: 'UNAVAILABLE', launch_available: false, completed_at: null } : { connection_status: 'TEMPORARILY_UNAVAILABLE', movement_status: 'UNAVAILABLE', launch_available: false, completed_at: null }; }
      } else state = stateFor(mapping, assignment);
    } catch { state = { connection_status: 'TEMPORARILY_UNAVAILABLE', movement_status: 'UNAVAILABLE', launch_available: false, completed_at: null }; }
    return { contract_name: 'leader_within_pocketpt_bridge_v1', contract_version: CONTRACT_VERSION, participant: { leader_id: mapping.leader_id }, connection_status: state.connection_status, movement_mission: { required: required === true, status: state.movement_status, display_name: "Today's Movement Mission", launch_available: state.launch_available, launch_url: state.launch_available ? launchPath : null, completed_at: state.completed_at } };
  }

  return { connect, assign, projection };
}

function projectMovementMission({ movement_source = MOVEMENT_SOURCES.LOCAL, local_mission, pocketpt_projection }) { return movement_source === MOVEMENT_SOURCES.POCKETPT ? pocketpt_projection?.movement_mission : local_mission; }
function calculateMissionProgress(steps) { const completed = ['featured_story', 'practice_selected', 'practice_completed', 'movement_completed', 'reflection_submitted'].filter((key) => steps[key] === true).length; return { completed, total: 5, percentage: completed * 20 }; }

module.exports = { CONTRACT_VERSION, MOVEMENT_SOURCES, createLeaderWithinPocketPtBridge, projectMovementMission, calculateMissionProgress };
