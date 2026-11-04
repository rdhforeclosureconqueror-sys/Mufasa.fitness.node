const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/shared-narration-player.js'), 'utf8');
test('player supports native audio and transcript without AI generation', () => {
  assert.ok(source.includes('audio.controls = true'));
  assert.ok(source.includes('Read transcript'));
  assert.ok(source.includes('Audio is not available yet'));
  assert.ok(!source.includes('speechSynthesis'));
  assert.ok(!source.includes('MediaRecorder'));
});
