'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('RuntimeState routes Mufasa chat to the authenticated Node AI Coach', () => {
  const source = read('public/runtime-state.js');
  const storage = new Map();
  const scope = {
    location: { origin: 'https://member.example' },
    MAAT_BACKEND_ORIGIN: 'https://mufasa-fitness-node.onrender.com',
    localStorage: { setItem: (key, value) => storage.set(key, value) },
    console,
    URL,
  };
  scope.window = scope;
  scope.globalThis = scope;
  vm.runInNewContext(source, scope, { filename: 'runtime-state.js' });

  const endpoints = scope.RuntimeState.getEndpoints();
  assert.equal(endpoints.aiCoachUrl, 'https://mufasa-fitness-node.onrender.com/api/me/ai-coach/messages');
  assert.equal(endpoints.askUrl, endpoints.aiCoachUrl, 'legacy askUrl alias must converge on canonical AI Coach');
  assert.equal(endpoints.programUrl, 'https://mufasabrain.onrender.com/coach/program/generate', 'program generation is intentionally outside Phase A');
  assert.notEqual(endpoints.askUrl, 'https://mufasabrain.onrender.com/ask');
});

test('workout and mirror shells consume RuntimeState askUrl rather than declaring a second coach authority', () => {
  for (const file of ['public/workout.html', 'index.html']) {
    const source = read(file);
    assert.match(source, /const ASK_URL = RUNTIME_ENDPOINTS\.askUrl \|\| BRAIN_BASE_URL \+ "\/ask";/, `${file} should consume RuntimeState.askUrl`);
    assert.match(source, /askUrl:\s*ASK_URL/, `${file} should pass canonical askUrl into CoachRuntime`);
  }
});

test('CoachRuntime keeps authenticated member identity on canonical AI Coach requests', () => {
  const source = read('public/coach-runtime.js');
  assert.match(source, /const authToken = deps\.getAuthToken\?\.\(\);/);
  assert.match(source, /authorization:\s*`Bearer \$\{authToken\}`/);
  assert.match(source, /payload\?\.data\?\.answer/, 'canonical Node ok-envelope answer must be supported');
});

test('canonical server route derives Mufasa member identity from authentication', () => {
  const source = read('server.js');
  assert.match(source, /app\.post\("\/api\/me\/ai-coach\/messages", requireAuth, requireMembershipEntitlement/);
  assert.match(source, /aiCoachService\.ask\(req\.auth\.userId, req\.body\?\.message\)/);
});
