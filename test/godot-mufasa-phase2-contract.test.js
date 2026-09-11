'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const docPath = path.join(root, 'docs', 'review-handoffs', 'godot-mufasa-phase2-npc-locomotion-20260911.md');
const scriptPath = path.join(root, 'scripts', 'godot-mufasa-phase2-verify.ps1');

const doc = fs.readFileSync(docPath, 'utf8');
const script = fs.readFileSync(scriptPath, 'utf8');

test('Mufasa state machine includes the required NPC states', () => {
  for (const state of ['IDLE', 'ALERT', 'CHASE', 'YIELD', 'CIRCLE']) {
    assert.match(doc, new RegExp(`\\b${state}\\b`));
  }
});

test('Mufasa remains a separate NPC authority from the player controller', () => {
  assert.match(doc, /player controller and Mufasa controller must remain independent/i);
  assert.match(doc, /Do not modify:[\s\S]*player locomotion authority/i);
});

test('yield is an explicit external behavior boundary', () => {
  assert.match(doc, /MUFASA_YIELD/);
  assert.match(doc, /cancel pursuit target/i);
  assert.match(doc, /leave Run/i);
});

test('circle is dynamic around the current player rather than a baked orbit', () => {
  assert.match(doc, /Circle is navigation behavior, not a baked animation/i);
  assert.match(doc, /current personalized-player world position/i);
  assert.match(doc, /recalculate if the player moves/i);
});

test('world movement stays under navigation and physical NPC authority', () => {
  assert.match(doc, /NavigationAgent3D/);
  assert.match(doc, /no animation-root world translation/i);
  assert.match(script, /world translation = NPC CharacterBody\/NavigationAgent authority/i);
});

test('first-failure pipeline is complete', () => {
  const stages = [
    'NPC_STATE',
    'MUFASA_NODE_RESOLVED',
    'ANIMATION_PLAYER_RESOLVED',
    'CLIP_RESOLVED',
    'PLAYER_TARGET_RESOLVED',
    'NAV_TARGET_RESOLVED',
    'PATH_AVAILABLE',
    'CLIP_PLAY_REQUESTED',
    'CLIP_PLAYING',
    'NPC_MOVED'
  ];
  for (const stage of stages) {
    assert.match(doc, new RegExp(stage));
    assert.match(script, new RegExp(stage));
  }
});

test('verifier is read-only with respect to git', () => {
  assert.doesNotMatch(script, /git\s+add\s+\./i);
  assert.doesNotMatch(script, /git\s+reset\s+--hard/i);
  assert.doesNotMatch(script, /git\s+clean/i);
  assert.doesNotMatch(script, /git\s+commit/i);
  assert.doesNotMatch(script, /git\s+push/i);
});

test('protected systems stay out of scope', () => {
  for (const protectedTerm of ['GO_TO_MAT', 'MoveNet', 'Push-Up Arena', 'Thriller', 'Motion Lab']) {
    assert.match(doc, new RegExp(protectedTerm.replace('-', '\\-'), 'i'));
  }
});
