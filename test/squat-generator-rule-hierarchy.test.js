const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const text = fs.readFileSync(path.join(ROOT, 'docs/review-handoffs/squat-generator-rules-v1.md'), 'utf8');

test('generator rule hierarchy puts exercise constraints ahead of source animation styling', () => {
  assert.match(text, /Hard constraints/);
  assert.match(text, /Numerical targets/);
  assert.match(text, /Coaching intent/);
  assert.match(text, /Movement Lego selection/);
  assert.match(text, /constraints outrank source styling/i);
});

test('generator rules reject a universal knees-behind-toes rule', () => {
  assert.match(text, /Do not encode `knee may never pass toe` as a universal hard rule/);
  assert.match(text, /ankle dorsiflexion/);
  assert.match(text, /knees track with the feet/);
});
