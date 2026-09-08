'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/motion/motion-lab-adjusted-preview-persistence.js'), 'utf8');

function loadModule() {
  const window = {
    PocketPTMotionLabPoseEditor: Object.freeze({
      VERSION: 'test-editor',
      exportAdjustment() {
        return Object.freeze({
          schemaVersion: 1,
          type: 'motion_lab_pose_adjustment',
          motionId: 'test-motion',
          edits: Object.freeze([
            Object.freeze({ phaseId: 'bottom', target: 'left_foot', mode: 'endpoint_or_root_translation' })
          ])
        });
      }
    })
  };
  const context = { window };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.window;
}

test('persistent preview installation fails closed unless exported authoring truth can be extended', () => {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context);
  const runtime = { createMotionSession() { return {}; } };
  const out = context.window.PocketPTMotionLabAdjustedPreviewPersistence.install(runtime);
  assert.equal(out, null);
  assert.equal(context.window.PocketPTMotionLabAdjustedPreviewPersistence.snapshot().firstFailingBoundary, 'editor_export_contract_available');
});

test('exported adjustment explicitly describes all-sample preview propagation', () => {
  const window = loadModule();
  const runtime = { createMotionSession() { return {}; } };
  const installed = window.PocketPTMotionLabAdjustedPreviewPersistence.install(runtime);
  assert.ok(installed?.createMotionSession);

  const payload = window.PocketPTMotionLabPoseEditor.exportAdjustment();
  assert.equal(payload.previewPersistence.enabled, true);
  assert.equal(payload.previewPersistence.scope, 'all_track_samples');
  assert.equal(payload.previewPersistence.strategy, 'constant_local_delta_from_edited_phase');
  assert.deepEqual(Array.from(payload.previewPersistence.sourcePhaseIds), ['bottom']);
  assert.equal(payload.previewPersistence.canonicalMotionSpecUnchanged, true);
});

test('persistence snapshot names the same propagation contract used by export', () => {
  const window = loadModule();
  const snapshot = window.PocketPTMotionLabAdjustedPreviewPersistence.snapshot();
  assert.equal(snapshot.propagationScope, 'all_track_samples');
  assert.equal(snapshot.propagationStrategy, 'constant_local_delta_from_edited_phase');
});
