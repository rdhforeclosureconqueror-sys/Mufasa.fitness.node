'use strict';

// Isolated, synthetic preview. Never imported by server.js/world-bridge-server.js.
// No real authentication, avatars, camera, challenge writes or external requests.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'public');
const CASES = ['legacy', 'avatar-failure', 'avatar-pass', 'unauthorized', 'fallback', 'clipboard-denied'];
const files = new Map([
  ['/arena/push-up', ['arena-push-up.html', 'text/html']],
  ['/arena-diagnostics.js', ['arena-diagnostics.js', 'text/javascript']],
  ['/arena-push-up.js', ['arena-push-up.js', 'text/javascript']]
]);
function createPreview() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://fixture.local');
    let referer;
    try { referer = new URL(req.headers.referer || '/', 'http://fixture.local'); } catch (_) { referer = new URL('http://fixture.local'); }
    const requested = url.searchParams.get('case') || referer.searchParams.get('case');
    const scenario = CASES.includes(requested) ? requested : 'legacy';
    res.setHeader('Cache-Control', 'no-store');
    if (scenario === 'clipboard-denied') res.setHeader('Permissions-Policy', 'clipboard-write=()');
    const send = (body, type = 'text/html', status = 200) => {res.writeHead(status, {'Content-Type': `${type}; charset=utf-8`}); res.end(body);};
    const json = (data, status = 200) => send(JSON.stringify({ok: status === 200, data}), 'application/json', status);
    if (url.pathname === '/') return send(`<html><head><title>Arena diagnostics fixture</title></head><body><h1>Local arena diagnostics fixture</h1><p>Synthetic evidence only. This does not test a real avatar, account or Godot build.</p><ul>${CASES.map(name => `<li><a href="/arena/push-up?case=${name}">${name}</a></li>`).join('')}<li><a href="/mobile">390px narrow layout</a></li></ul></body></html>`);
    if (url.pathname === '/mobile') return send('<html><head><title>Narrow arena diagnostics fixture</title></head><body style="margin:0;background:#30343b"><iframe title="390px arena preview" src="/arena/push-up?case=legacy" style="display:block;width:390px;height:844px;border:0;margin:12px auto"></iframe></body></html>');
    if (files.has(url.pathname)) {
      const [file, type] = files.get(url.pathname);
      return send(fs.readFileSync(path.join(root, file), 'utf8'), type);
    }
    if (url.pathname === '/api/game/config') return json({protocolVersion: 1, returnUrl: '/push-up-challenge.html'});
    if (url.pathname === '/api/game/bootstrap') {
      if (scenario === 'unauthorized') return json(null, 401);
      const fallback = scenario === 'fallback';
      return json({protocolVersion: 1, session: {id: 'synthetic-session', expiresAt: new Date(Date.now() + 600000).toISOString()},
        member: {id: 'synthetic-member', displayName: 'Fixture Member'}, experience: {type: 'PUSH_UP_ARENA', challengeId: 'push_up'},
        avatar: fallback ? null : {avatarId: 'a'.repeat(32), profileVersion: 'b'.repeat(32), format: 'glb', assetUrl: `/api/game/avatar/asset?version=${'b'.repeat(32)}`},
        avatarState: {status: fallback ? 'FALLBACK' : 'AVAILABLE', fallback: 'DEFAULT_AVATAR'}});
    }
    if (url.pathname === '/api/game/build') return json({protocolVersion: 1, available: true, entryPath: '/game/push-up-arena/index.html'});
    if (url.pathname === '/api/game/session' && req.method === 'DELETE') return json({ended: true});
    if (url.pathname === '/push-up-challenge.html') return send('<h1>Fixture exit completed</h1><p>No production session was used.</p><a href="/">Return to fixture cases</a>');
    if (url.pathname === '/game/push-up-arena/index.html') return send(`<!doctype html><html><head><title>Simulated game</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at bottom,#321c16,#0c1016 70%);color:#e6ddd0;font:16px system-ui;text-align:center}article{border:1px solid #a54b36;padding:24px;border-radius:12px;max-width:70%}p{line-height:1.6}small{color:#aebacf}</style></head><body><article><h2>Simulated game frame</h2><p>Local diagnostic fixture: ${scenario}</p><small>The production gym and avatar are not loaded here.</small></article><script>
      let requestId = null, sequence = 0;
      const scenario = ${JSON.stringify(scenario)};
      const send = (stage, status) => parent.postMessage({type:'POCKETPT_GODOT_BRIDGE',event:'DIAGNOSTIC',protocolVersion:1,diagnosticVersion:1,requestId,sequence:++sequence,stage,status},location.origin);
      addEventListener('message', event => {
        const data = event.data;
        if(event.origin !== location.origin || event.source !== parent || data?.event !== 'DIAGNOSTICS_REQUEST' || data.requestId === requestId) return;
        requestId = data.requestId; sequence = 0;
        if(scenario === 'avatar-failure'){send('AVATAR_DOWNLOAD','PASS');send('AVATAR_IMPORT','FAIL');}
        if(scenario === 'avatar-pass'){send('AVATAR_DOWNLOAD','PASS');send('AVATAR_IMPORT','PASS');send('AVATAR_MOUNT','PASS');}
        if(scenario === 'fallback')send('AVATAR_FALLBACK','PASS');
      });
      parent.postMessage({type:'POCKETPT_GODOT_BRIDGE',event:'READY',protocolVersion:1},location.origin);
    </script></body></html>`);
    send('Fixture route not found', 'text/plain', 404);
  });
}
if (require.main === module) {
  const port = Number(process.env.ARENA_DIAGNOSTICS_PREVIEW_PORT || 8769);
  const host = process.env.ARENA_DIAGNOSTICS_PREVIEW_HOST || '127.0.0.1';
  createPreview().listen(port, host, () => console.log(`Synthetic arena diagnostics preview: http://${host}:${port}/`));
}
module.exports = {createPreview};
