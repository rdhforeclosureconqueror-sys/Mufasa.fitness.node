(function (win) {
  "use strict";
  const family = () => /CriOS/i.test(navigator.userAgent) ? "chrome_ios" : /FxiOS/i.test(navigator.userAgent) ? "firefox_ios" : /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent) ? "safari" : /Chrome/i.test(navigator.userAgent) ? "chrome" : "other";
  const device = () => matchMedia("(max-width: 700px)").matches ? "mobile" : "desktop";
  const endpoint = () => {
    const configured=win.RuntimeState?.getBackendOrigin?.()||win.MAAT_BACKEND_ORIGIN||win.__MAAT_RUNTIME_CONFIG__?.backendOrigin||win.location.origin;
    return `${String(configured).replace(/\/+$/,"")}/api/me/client-diagnostics`;
  };
  async function report(capability,status,classification,stage) {
    const auth=win.AuthStateRuntime?.getAuthToken?.()||win.APP_AUTH?.token||localStorage.getItem("maat_auth_token")||localStorage.getItem("authToken");
    if(!auth)return false;
    const manifest=win.__MAAT_RUNTIME_CONFIG__||{};
    try { await win.fetch(endpoint(),{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${auth}`},body:JSON.stringify({capability,status,classification,browserFamily:family(),deviceCategory:device(),buildIdentifier:manifest.buildIdentifier||undefined,assetToken:manifest.assetToken||undefined,stage}),credentials:"omit"});return true; } catch { return false; }
  }
  win.ClientCapabilityEvidence=Object.freeze({report});
})(window);
