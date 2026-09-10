(function installRuntimeConfig(global) {
  "use strict";
  const backendOrigin = "https://mufasa-fitness-node.onrender.com";
  global.__MAAT_RUNTIME_CONFIG__ = Object.freeze({ ...(global.__MAAT_RUNTIME_CONFIG__ || {}), backendOrigin });
  global.MAAT_BACKEND_ORIGIN = global.__MAAT_RUNTIME_CONFIG__.backendOrigin;

  if (typeof document !== "undefined") {
    // Presentation authority must exist before any Mirror Motion producer gets a
    // chance to paint its legacy fixed-position panel. This is deliberately a
    // presentation-only contract: producers remain in the DOM and keep updating
    // their diagnostic text for the consolidated center to collect.
    const STYLE_ID = "pocketpt-mirror-producer-presentation-guard";
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        body > [id^="mirrorMotion"]{display:none!important}
        body > [id^="mirrorCamera"]{display:none!important}
        body > [id^="mirror"][data-pocketpt-debug-producer="true"]{display:none!important}
        #pocketptMirrorDebugCenter,#pocketptMirrorDebugLauncher{display:revert}
        #pocketptMirrorDebugCenter[hidden],#pocketptMirrorDebugLauncher[hidden]{display:none!important}
      `;
      (document.head || document.documentElement).appendChild(style);
    }

    global.PocketPTMirrorPresentationAuthority = Object.freeze({
      authority: "mirror-debug-center",
      legacyProducerPresentation: false,
      version: "20260910-producer-authority-v1"
    });

    // Load the single visible authority immediately. Previous implementations
    // waited until a legacy producer was detected, which allowed iPhone Safari to
    // render Camera Review / Phase / Acceptance panels before consolidation ran.
    if (!document.querySelector('script[data-mirror-debug-center]')) {
      const script = document.createElement("script");
      script.src = "/mirror-debug-center.js?v=20260910-producer-authority-v4";
      script.defer = true;
      script.dataset.mirrorDebugCenter = "true";
      document.head.appendChild(script);
    }

    if (!document.querySelector('script[data-mirror-deployment-diagnostics]')) {
      const deployment = document.createElement("script");
      deployment.src = "/mirror-deployment-diagnostics.js?v=20260910-producer-authority-v2";
      deployment.defer = true;
      deployment.dataset.mirrorDeploymentDiagnostics = "true";
      document.head.appendChild(deployment);
    }
  }

  if (typeof document !== "undefined" && !document.querySelector('script[data-mufasa-voice-lifecycle]')) {
    const script = document.createElement("script");
    script.src = "/mufasa-voice-lifecycle.js?v=20260905-phase-b";
    script.defer = true;
    script.dataset.mufasaVoiceLifecycle = "true";
    document.head.appendChild(script);
  }
})(typeof window !== "undefined" ? window : globalThis);
