'use strict';

const { validateYouthFitnessRule } = require('./models');
const { evidenceSources } = require('./sources');

const sourceIds = new Set(evidenceSources.map((source) => source.source_id));
const common = { hard_rule: true, admin_override: false, active: true, effective_date: '2026-08-17', review_due: '2027-08-17', evidence_version: 1, phase_introduced: 1 };
const definitions = [
  ['YT-R-001', 'No routine muscular-failure training', 'INTENSITY', 'Resistance sets should generally terminate before technical or momentary muscular failure.', 'CONSERVATIVE_PROGRAM_POLICY', 'PROGRAM_POLICY', ['SRC001', 'SRC002']],
  ['YT-R-002', 'Pain overrides programming', 'SAFETY', 'Pain stops the affected activity and routes the participant to an appropriate adult response; programming does not diagnose or override pain.', 'CONSERVATIVE_PROGRAM_POLICY', 'PROGRAM_POLICY', ['SRC001', 'SRC002']],
  ['YT-R-003', 'No automatic 1RM or maximal lifting for youth', 'INTENSITY', 'Automatic youth programming must not prescribe one-repetition-maximum testing or maximal lifting.', 'CONSERVATIVE_PROGRAM_POLICY', 'PROGRAM_POLICY', ['SRC001', 'SRC002']],
  ['YT-R-004', 'No prohibited lifts or maximal tests in automatic programming', 'ACTIVITY_ELIGIBILITY', 'Automatic youth programming must not prescribe power cleans, snatches, or bench-press testing.', 'CONSERVATIVE_PROGRAM_POLICY', 'PROGRAM_POLICY', ['SRC001', 'SRC002']],
  ['YT-R-005', 'Bodyweight is not automatically low intensity', 'INTENSITY', 'Activity intensity must be evaluated from the complete prescription and participant context, not inferred from bodyweight loading.', 'CONSERVATIVE_PROGRAM_POLICY', 'PROGRAM_POLICY', ['SRC001']],
  ['YT-R-006', 'Progress one major training variable at a time', 'PROGRESSION', 'A progression decision may change only one major training variable at a time.', 'CONSERVATIVE_PROGRAM_POLICY', 'PROGRAM_POLICY', ['SRC001', 'SRC003']],
  ['YT-R-007', 'Progression requires repeated qualifying success', 'PROGRESSION', 'Progression requires demonstrated success across at least two qualifying sessions.', 'CONSERVATIVE_PROGRAM_POLICY', 'PROGRAM_POLICY', ['SRC001', 'SRC003']],
  ['YT-R-008', 'Regression is a normal programming response', 'PROGRESSION', 'Regression or modification is a neutral programming response and must not be framed as participant failure.', 'CONSERVATIVE_PROGRAM_POLICY', 'PROGRAM_POLICY', ['SRC001', 'SRC004']],
  ['YT-R-009', 'Readiness adjustment is not medical screening', 'READINESS', 'Readiness information may conservatively adjust training but must not produce medical clearance or diagnosis.', 'CONSERVATIVE_PROGRAM_POLICY', 'PROGRAM_POLICY', ['SRC001', 'SRC004']],
  ['YT-R-010', 'Sleep education is age-appropriate and non-shaming', 'RECOVERY', 'Sleep education must use age-appropriate guidance and must not shame a participant for reported sleep.', 'EVIDENCE_CONSENSUS', 'CONSENSUS', ['SRC009']],
  ['YT-R-011', 'Hydration education avoids arbitrary water loading', 'RECOVERY', 'Hydration education must acknowledge individual and environmental variation and must not prescribe arbitrary water loading.', 'EVIDENCE_CONSENSUS', 'CONSENSUS', ['SRC010']],
  ['YT-R-012', 'Movement screens do not diagnose anatomy', 'ASSESSMENT', 'Movement screens produce observations and approved training categories, not anatomical, medical, or injury diagnoses.', 'CONSERVATIVE_PROGRAM_POLICY', 'PROGRAM_POLICY', ['SRC007', 'SRC008']],
  ['YT-R-013', 'No proprietary global youth fitness score in Version 1', 'ASSESSMENT', 'Performance, movement, consistency, and engagement remain separate; Version 1 must not create a proprietary global youth fitness score.', 'CONSERVATIVE_PROGRAM_POLICY', 'PROGRAM_POLICY', ['SRC005', 'SRC007']],
  ['YT-R-014', 'Compare progress primarily with personal baseline', 'ASSESSMENT', 'Participant progress is compared primarily against that participant’s protocol-consistent baseline.', 'CONSERVATIVE_PROGRAM_POLICY', 'PROGRAM_POLICY', ['SRC005', 'SRC006', 'SRC007']],
  ['YT-R-015', 'Final safety validator fails closed', 'SAFETY', 'A youth prescription must not be delivered when final safety validation fails, errors, or cannot establish required inputs.', 'CONSERVATIVE_PROGRAM_POLICY', 'PROGRAM_POLICY', ['SRC001', 'SRC002']],
];

const youthFitnessRules = Object.freeze(definitions.map(([rule_id, name, category, description, evidence_class, claim_strength, ids]) => validateYouthFitnessRule({ ...common, rule_id, name, category, description, evidence_class, claim_strength, source_ids: ids }, sourceIds)));

module.exports = { youthFitnessRules };
