#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const rootIndexPath = path.join(repoRoot, 'index.html');
const publicIndexPath = path.join(repoRoot, 'public', 'index.html');
const backendReadPath = path.join(repoRoot, 'public', 'backend-read.js');
const serverPath = path.join(repoRoot, 'server.js');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function assertContains(text, pattern, label, failures) {
  const ok = typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text);
  if (!ok) failures.push(label);
  return ok;
}

function run() {
  const failures = [];
  const rootIndex = read(rootIndexPath);
  const publicIndex = read(publicIndexPath);
  const backendRead = read(backendReadPath);
  const server = read(serverPath);

  assertContains(rootIndex, 'Loading Google sign-in', 'root index missing Google loading status text', failures);
  assertContains(publicIndex, 'Loading Google sign-in', 'public index missing Google loading status text', failures);
  assertContains(rootIndex, 'Failed:', 'root index missing Google failure status text', failures);
  assertContains(publicIndex, 'Failed:', 'public index missing Google failure status text', failures);
  if (rootIndex.includes('Build: pending')) failures.push('root index contains Build pending blocker text');
  if (publicIndex.includes('Build: pending')) failures.push('public index contains Build pending blocker text');
  if (rootIndex.includes('LOGIN TRACE BUILD ACTIVE')) failures.push('root index contains login trace marker');
  if (publicIndex.includes('LOGIN TRACE BUILD ACTIVE')) failures.push('public index contains login trace marker');

  assertContains(rootIndex, 'https://accounts.google.com/gsi/client', 'root index missing Google GIS script', failures);
  assertContains(publicIndex, 'https://accounts.google.com/gsi/client', 'public index missing Google GIS script', failures);

  assertContains(rootIndex, /google\.accounts\.id\.initialize\(/, 'root index missing google.accounts.id.initialize', failures);
  assertContains(rootIndex, /google\.accounts\.id\.renderButton\(/, 'root index missing google.accounts.id.renderButton', failures);
  if (/google\.accounts\.id\.prompt\(/.test(rootIndex)) failures.push('root index still uses deprecated google.accounts.id.prompt flow');

  assertContains(rootIndex, 'id="googleBtn"', 'root index missing google button id', failures);
  assertContains(rootIndex, 'id="googleSignInMount"', 'root index missing GIS mount container id', failures);

  assertContains(server, 'app.post("/api/auth/bridge"', 'server missing /api/auth/bridge route', failures);
  assertContains(backendRead, '"/api/auth/bridge"', 'frontend backend-read missing /api/auth/bridge call', failures);
  assertContains(backendRead, 'credential', 'frontend bridge payload missing credential', failures);
  assertContains(backendRead, 'body.provider', 'frontend bridge payload missing provider', failures);
  assertContains(backendRead, 'body.trustMode', 'frontend bridge payload missing trustMode', failures);
  assertContains(backendRead, 'body.googleIdToken', 'frontend bridge payload missing credential/googleIdToken', failures);

  assertContains(rootIndex, 'setGoogleSignInStatus("Loading Google sign-in")', 'root index missing Google loading status handler call', failures);
  assertContains(rootIndex, 'setGoogleSignInStatus("Ready")', 'root index missing Google ready status handler call', failures);
  assertContains(rootIndex, 'googleBtn.onclick = () => {', 'root index missing Google button click handler', failures);
  assertContains(rootIndex, 'callback: (response) => {', 'root index missing Google credential callback', failures);
  assertContains(rootIndex, 'const googleIdToken = response.credential || null;', 'root index missing credential extraction from GIS callback', failures);
  assertContains(rootIndex, 'BACKEND_READ_CLIENT.ensureAuthToken', 'root index missing auth bridge invocation', failures);

  const authShellStart = rootIndex.indexOf('function setGoogleSignInStatus(message) {');
  const authShellEnd = rootIndex.indexOf('signOutBtn.onclick =', authShellStart);
  if (authShellStart < 0 || authShellEnd <= authShellStart) failures.push('unable to isolate root index auth shell block');
  else {
    const authShell = rootIndex.slice(authShellStart, authShellEnd);
    if (/retention-flow|ensureRetentionFlowLoaded/i.test(authShell)) failures.push('root auth shell depends on retention-flow loader');
    if (/workout/i.test(authShell)) failures.push('root auth shell depends on workout bootstrap');
    if (/avatar/i.test(authShell)) failures.push('root auth shell depends on avatar bootstrap');
  }

  if (failures.length) {
    console.error('auth:trace-audit failed:');
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }

  console.log('auth:trace-audit passed.');
  console.log('Verified GIS shell wiring, minimal fallback copy, bridge route/payload wiring, and auth-shell isolation.');
}

run();
