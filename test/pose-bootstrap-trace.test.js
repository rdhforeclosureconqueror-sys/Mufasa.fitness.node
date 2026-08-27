const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('production workout exposes the focused Pose Bootstrap Trace beside pose proof', () => {
  const html = read('public/workout.html');
  const proof = html.indexOf('id="poseTrackingProof"');
  const trace = html.indexOf('id="poseBootstrapTrace"');
  assert.ok(proof >= 0 && trace > proof);
  assert.match(html, /id="poseBootstrapTraceValues"/);
});

test('camera bootstrap uses one authoritative production video and waits for dimensions', () => {
  const source = read('public/workout-runtime.js');
  assert.match(source, /function getVideoElement\(\)\{ return byId\('video'\)/);
  assert.match(source, /video\.srcObject = stream/);
  assert.match(source, /srcObjectMatchesStream: video\.srcObject === stream/);
  assert.match(source, /VIDEO_METADATA_NOT_READY/);
  assert.doesNotMatch(source, /createElement\(['"]video['"]\)/);
});

test('TensorFlow, detector, and first inference boundaries are explicitly traced', () => {
  const loader = read('public/runtime-state.js');
  const pose = read('public/pose-runtime.js');
  for (const boundary of ['TF_SCRIPT_LOAD_FAILED', 'POSE_DETECTION_SCRIPT_LOAD_FAILED']) assert.match(loader, new RegExp(boundary));
  for (const boundary of ['TF_READY_REJECTED', 'MOVENET_DETECTOR_CREATE_FAILED', 'ESTIMATE_POSES_REJECTED']) assert.match(pose, new RegExp(boundary));
  assert.match(loader, /tfVersion = global\.tf\?\.version\?\.tfjs/);
  assert.match(pose, /estimatePosesEnteredCount/);
});
