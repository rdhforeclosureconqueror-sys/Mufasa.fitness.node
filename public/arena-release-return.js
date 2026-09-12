(function installReleaseArenaReturn(global) {
  'use strict';

  const params = new URLSearchParams(global.location.search || '');
  if (params.get('entry') !== 'release') return;

  let releaseReturnUrl = null;

  async function resolveReturnUrl() {
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
      releaseReturnUrl = new URL('/push-up.html', trusted.origin).href;
      return releaseReturnUrl;
    } catch (error) {
      global.console?.warn?.('[RELEASE_ARENA_RETURN] unable to resolve release return URL', error?.message || error);
      return null;
    }
  }

  async function revokeAndReturn(event) {
    const link = event.target?.closest?.('[data-arena-exit]');
    if (!link || !releaseReturnUrl) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      await global.fetch('/api/game/session', {
        method: 'DELETE',
        credentials: 'same-origin',
        cache: 'no-store',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (_) {}
    global.location.assign(releaseReturnUrl);
  }

  resolveReturnUrl().then((destination) => {
    if (!destination) return;
    const exit = global.document.getElementById('exitArena');
    if (exit) exit.href = destination;
    global.document.addEventListener('click', revokeAndReturn, true);
  });
})(window);
