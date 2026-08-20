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
  function calculateCameraFit(size, center, aspect, verticalFovDegrees, padding = 1.2) {
    const safeAspect = Math.max(Number(aspect) || 1, 0.01);
    const halfVerticalFov = Math.max(1, Number(verticalFovDegrees) || 50) * Math.PI / 360;
    const verticalDistance = (Math.max(Number(size?.y) || 0, 0.01) / 2) / Math.tan(halfVerticalFov);
    const horizontalDistance = (Math.max(Number(size?.x) || 0, 0.01) / 2) / (Math.tan(halfVerticalFov) * safeAspect);
    const distance = Math.max(verticalDistance, horizontalDistance) * Math.max(Number(padding) || 1, 1);
    const depth = Math.max(Number(size?.z) || 0, 0.01);
    return Object.freeze({ center: Object.freeze({ x: Number(center?.x) || 0, y: Number(center?.y) || 0, z: Number(center?.z) || 0 }), distance, near: Math.max(0.01, distance - depth * 2), far: Math.max(distance + depth * 2, distance * 4, 10) });
  }

  class DisposableMotionSession {
    constructor(options = {}) {
      this.options = options; this.env = options.environment || globalScope; this.loader = options.loader || defaultLoader;
      this.state = "created"; this.controller = new AbortController(); this.listeners = []; this.timers = new Set();
      this.renderer = null; this.scene = null; this.camera = null; this.mesh = null; this.canvas = null; this.raf = null; this.THREE = null;
      this.avatar = null; this.animationFixture = null; this.motionSpec = null; this.motionDiagnostics = null; this.mixer = null; this.action = null; this.clock = null; this.loop = true;
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
        this.THREE = THREE;
        if (this.controller.signal.aborted || this.state !== "initializing") return this.failure("session_aborted");
        if (this.options.injectFailure === "renderer_init") throw Object.assign(new Error("Injected renderer failure"), { code: "renderer_init_failed" });
        this.renderer = (this.options.createRenderer || (opts => new THREE.WebGLRenderer(opts)))({ antialias: false, alpha: true });
        this.canvas = this.renderer.domElement; container.appendChild(this.canvas); counters.canvases++;
        this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x07110e); this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10); this.camera.position.z = 2.5;
        this.scene.add(new THREE.HemisphereLight(0xf4f7f5, 0x26352f, 1.15));
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.65); keyLight.position.set(3, 5, 4); this.scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0xb9d8ff, 0.55); fillLight.position.set(-4, 2, 3); this.scene.add(fillLight);
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
          if (this.avatar) this.mixer?.update?.(Math.min(0.1, this.clock?.getDelta?.() || 0));
          else this.mesh.rotation.y += 0.01;
          this.options.onFrame?.(this);
          this.renderer.render(this.scene, this.camera); this.raf = this.env.requestAnimationFrame(frame);
        } catch (error) { this.fail("runtime_failed", error); }
      };
      this.raf = this.env.requestAnimationFrame(frame);
    }
    stopRenderLoop() { if (this.raf !== null) { this.env.cancelAnimationFrame(this.raf); this.raf = null; counters.activeRafs--; } }
    async loadAsset(path) {
      if (this.state !== "running") return this.failure("runtime_failed");
      try {
        const Loader = await this.loader.loadGLTFLoader({ signal: this.controller.signal, importModule: this.options.importModule });
        const asset = await new Loader().loadAsync(path);
        if (this.controller.signal.aborted) return this.failure("session_aborted");
        return asset;
      } catch (error) {
        if (this.controller.signal.aborted || error?.code === "session_aborted") return this.failure("session_aborted");
        const status = Number(error?.target?.status || error?.status);
        return this.failure(status === 404 || error?.code === "asset_missing" ? "asset_missing" : error?.code || "asset_load_failed", error);
      }
    }
    inspectAvatar(root) {
      const bones = [], skinnedMeshes = [];
      root?.traverse?.(object => { if (object.isBone) bones.push(object.name || "(unnamed)"); if (object.isSkinnedMesh) skinnedMeshes.push(object.name || "(unnamed)"); });
      return Object.freeze({ boneCount: bones.length, boneNames: Object.freeze(bones), skinnedMeshCount: skinnedMeshes.length, skinnedMeshes: Object.freeze(skinnedMeshes) });
    }
    frameAvatar(root) {
      root?.updateMatrixWorld?.(true);
      const bounds = new this.THREE.Box3().setFromObject(root), size = bounds.getSize(new this.THREE.Vector3()), center = bounds.getCenter(new this.THREE.Vector3());
      if (![size.x, size.y, size.z, center.x, center.y, center.z].every(Number.isFinite) || size.y <= 0) return null;
      const fit = calculateCameraFit(size, center, this.camera.aspect, this.camera.fov, 1.2);
      this.camera.position.set(fit.center.x, fit.center.y, fit.center.z + fit.distance); this.camera.near = fit.near; this.camera.far = fit.far;
      this.camera.lookAt(fit.center.x, fit.center.y, fit.center.z); this.camera.updateProjectionMatrix(); return fit;
    }
    async loadAvatar(path) {
      this.unloadAvatar(); const asset = await this.loadAsset(path); if (asset?.status === "failed") return asset;
      const diagnostics = this.inspectAvatar(asset.scene);
      if (!diagnostics.boneCount || !diagnostics.skinnedMeshCount) return this.failure("avatar_invalid");
      this.avatar = asset.scene; this.scene.add(this.avatar); this.mesh.visible = false; const cameraFit = this.frameAvatar(this.avatar);
      this.mixer = new this.THREE.AnimationMixer(this.avatar); this.clock = new this.THREE.Clock();
      return Object.freeze({ status: "ready", diagnostics: Object.freeze({ ...diagnostics, cameraFit }) });
    }
    async loadAnimation(path) {
      if (!this.avatar || !this.mixer) return this.failure("avatar_required");
      const asset = await this.loadAsset(path); if (asset?.status === "failed") return asset;
      const clip = asset.animations?.[0]; if (!clip) return this.failure("animation_missing");
      this.unloadMotion(); this.animationFixture = asset; this.action = this.mixer.clipAction(clip, this.avatar); this.setLoop(this.loop);
      const bones = new Set(this.inspectAvatar(this.avatar).boneNames);
      const tracks = clip.tracks || [], unboundTracks = tracks.map(track => track.name.split(".")[0]).filter(name => !bones.has(name));
      return Object.freeze({ status: "ready", diagnostics: Object.freeze({ clipName: clip.name || "(unnamed)", duration: clip.duration, trackCount: tracks.length, unboundTrackCount: unboundTracks.length, unboundTracks: Object.freeze(unboundTracks) }) });
    }
    loadMotionSpec(spec, compiler) {
      if (!this.avatar || !this.mixer) return this.failure("avatar_required");
      const built = compiler?.compile?.(this.THREE, spec, this.avatar); if (!built || built.status !== "ready") return built || this.failure("motion_compile_failed");
      this.unloadMotion(); this.motionSpec = spec; this.motionDiagnostics = built.diagnostics; this.action = this.mixer.clipAction(built.clip, this.avatar); this.setLoop(this.loop);
      return Object.freeze({ status: "ready", diagnostics: Object.freeze({ ...built.diagnostics, clipName: built.clip.name, clipDuration: built.clip.duration }) });
    }
    unloadMotion() { this.stop(); this.action = null; this.animationFixture = null; this.motionSpec = null; this.motionDiagnostics = null; return { status: "ready" }; }
    currentMotionPhase() { if (!this.motionSpec || !this.action) return null; const duration = this.motionSpec.durationSeconds, normalized = duration > 0 ? Math.max(0, Math.min(1, Number(this.action.time || 0) / duration)) : 0; return this.motionSpec.phases.slice().reverse().find(phase => normalized >= phase.normalizedTime)?.id || this.motionSpec.phases[0]?.id || null; }
    unloadAvatar() { this.unloadMotion(); if (this.avatar) this.scene?.remove?.(this.avatar); this.avatar = this.mixer = this.clock = null; if (this.mesh) this.mesh.visible = true; }
    play() { if (!this.action) return this.failure("animation_required"); this.action.paused = false; this.action.play(); return { status: "playing" }; }
    pause() { if (!this.action) return this.failure("animation_required"); this.action.paused = true; return { status: "paused" }; }
    resume() { return this.play(); }
    stop() { this.action?.stop?.(); this.mixer?.stopAllAction?.(); return { status: "stopped" }; }
    restart() { if (!this.action) return this.failure("animation_required"); this.action.reset(); return this.play(); }
    setLoop(enabled) { this.loop = Boolean(enabled); if (this.action) this.action.setLoop(this.loop ? this.THREE.LoopRepeat : this.THREE.LoopOnce, this.loop ? Infinity : 1); return { status: "ready", loop: this.loop }; }
    fail(code, cause) { if (this.state !== "disposed" && this.state !== "disposing") { this.state = "failed"; this.options.onError?.(Object.assign(new Error(code), { code, cause })); this.dispose(); } return this.failure(code, cause); }
    dispose() {
      if (this.state === "disposed" || this.state === "disposing") return;
      this.state = "disposing"; this.controller.abort(); this.stopRenderLoop();
      this.unloadAvatar();
      for (const timer of this.timers) { this.env.clearTimeout(timer); counters.timers--; } this.timers.clear();
      for (const [target, type, handler, options] of this.listeners) { target?.removeEventListener?.(type, handler, options); counters.listeners--; } this.listeners.length = 0;
      this.scene?.traverse?.(object => { object.geometry?.dispose?.(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(material => { if (!material) return; for (const value of Object.values(material)) if (value?.isTexture) value.dispose(); material.dispose?.(); }); });
      this.renderer?.renderLists?.dispose?.(); this.renderer?.dispose?.(); this.renderer?.forceContextLoss?.();
      if (this.canvas?.parentNode) { this.canvas.parentNode.removeChild(this.canvas); counters.canvases--; }
      this.renderer = this.scene = this.camera = this.mesh = this.canvas = this.THREE = null;
      if (this.counted) { counters.activeSessions--; this.counted = false; } this.state = "disposed";
    }
  }
  function createMotionSession(options) { return new DisposableMotionSession(options); }
  return Object.freeze({ STATES, DisposableMotionSession, createMotionSession, calculateCameraFit, diagnostics: snapshot });
});
