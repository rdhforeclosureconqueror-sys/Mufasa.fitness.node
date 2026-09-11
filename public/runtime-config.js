(function installRuntimeConfig(global) {
  "use strict";
  const backendOrigin = "https://mufasa-fitness-node.onrender.com";
  global.__MAAT_RUNTIME_CONFIG__ = Object.freeze({ ...(global.__MAAT_RUNTIME_CONFIG__ || {}), backendOrigin });
  global.MAAT_BACKEND_ORIGIN = global.__MAAT_RUNTIME_CONFIG__.backendOrigin;

  if (typeof document !== "undefined") {
    // Presentation authority must exist before any Mirror Motion producer gets a
    // chance to paint its legacy fixed-position panel. Producers remain alive in
    // the DOM so the consolidated center can collect their diagnostic evidence.
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

    // PR #771 established the startup authority. Keep that authority durable when
    // a legacy producer creates, recreates, or restyles its fixed panel later.
    const isLegacyMirrorPanel = (element) => {
      if (!element || element.nodeType !== 1) return false;
      const id = String(element.id || "");
      if (id === "pocketptMirrorDebugCenter" || id === "pocketptMirrorDebugLauncher") return false;
      return /^mirrorMotion.*(?:Debug|Acceptance|Controls)$/i.test(id)
        || /^mirror.*Camera.*(?:Debug|Review|Motion)$/i.test(id)
        || element.matches?.('[data-pocketpt-debug-producer="true"]') === true;
    };

    const suppressLegacyMirrorPanel = (element) => {
      if (!isLegacyMirrorPanel(element)) return false;
      const alreadySuppressed = element.style?.getPropertyValue("display") === "none"
        && element.style?.getPropertyPriority("display") === "important"
        && element.getAttribute?.("aria-hidden") === "true";
      if (alreadySuppressed) return false;
      element.style?.setProperty("display", "none", "important");
      element.setAttribute?.("aria-hidden", "true");
      element.setAttribute?.("data-pocketpt-presentation-suppressed", "mirror-debug-center");
      return true;
    };

    const suppressLegacyMirrorTree = (node) => {
      if (!node || node.nodeType !== 1) return false;
      let changed = suppressLegacyMirrorPanel(node);
      node.querySelectorAll?.('[id^="mirrorMotion"],[id^="mirrorCamera"],[data-pocketpt-debug-producer="true"]')
        .forEach((element) => { if (suppressLegacyMirrorPanel(element)) changed = true; });
      return changed;
    };

    const installMirrorPresentationObserver = () => {
      if (!document.body) return;
      suppressLegacyMirrorTree(document.body);
      if (!global.MutationObserver || global.__POCKETPT_MIRROR_PRESENTATION_OBSERVER__) return;
      const observer = new global.MutationObserver((records) => {
        for (const record of records) {
          if (record.type === "attributes") suppressLegacyMirrorPanel(record.target);
          for (const node of record.addedNodes || []) suppressLegacyMirrorTree(node);
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class", "id", "hidden"]
      });
      global.__POCKETPT_MIRROR_PRESENTATION_OBSERVER__ = observer;
    };

    if (document.body) installMirrorPresentationObserver();
    else document.addEventListener("DOMContentLoaded", installMirrorPresentationObserver, { once: true });

    global.PocketPTMirrorPresentationAuthority = Object.freeze({
      authority: "mirror-debug-center",
      legacyProducerPresentation: false,
      dynamicProducerSuppression: true,
      version: "20260910-producer-authority-v2"
    });

    // Force a new center asset after the durable-authority repair so Safari/CDN
    // cannot keep executing the prior consolidation revision.
    if (!document.querySelector('script[data-mirror-debug-center]')) {
      const script = document.createElement("script");
      script.src = "/mirror-debug-center.js?v=20260910-producer-authority-v5";
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
