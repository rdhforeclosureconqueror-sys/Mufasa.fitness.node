(function installReleaseArenaReturn(global) {
  'use strict';

  const params = new URLSearchParams(global.location.search || '');
  if (params.get('entry') !== 'release') return;

  let releaseReturnUrl = null;
  let returnUrlPromise = null;

  function releaseReferrerUrl() {
    try {
      const referrer = new URL(global.document.referrer || '');
      if (!['https:', 'http:'].includes(referrer.protocol) || referrer.username || referrer.password) return null;
      if (!['/push-up.html', '/push-up-release.html'].includes(referrer.pathname)) return null;
      return new URL('/push-up.html', referrer.origin).href;
    } catch (_) {
      return null;
    }
  }

  function resolveReturnUrl() {
    if (releaseReturnUrl) return Promise.resolve(releaseReturnUrl);
    if (returnUrlPromise) return returnUrlPromise;

    returnUrlPromise = (async () => {
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
        const exit = global.document.getElementById('exitArena');
        if (exit) exit.href = releaseReturnUrl;
        return releaseReturnUrl;
      } catch (error) {
        global.console?.warn?.('[RELEASE_ARENA_RETURN] unable to resolve release return URL', error?.message || error);
        return null;
      } finally {
        returnUrlPromise = null;
      }
    })();

    return returnUrlPromise;
  }

  async function revokeSessionBounded() {
    let timeoutId = null;
    try {
      await Promise.race([
        global.fetch('/api/game/session', {
          method: 'DELETE',
          credentials: 'same-origin',
          cache: 'no-store',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' }
        }).catch(() => null),
        new Promise((resolve) => {
          timeoutId = global.setTimeout(resolve, 5000);
        })
      ]);
    } finally {
      if (timeoutId != null) global.clearTimeout(timeoutId);
    }
  }

  async function revokeAndReturn(event) {
    const link = event.target?.closest?.('[data-arena-exit]');
    if (!link) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const destination = releaseReturnUrl || await resolveReturnUrl() || releaseReferrerUrl() || link.href;
    await revokeSessionBounded();
    global.location.assign(destination);
  }

  // Capture release exits immediately so an early tap waits for the same in-flight
  // frontend-origin lookup instead of falling through to the legacy backend-origin path.
  global.document.addEventListener('click', revokeAndReturn, true);
  resolveReturnUrl();
})(window);