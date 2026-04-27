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

  assertContains(rootIndex, 'LOGIN TRACE BUILD ACTIVE', 'root index missing LOGIN TRACE BUILD ACTIVE marker', failures);
  assertContains(publicIndex, 'LOGIN TRACE BUILD ACTIVE', 'public index missing LOGIN TRACE BUILD ACTIVE marker', failures);
  assertContains(rootIndex, 'window.__LOGIN_TRACE_BUILD_ACTIVE = true', 'root index missing __LOGIN_TRACE_BUILD_ACTIVE global', failures);
  assertContains(publicIndex, 'window.__LOGIN_TRACE_BUILD_ACTIVE = true', 'public index missing __LOGIN_TRACE_BUILD_ACTIVE global', failures);

  assertContains(rootIndex, 'https://accounts.google.com/gsi/client', 'root index missing Google GIS script', failures);
  assertContains(publicIndex, 'https://accounts.google.com/gsi/client', 'public index missing Google GIS script', failures);

  assertContains(rootIndex, /google\.accounts\.id\.initialize\(/, 'root index missing google.accounts.id.initialize', failures);
  assertContains(rootIndex, /google\.accounts\.id\.renderButton\(/, 'root index missing google.accounts.id.renderButton', failures);
  assertContains(rootIndex, /google\.accounts\.id\.prompt\(/, 'root index missing google.accounts.id.prompt', failures);

  assertContains(rootIndex, 'id="googleBtn"', 'root index missing google button id', failures);
  assertContains(rootIndex, 'id="googleSignInMount"', 'root index missing GIS mount container id', failures);

  assertContains(server, 'app.post("/api/auth/bridge"', 'server missing /api/auth/bridge route', failures);
  assertContains(backendRead, '"/api/auth/bridge"', 'frontend backend-read missing /api/auth/bridge call', failures);
  assertContains(backendRead, 'body.provider', 'frontend bridge payload missing provider', failures);
  assertContains(backendRead, 'body.trustMode', 'frontend bridge payload missing trustMode', failures);
  assertContains(backendRead, 'body.googleIdToken', 'frontend bridge payload missing credential/googleIdToken', failures);

  assertContains(rootIndex, 'window.__loginTrace', 'root index missing login trace globals', failures);
  assertContains(rootIndex, 'function updateLoginTrace', 'root index missing updateLoginTrace helper', failures);
  assertContains(rootIndex, 'function ensureRetentionFlowLoaded', 'root index missing retention flow lazy-loader wrapper', failures);
  assertContains(rootIndex, 'retentionFlowBootPromise = window.__loadExternalScript', 'retention-flow not lazy-loaded through guarded promise', failures);
  assertContains(rootIndex, '.catch((error) => {', 'retention-flow loader missing catch guard', failures);

  if (failures.length) {
    console.error('auth:trace-audit failed:');
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }

  console.log('auth:trace-audit passed.');
  console.log('Verified login trace marker, GIS shell wiring, auth bridge route/payload, and guarded retention-flow loader.');
}

run();
