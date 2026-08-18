(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTMotionViewer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (globalScope) {
  "use strict";
  function loadScript(src, signal) { return new Promise((resolve, reject) => { const script = globalScope.document.createElement("script"); script.src = src; script.async = true; script.onload = resolve; script.onerror = () => reject(Object.assign(new Error("Dependency script failed"), { code: "dependency_load_failed" })); signal?.addEventListener("abort", () => { script.remove(); reject(Object.assign(new Error("Aborted"), { code: "session_aborted" })); }, { once: true }); globalScope.document.head.appendChild(script); }); }
  async function acquire(signal) {
    if (!globalScope.PocketPTShared3DLoader) await loadScript("/motion/shared3d-loader.js", signal);
    if (!globalScope.PocketPTDisposableMotionSession) await loadScript("/motion/disposable-motion-session.js", signal);
    return globalScope.PocketPTDisposableMotionSession;
  }
  return Object.freeze({ createSession(options = {}) { let runtime = null, disposed = false; return { async mount(root) { const heading = root.ownerDocument.createElement("p"); heading.textContent = "3D runtime test"; root.appendChild(heading); const api = await acquire(options.signal); if (disposed || options.signal?.aborted) return { status: "failed", code: "session_aborted" }; runtime = api.createMotionSession({ onError: options.onError }); return runtime.start(root); }, dispose() { disposed = true; runtime?.dispose(); runtime = null; } }; } });
});
