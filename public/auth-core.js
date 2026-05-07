(() => {
  window.onerror = (msg, src, line, col, err) => console.error('[AUTH_CORE][onerror]', msg, src, line, col, err);
  window.onunhandledrejection = (event) => console.error('[AUTH_CORE][unhandledrejection]', event?.reason || event);
  console.log('[BOOT] auth-core loaded');

  const NODE_BASE_URL = 'https://mufasa-fitness-node.onrender.com';
  const AUTH_LOGIN_URL = `${NODE_BASE_URL}/api/auth/login`;
  const AUTH_REGISTER_URL = `${NODE_BASE_URL}/api/auth/register`;
  const AUTH_ME_URL = `${NODE_BASE_URL}/api/auth/me`;
  const authDebugState = window.__authPropagationDebug || (window.__authPropagationDebug = {
    authChangedFired: false,
    lastAuthEventAt: null,
    lastAuthError: null
  });

  const stateUpdate = (patch) => {
    if (typeof window.__setAuthDebugState === 'function') window.__setAuthDebugState(patch);
    const el = document.getElementById('authDebugStatus');
    if (!el) return;
    if (patch.authScriptLoaded) el.textContent = el.textContent.replace('AUTH SCRIPT LOADED: no', 'AUTH SCRIPT LOADED: yes');
  };

  const hideAuthOverlay = () => {
    const overlay = document.getElementById('authOverlay');
    if (overlay) {
      overlay.hidden = true;
      overlay.style.display = 'none';
      overlay.style.pointerEvents = 'none';
    }
    const app = document.querySelector('.app');
    if (app) app.style.display = '';
    document.body.classList.add('authenticated');
  };

  const propagateAuthState = (detail, reason) => {
    if (typeof window.setCanonicalAuthState === 'function') {
      return window.setCanonicalAuthState(detail, { reason, forceDispatch: true });
    }
    console.error('[AUTH_CORE] auth-state-runtime missing');
    authDebugState.lastAuthError = 'auth_state_runtime_missing';
    return null;
  };

  const bind = () => {
    const form = document.getElementById('authLoginForm');
    const loginBtn = document.getElementById('authLoginSubmit');
    const createBtn = document.getElementById('authCreateAccountBtn');
    stateUpdate({ authScriptLoaded: true, formFound: !!form, loginButtonFound: !!loginBtn, createButtonFound: !!createBtn });
    if (!form || !loginBtn || !createBtn) return false;
    if (form.dataset.authCoreBound === 'true') return true;

    const emailEl = document.getElementById('authEmail');
    const passEl = document.getElementById('authPassword');
    const nameEl = document.getElementById('authName');
    const nameWrapEl = document.getElementById('authNameWrap');
    const statusEl = document.getElementById('authLoginStatus');
    const stepEl = document.getElementById('authLoginStepStatus');
    let mode = 'login';

    const setMode = () => {
      const reg = mode === 'register';
      if (nameWrapEl) nameWrapEl.style.display = reg ? 'block' : 'none';
      if (nameEl) nameEl.required = reg;
      loginBtn.textContent = reg ? 'Create account' : 'Login';
      createBtn.textContent = reg ? 'Back to login' : 'Create account';
    };

    createBtn.addEventListener('click', () => {
      mode = mode === 'login' ? 'register' : 'login';
      setMode();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const email = emailEl?.value?.trim() || '';
      const password = passEl?.value || '';
      const name = nameEl?.value?.trim() || '';
      const register = mode === 'register';
      const authUrl = register ? AUTH_REGISTER_URL : AUTH_LOGIN_URL;
      const body = register ? { name, email, password } : { email, password };
      try {
        if (statusEl) statusEl.textContent = register ? 'Creating account…' : 'Signing in…';
        if (stepEl) stepEl.textContent = `POST ${authUrl}`;
        console.log(`[AUTH_CORE] posting to ${authUrl}`);
        const authRes = await fetch(authUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
        const authJson = await authRes.json().catch(() => ({}));
        if (!authRes.ok || !authJson?.token) {
          const backendError = authJson?.error || 'auth_failed';
          throw new Error(`${authRes.status} ${backendError}`);
        }

        if (stepEl) stepEl.textContent = `GET ${AUTH_ME_URL}`;
        const meRes = await fetch(AUTH_ME_URL, { headers: { authorization: `Bearer ${authJson.token}` } });
        const meJson = await meRes.json().catch(() => ({}));
        if (!meRes.ok || !meJson?.user) throw new Error('me_failed');

        const canonicalPayload = {
          isAuthenticated: true,
          token: authJson.token,
          user: meJson.user
        };
        propagateAuthState(canonicalPayload, 'auth-core:login');

        hideAuthOverlay();
        if (statusEl) statusEl.textContent = 'Signed in.';
      } catch (err) {
        console.error('[AUTH_CORE] submit failed', err);
        authDebugState.lastAuthError = err?.message || String(err);
        if (statusEl) statusEl.textContent = `Login failed: ${err?.message || 'unknown_error'}`;
      }
    });

    form.dataset.authCoreBound = 'true';
    form.dataset.authLoginBound = 'true';
    setMode();
    return true;
  };

  let elapsed = 0;
  const timer = setInterval(() => {
    if (bind()) return clearInterval(timer);
    elapsed += 100;
    if (elapsed >= 3000) clearInterval(timer);
  }, 100);
  bind();
})();
