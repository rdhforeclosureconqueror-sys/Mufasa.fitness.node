'use strict';

const { evidenceSources, youthFitnessRules } = require('../evidence');
const { validateActivityRegistry } = require('./models');

const approval = Object.freeze({ status: 'APPROVED', version: 1, approved_by: 'YOUTH_FITNESS_CONTENT_ADMIN', approved_at: '2026-08-17' });
const ages = ['10_12', '13_15', '16_17'];
const evidence_tags = { source_ids: ['SRC001', 'SRC002'], rule_ids: ['YT-R-001', 'YT-R-002', 'YT-R-005'] };

function activity(activity_id, activity_type, name, movement_families, minimum_training_level, impact_level, equipment, relations = {}, details = {}) {
  return {
    activity_id, activity_type, name,
    description: details.description || `${name} taught with controlled technique and participant-appropriate range.`,
    movement_families, minimum_training_level, age_presentation_bands: ages, impact_level, equipment,
    instructions: details.instructions || ['Set up in a stable starting position.', 'Move with control through a comfortable range.', 'Finish the repetition while maintaining the coached shape.'],
    coaching_cues: details.coaching_cues || ['Move smoothly.', 'Keep breathing.', 'Choose quality over speed.'],
    common_errors: details.common_errors || ['Rushing the movement.', 'Using a range that cannot be controlled.'],
    stop_conditions: details.stop_conditions || ['Stop for pain.', 'Stop if technique cannot be restored after coaching.', 'Stop for dizziness or unusual shortness of breath and tell an appropriate adult.'],
    regression_ids: relations.regressions || [], progression_ids: relations.progressions || [],
    evidence_tags: details.evidence_tags || evidence_tags, approval,
  };
}

const definitions = [
  activity('YF-EX-001', 'EXERCISE', 'Wall Push-Up', ['PUSH', 'TRUNK'], 'FOUNDATION', 'NONE', ['WALL', 'BODYWEIGHT'], { progressions: ['YF-EX-002'] }),
  activity('YF-EX-002', 'EXERCISE', 'Elevated Push-Up', ['PUSH', 'TRUNK'], 'FOUNDATION', 'NONE', ['BOX_OR_BENCH', 'BODYWEIGHT'], { regressions: ['YF-EX-001'], progressions: ['YF-EX-003'] }),
  activity('YF-EX-003', 'EXERCISE', 'Standard Push-Up', ['PUSH', 'TRUNK'], 'DEVELOPMENT', 'NONE', ['BODYWEIGHT', 'MAT'], { regressions: ['YF-EX-002'] }),
  activity('YF-EX-004', 'EXERCISE', 'Box Squat', ['SQUAT'], 'FOUNDATION', 'NONE', ['BOX_OR_BENCH', 'BODYWEIGHT'], { progressions: ['YF-EX-005'] }),
  activity('YF-EX-005', 'EXERCISE', 'Bodyweight Squat', ['SQUAT'], 'FOUNDATION', 'NONE', ['BODYWEIGHT'], { regressions: ['YF-EX-004'] }),
  activity('YF-EX-006', 'EXERCISE', 'Glute Bridge', ['HINGE', 'TRUNK'], 'FOUNDATION', 'NONE', ['MAT', 'BODYWEIGHT']),
  activity('YF-EX-007', 'EXERCISE', 'Band Row', ['PULL'], 'FOUNDATION', 'NONE', ['BANDS']),
  activity('YF-EX-008', 'EXERCISE', 'Assisted Split Squat', ['SINGLE_LEG', 'SQUAT'], 'FOUNDATION', 'NONE', ['WALL', 'BODYWEIGHT']),
  activity('YF-EX-009', 'EXERCISE', 'Bear-Hug Carry', ['CARRY', 'TRUNK', 'LOCOMOTION'], 'FOUNDATION', 'LOW', ['LIGHT_DUMBBELL', 'OPEN_SPACE']),
  activity('YF-EX-010', 'EXERCISE', 'Low Pogo', ['JUMP_LAND'], 'DEVELOPMENT', 'MODERATE', ['OPEN_SPACE', 'BODYWEIGHT'], {}, { instructions: ['Stand tall with space around you.', 'Make small two-foot hops and land softly.', 'Pause when landing quality changes.'], coaching_cues: ['Quiet landings.', 'Small and springy.', 'Stay tall.'] }),
  activity('YF-EX-011', 'EXERCISE', 'Dead Bug', ['TRUNK'], 'FOUNDATION', 'NONE', ['MAT', 'BODYWEIGHT']),
  activity('YF-EX-012', 'EXERCISE', 'Half-Kneeling Breathing Reset', ['BREATHING_RECOVERY', 'MOBILITY'], 'FOUNDATION', 'NONE', ['MAT'], {}, { coaching_cues: ['Easy, unforced breaths.', 'Relax the shoulders.', 'Use a comfortable position.'] }),
  activity('YF-GM-001', 'GAME', 'Cone Treasure Hunt', ['MOVEMENT_GAME', 'LOCOMOTION', 'CONDITIONING'], 'FOUNDATION', 'LOW', ['CONES', 'OPEN_SPACE'], {}, { instructions: ['An adult places visible cones in a clear play area.', 'Move to collect one cone at a time using the named locomotion pattern.', 'Return each cone to the home marker before continuing.'], coaching_cues: ['Look where you are going.', 'Control each turn.', 'Keep the play area clear.'] }),
  activity('YF-GM-002', 'GAME', 'Movement Mirror', ['MOVEMENT_GAME', 'MOBILITY'], 'FOUNDATION', 'NONE', ['OPEN_SPACE'], {}, { instructions: ['Partners face each other with safe spacing.', 'One partner leads slow approved movements.', 'Switch leader when the coach signals.'] }),
  activity('YF-GM-003', 'GAME', 'Traffic Lights', ['MOVEMENT_GAME', 'LOCOMOTION', 'CONDITIONING'], 'FOUNDATION', 'LOW', ['CONES', 'OPEN_SPACE'], {}, { instructions: ['Use cones to mark a clear boundary.', 'Move on green, slow down on yellow, and make a controlled stop on red.', 'Use only the movement pattern named by the coach.'] }),
];

const evidenceContext = { sourceIds: new Set(evidenceSources.map(({ source_id }) => source_id)), ruleIds: new Set(youthFitnessRules.map(({ rule_id }) => rule_id)) };
const activities = validateActivityRegistry(definitions, evidenceContext);
const exercises = Object.freeze(activities.filter(({ activity_type }) => activity_type === 'EXERCISE'));
const games = Object.freeze(activities.filter(({ activity_type }) => activity_type === 'GAME'));

function getApprovedActivity(activityId) {
  const item = activities.find(({ activity_id }) => activity_id === activityId);
  return item && item.approval.status === 'APPROVED' ? item : null;
}

function requireApprovedActivity(activityId) {
  const item = getApprovedActivity(activityId);
  if (!item) throw new TypeError(`Activity is not in the approved youth registry: ${activityId}`);
  return item;
}

module.exports = { activities, exercises, games, getApprovedActivity, requireApprovedActivity };
