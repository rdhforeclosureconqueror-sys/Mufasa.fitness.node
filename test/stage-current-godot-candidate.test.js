'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'stage-avatar-startup-restore.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

test('staging workflow accepts only the verified 7492057 generated candidate', () => {
  assert.match(workflow, /GODOT_SOURCE_COMMIT: 7492057e951d863cb64125b20451643688e01bb1/);
  assert.match(workflow, /GODOT_GENERATED_BRANCH: generated\/web-candidate/);
  assert.match(workflow, /grep -Fx "godot_source_commit=\$\{GODOT_SOURCE_COMMIT\}"/);
  assert.doesNotMatch(workflow, /6d8b145a29a49f34a2197ffc91ddac69f85d6a6b/);
});

test('staging workflow runs on the physical-acceptance round-2 staging branch', () => {
  assert.match(workflow, /- fix\/stage-multiplayer-arm-round2-20260914/);
  assert.doesNotMatch(workflow, /- codex\/audit-and-fix-stale-godot-build-issues/);
});

test('staging workflow records candidate identity and verifies producer bytes before copy', () => {
  assert.match(workflow, /rev-parse HEAD > \/tmp\/GODOT_CANDIDATE_COMMIT/);
  assert.match(workflow, /sha256sum -c -/);
  assert.match(workflow, /godotCandidateCommit: candidateCommit/);

  for (const file of ['index.html', 'index.js', 'index.pck', 'index.wasm']) {
    assert.match(workflow, new RegExp(`cp "\\$CANDIDATE\/${file}" public\/game\/push-up-arena\/${file.replace('.', '\\.')}\\b`));
  }
});
