'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'stage-avatar-startup-restore.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

test('staging workflow accepts only the verified 6d8b145 generated candidate', () => {
  assert.match(workflow, /GODOT_SOURCE_COMMIT: 6d8b145a29a49f34a2197ffc91ddac69f85d6a6b/);
  assert.match(workflow, /GODOT_GENERATED_BRANCH: generated\/web-candidate/);
  assert.match(workflow, /grep -Fx "godot_source_commit=\$\{GODOT_SOURCE_COMMIT\}"/);
  assert.doesNotMatch(workflow, /37a5bde0e9dfd56317fed5a3f2ca68a3b1d587a2/);
});

test('staging workflow runs on the actual Codex review branch', () => {
  assert.match(workflow, /- codex\/audit-and-fix-stale-godot-build-issues/);
  assert.doesNotMatch(workflow, /- fix\/stage-current-godot-candidate-20260914/);
});

test('staging workflow records candidate identity and verifies producer bytes before copy', () => {
  assert.match(workflow, /rev-parse HEAD > \/tmp\/GODOT_CANDIDATE_COMMIT/);
  assert.match(workflow, /sha256sum -c -/);
  assert.match(workflow, /godotCandidateCommit: candidateCommit/);

  for (const file of ['index.html', 'index.js', 'index.pck', 'index.wasm']) {
    assert.match(workflow, new RegExp(`cp "\\$CANDIDATE\/${file}" public\/game\/push-up-arena\/${file.replace('.', '\\.')}\\b`));
  }
});
