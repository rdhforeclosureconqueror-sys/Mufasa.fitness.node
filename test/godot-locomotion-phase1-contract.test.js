'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const handoffPath = path.join(
  root,
  'docs',
  'review-handoffs',
  'godot-locomotion-phase1-player-controller-20260911.md'
);
const verifyPath = path.join(root, 'scripts', 'godot-locomotion-phase1-verify.ps1');

test('defines one shared locomotion authority and required states', () => {
  const text = fs.readFileSync(handoffPath, 'utf8');
  assert.match(text, /IDLE -> WALK -> RUN -> STOP -> IDLE/);
  assert.match(text, /ACTION_OVERRIDE/);
  assert.match(text, /FINAL HORIZONTAL VELOCITY/);
  assert.match(text, /Do not create a separate GO_TO_MAT animation controller\./);
  assert.match(text, /Do not create a separate manual-movement animation controller\./);
});

test('protects physical world-motion authority and navigation semantics', () => {
  const text = fs.readFileSync(handoffPath, 'utf8');
  assert.match(text, /CharacterBody3D \/ NavigationAgent3D remain world-position authority\./);
  assert.match(text, /map_get_closest_point/);
  assert.match(text, /Do not restore `NavigationAgent3D\.is_navigation_finished\(\)` as the AT_MAT authority\./);
});

test('requires truthful clip resolution and first-failure diagnostics', () => {
  const text = fs.readFileSync(handoffPath, 'utf8');
  assert.match(text, /Do not fabricate clip names\./);
  assert.match(text, /IDLE_CLIP_RESOLVED/);
  assert.match(text, /WALK_CLIP_RESOLVED/);
  assert.match(text, /RUN_CLIP_RESOLVED/);
  assert.match(text, /FIRST FAILURE/);
  assert.match(text, /CLIP_PLAYING -> CHARACTER_MOVED/);
});

test('keeps Mufasa and unrelated systems out of player locomotion phase', () => {
  const text = fs.readFileSync(handoffPath, 'utf8');
  assert.match(text, /Do not implement Mufasa in this phase\./);
  assert.match(text, /Do not alter MoveNet\/TensorFlow\./);
  assert.match(text, /Do not alter Push-Up Arena rep\/timer\/leaderboard logic\./);
  assert.match(text, /Do not alter Thriller\./);
  assert.match(text, /Do not alter Motion Lab overhead squat\./);
});

test('verification helper stays read-only with respect to git', () => {
  const text = fs.readFileSync(verifyPath, 'utf8');
  assert.doesNotMatch(text, /git\s+add\s+\./i);
  assert.doesNotMatch(text, /git\s+reset\s+--hard/i);
  assert.doesNotMatch(text, /git\s+clean\b/i);
  assert.doesNotMatch(text, /git\s+checkout\b/i);
  assert.doesNotMatch(text, /git\s+switch\b/i);
  assert.match(text, /git status --short/);
  assert.match(text, /git rev-parse HEAD/);
});
