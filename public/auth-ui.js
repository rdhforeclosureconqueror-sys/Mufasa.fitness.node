(() => {
  const NODE_BASE_URL = "https://mufasa-fitness-node.onrender.com";
  let authMode = "login";

  function showBindingError(message) {
    const el = document.getElementById("authLoginBindingError");
    if (el) {
      el.style.display = "block";
      el.textContent = message;
    }
  }

  function renderMode() {
    const isRegisterMode = authMode === "register";
    const authNameWrapEl = document.getElementById("authNameWrap");
    const authNameEl = document.getElementById("authName");
    const authPasswordEl = document.getElementById("authPassword");
    const authLoginTitleEl = document.getElementById("authLoginTitle");
    const authLoginSubmitEl = document.getElementById("authLoginSubmit");
    const authCreateAccountBtn = document.getElementById("authCreateAccountBtn");
    if (authNameWrapEl) authNameWrapEl.style.display = isRegisterMode ? "block" : "none";
    if (authNameEl) authNameEl.required = isRegisterMode;
    if (authPasswordEl) authPasswordEl.autocomplete = isRegisterMode ? "new-password" : "current-password";
    if (authLoginTitleEl) authLoginTitleEl.textContent = isRegisterMode ? "Create account" : "Sign in";
    if (authLoginSubmitEl) authLoginSubmitEl.textContent = isRegisterMode ? "Create account" : "Login";
    if (authCreateAccountBtn) authCreateAccountBtn.textContent = isRegisterMode ? "Back to login" : "Create account";
  }

  async function submitAuth() {
    const authEmailEl = document.getElementById("authEmail");
    const authPasswordEl = document.getElementById("authPassword");
    const authNameEl = document.getElementById("authName");
    const authLoginStatusEl = document.getElementById("authLoginStatus");
    const email = authEmailEl?.value?.trim() || "";
    const password = authPasswordEl?.value || "";
    const name = authNameEl?.value?.trim() || "";
    const isRegisterMode = authMode === "register";
    try {
      let loginRes;
      if (isRegisterMode) {
        loginRes = await fetch(`${NODE_BASE_URL}/api/auth/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      } else {
        loginRes = await fetch(`${NODE_BASE_URL}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
      }
      const loginPayload = await loginRes.json().catch(() => ({}));
      const token = loginPayload?.token;
      if (!loginRes.ok || !token) throw new Error(loginPayload?.error || "login_failed");
      localStorage.setItem("maatAuthToken", token);
      const meRes = await fetch(`${NODE_BASE_URL}/api/auth/me`, { headers: { authorization: `Bearer ${token}` } });
      const mePayload = await meRes.json().catch(() => ({}));
      const user = mePayload?.data?.user;
      if (!meRes.ok || !mePayload?.ok || !user) throw new Error("session_invalid");
      window.APP_AUTH = { isAuthenticated: true, token, user };
      if (typeof window.onLogin === "function") {
        await window.onLogin({ userId: user.userId || user.id, email: user.email, name: user.name, authProvider: user.provider || "password" });
      }
      const authOverlayEl = document.getElementById("authOverlay");
      if (authOverlayEl) authOverlayEl.style.display = "none";
      const appShellEl = document.getElementById("appShell");
      if (appShellEl) appShellEl.classList.remove("app-shell-hidden");
      if (authLoginStatusEl) authLoginStatusEl.textContent = "Signed in.";
    } catch (error) {
      localStorage.removeItem("maatAuthToken");
      if (authLoginStatusEl) authLoginStatusEl.textContent = `Login failed: ${error?.message || "unknown_error"}`;
    }
  }

  async function handleAuthButtonClick(event) {
    console.log("[AUTH_LOGIN] button clicked");
    event?.preventDefault?.();
    event?.stopPropagation?.();
    return submitAuth();
  }

  function handleCreateAccountToggle(event) {
    console.log("[AUTH_LOGIN] create account clicked");
    event?.preventDefault?.();
    authMode = authMode === "login" ? "register" : "login";
    renderMode();
  }

  function bind() {
    console.log("[AUTH_LOGIN] binding code reached");
    const authLoginForm = document.getElementById("authLoginForm");
    const authLoginSubmit = document.getElementById("authLoginSubmit");
    const authCreateAccountBtn = document.getElementById("authCreateAccountBtn");
    console.log("[AUTH_LOGIN] form", authLoginForm);
    console.log("[AUTH_LOGIN] login button", authLoginSubmit);
    console.log("[AUTH_LOGIN] create button", authCreateAccountBtn);
    if (!authLoginForm || !authLoginSubmit || !authCreateAccountBtn) {
      showBindingError("Login UI init failed: missing required auth element.");
      return;
    }
    authLoginForm.addEventListener("submit", handleAuthButtonClick);
    authLoginSubmit.addEventListener("click", handleAuthButtonClick);
    authCreateAccountBtn.addEventListener("click", handleCreateAccountToggle);
    authLoginSubmit.onclick = handleAuthButtonClick;
    authCreateAccountBtn.onclick = handleCreateAccountToggle;
    console.log("[AUTH_LOGIN] handlers attached");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
