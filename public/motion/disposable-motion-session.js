(function (root, factory) {
  const loader = typeof module === "object" && module.exports ? require("./shared3d-loader") : root.PocketPTShared3DLoader;
  const api = factory(loader, root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTDisposableMotionSession = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (defaultLoader, globalScope) {
  "use strict";
  const STATES = Object.freeze(["created", "initializing", "running", "failed", "disposing", "disposed"]);
  const counters = { activeSessions: 0, activeRafs: 0, listeners: 0, timers: 0, canvases: 0 };
  const snapshot = () => Object.freeze({ ...counters });

  class DisposableMotionSession {
    constructor(options = {}) {
      this.options = options; this.env = options.environment || globalScope; this.loader = options.loader || defaultLoader;
      this.state = "created"; this.controller = new AbortController(); this.listeners = []; this.timers = new Set();
      this.renderer = null; this.scene = null; this.camera = null; this.mesh = null; this.canvas = null; this.raf = null;
      this.counted = true; counters.activeSessions++;
    }
    addListener(target, type, handler, options) { target?.addEventListener?.(type, handler, options); this.listeners.push([target, type, handler, options]); counters.listeners++; }
    failure(code, cause) { return Object.freeze({ status: "failed", code, cause: cause ? String(cause.message || cause) : null }); }
    async start(container) {
      if (this.state !== "created") return this.failure(this.state === "disposed" ? "session_aborted" : "runtime_failed");
      this.state = "initializing";
      const capability = (this.options.probeCapability || this.loader.probeCapability)(this.env);
      if (!capability.supported) return this.fail(capability.reason === "webgl_unavailable" ? "unsupported" : capability.reason);
      try {
        const THREE = await this.loader.loadThree({ signal: this.controller.signal, importModule: this.options.importModule });
        if (this.controller.signal.aborted || this.state !== "initializing") return this.failure("session_aborted");
        if (this.options.injectFailure === "renderer_init") throw Object.assign(new Error("Injected renderer failure"), { code: "renderer_init_failed" });
        this.renderer = (this.options.createRenderer || (opts => new THREE.WebGLRenderer(opts)))({ antialias: false, alpha: true });
        this.canvas = this.renderer.domElement; container.appendChild(this.canvas); counters.canvases++;
        this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10); this.camera.position.z = 2.5;
        const geometry = new THREE.BoxGeometry(1, 1, 1), material = new THREE.MeshBasicMaterial({ color: 0x35c98b });
        this.mesh = new THREE.Mesh(geometry, material); this.scene.add(this.mesh);
        this.onResize = () => this.resize(container); this.onVisibility = () => this.env.document.hidden ? this.stopRenderLoop() : this.startRenderLoop();
        this.onPageHide = () => this.dispose(); this.onContextLost = event => { event?.preventDefault?.(); this.fail("context_lost"); };
        this.onContextRestored = () => {}; // Context loss is terminal in Phase C; a new session is the safe recovery path.
        this.addListener(this.env, "resize", this.onResize); this.addListener(this.env.document, "visibilitychange", this.onVisibility);
        this.addListener(this.env, "pagehide", this.onPageHide); this.addListener(this.canvas, "webglcontextlost", this.onContextLost);
        this.addListener(this.canvas, "webglcontextrestored", this.onContextRestored);
        this.resize(container); this.state = "running"; this.startRenderLoop();
        return Object.freeze({ status: "ready", capability });
      } catch (error) {
        if (this.controller.signal.aborted) return this.failure("session_aborted");
        return this.fail(error?.code || (this.renderer ? "runtime_failed" : "renderer_init_failed"), error);
      }
    }
    resize(container) {
      if (!this.renderer || !this.camera) return;
      const width = Math.max(1, Math.min(1280, container.clientWidth || 320));
      const height = Math.max(1, Math.min(720, container.clientHeight || 240));
      this.renderer.setPixelRatio(Math.min(1.5, this.env.devicePixelRatio || 1)); this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    }
    startRenderLoop() {
      if (this.state !== "running" || this.raf !== null || this.env.document?.hidden) return;
      counters.activeRafs++;
      const frame = () => {
        if (this.state !== "running") return;
        try {
          if (this.options.injectFailure === "runtime") throw new Error("Injected runtime failure");
          this.mesh.rotation.y += 0.01; this.renderer.render(this.scene, this.camera); this.raf = this.env.requestAnimationFrame(frame);
        } catch (error) { this.fail("runtime_failed", error); }
      };
      this.raf = this.env.requestAnimationFrame(frame);
    }
    stopRenderLoop() { if (this.raf !== null) { this.env.cancelAnimationFrame(this.raf); this.raf = null; counters.activeRafs--; } }
    fail(code, cause) { if (this.state !== "disposed" && this.state !== "disposing") { this.state = "failed"; this.options.onError?.(Object.assign(new Error(code), { code, cause })); this.dispose(); } return this.failure(code, cause); }
    dispose() {
      if (this.state === "disposed" || this.state === "disposing") return;
      this.state = "disposing"; this.controller.abort(); this.stopRenderLoop();
      for (const timer of this.timers) { this.env.clearTimeout(timer); counters.timers--; } this.timers.clear();
      for (const [target, type, handler, options] of this.listeners) { target?.removeEventListener?.(type, handler, options); counters.listeners--; } this.listeners.length = 0;
      this.scene?.traverse?.(object => { object.geometry?.dispose?.(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(material => { if (!material) return; for (const value of Object.values(material)) if (value?.isTexture) value.dispose(); material.dispose?.(); }); });
      this.renderer?.renderLists?.dispose?.(); this.renderer?.dispose?.(); this.renderer?.forceContextLoss?.();
      if (this.canvas?.parentNode) { this.canvas.parentNode.removeChild(this.canvas); counters.canvases--; }
      this.renderer = this.scene = this.camera = this.mesh = this.canvas = null;
      if (this.counted) { counters.activeSessions--; this.counted = false; } this.state = "disposed";
    }
  }
  function createMotionSession(options) { return new DisposableMotionSession(options); }
  return Object.freeze({ STATES, DisposableMotionSession, createMotionSession, diagnostics: snapshot });
});
