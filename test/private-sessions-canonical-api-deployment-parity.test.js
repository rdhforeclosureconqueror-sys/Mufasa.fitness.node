const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const privateJs=fs.readFileSync(path.join(root,'public','private-sessions.js'),'utf8');
const privateHtml=fs.readFileSync(path.join(root,'public','private-sessions.html'),'utf8');
const bridge=fs.readFileSync(path.join(root,'world-bridge-server.js'),'utf8');
const adminDebug=fs.readFileSync(path.join(root,'public','admin-first-failure.js'),'utf8');
const service=fs.readFileSync(path.join(root,'src','services','privateCoachingQuoteService.js'),'utf8');

test('Private Sessions submits through canonical API client',()=>{
  assert.match(privateJs,/MaatApiClient\.request\("\/api\/me\/private-coaching\/quote"/);
  assert.doesNotMatch(privateJs,/fetch\(url,\{credentials:"omit"/);
  assert.match(privateJs,/backend reached/);
  assert.match(privateHtml,/private-sessions\.js\?v=20260901-canonical-api-v5/);
});

test('backend exposes deployment identity and safe private coaching diagnostics',()=>{
  assert.match(bridge,/\/api\/deployment\/identity/);
  assert.match(bridge,/RENDER_GIT_COMMIT/);
  assert.match(bridge,/err\?\.details/);
  assert.match(service,/PRIVATE_COACHING_SERVICES_INVALID/);
  assert.match(service,/receivedServices/);
});

test('admin first-failure checks frontend backend deployment parity before downstream surfaces',()=>{
  assert.match(adminDebug,/Frontend \/ Backend deployment parity/);
  assert.match(adminDebug,/__frontend-version\.json/);
  assert.match(adminDebug,/DEPLOYMENT SPLIT/);
  assert.ok(adminDebug.indexOf('results.deployment_parity=await deploymentParity()') < adminDebug.indexOf('results.admin_auth=await adminAuth()'));
});
