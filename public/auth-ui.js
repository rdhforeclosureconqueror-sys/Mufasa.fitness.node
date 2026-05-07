(() => {
  "use strict";

  console.log("[AUTH_FORM_RUNTIME] auth-ui compatibility delegator loaded");

  function showBindingError(message) {
    const el = document.getElementById("authLoginBindingError");
    if (el) {
      el.style.display = "block";
      el.textContent = message;
    }
  }

  function submitAuth() {
    console.log("[AUTH_SUBMIT] auth-ui delegating submit to auth-core");
    return window.AuthCore?.submitAuthRequest?.();
  }

  function handleAuthButtonClick(event) {
    console.log("[AUTH_SUBMIT] auth-ui button delegator invoked");
    event?.preventDefault?.();
    event?.stopPropagation?.();
    return window.AuthCore?.handleLoginButtonClick?.(event) || submitAuth();
  }

  function handleCreateAccountToggle(event) {
    console.log("[AUTH_REGISTER] auth-ui toggle delegator invoked");
    event?.preventDefault?.();
    event?.stopPropagation?.();
    return window.AuthCore?.handleCreateAccountToggle?.(event);
  }

  function bind() {
    console.log("[AUTH_FORM_RUNTIME] auth-ui binding compatibility reached");
    const authLoginForm = document.getElementById("authLoginForm");
    const authLoginSubmit = document.getElementById("authLoginSubmit");
    const authCreateAccountBtn = document.getElementById("authCreateAccountBtn");
    if (!authLoginForm || !authLoginSubmit || !authCreateAccountBtn) {
      showBindingError("Login UI init failed: missing required auth element.");
      return false;
    }
    if (window.AuthCore?.bindAuthLoginForm?.()) return true;
    if (authLoginForm.dataset.authUiDelegatorBound === "true") return true;
    authLoginForm.addEventListener("submit", handleAuthButtonClick);
    authLoginSubmit.addEventListener("click", handleAuthButtonClick);
    authCreateAccountBtn.addEventListener("click", handleCreateAccountToggle);
    authLoginForm.dataset.authUiDelegatorBound = "true";
    console.log("[AUTH_FORM_RUNTIME] auth-ui delegator handlers attached");
    return true;
  }

  window.AuthUiCompatibility = {
    bind,
    handleAuthButtonClick,
    handleCreateAccountToggle,
    submitAuth
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
