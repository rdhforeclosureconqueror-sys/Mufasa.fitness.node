(() => {
  "use strict";

  window.onerror = (msg, src, line, col, err) => console.error("[AUTH_CORE][onerror]", msg, src, line, col, err);
  window.onunhandledrejection = (event) => console.error("[AUTH_CORE][unhandledrejection]", event?.reason || event);
  console.log("[BOOT] auth-core loaded");
  console.log("[AUTH_FORM_RUNTIME] auth-core form runtime loaded");

  const NODE_BASE_URL = "https://mufasa-fitness-node.onrender.com";
  const AUTH_LOGIN_URL = `${NODE_BASE_URL}/api/auth/login`;
  const AUTH_REGISTER_URL = `${NODE_BASE_URL}/api/auth/register`;
  const AUTH_ME_URL = `${NODE_BASE_URL}/api/auth/me`;
  const authDebugState = window.__authPropagationDebug || (window.__authPropagationDebug = {
    authChangedFired: false,
    lastAuthEventAt: null,
    lastAuthError: null
  });

  let authMode = "login";
  let submitInFlight = null;

  const getEl = (id) => document.getElementById(id);

  const stateUpdate = (patch) => {
    if (typeof window.__setAuthDebugState === "function") window.__setAuthDebugState(patch);
    const el = getEl("authDebugStatus");
    if (!el) return;
    if (patch.authScriptLoaded) el.textContent = el.textContent.replace("AUTH SCRIPT LOADED: no", "AUTH SCRIPT LOADED: yes");
  };

  const updateAuthStepStatus = (step, detail) => {
    const el = getEl("authLoginStepStatus");
    if (!el) return;
    el.textContent = detail ? `${step}: ${detail}` : step;
  };

  const showBindingError = (message) => {
    const el = getEl("authLoginBindingError");
    if (!el) return;
    el.style.display = "block";
    el.textContent = message;
  };

  const hideAuthOverlay = () => {
    const overlay = getEl("authOverlay");
    if (overlay) {
      console.log("[AUTH_LOGIN] hiding auth overlay");
      overlay.hidden = true;
      overlay.style.display = "none";
      overlay.style.pointerEvents = "none";
    }
    const app = document.querySelector(".app");
    if (app) app.style.display = "";
    const appShell = getEl("appShell");
    if (appShell) {
      appShell.hidden = false;
      appShell.classList.remove("app-shell-hidden");
      appShell.style.display = "";
      appShell.style.pointerEvents = "auto";
    }
    document.body.classList.add("authenticated");
    console.log("[AUTH_LOGIN] app shell shown");
  };

  const propagateAuthState = (detail, reason) => {
    if (typeof window.setCanonicalAuthState === "function") {
      return window.setCanonicalAuthState(detail, { reason, forceDispatch: true });
    }
    console.error("[AUTH_CORE] auth-state-runtime missing");
    authDebugState.lastAuthError = "auth_state_runtime_missing";
    return null;
  };

  const renderAuthMode = () => {
    const isRegisterMode = authMode === "register";
    const nameWrapEl = getEl("authNameWrap");
    const nameEl = getEl("authName");
    const passwordEl = getEl("authPassword");
    const loginTitleEl = getEl("authLoginTitle");
    const loginBtn = getEl("authLoginSubmit");
    const createBtn = getEl("authCreateAccountBtn");
    if (nameWrapEl) nameWrapEl.style.display = isRegisterMode ? "block" : "none";
    if (nameEl) nameEl.required = isRegisterMode;
    if (passwordEl) passwordEl.autocomplete = isRegisterMode ? "new-password" : "current-password";
    if (loginTitleEl) loginTitleEl.textContent = isRegisterMode ? "Create account" : "Sign in";
    if (loginBtn) loginBtn.textContent = isRegisterMode ? "Create account" : "Login";
    if (createBtn) createBtn.textContent = isRegisterMode ? "Back to login" : "Create account";
  };

  const runPostLoginHooks = async (user, token) => {
    window.__statusPanelsBootStatus = window.__statusPanelsBootStatus || {};
    window.__statusPanelsBootStatus.authRestoredValidated = true;
    if (typeof window.onLogin === "function") {
      updateAuthStepStatus("onLogin()", "running");
      await window.onLogin({
        userId: user.userId || user.id,
        email: user.email,
        name: user.name,
        authProvider: user.provider || "password"
      });
    }
    hideAuthOverlay();
    if (typeof window.bindPrimaryButtonsAfterLogin === "function") window.bindPrimaryButtonsAfterLogin("auth-core:submit");
    window.dispatchEvent?.(new CustomEvent("auth:submit:complete", { detail: { token, user } }));
  };

  async function submitAuthRequest() {
    if (submitInFlight) return submitInFlight;
    const email = getEl("authEmail")?.value?.trim() || "";
    const password = getEl("authPassword")?.value || "";
    const name = getEl("authName")?.value?.trim() || "";
    const isRegisterMode = authMode === "register";
    const authLoginStatusEl = getEl("authLoginStatus");
    const authUrl = isRegisterMode ? AUTH_REGISTER_URL : AUTH_LOGIN_URL;
    const body = isRegisterMode ? { name, email, password } : { email, password };

    submitInFlight = (async () => {
      try {
        console.log("[AUTH_SUBMIT] submit received", { mode: isRegisterMode ? "register" : "login" });
        if (isRegisterMode) console.log("[AUTH_REGISTER] submit received");
        if (authLoginStatusEl) authLoginStatusEl.textContent = isRegisterMode ? "Creating account…" : "Signing in…";
        updateAuthStepStatus("submit received", isRegisterMode ? "register" : "login");
        updateAuthStepStatus(isRegisterMode ? "POST /api/auth/register" : "POST /api/auth/login", "sending");
        console.log(`[AUTH_FORM_RUNTIME] posting to ${authUrl}`);
        const loginRes = await fetch(authUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        });
        const loginPayload = await loginRes.json().catch(() => ({}));
        const token = loginPayload?.token;
        if (!loginRes.ok || !token) throw new Error(loginPayload?.error || "login_failed");

        updateAuthStepStatus("token received", "auth-state-runtime pending");
        updateAuthStepStatus("GET /api/auth/me", "sending");
        const meRes = await fetch(AUTH_ME_URL, { headers: { authorization: `Bearer ${token}` } });
        const mePayload = await meRes.json().catch(() => ({}));
        const user = mePayload?.user || mePayload?.data?.user;
        console.log("[AUTH_LOGIN] /api/auth/me user resolved");
        updateAuthStepStatus("GET /api/auth/me", "user resolved");
        if (!meRes.ok || !mePayload?.ok || !user) throw new Error(mePayload?.error || "session_invalid");

        propagateAuthState({ token, user }, "auth-core:submitAuthRequest");
        console.log("[AUTH_LOGIN] login success");
        await runPostLoginHooks(user, token);
        updateAuthStepStatus("app shell shown", "success");
        if (authLoginStatusEl) authLoginStatusEl.textContent = "Signed in.";
        return { ok: true, token, user };
      } catch (error) {
        window.AuthStateRuntime?.clearCanonicalAuthState?.("auth-core:submitAuthRequest_failed");
        updateAuthStepStatus("failed", error?.message || "unknown_error");
        authDebugState.lastAuthError = error?.message || String(error || "unknown_error");
        console.error("[AUTH_SUBMIT] failed", error);
        if (authLoginStatusEl) authLoginStatusEl.textContent = `Login failed: ${error?.message || "unknown_error"}`;
        return { ok: false, error };
      } finally {
        submitInFlight = null;
      }
    })();
    return submitInFlight;
  }

  async function handleLoginSubmit(event) {
    console.log("[AUTH_SUBMIT] form submitted");
    event?.preventDefault?.();
    event?.stopPropagation?.();
    return submitAuthRequest();
  }

  async function handleLoginButtonClick(event) {
    console.log("[AUTH_SUBMIT] button clicked");
    event?.preventDefault?.();
    event?.stopPropagation?.();
    stateUpdate({ loginClicked: true });
    return submitAuthRequest();
  }

  function handleCreateAccountToggle(event) {
    console.log("[AUTH_FORM_RUNTIME] create account toggled");
    event?.preventDefault?.();
    event?.stopPropagation?.();
    stateUpdate({ createClicked: true });
    authMode = authMode === "login" ? "register" : "login";
    renderAuthMode();
    const authLoginStatusEl = getEl("authLoginStatus");
    if (authLoginStatusEl) authLoginStatusEl.textContent = "";
  }

  function disableDuplicateForms(forms) {
    if (forms.length <= 1) return;
    console.warn(`[AUTH_FORM_RUNTIME] multiple login forms detected: ${forms.length}`);
    forms.slice(1).forEach((extraForm, index) => {
      extraForm.setAttribute("data-auth-login-disabled", "true");
      extraForm.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        return false;
      });
      const submitter = extraForm.querySelector('[type="submit"], button');
      if (submitter) submitter.disabled = true;
      console.warn(`[AUTH_FORM_RUNTIME] disabled extra login form at index ${index + 1}`);
    });
  }

  function bindAuthLoginForm() {
    console.log("[AUTH_FORM_RUNTIME] bindAuthLoginForm reached");
    const forms = Array.from(document.querySelectorAll("#authLoginForm"));
    const form = forms[0] || null;
    const button = getEl("authLoginSubmit");
    const createBtn = getEl("authCreateAccountBtn");
    console.log("[AUTH_FORM_RUNTIME] form found", !!form);
    console.log("[AUTH_FORM_RUNTIME] button found", !!button);
    stateUpdate({ authScriptLoaded: true, formFound: !!form, loginButtonFound: !!button, createButtonFound: !!createBtn });
    disableDuplicateForms(forms);
    if (!form || !button) {
      showBindingError("Login UI could not be initialized (form/button missing). Refresh or contact support.");
      return false;
    }
    if (form.dataset.authCoreBound === "true") return true;
    form.addEventListener("submit", handleLoginSubmit);
    button.addEventListener("click", handleLoginButtonClick);
    createBtn?.addEventListener("click", handleCreateAccountToggle);
    form.dataset.authCoreBound = "true";
    form.dataset.authLoginBound = "auth-core";
    console.log("[AUTH_FORM_RUNTIME] submit handler attached");
    console.log("[AUTH_FORM_RUNTIME] handlers attached");
    renderAuthMode();
    return true;
  }

  window.AuthCore = {
    bindAuthLoginForm,
    handleCreateAccountToggle,
    handleLoginButtonClick,
    handleLoginSubmit,
    renderAuthMode,
    submitAuthRequest
  };
  window.handleLoginButtonClick = handleLoginButtonClick;
  window.handleCreateAccountToggle = handleCreateAccountToggle;

  let elapsed = 0;
  const timer = setInterval(() => {
    if (bindAuthLoginForm()) return clearInterval(timer);
    elapsed += 100;
    if (elapsed >= 3000) clearInterval(timer);
  }, 100);
  document.addEventListener("DOMContentLoaded", bindAuthLoginForm);
  window.addEventListener("load", bindAuthLoginForm);
  bindAuthLoginForm();
})();
