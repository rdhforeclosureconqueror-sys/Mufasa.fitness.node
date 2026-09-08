'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const editor = read('public/motion/motion-lab-pose-editor.js');
const index = read('motion-lab/index.html');
const css = read('motion-lab/motion-lab.css');

test('Pose Editor resolves sanitized Mixamo aliases like the Motion Spec compiler', () => {
  assert.match(editor, /normalizedBoneKey/);
  assert.match(editor, /replace\(\/\[\^a-z0-9\]\/g, ''\)/);
  assert.match(editor, /normalizedMatches\.length === 1/);
  assert.match(editor, /authoring_chain_unresolved/);
  assert.match(editor, /requested:/);
  assert.match(editor, /resolved:/);
});

test('Move mode uses semantic avatar-relative directions instead of mislabeled world X', () => {
  assert.match(index, /value="forward">Forward \/ Back/);
  assert.match(index, /value="up">Up \/ Down/);
  assert.match(index, /value="lateral">Left \/ Right/);
  assert.match(editor, /avatarRelativeVector/);
  assert.match(editor, /getWorldQuaternion/);
  assert.doesNotMatch(index, /X — forward\/back/);
});

test('live Motion viewer is docked into Pose Editor for same-screen mobile authoring', () => {
  assert.match(index, /id="poseEditorLiveViewer"/);
  assert.match(editor, /mountLiveViewer/);
  assert.match(editor, /host\.appendChild\(viewer\)/);
  assert.match(css, /#poseEditorLiveViewer\{position:sticky/);
  assert.match(css, /#poseEditorLiveViewer #viewer\{height:280px\}/);
});

test('Pose Editor inspection session uses a gold scene for black-avatar contrast', () => {
  assert.match(editor, /GOLD_SCENE = 0xd4af37/);
  assert.match(editor, /session\.scene\.background = new session\.THREE\.Color\(GOLD_SCENE\)/);
  assert.match(css, /#viewer\{[^}]*background:#d4af37/);
});
