const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync(require.resolve('../public/workout.html'), 'utf8');
const layoutProof = fs.readFileSync(require.resolve('../public/mobile-layout-containment.js'), 'utf8');
const workoutRuntime = fs.readFileSync(require.resolve('../public/workout-runtime.js'), 'utf8');
const poseRuntime = fs.readFileSync(require.resolve('../public/pose-runtime.js'), 'utf8');

const build = '2026-08-27-movenet-visible-audible-v22';

test('mobile diagnostics and grid children use shrink-safe containment', () => {
  assert.match(html, /\.app > \*, \.pane > \* \{ min-width: 0; \}/);
  assert.match(html, /\.small-card \{[\s\S]*?max-width: 100%;[\s\S]*?min-width: 0;/);
  assert.match(html, /\.diagPre,[\s\S]*?white-space: pre-wrap;[\s\S]*?overflow-wrap: anywhere;[\s\S]*?word-break: break-word;/);
  assert.doesNotMatch(html, /html, body \{[\s\S]{0,100}overflow-x: hidden/);
});

test('camera card and authoritative production video are width-contained', () => {
  assert.match(html, /\.video-shell \{[\s\S]*?max-width: 100%;[\s\S]*?box-sizing: border-box;/);
  assert.match(html, /video, canvas \{[\s\S]*?width: 100%;[\s\S]*?max-width: 100%;[\s\S]*?display: block;/);
  assert.equal((html.match(/<video id="video"/g) || []).length, 1);
  assert.match(workoutRuntime, /function getVideoElement\(\)\{ return byId\('video'\)/);
  assert.doesNotMatch(`${html}\n${workoutRuntime}\n${poseRuntime}`, /createElement\(['"]video['"]\)/);
});

test('production-visible proof measures all four stages and reports offenders', () => {
  assert.match(html, /Mobile Layout Containment Proof/);
  for (const text of ['before Connect Camera', 'immediately after camera ready', '250 ms after camera ready', '1 second after camera ready']) assert.match(layoutProof, new RegExp(text));
  for (const text of ['Document scroll width', 'Body scroll width', 'Horizontal overflow present', 'Overflow offender count', 'Pose Tracking Proof container width', 'Pose Bootstrap Trace container width']) assert.match(layoutProof, new RegExp(text));
  assert.match(layoutProof, /querySelectorAll\('\*'\)/);
});

test('layout phase uses the new cache identifier without editing inference behavior', () => {
  assert.match(html, new RegExp(build));
  assert.match(fs.readFileSync(require.resolve('../server.js'), 'utf8'), new RegExp(build));
  assert.match(fs.readFileSync(require.resolve('../public/__frontend-version.json'), 'utf8'), new RegExp(build));
  assert.match(poseRuntime, /estimatePosesEnteredCount/);
  assert.match(poseRuntime, /estimatePosesResolvedCount/);
  assert.match(poseRuntime, /estimatePosesRejectedCount/);
});
