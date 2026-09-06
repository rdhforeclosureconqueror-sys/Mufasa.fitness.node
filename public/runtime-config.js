(function installRuntimeConfig(global) {
  "use strict";
  const backendOrigin = "https://mufasa-fitness-node.onrender.com";
  global.__MAAT_RUNTIME_CONFIG__ = Object.freeze({ ...(global.__MAAT_RUNTIME_CONFIG__ || {}), backendOrigin });
  global.MAAT_BACKEND_ORIGIN = global.__MAAT_RUNTIME_CONFIG__.backendOrigin;

  if (typeof document !== "undefined" && !document.querySelector('script[data-mufasa-voice-lifecycle]')) {
    const script = document.createElement("script");
    script.src = "/mufasa-voice-lifecycle.js?v=20260905-phase-b";
    script.defer = true;
    script.dataset.mufasaVoiceLifecycle = "true";
    document.head.appendChild(script);
  }
})(typeof window !== "undefined" ? window : globalThis);
