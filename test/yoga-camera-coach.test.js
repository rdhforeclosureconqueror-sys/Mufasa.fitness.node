'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const definitions = require('../data/yoga/pose-rules.v1.json').poses;
const poses = require('../data/yoga/poses.v1.json');
const sessions = require('../data/yoga/sessions.v1.json');
const importedMapping = require('../docs/yoga/imported-pose-mapping.v1.json');
const { jointAngle } = require('../src/yoga/camera-coach/geometry');
const { normalizeLandmarks } = require('../src/yoga/camera-coach/landmarks');
const { evaluatePose } = require('../src/yoga/camera-coach/ruleEngine');
const { createCameraCoach } = require('../src/yoga/camera-coach');

const point = (x, y, confidence = 1) => ({ x, y, confidence });

test('normalizes coordinates and mirrored camera side names', () => {
  const result = normalizeLandmarks([{ name: 'left_knee', x: 80, y: 25, confidence: 0.8 }], { width: 100, height: 50, mirrored: true });
  assert.deepEqual(result.right_knee, { x: 0.8, y: 0.5, z: 0, confidence: 0.8 });
});

test('calculates deterministic joint angles', () => {
  assert.equal(jointAngle(point(1, 0), point(0, 0), point(0, 1)), 90);
  assert.equal(jointAngle(point(-1, 0), point(0, 0), point(1, 0)), 180);
});

test('evaluates a passing Chair observation and chooses an available side', () => {
  const landmarks = normalizeLandmarks({ left_hip: point(0, 1), left_knee: point(0, 0), left_ankle: point(1, 0) });
  const result = evaluatePose({ poseId: 'chair', timestamp: 1, landmarks }, definitions[0]);
  assert.equal(result.overallStatus, 'aligned');
  assert.equal(result.rules[0].side, 'left');
});

test('missing and low-confidence landmarks do not create corrective feedback', () => {
  const definition = definitions[0];
  const missing = evaluatePose({ poseId: 'chair', landmarks: {} }, definition);
  assert.equal(missing.overallStatus, 'insufficient_data');
  assert.deepEqual(missing.feedback, []);
  const landmarks = normalizeLandmarks({ left_hip: point(0, 1, 0.2), left_knee: point(0, 0), left_ankle: point(1, 0) });
  assert.equal(evaluatePose({ poseId: 'chair', landmarks }, definition).rules[0].reason, 'low_confidence');
});

test('multiple failures generate ordered correction messages', () => {
  const landmarks = normalizeLandmarks({
    left_hip: point(0, 1), left_knee: point(0, 0), left_ankle: point(0.2, 1),
    right_hip: point(2, 1), right_knee: point(2, 0), right_ankle: point(2.2, 1),
    left_shoulder: point(0, 2), left_elbow: point(0, 1), left_wrist: point(1, 1),
    right_shoulder: point(2, 2), right_elbow: point(2, 1), right_wrist: point(1, 1),
  });
  const result = evaluatePose({ poseId: 'warrior-ii', landmarks }, definitions[1]);
  assert.equal(result.overallStatus, 'needs_adjustment');
  assert.equal(result.feedback.length, 3);
});

test('provider adapter preserves optional integration boundary', async () => {
  const coach = createCameraCoach({
    landmarkProvider: { observe: async () => ({ timestamp: 7, width: 1, height: 1, landmarks: {
      left_hip: point(0, 1), left_knee: point(0, 0), left_ankle: point(1, 0),
    } }) },
    ruleDefinitions: definitions,
  });
  assert.equal((await coach.checkForm('chair')).timestamp, 7);
});

test('rules and sessions reference canonical pose IDs only', () => {
  const canonical = new Set(poses.poses.map((pose) => pose.id));
  definitions.forEach((definition) => assert.ok(canonical.has(definition.poseId)));
  sessions.sessions.flatMap((session) => session.poses).forEach((step) => assert.ok(canonical.has(step.poseId)));
  importedMapping.mappings.forEach((mapping) => assert.ok(canonical.has(mapping.canonicalPoseId)));
});
