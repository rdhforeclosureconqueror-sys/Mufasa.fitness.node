(function installReleaseArenaReturn(global) {
  'use strict';

  const params = new URLSearchParams(global.location.search || '');
  if (params.get('entry') !== 'release') return;

  let releaseReturnUrl = null;
  let resolved = false;

  async function resolveReturnUrl() {
    if (resolved) return releaseReturnUrl;
    resolved = true;
    try {
      const response = await global.fetch('/api/game/config', {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      const payload = await response.json().catch(() => null);
      const configured = payload?.ok === true ? payload?.data?.returnUrl : null;
      if (!response.ok || !configured) throw new Error('arena_config_unavailable');
      const trusted = new URL(configured, global.location.origin);
      if (!['https:', 'http:'].includes(trusted.protocol) || trusted.username || trusted.password || trusted.pathname !== '/push-up-challenge.html') {
        throw new Error('arena_config_return_invalid');
      }
      const target = new URL('/push-up.html', trusted.origin);
      releaseReturnUrl = target.href;
      const exit = global.document.getElementById('exitArena');
      if (exit) exit.href = releaseReturnUrl;
      return releaseReturnUrl;
    } catch (error) {
      global.console?.warn?.('[RELEASE_ARENA_RETURN] unable to resolve release return URL', error?.message || error);
      return null;
    }
  }

  async function revokeAndReturn(event) {
    const link = event.target?.closest?.('[data-arena-exit]');
    if (!link) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const destination = await resolveReturnUrl();
    try {
      await global.fetch('/api/game/session', {
        method: 'DELETE',
        credentials: 'same-origin',
        cache: 'no-store',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (_) {}
    global.location.assign(destination || '/push-up.html');
  }

  global.document.addEventListener('click', revokeAndReturn, true);
  resolveReturnUrl();
})(window);
