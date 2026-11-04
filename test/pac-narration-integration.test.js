const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (name) => fs.readFileSync(path.join(__dirname, '..', 'public', name), 'utf8');
test('PAC loads narration component before weekly story renderer', () => {
  const html = read('eight-limbs-adinkra.html');
  assert.ok(html.includes('/shared-narration-player.js'));
  assert.ok(html.indexOf('/shared-narration-player.js') < html.indexOf('/eight-limbs-adinkra.js'));
});
test('weekly story is escaped and remains readable as transcript', () => {
  const js = read('eight-limbs-adinkra.js');
  assert.ok(js.includes('milele-narration'));
  assert.ok(js.includes('data-transcript'));
  assert.ok(js.includes('escapeHtml(story.story)'));
});
