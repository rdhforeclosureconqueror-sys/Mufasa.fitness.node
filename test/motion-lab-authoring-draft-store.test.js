'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(ROOT, 'motion-lab/index.html'), 'utf8');
const store = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-authoring-draft-store.js'), 'utf8');
const Lunge = require('../public/motion/lunge-motion-spec.js');

test('Pose Editor exposes save load and delete authored motion controls', () => {
  assert.match(index, /id="poseEditorSaveDraft"[^>]*>Save Adjusted Motion</);
  assert.match(index, /id="poseEditorLoadDraft"[^>]*>Load Saved Motion</);
  assert.match(index, /id="poseEditorDeleteDraft"[^>]*>Delete Saved Motion</);
  assert.match(index, /motion-lab-authoring-draft-store\.js/);
});

test('authoring draft store persists by motion id without rewriting canonical Motion Spec', () => {
  assert.match(store, /pocketpt\.motionLab\.authoringDraft\.v1:/);
  assert.match(store, /localStorage\?\.setItem/);
  assert.match(store, /motionId: id/);
  assert.match(store, /adjustment/);
  assert.match(store, /clip: clipJson/);
  assert.doesNotMatch(store, /lunge\/stationary_left/);
  assert.doesNotMatch(store, /lunge-motion-spec\.js/);
});

test('saved authored clip restores as a ready editing base without autoplay', () => {
  assert.match(store, /AnimationClip\?\.parse/);
  assert.match(store, /SAVED AUTHORING DRAFT/);
  assert.match(store, /active\.loadMotionSpec\(active\.motionSpec, compiler\)/);
  assert.match(store, /Press Play to preview or continue editing from this draft/);
  assert.doesNotMatch(store, /active\.play\?\.\(\)/);
});

test('saving requires real edits and a successfully built adjusted preview', () => {
  assert.match(store, /authoring_edits_required/);
  assert.match(store, /api\.playAdjustedPreview\?\.\(\)/);
  assert.match(store, /adjusted_preview_build/);
  assert.match(store, /clip_serialization_failed/);
});

test('durable draft feature does not promote unverified v2.2/v2.3 geometry into canonical lunge', () => {
  assert.equal(Lunge.spec.version, 2.1);
  assert.equal(Lunge.spec.motionId, 'lunge/stationary_left_movement_definition_v2_1_exit_release');
  assert.equal(Lunge.spec.acceptedAuthoringAdjustment, undefined);
  assert.match(index, /Load Stationary Lunge Left v2\.1 \(Reference Only\)/);
  assert.doesNotMatch(index, /Load Stationary Lunge Left v2\.3 \(Reference Only\)/);
});
