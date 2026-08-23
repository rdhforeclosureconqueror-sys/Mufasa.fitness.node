const test = require('node:test');
const assert = require('node:assert/strict');
const contract = require('../public/kettlebell-checkpoints');
const runtime = require('../public/qualified-rep-runtime');

const exercises = {
  squat: { exerciseId: 'exercise_goblet_squat', tempo: '3–1–1–1' },
  hinge: { exerciseId: 'exercise_kettlebell_deadlift', tempo: '3–1–1–1' },
  lunge: { exerciseId: 'exercise_reverse_lunge', tempo: '3–1–1–1' }
};
function observation(exercise, checkpointId, timestamp, status = 'observed', confidence = .9) {
  const definition = contract.resolve(exercise.exerciseId);
  return { exerciseId: exercise.exerciseId, movementFamily: definition?.movementFamily, checkpointId, timestamp, status, confidence, side: 'unknown', orientation: 'side', advisory: true };
}
function feed(machine, exercise, ids, start = 1000, spacing = 1000) {
  let result;
  ids.forEach((id, index) => { result = machine.process(observation(exercise, id, start + index * spacing), exercise); result = machine.process(observation(exercise, id, start + index * spacing + 20), exercise); });
  return result;
}

for (const [family, exercise] of Object.entries(exercises)) test(`${family} canonical exercise can qualify an honest complete cycle`, () => {
  const machine = new runtime.CandidateStateMachine();
  const ids = contract.resolve(exercise.exerciseId).checkpoints.map((item) => item.id);
  const result = feed(machine, exercise, ids);
  assert.equal(result.qualificationStatus, 'qualified'); assert.equal(result.advisory, true); assert.equal(result.candidateCount, 1);
});

