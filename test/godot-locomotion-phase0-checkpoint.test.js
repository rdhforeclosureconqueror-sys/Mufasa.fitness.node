'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const repoRoot = path.resolve(__dirname, '..');
const scriptPath = path.join(repoRoot, 'scripts', 'godot-locomotion-phase0-checkpoint.ps1');
const handoffPath = path.join(
  repoRoot,
  'docs',
  'review-handoffs',
  'godot-locomotion-phase0-execution-20260911.md'
);

test('Phase 0 checkpoint is read-only and preserves the local Godot safety boundary', () => {
  const source = fs.readFileSync(scriptPath, 'utf8');

  assert.match(source, /git status --short/);
  assert.match(source, /git branch --show-current/);
  assert.match(source, /git log -1 --oneline/);
  assert.match(source, /git remote -v/);
  assert.match(source, /NO_REMOTE \(allowed; do not invent one\)/);
  assert.match(source, /export_presets\.cfg\.before-pocketpt-fix/);

  assert.doesNotMatch(source, /git\s+reset\s+--hard/i);
  assert.doesNotMatch(source, /git\s+clean(?:\s|$)/i);
  assert.doesNotMatch(source, /git\s+add\s+\./i);
});

test('Phase 0 checkpoint looks for the authoritative Godot locomotion files', () => {
  const source = fs.readFileSync(scriptPath, 'utf8');

  for (const required of [
    'Main.tscn',
    'player.gd',
    'gym_environment.gd',
    'pocketpt_phone_flow.gd',
    'pocketpt_bootstrap.gd',
    'pocketpt_avatar_loader.gd',
    'pocketpt_game_client.gd',
    'pocketpt_bridge_debug.gd',
    'mufasa_gym.tscn'
  ]) {
    assert.match(source, new RegExp(required.replaceAll('.', '\\.')));
  }
});

test('Phase 0 handoff requires truthful runtime animation inventory before Walk is claimed', () => {
  const source = fs.readFileSync(handoffPath, 'utf8');

  for (const boundary of [
    'PERSONAL_AVATAR_MOUNTED',
    'SKELETON_FOUND',
    'BONES_INVENTORIED',
    'ANIMATION_PLAYER_FOUND',
    'ANIMATION_LIBRARY_FOUND',
    'CLIPS_INVENTORIED',
    'IDLE_CLIP_RESOLVED',
    'WALK_CLIP_RESOLVED',
    'RUN_CLIP_RESOLVED'
  ]) {
    assert.match(source, new RegExp(boundary));
  }

  assert.match(source, /Do not fabricate expected clip names\./);
  assert.match(source, /does \*\*not\*\* claim that Walk or Run are fixed/);
  assert.match(source, /World translation remains owned by `CharacterBody3D` \/ `NavigationAgent3D`\./);
});
