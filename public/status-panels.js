(function initStatusPanels(global) {
  function getPrimaryNavHandlerStatus() {
    const checks = global.getPrimaryNavHandlerStatus;
    if (typeof checks === 'function') return checks();
    return {
      dashboard: typeof global.dashboardBtn?.onclick === 'function',
      workoutLibrary: typeof global.exerciseLibraryBtn?.onclick === 'function',
      camera: typeof global.connectBtn?.onclick === 'function',
      diagnostics: typeof global.runSystemDiagnosticBtn?.onclick === 'function',
      profile: typeof global.saveProfileFormBtn?.onclick === 'function',
      calendar: typeof global.calendarApplyBtn?.onclick === 'function'
    };
  }



  function getLiveWorkoutBreakpointLine() {
    const tracker = global.__liveWorkoutBreakpoints;
    if (!tracker?.summaryLine) return 'live workout breakpoint: tracker unavailable';
    return tracker.summaryLine();
  }

  function getLiveWorkoutTraceLines() {
    const tracker = global.__liveWorkoutBreakpoints;
    if (typeof tracker?.traceLines !== 'function') return [];
    return tracker.traceLines();
  }

  function renderLiveWorkoutBreakpointStatus(reason = 'update') {
    const tracker = global.__liveWorkoutBreakpoints;
    const line = getLiveWorkoutBreakpointLine();
    ['authPropagationStatus', 'appActivationStatus', 'featureActivationStatus', 'systemBootStatus', 'challengeDiagnosticsStatus'].forEach((panelId) => {
      const panel = document.getElementById(panelId);
      if (!panel) return;
      const current = String(panel.textContent || '');
      if (!current.trim() || current.trim().toLowerCase().startsWith('pending')) return;
      const lines = current.split('\n').filter((entry) => !entry.startsWith('live workout breakpoint:') && !entry.startsWith('live workout trace:'));
      lines.push(line, ...getLiveWorkoutTraceLines());
      panel.textContent = lines.join('\n');
    });
    return { reason, firstBlocking: tracker?.getFirstBlocking?.() || null };
  }

  function setStatusPanelError(panelId, tag, message) {
    const panelEl = document.getElementById(panelId);
    if (!panelEl) return;
    panelEl.textContent = `ERROR: ${message}`;
    console.error(tag, message);
  }

  function renderSystemBootStatus(reason = 'update') {
    const panel = document.getElementById('systemBootStatus');
    if (!panel) return;
    const bootStatus = global.__statusPanelsBootStatus || global.bootStatus || {};
    panel.textContent = [
      `reason: ${reason}`,
      `frontend shell loaded: ${bootStatus.shellLoaded ? 'yes' : 'no'}`,
      `frontend version file loaded: ${bootStatus.frontendVersionLoaded ? 'yes' : 'no'}`,
      `backend __version reached: ${bootStatus.backendVersionReached ? 'yes' : 'no'}`,
      `backend build parsed: ${bootStatus.backendBuildParsed ? 'yes' : 'no'}`,
      `auth restored/validated: ${bootStatus.authRestoredValidated ? 'yes' : 'no'}`,
      `app runtime started: ${bootStatus.appRuntimeStarted ? 'yes' : 'no'}`,
      `feature gates enabled: ${bootStatus.featureGatesEnabled ? 'yes' : 'no'}`,
      `last boot error: ${bootStatus.lastBootError || 'none'}`,
      getLiveWorkoutBreakpointLine(),
      ...getLiveWorkoutTraceLines()
    ].join('\n');
  }

  function updateAuthPropagationStatus(reason = 'update') {
    try {
      const panelEl = document.getElementById('authPropagationStatus');
      if (!panelEl) return;
      const auth = global.APP_AUTH || {};
      const user = auth.user || global.__LAST_AUTH_USER || {};
      const dbg = global.__authPropagationDebug || {};
      const payload = [
        `reason: ${reason}`,
        `maatAuthToken exists: ${localStorage.getItem('maatAuthToken') ? 'yes' : 'no'}`,
        `window.APP_AUTH exists: ${global.APP_AUTH ? 'yes' : 'no'}`,
        `window.__LAST_AUTH_USER exists: ${global.__LAST_AUTH_USER ? 'yes' : 'no'}`,
        `window.__AUTH_READY: ${global.__AUTH_READY === true ? 'yes' : 'no'}`,
        `window.APP_AUTH.isAuthenticated: ${auth.isAuthenticated ? 'yes' : 'no'}`,
        `window.APP_AUTH.user.email: ${user.email || 'n/a'}`,
        `window.APP_AUTH.user.role: ${user.role || 'n/a'}`,
        `window.APP_AUTH.user.roles: ${Array.isArray(user.roles) ? user.roles.join(',') : 'n/a'}`,
        `window.setCanonicalAuthState exists: ${typeof global.setCanonicalAuthState === 'function' ? 'yes' : 'no'}`,
        `auth:changed fired: ${dbg.authChangedFired ? 'yes' : 'no'}`,
        `last auth event timestamp: ${dbg.lastAuthEventAt || 'none'}`,
        `last auth error: ${dbg.lastAuthError || 'none'}`,
        getLiveWorkoutBreakpointLine(),
        `push-up challenge runtime: ${global.PushupChallengeRuntime ? 'yes' : 'no'}`
      ];
      panelEl.textContent = payload.join('\n');
    } catch (error) {
      const message = error?.message || String(error || 'unknown_auth_propagation_error');
      setStatusPanelError('authPropagationStatus', '[AUTH_PROP_STATUS_ERROR]', message);
    }
  }

  function updateActivationStatusPanel(reason = 'update') {
    try {
      const panelEl = document.getElementById('appActivationStatus');
      if (!panelEl) return;
      const authOverlay = document.getElementById('authOverlay');
      const appShell = document.getElementById('appShell');
      const handlers = getPrimaryNavHandlerStatus();
      const auth = global.APP_AUTH || {};
      const authenticated = Boolean(auth.isAuthenticated);
      const shellVisible = Boolean(appShell) && appShell.hidden !== true && appShell.style.display !== 'none';
      const overlayHidden = !authOverlay || authOverlay.hidden === true || authOverlay.style.display === 'none' || authOverlay.style.pointerEvents === 'none';
      const anyHandlerAttached = Object.values(handlers).some(Boolean);
      const payload = [
        `reason: ${reason}`,
        `authenticated: ${authenticated ? 'yes' : 'no'}`,
        `app shell visible: ${shellVisible ? 'yes' : 'no'}`,
        `overlay hidden: ${overlayHidden ? 'yes' : 'no'}`,
        `handlers attached: ${anyHandlerAttached ? 'yes' : 'no'}`,
        `dashboard handler attached: ${handlers.dashboard ? 'yes' : 'no'}`,
        `workout library handler attached: ${handlers.workoutLibrary ? 'yes' : 'no'}`,
        `camera handler attached: ${handlers.camera ? 'yes' : 'no'}`,
        `diagnostics handler attached: ${handlers.diagnostics ? 'yes' : 'no'}`,
        `connectCamera available: ${typeof global.connectCamera === 'function' ? 'yes' : 'no'}`,
        `startWorkout available: ${typeof global.startWorkout === 'function' ? 'yes' : 'no'}`,
        `onLogin available: ${typeof global.onLogin === 'function' ? 'yes' : 'no'}`,
        `retention loader available: ${typeof global.ensureRetentionFlowLoaded === 'function' ? 'yes' : 'no'}`,
        `last button clicked: ${global.__lastAppButtonClicked || 'none'}`,
        `last app error: ${global.__lastAppError || 'none'}`,
        getLiveWorkoutBreakpointLine()
      ];
      panelEl.textContent = payload.join('\n');
    } catch (error) {
      const message = error?.message || String(error || 'unknown_app_activation_error');
      setStatusPanelError('appActivationStatus', '[APP_ACTIVATION_STATUS_ERROR]', message);
    }
  }

  function runPendingPanelWatchdogs() {
    global.setTimeout(() => {
      try {
        const panelEl = document.getElementById('authPropagationStatus');
        if (!panelEl) return;
        if ((panelEl.textContent || '').trim().toLowerCase().startsWith('pending')) {
          updateAuthPropagationStatus('watchdog:2s');
        }
      } catch (error) {
        const message = error?.message || String(error || 'unknown_auth_watchdog_error');
        setStatusPanelError('authPropagationStatus', '[AUTH_PROP_STATUS_ERROR]', message);
      }
    }, 2000);

    global.setTimeout(() => {
      try {
        const panelEl = document.getElementById('appActivationStatus');
        if (!panelEl) return;
        if ((panelEl.textContent || '').trim().toLowerCase().startsWith('pending')) {
          updateActivationStatusPanel('watchdog:2s');
        }
      } catch (error) {
        const message = error?.message || String(error || 'unknown_activation_watchdog_error');
        setStatusPanelError('appActivationStatus', '[APP_ACTIVATION_STATUS_ERROR]', message);
      }
    }, 2000);

    global.setTimeout(() => {
      const panelEl = document.getElementById('featureActivationStatus');
      if (panelEl && (panelEl.textContent || '').trim().toLowerCase().startsWith('pending')) {
        global.__appRuntime?.updateFeaturePanel?.('watchdog:2s');
      }
    }, 2000);

    global.setTimeout(() => {
      const panelEl = document.getElementById('systemBootStatus');
      if (panelEl && (panelEl.textContent || '').trim().toLowerCase().startsWith('pending')) {
        renderSystemBootStatus('watchdog:2s');
      }
    }, 2000);
  }

  global.StatusPanels = {
    setStatusPanelError,
    renderSystemBootStatus,
    updateAuthPropagationStatus,
    updateActivationStatusPanel,
    renderLiveWorkoutBreakpointStatus,
    runPendingPanelWatchdogs
  };
})(window);