test('incomplete cycle and checkpoint flicker do not qualify', () => {
  const machine = new runtime.CandidateStateMachine(); machine.configure(exercises.squat);
  assert.equal(machine.process(observation(exercises.squat, 'setup', 1000)).observedCheckpoints.length, 0);
  assert.notEqual(feed(machine, exercises.squat, ['setup', 'descent', 'bottom']).qualificationStatus, 'qualified');
});
test('invalid transition rejects and reports its reason', () => {
  const machine = new runtime.CandidateStateMachine(); feed(machine, exercises.squat, ['setup']);
  const result = feed(machine, exercises.squat, ['ascent'], 2000); assert.equal(result.state, 'rejected'); assert.match(result.rejectionReason, /invalid_transition/);
});
test('one missed intermediate is legal but two are not', () => {
  let machine = new runtime.CandidateStateMachine();
  let result = feed(machine, exercises.squat, ['setup', 'descent', 'ascent', 'stand']);
  assert.equal(result.qualificationStatus, 'qualified'); assert.equal(result.skippedCheckpointCount, 1);
  machine = new runtime.CandidateStateMachine(); feed(machine, exercises.squat, ['setup', 'bottom']);
  result = feed(machine, exercises.squat, ['stand'], 4000); assert.equal(result.state, 'rejected');
});
test('terminal hold is latched and a complete new cycle is required', () => {
  const machine = new runtime.CandidateStateMachine(); const ids = ['setup', 'descent', 'bottom', 'ascent', 'stand'];
  feed(machine, exercises.squat, ids); const held = feed(machine, exercises.squat, ['stand'], 9000);
  assert.equal(machine.count, 1); assert.notEqual(held.qualificationStatus, 'qualified');
  feed(machine, exercises.squat, ids, 11000); assert.equal(machine.count, 2);
});
test('uncertainty holds briefly and resets after timeout without progress', () => {
  const machine = new runtime.CandidateStateMachine({ uncertaintyTimeoutMs: 100 }); feed(machine, exercises.squat, ['setup'], 1000);
  assert.equal(machine.process(observation(exercises.squat, null, 1050, 'uncertain')).state, 'uncertain_hold');
  assert.equal(machine.process(observation(exercises.squat, null, 1201, 'insufficient_keypoints')).state, 'rejected'); assert.equal(machine.count, 0);
});
test('camera unavailable pauses then safely rejects; reconnect starts fresh', () => {
  const machine = new runtime.CandidateStateMachine({ uncertaintyTimeoutMs: 100 }); feed(machine, exercises.hinge, ['setup'], 1000);
  assert.equal(machine.process(observation(exercises.hinge, null, 1050, 'camera_unavailable')).state, 'camera_unavailable');
  assert.equal(machine.process(observation(exercises.hinge, null, 1201, 'camera_unavailable')).state, 'rejected');
  assert.equal(feed(machine, exercises.hinge, ['setup', 'hinge', 'bottom', 'extend', 'lockout'], 2000).qualificationStatus, 'qualified');
});
test('unsupported orientation never advances and candidate timeout resets', () => {
  let machine = new runtime.CandidateStateMachine({ uncertaintyTimeoutMs: 100 }); machine.configure(exercises.hinge);
  assert.equal(machine.process(observation(exercises.hinge, null, 1000, 'unsupported_orientation')).observedCheckpoints.length, 0);
  machine = new runtime.CandidateStateMachine({ candidateTimeoutMs: 100 }); feed(machine, exercises.hinge, ['setup'], 1000);
  assert.equal(machine.process(observation(exercises.hinge, 'hinge', 1200)).rejectionReason, 'candidate_timeout');
});
test('candidate confidence uses weakest accepted checkpoint, not a fabricated average', () => {
  const machine = new runtime.CandidateStateMachine(); const ids = ['setup', 'descent', 'bottom', 'ascent', 'stand']; let result;
  ids.forEach((id, i) => { result = machine.process(observation(exercises.squat, id, 1000 + i * 1000, 'observed', i === 2 ? .61 : .95), exercises.squat); result = machine.process(observation(exercises.squat, id, 1020 + i * 1000, 'observed', i === 2 ? .61 : .95), exercises.squat); });
  assert.equal(result.candidateConfidence, .61);
});
test('carries, ballistic, press, row, composite, and unknown exercises cannot qualify', () => {
  for (const exerciseId of ['exercise_farmer_carry', 'exercise_two_hand_kettlebell_swing', 'exercise_overhead_press', 'exercise_bent_over_row', 'exercise_clean_to_press', 'unknown']) {
    const machine = new runtime.CandidateStateMachine(); const result = machine.process({ status: 'unsupported_exercise', timestamp: 1 }, { exerciseId });
    assert.equal(result.qualificationSupported, false, exerciseId); assert.equal(machine.count, 0);
  }
});
test('tempo parser is honest and timing status remains advisory', () => {
  assert.deepEqual(runtime.parseTempo('3–1–1–1').seconds, [3, 1, 1, 1]);
  assert.equal(runtime.parseTempo('controlled').status, 'insufficient_tempo_data');
  assert.equal(runtime.tempoMetrics(runtime.parseTempo('3-1-1-1'), 0, 6000).status, 'on_tempo');
  assert.equal(runtime.tempoMetrics(runtime.parseTempo('3-1-1-1'), 0, 3000).status, 'faster_than_target');
  assert.equal(runtime.tempoMetrics(runtime.parseTempo('3-1-1-1'), 0, 9000).status, 'slower_than_target');
  assert.equal(runtime.tempoMetrics(runtime.parseTempo('controlled'), 0, 5000).status, 'insufficient_timing_data');
});
test('canonical prescription is read without mutation and output contains no frame payload', () => {
  const exercise = Object.freeze({ ...exercises.squat }); const machine = new runtime.CandidateStateMachine();
  const result = feed(machine, exercise, ['setup', 'descent', 'bottom', 'ascent', 'stand']);
  assert.equal(exercise.tempo, '3–1–1–1'); assert.equal(result.tempoTarget.source, exercise.tempo); assert.equal('posePacket' in result, false);
});
