const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../public/workout.html'), 'utf8');
const alternateWorkout = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const BUILD = '2026-08-29-full-body-retarget-v1';
const POSE_BACKEND_BUILD = '2026-08-29-ios-webgl-backend-v1';
const ALIGNED_ASSETS = [
  '/motion/avaturn-live-pose-solver.js',
  '/motion/live-avatar-mirror.js',
  '/motion/normalized-pose.js'
];

test('workout loads every changed live-stability runtime with one coherent cache identifier', () => {
  for (const asset of ALIGNED_ASSETS) {
    const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(html, new RegExp(`<script[^>]+src=["']${escaped}\\?v=${BUILD}["']`), asset);
    assert.equal((html.match(new RegExp(`${escaped}\\?v=`, 'g')) || []).length, 1, `${asset} has one versioned include`);
  }
});

test('changed normalized-pose runtime shares the full-body cache identifier', () => {
  assert.match(html, new RegExp(`/motion/normalized-pose\\.js\\?v=${BUILD}`));
});

test('alternate workout shell cannot load the changed pose runtime from the prior cache generation', () => {
  assert.match(alternateWorkout, new RegExp(`/pose-runtime\\.js\\?v=${POSE_BACKEND_BUILD}`));
  assert.doesNotMatch(alternateWorkout, /pose-runtime\.js\?v=2026-08-28-movenet-temporal-display-proof-v25/);
});

test('backend-selection runtime uses one coherent deployment identifier in both shells', () => {
  for (const shell of [html, alternateWorkout]) {
    assert.equal((shell.match(new RegExp(`/pose-runtime\\.js\\?v=${POSE_BACKEND_BUILD}`, 'g')) || []).length, 1);
    assert.doesNotMatch(shell, new RegExp(`/pose-runtime\\.js\\?v=${BUILD}`));
  }
});
