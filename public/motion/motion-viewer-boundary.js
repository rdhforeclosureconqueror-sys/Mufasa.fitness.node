(function (root, factory) {
  const contract = typeof module === "object" && module.exports ? require("./motion-viewer-contract") : root.MotionViewerContract;
  const api = factory(contract, root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MotionViewerBoundary = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (contract, globalScope) {
  "use strict";

  const DEFAULT_TIMEOUT_MS = 8000;

  function browserLoader({ attempt }) {
    return new Promise((resolve, reject) => {
      const script = globalScope.document.createElement("script");
      script.src = `/motion/fake-motion-viewer.js?attempt=${attempt}`;
      script.async = true;
      script.onload = () => globalScope.PocketPTMotionViewer ? resolve(globalScope.PocketPTMotionViewer) : reject(new Error("Viewer export missing"));
      script.onerror = () => reject(new Error("Viewer import failed"));
      globalScope.document.head.appendChild(script);
    });
  }

  function domView(root) {
    root.className = "motion-viewer-boundary";
    return {
      show(status, actions = {}) {
        if (status === "ready") {
          root.dataset.motionStatus = status;
          return;
        }
        root.replaceChildren();
        root.dataset.motionStatus = status;
        if (status === "disabled") return;
        const message = globalScope.document.createElement("p");
        message.textContent = status === "loading" ? "Loading motion viewer…" : status === "ready" ? "Motion viewer ready" : status === "idle" ? "Optional motion preview" : "Motion viewer unavailable";
        root.appendChild(message);
        if (actions.start || actions.retry) {
          const button = globalScope.document.createElement("button");
          button.type = "button";
          button.textContent = actions.retry ? "Retry motion viewer" : "View 3D Motion";
          button.addEventListener("click", actions.retry || actions.start, { once: true });
          root.appendChild(button);
        }
      },
      viewerRoot() {
        const region = globalScope.document.createElement("div");
        region.setAttribute("aria-label", "Motion viewer");
        root.appendChild(region);
        return region;
      }
    };
  }

  function create(options) {
    const descriptor = contract.descriptor(options.descriptor?.exerciseId);
    const enabled = options.enabled === true;
    const view = options.view || domView(options.root);
    const loadViewer = options.loadViewer || browserLoader;
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
    const clock = options.clock || (() => Date.now());
    const timers = options.timers || { setTimeout: globalScope.setTimeout.bind(globalScope), clearTimeout: globalScope.clearTimeout.bind(globalScope) };
    const emit = typeof options.onDiagnostic === "function" ? options.onDiagnostic : () => {};
    let status = enabled ? "idle" : "disabled", generation = 0, timer = null, session = null, controller = null, mounted = false;

    function report(stage, failureCode, startedAt) { emit(contract.diagnostic({ stage, status, elapsedMs: clock() - startedAt, exerciseId: descriptor.exerciseId, failureCode })); }
    function dispose() {
      generation += 1;
      if (timer !== null) timers.clearTimeout(timer);
      timer = null;
      controller?.abort();
      controller = null;
      try { session?.dispose?.(); } catch (_) {}
      session = null;
    }
    function fail(nextStatus, code, startedAt, token) {
      if (!mounted || token !== generation) return;
      if (timer !== null) timers.clearTimeout(timer);
      timer = null;
      controller?.abort();
      controller = null;
      try { session?.dispose?.(); } catch (_) {}
      session = null;
      generation += 1;
      status = nextStatus;
      report("viewer_attempt", code, startedAt);
      view.show(status, { retry: start });
    }
    async function start() {
      if (!mounted || !enabled) return;
      dispose();
      const token = generation, startedAt = clock();
      controller = new AbortController();
      status = "loading";
      view.show(status);
      timer = timers.setTimeout(() => { controller?.abort(); fail("timed_out", "LOAD_TIMEOUT", startedAt, token); }, timeoutMs);
      try {
        const implementation = await loadViewer({ signal: controller.signal, attempt: token, descriptor });
        if (!mounted || token !== generation) return;
        if (!implementation || typeof implementation.createSession !== "function") throw Object.assign(new TypeError("Malformed viewer implementation"), { code: "INVALID_IMPLEMENTATION" });
        session = implementation.createSession({ descriptor, signal: controller.signal, onError: () => fail("failed", "RUNTIME_FAILURE", startedAt, token) });
        if (!session || typeof session.mount !== "function" || typeof session.dispose !== "function") throw Object.assign(new TypeError("Malformed viewer session"), { code: "INVALID_SESSION" });
        const result = await session.mount(view.viewerRoot());
        if (!mounted || token !== generation) return;
        if (!result || result.status !== "ready") throw Object.assign(new Error("Viewer did not report ready"), { code: "INVALID_STATUS" });
        timers.clearTimeout(timer); timer = null; status = "ready"; view.show(status); report("viewer_attempt", null, startedAt);
      } catch (error) {
        fail("failed", error?.code || "LOAD_OR_INITIALIZATION_FAILURE", startedAt, token);
      }
    }
    function mount() { mounted = true; view.show(status, enabled ? { start } : {}); return api; }
    function unmount() { mounted = false; dispose(); }
    const api = Object.freeze({ mount, unmount, retry: start, getStatus: () => status });
    return api;
  }

  return Object.freeze({ create, browserLoader, DEFAULT_TIMEOUT_MS });
});
