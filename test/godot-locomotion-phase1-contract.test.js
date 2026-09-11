const fs = require('fs');
const path = require('path');

describe('Godot locomotion phase 1 contract', () => {
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
    expect(text).toContain('IDLE -> WALK -> RUN -> STOP -> IDLE');
    expect(text).toContain('ACTION_OVERRIDE');
    expect(text).toContain('FINAL HORIZONTAL VELOCITY');
    expect(text).toContain('Do not create a separate GO_TO_MAT animation controller.');
    expect(text).toContain('Do not create a separate manual-movement animation controller.');
  });

  test('protects physical world-motion authority and navigation semantics', () => {
    const text = fs.readFileSync(handoffPath, 'utf8');
    expect(text).toContain('CharacterBody3D / NavigationAgent3D remain world-position authority.');
    expect(text).toContain('map_get_closest_point');
    expect(text).toContain('Do not restore `NavigationAgent3D.is_navigation_finished()` as the AT_MAT authority.');
  });

  test('requires truthful clip resolution and first-failure diagnostics', () => {
    const text = fs.readFileSync(handoffPath, 'utf8');
    expect(text).toContain('Do not fabricate clip names.');
    expect(text).toContain('IDLE_CLIP_RESOLVED');
    expect(text).toContain('WALK_CLIP_RESOLVED');
    expect(text).toContain('RUN_CLIP_RESOLVED');
    expect(text).toContain('FIRST FAILURE');
    expect(text).toContain('CLIP_PLAYING -> CHARACTER_MOVED');
  });

  test('keeps Mufasa and unrelated systems out of player locomotion phase', () => {
    const text = fs.readFileSync(handoffPath, 'utf8');
    expect(text).toContain('Do not implement Mufasa in this phase.');
    expect(text).toContain('Do not alter MoveNet/TensorFlow.');
    expect(text).toContain('Do not alter Push-Up Arena rep/timer/leaderboard logic.');
    expect(text).toContain('Do not alter Thriller.');
    expect(text).toContain('Do not alter Motion Lab overhead squat.');
  });

  test('verification helper stays read-only with respect to git', () => {
    const text = fs.readFileSync(verifyPath, 'utf8');
    expect(text).not.toMatch(/git\s+add\s+\./i);
    expect(text).not.toMatch(/git\s+reset\s+--hard/i);
    expect(text).not.toMatch(/git\s+clean\b/i);
    expect(text).not.toMatch(/git\s+checkout\b/i);
    expect(text).not.toMatch(/git\s+switch\b/i);
    expect(text).toContain('git status --short');
    expect(text).toContain('git rev-parse HEAD');
  });
});
