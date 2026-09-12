(function installMileleFitPushUpRelease(global) {
  'use strict';

  const BUILD = '20260912-avatar-gate-v1';
  const AVATURN_URL = 'https://www.avaturn.me/';
  const state = {
    build: BUILD,
    phase: 'BOOT',
    profile: null,
    auth: null,
    avatarReady: false,
    avatar: null,
    firstFailure: null,
    trace: []
  };

  const $ = (id) => global.document.getElementById(id);

  function safe(value) {
    return String(value == null ? '' : value)
      .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [REDACTED]')
      .replace(/ticket=[A-Za-z0-9_-]+/gi, 'ticket=[REDACTED]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
      .slice(0, 260);
  }

  function trace(stage, status, detail = '') {
    const entry = { stage, status, detail: safe(detail), at: new Date().toISOString() };
    state.trace.push(entry);
    if (state.trace.length > 80) state.trace.shift();
    if (status === 'FAIL' && !state.firstFailure) state.firstFailure = entry;
    renderDiagnostics();
    try { global.console?.info?.('[PUSH_UP_RELEASE]', entry); } catch (_) {}
    return entry;
  }

  function renderDiagnostics(force = false) {
    const el = $('releaseAvatarDiagnostics');
    if (!el) return;
    const debug = force || new URLSearchParams(global.location.search).get('debugRelease') === '1' || Boolean(state.firstFailure);
    el.hidden = !debug;
    if (!debug) return;
    const first = state.firstFailure ? `${state.firstFailure.stage} — ${state.firstFailure.detail || state.firstFailure.status}` : 'none';
    el.textContent = [
      `MileleFit Push-Up Release ${BUILD}`,
      `phase: ${state.phase}`,
      `avatar ready: ${state.avatarReady ? 'YES' : 'NO'}`,
      `first failure: ${first}`,
      '',
      ...state.trace.map((entry) => `${entry.status.padEnd(7)} ${entry.stage} — ${entry.detail || ''}`)
    ].join('\n');
  }

  function setStatus(message, mode = '') {
    const el = $('releaseAvatarStatus');
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('good', mode === 'good');
    el.classList.toggle('bad', mode === 'bad');
  }

  function setGate(message, ready = false) {
    state.avatarReady = Boolean(ready);
    const status = $('releaseGateStatus');
    const button = $('releaseEnterArenaBtn');
    if (status) status.textContent = message;
    if (button) button.disabled = !ready;
    renderDiagnostics();
  }

  function setError(message = '') {
    const el = $('releaseError');
    if (el) el.textContent = message;
  }

  function canonicalAuthFromReadiness(readiness) {
    const auth = readiness?.auth || global.AuthStateRuntime?.getCanonicalAuthState?.() || null;
    const token = auth?.token || global.AuthStateRuntime?.getAuthToken?.() || null;
    if (!token) return null;
    return { ...(auth || {}), token };
  }

  function loginTarget(mode = 'login') {
    const returnTo = `${global.location.pathname}${global.location.search}${global.location.hash}`;
    if (global.AuthNavigation?.loginUrl) {
      const url = global.AuthNavigation.loginUrl(returnTo);
      if (mode === 'register') {
        const parsed = new URL(url, global.location.origin);
        parsed.searchParams.set('mode', 'register');
        return `${parsed.pathname}${parsed.search}`;
      }
      return url;
    }
    const target = new URL('/login.html', global.location.origin);
    target.searchParams.set('returnTo', returnTo);
    if (mode === 'register') target.searchParams.set('mode', 'register');
    return `${target.pathname}${target.search}`;
  }

  function resolveAssetUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    try {
      if (/^https?:\/\//i.test(raw)) return raw;
      if (typeof global.MaatApiClient?.resolve === 'function') return global.MaatApiClient.resolve(raw);
      const origin = global.RuntimeState?.getBackendOrigin?.() || global.MAAT_BACKEND_ORIGIN || global.location.origin;
      return new URL(raw, `${String(origin).replace(/\/$/, '')}/`).href;
    } catch (_) {
      return null;
    }
  }

  function canonicalAvatar(profile = state.profile) {
    const source = profile?.avatar;
    if (!source || typeof source !== 'object') return null;
    const modelUrl = String(source.avatarModelUrl || source.modelUrl || '').trim();
    if (!modelUrl) return null;
    return {
      avatarProvider: source.avatarProvider || source.provider || 'custom',
      avatarModelUrl: modelUrl,
      avatarThumbnailUrl: String(source.avatarThumbnailUrl || source.thumbnailUrl || '').trim() || null,
      avatarUpdatedAt: source.avatarUpdatedAt || source.updatedAt || null
    };
  }

  function renderAvatar(profile = state.profile) {
    state.profile = profile || null;
    state.avatar = canonicalAvatar(profile);
    const ready = Boolean(state.avatar?.avatarModelUrl);
    const thumb = $('releaseAvatarThumb');
    const placeholder = $('releaseAvatarPlaceholder');
    const badge = $('releaseAvatarReadyBadge');
    const setup = $('releaseAvatarSetup');
    const readyActions = $('releaseAvatarReadyActions');
    const signedOut = $('releaseSignedOutActions');
    const modelInput = $('releaseAvatarModelUrlInput');
    const thumbInput = $('releaseAvatarThumbUrlInput');

    if (modelInput) modelInput.value = state.avatar?.avatarModelUrl || '';
    if (thumbInput) thumbInput.value = state.avatar?.avatarThumbnailUrl || '';
    if (signedOut) signedOut.hidden = true;
    if (setup) setup.hidden = ready;
    if (readyActions) readyActions.hidden = !ready;
    if (badge) badge.hidden = !ready;

    const thumbUrl = resolveAssetUrl(state.avatar?.avatarThumbnailUrl);
    if (thumb) {
      thumb.hidden = !thumbUrl;
      if (thumbUrl) thumb.src = thumbUrl;
      else thumb.removeAttribute('src');
    }
    if (placeholder) placeholder.hidden = Boolean(thumbUrl);

    if (ready) {
      setStatus('Your saved MileleFit avatar is verified and ready for the arena.', 'good');
      setGate('Avatar verified. You can enter the Push-Up Arena.', true);
      trace('AVATAR_PROFILE', 'PASS', `canonical avatar present (${state.avatar.avatarProvider || 'custom'})`);
    } else {
      setStatus('No canonical avatar is attached to this account yet. Create or upload one below.');
      setGate('Create or upload your avatar before arena entry.', false);
      trace('AVATAR_PROFILE', 'WAITING', 'canonical avatar missing');
    }
  }

  function renderSignedOut() {
    state.profile = null;
    state.avatar = null;
    state.avatarReady = false;
    $('releaseSignedOutActions').hidden = false;
    $('releaseAvatarSetup').hidden = true;
    $('releaseAvatarReadyActions').hidden = true;
    $('releaseAvatarReadyBadge').hidden = true;
    $('releaseAvatarThumb').hidden = true;
    $('releaseAvatarPlaceholder').hidden = false;
    setStatus('Sign in or create an account so MileleFit can load your personalized avatar.');
    setGate('Sign in first. Arena access is tied to your MileleFit member profile.', false);
    trace('AUTH', 'WAITING', 'member sign-in required');
  }

  function configureCanonicalRuntimes(authToken) {
    global.AppHydrationRuntime?.configure?.({
      backendReadClient: global.BACKEND_READ_CLIENT,
      getProfile: () => state.profile,
      setProfile: (profile) => { state.profile = profile; global.USER_PROFILE = profile; },
      installAuthListeners: false
    });

    global.ProfileWriteRuntime?.configure?.({
      refs: {
        avatarFileInput: $('releaseAvatarFileInput'),
        avatarModelUrlInput: $('releaseAvatarModelUrlInput'),
        avatarThumbUrlInput: $('releaseAvatarThumbUrlInput'),
        avatarCreationStatusEl: $('releaseAvatarUploadStatus'),
        avatarRuntimeStatusEl: $('releaseAvatarRuntimeStatus'),
        avatarAssetStatusEl: $('releaseAvatarAssetStatus')
      },
      endpoints: {
        nodeBaseUrl: global.MaatApiClient?.origin?.() || global.RuntimeState?.getBackendOrigin?.() || global.MAAT_BACKEND_ORIGIN || global.location.origin
      },
      deps: {
        getProfile: () => state.profile,
        setProfile: (profile) => { state.profile = profile; global.USER_PROFILE = profile; },
        getAuthToken: () => authToken || global.AuthStateRuntime?.getAuthToken?.(),
        isAvatarFeatureEnabled: () => true,
        avatarProviderDefault: 'avaturn',
        persistUser: () => {},
        loadAvatarAssetForCurrentUser: async () => true,
        setAvatarAssetStatus: (message, bad) => {
          const el = $('releaseAvatarAssetStatus');
          if (el) el.textContent = message;
          if (bad) trace('AVATAR_ASSET', 'FAIL', message);
        },
        setAvatarRuntimeStatus: (message, bad) => {
          const el = $('releaseAvatarRuntimeStatus');
          if (el) el.textContent = message;
          if (bad) trace('AVATAR_RUNTIME', 'FAIL', message);
        }
      }
    });
  }

  async function loadCanonicalProfile(authToken, reason = 'initial') {
    state.phase = 'PROFILE_LOADING';
    setStatus('Loading your MileleFit avatar…');
    setGate('Verifying your avatar before arena entry…', false);
    configureCanonicalRuntimes(authToken);
    trace('PROFILE_READ', 'RUNNING', `GET /api/me/profile (${reason})`);
    const result = await global.AppHydrationRuntime?.hydrateProfileFromBackend?.({ authToken });
    if (!result) {
      const last = global.AppHydrationRuntime?.getState?.().lastProfileReload || {};
      const message = last.message || last.code || 'profile_read_failed';
      trace('PROFILE_READ', 'FAIL', message);
      throw new Error(message);
    }
    state.profile = global.AppHydrationRuntime?.getCanonicalProfile?.() || state.profile;
    global.USER_PROFILE = state.profile;
    trace('PROFILE_READ', 'PASS', 'canonical profile adopted');
    renderAvatar(state.profile);
    return state.profile;
  }

  async function refreshAuthAndAvatar(reason = 'refresh') {
    state.phase = 'AUTH_CHECK';
    setError('');
    const readiness = await global.AuthStateRuntime?.whenReady?.();
    const auth = canonicalAuthFromReadiness(readiness);
    if (!auth) {
      state.auth = null;
      renderSignedOut();
      return false;
    }
    state.auth = auth;
    trace('AUTH', 'PASS', 'canonical member session restored');
    try {
      await loadCanonicalProfile(auth.token, reason);
      state.phase = state.avatarReady ? 'READY' : 'AVATAR_REQUIRED';
      return state.avatarReady;
    } catch (error) {
      state.phase = 'PROFILE_FAILED';
      setStatus('We could not verify your MileleFit profile. Retry or sign in again.', 'bad');
      setGate('Avatar verification failed. Arena entry remains locked.', false);
      setError(error?.message || 'Profile verification failed.');
      trace('PROFILE_GATE', 'FAIL', error?.message || 'profile verification failed');
      return false;
    }
  }

  async function uploadAvatar() {
    const file = $('releaseAvatarFileInput')?.files?.[0];
    if (!file) {
      $('releaseAvatarUploadStatus').textContent = 'Choose a .glb avatar file first.';
      return;
    }
    if (!state.auth?.token) {
      renderSignedOut();
      return;
    }
    const button = $('releaseUploadAvatarBtn');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Uploading…';
    setError('');
    setGate('Uploading and verifying your avatar…', false);
    trace('AVATAR_UPLOAD', 'RUNNING', `${file.name} · ${file.size} bytes`);
    try {
      configureCanonicalRuntimes(state.auth.token);
      const result = await global.ProfileWriteRuntime?.uploadAvatarFile?.(file);
      if (!result?.ok) throw new Error(result?.reason || 'avatar_upload_failed');
      state.profile = global.AppHydrationRuntime?.getCanonicalProfile?.() || state.profile;
      trace('AVATAR_UPLOAD', 'PASS', 'upload, canonical reload, and profile adoption complete');
      renderAvatar(state.profile);
      state.phase = 'READY';
    } catch (error) {
      state.phase = 'AVATAR_UPLOAD_FAILED';
      const message = error?.message || 'Avatar upload failed.';
      setStatus('Avatar upload did not complete. The arena remains locked until your profile is verified.', 'bad');
      setGate('Fix the avatar upload and retry before entering the arena.', false);
      setError(message);
      trace('AVATAR_UPLOAD', 'FAIL', error?.code || message);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function enterArena() {
    const button = $('releaseEnterArenaBtn');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Verifying player…';
    setError('');
    try {
      const ready = await refreshAuthAndAvatar('pre-arena');
      if (!ready) throw new Error('Your personalized avatar must be verified before arena entry.');
      if (!global.PocketPTWorldLaunch?.createArenaSession) throw new Error('Arena launcher is unavailable.');
      state.phase = 'ARENA_SESSION';
      trace('ARENA_SESSION', 'RUNNING', 'creating authenticated Push-Up Arena session');
      button.textContent = 'Opening arena…';
      const session = await global.PocketPTWorldLaunch.createArenaSession();
      if (!session?.launchUrl) throw new Error('Arena launch URL missing.');
      trace('ARENA_SESSION', 'PASS', 'one-time arena launch created');
      state.phase = 'NAVIGATING';
      global.location.assign(session.launchUrl);
    } catch (error) {
      if (error?.code === 'AUTH_REDIRECT') return;
      state.phase = 'ARENA_BLOCKED';
      const message = error?.message || 'Arena launch failed.';
      setError(message);
      trace('ARENA_GATE', 'FAIL', message);
      button.disabled = !state.avatarReady;
      button.textContent = original;
    }
  }

  function bind() {
    $('releaseSignInBtn').addEventListener('click', () => global.location.assign(loginTarget('login')));
    $('releaseCreateAccountBtn').addEventListener('click', () => global.location.assign(loginTarget('register')));
    $('releaseOpenAvaturnBtn').addEventListener('click', () => {
      const popup = global.open(AVATURN_URL, 'avaturn_creator', 'popup=true,width=1100,height=800');
      $('releaseAvatarUploadStatus').textContent = popup ? 'Avaturn opened. Export your .glb, then return here and upload it.' : 'Popup blocked. Allow popups or open Avaturn in a new tab.';
      trace('AVATURN', popup ? 'PASS' : 'WAITING', popup ? 'creator opened' : 'popup blocked');
    });
    $('releaseUploadAvatarBtn').addEventListener('click', uploadAvatar);
    $('releaseChangeAvatarBtn').addEventListener('click', () => {
      $('releaseAvatarSetup').hidden = false;
      $('releaseAvatarReadyActions').hidden = true;
      $('releaseAvatarUploadStatus').textContent = 'Choose a new .glb to replace the avatar currently attached to your profile.';
      $('releaseAvatarSetup').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $('releaseEnterArenaBtn').addEventListener('click', enterArena);
    global.addEventListener('auth:changed', () => refreshAuthAndAvatar('auth-changed'));
    global.addEventListener('app:canonical-profile', (event) => {
      if (!event?.detail?.profile) return;
      state.profile = event.detail.profile;
      renderAvatar(state.profile);
    });
  }

  async function boot() {
    bind();
    trace('PAGE', 'PASS', 'release front door loaded');
    if (!global.AuthStateRuntime || !global.BACKEND_READ_CLIENT || !global.AppHydrationRuntime || !global.ProfileWriteRuntime || !global.PocketPTAvatarUploadContract) {
      state.phase = 'DEPENDENCY_FAILED';
      const missing = [
        ['AuthStateRuntime', global.AuthStateRuntime],
        ['BACKEND_READ_CLIENT', global.BACKEND_READ_CLIENT],
        ['AppHydrationRuntime', global.AppHydrationRuntime],
        ['ProfileWriteRuntime', global.ProfileWriteRuntime],
        ['PocketPTAvatarUploadContract', global.PocketPTAvatarUploadContract]
      ].filter(([, value]) => !value).map(([name]) => name).join(', ');
      trace('DEPENDENCIES', 'FAIL', `missing: ${missing}`);
      setStatus('Avatar setup could not start because a required MileleFit runtime is unavailable.', 'bad');
      setGate('Arena entry locked until avatar setup is restored.', false);
      setError(`First failure: missing ${missing}`);
      return;
    }
    trace('DEPENDENCIES', 'PASS', 'canonical auth/profile/avatar runtimes available');
    await refreshAuthAndAvatar('boot');
  }

  global.MileleFitPushUpRelease = {
    boot,
    refresh: refreshAuthAndAvatar,
    uploadAvatar,
    enterArena,
    getState: () => ({ ...state, auth: state.auth ? { ...state.auth, token: state.auth.token ? '[REDACTED]' : null } : null, trace: [...state.trace] })
  };

  if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(window);
