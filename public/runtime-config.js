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
      const mirrorDiagnosticsPresent = Boolean(
        document.querySelector('[id^="mirrorMotion"], [data-mirror-motion-diagnostics], [data-mirror-motion-phase3-diagnostics], [data-mirror-motion-phase4-diagnostics]')
        || global.PocketPTMirrorMotionAcceptance
        || global.PocketPTMirrorMotionLiveAcceptance
      );
      if (!mirrorDiagnosticsPresent) return attempts >= 120;
      if (!document.querySelector('script[data-mirror-deployment-diagnostics]')) {
        const deployment = document.createElement("script");
        deployment.src = "/mirror-deployment-diagnostics.js?v=20260907-deployment-parity-v1";
        deployment.defer = true;
        deployment.dataset.mirrorDeploymentDiagnostics = "true";
        document.head.appendChild(deployment);
      }
      if (document.querySelector('script[data-mirror-debug-center]')) return true;
      const script = document.createElement("script");
      script.src = "/mirror-debug-center.js?v=20260907-consolidated-v2";
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
