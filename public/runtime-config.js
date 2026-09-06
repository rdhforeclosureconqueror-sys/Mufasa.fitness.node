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

  if (typeof document !== "undefined" && typeof global.setInterval === "function") {
    let attempts = 0;
    const maybeLoadMirrorDebugCenter = () => {
      attempts += 1;
      if (document.querySelector('script[data-mirror-debug-center]')) return true;
      const mirrorDiagnosticsPresent = Boolean(
        document.querySelector('[id^="mirrorMotion"], [data-mirror-motion-diagnostics], [data-mirror-motion-phase3-diagnostics], [data-mirror-motion-phase4-diagnostics]')
        || global.PocketPTMirrorMotionAcceptance
        || global.PocketPTMirrorMotionLiveAcceptance
      );
      if (!mirrorDiagnosticsPresent) return attempts >= 120;
      const script = document.createElement("script");
      script.src = "/mirror-debug-center.js?v=20260906-consolidated";
      script.defer = true;
      script.dataset.mirrorDebugCenter = "true";
      document.head.appendChild(script);
      return true;
    };
    if (!maybeLoadMirrorDebugCenter()) {
      const timer = global.setInterval(() => {
        if (maybeLoadMirrorDebugCenter()) global.clearInterval?.(timer);
      }, 500);
      timer?.unref?.();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
