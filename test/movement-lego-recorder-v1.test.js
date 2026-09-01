'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  MovementRecorder,
  compactFrame,
  summarize,
  saveLocalRecording,
  readLocalRecordings,
  MAX_LOCAL_RECORDINGS
} = require('../public/motion/movement-recorder');

function fakeTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener); },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    dispatch(type, detail) { for (const listener of listeners.get(type) || []) listener({ type, detail }); }
  };
}

function point(name, x, y, score = 0.95) { return { name, x, y, score }; }
function posePacket(at = 1000) {
  const points = [
    point('nose', 100, 8),
    point('left_shoulder', 70, 30), point('right_shoulder', 130, 30),
    point('left_elbow', 60, 48), point('right_elbow', 140, 48),
    point('left_wrist', 52, 66), point('right_wrist', 148, 66),
    point('left_hip', 80, 58), point('right_hip', 120, 58),
    point('left_knee', 82, 76), point('right_knee', 118, 76),
    point('left_ankle', 84, 96), point('right_ankle', 116, 96)
  ];
  return { at, video: { width: 200, height: 100 }, keypoints: points, pose: { keypoints: points } };
}

test('compact movement frames contain body mechanics but no raw video', () => {
  const frame = compactFrame({
    timestamp: 1000,
    confidence: { bodyDetected: true, overall: 0.9 },
    joints: {
      left_shoulder: { x: 0.35, y: 0.3, confidence: 0.9 }, left_elbow: { x: 0.3, y: 0.5, confidence: 0.9 }, left_wrist: { x: 0.25, y: 0.7, confidence: 0.9 },
      right_shoulder: { x: 0.65, y: 0.3, confidence: 0.9 }, right_elbow: { x: 0.7, y: 0.5, confidence: 0.9 }, right_wrist: { x: 0.75, y: 0.7, confidence: 0.9 },
      left_hip: { x: 0.4, y: 0.6, confidence: 0.9 }, right_hip: { x: 0.6, y: 0.6, confidence: 0.9 },
      left_knee: { x: 0.4, y: 0.8, confidence: 0.9 }, right_knee: { x: 0.6, y: 0.8, confidence: 0.9 },
      left_ankle: { x: 0.4, y: 1, confidence: 0.9 }, right_ankle: { x: 0.6, y: 1, confidence: 0.9 }
    },
    landmarks: { bodyHeightNormalized: 0.7, hipCenter: { x: 0.5, y: 0.6, confidence: 0.9 } },
    directions: { bodyAxis: { x: 0, y: 1, z: 0 } }
  }, 250);
  assert.equal(frame.t, 250);
  assert.equal(frame.quality.usable, true);
  assert.equal(frame.landmarks.bodyHeightNormalized, 0.7);
  assert.equal(frame.directions.bodyAxis.y, 1);
  assert.equal('video' in frame, false);
  assert.equal('image' in frame, false);
});

test('recorder subscribes to canonical pose-runtime frames and creates a reusable template recording', () => {
  const target = fakeTarget();
  let now = 1000;
  const recorder = new MovementRecorder({ eventTarget: target, now: () => now });
  recorder.start({ primitiveId: 'stand_to_ground', label: 'neutral ground entry', category: 'transitions', durationMs: 5000 });
  target.dispatch('pose-runtime:frame', { posePacket: posePacket(now) });
  now += 70;
  target.dispatch('pose-runtime:frame', { posePacket: posePacket(now) });
  now += 70;
  target.dispatch('pose-runtime:frame', { posePacket: posePacket(now) });
  const recording = recorder.stop('manual');
  assert.equal(recording.meta.primitiveId, 'stand_to_ground');
  assert.equal(recording.source, 'PocketPT MoveNet / pose-runtime:frame');
  assert.equal(recording.rawVideoStored, false);
  assert.equal(recording.threeDimensionalBoneRotations, false);
  assert.equal(recording.handDetail, 'wrist-only; no finger skeleton');
  assert.equal(recording.frames.length, 3);
  assert.ok(recording.summary.frameCount >= 3);
  recorder.dispose();
});

test('summary reports usable-frame quality instead of assuming every frame is valid', () => {
  const result = summarize([
    { t: 0, quality: { usable: true, overallConfidence: 0.9, visibleJointCount: 12 } },
    { t: 100, quality: { usable: false, overallConfidence: 0.2, visibleJointCount: 4 } }
  ]);
  assert.equal(result.frameCount, 2);
  assert.equal(result.usableFrameCount, 1);
  assert.equal(result.usableRatio, 0.5);
  assert.equal(result.durationMs, 100);
});

test('local evidence storage is bounded', () => {
  const memory = new Map();
  const storage = { getItem: (key) => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) };
  for (let index = 0; index < MAX_LOCAL_RECORDINGS + 3; index += 1) {
    saveLocalRecording({ recordingId: `r${index}`, meta: { primitiveId: 'plank' } }, storage);
  }
  const stored = readLocalRecordings(storage);
  assert.equal(stored.length, MAX_LOCAL_RECORDINGS);
  assert.equal(stored[0].recordingId, `r${MAX_LOCAL_RECORDINGS + 2}`);
});

test('scavenger registry has compact sections and starts from the merged stand-to-plank evidence', () => {
  const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/motion/registry/movement-lego-scavenger.v1.json'), 'utf8'));
  assert.deepEqual(registry.statusOrder, ['EMPTY', 'CANDIDATE', 'STUDIED', 'VALIDATED', 'READY']);
  assert.deepEqual(registry.sections.map((section) => section.id), ['transitions', 'postures', 'actions']);
  const cards = registry.sections.flatMap((section) => section.cards);
  assert.equal(new Set(cards.map((card) => card.id)).size, cards.length);
  const ground = cards.find((card) => card.id === 'stand_to_ground');
  assert.equal(ground.status, 'CANDIDATE');
  assert.ok(ground.repoEvidence.includes('/motion/transition-profiles/stand-to-plank.v1.json'));
});

test('trainer boot conditionally requests the recorder instead of adding a second camera runtime', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/boot-core.js'), 'utf8');
  assert.match(source, /data-coach-template-builder/);
  assert.match(source, /\/motion\/movement-recorder\.js/);
  assert.doesNotMatch(source, /getUserMedia/);
});
