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
      this.avatar = null; this.avatarAsset = null; this.avatarProfile = null; this.avatarLoadVersion = 0; this.animationFixture = null; this.nativeSourceClip = null; this.sessionClip = null; this.motionSpec = null; this.motionDiagnostics = null; this.mixer = null; this.action = null; this.clock = null; this.loop = true;
      this.counted = true; counters.activeSessions++;
    }
    diagnostic(event, detail = {}) { try { this.options.onDiagnostic?.(Object.freeze({ event, ...detail })); } catch (_) {} }
    addListener(target, type, handler, options) { target?.addEventListener?.(type, handler, options); this.listeners.push([target, type, handler, options]); counters.listeners++; }
    failure(code, cause) { return Object.freeze({ status: "failed", code, cause: cause ? String(cause.message || cause) : null }); }
    async start(container) {
      if (this.state !== "created") return this.failure(this.state === "disposed" ? "session_aborted" : "runtime_failed");
      this.state = "initializing";
      const capability = (this.options.probeCapability || this.loader.probeCapability)(this.env);
      if (!capability.supported) { this.diagnostic("preview_capability_failed", { code: capability.reason || "unsupported" }); return this.fail(capability.reason === "webgl_unavailable" ? "unsupported" : capability.reason); }
      this.diagnostic("capability_pass");
      try {
        const THREE = await this.loader.loadThree({ signal: this.controller.signal, importModule: this.options.importModule });
        this.THREE = THREE;
        this.diagnostic("three_loaded");
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
        this.diagnostic("session_started");
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
    async loadAsset(path, kind = "asset") {
      if (this.state !== "running") return this.failure("runtime_failed");
      try {
        this.diagnostic(kind === "avatar" ? "avatar_fetch_started" : "fixture_fetch_started");
        const Loader = await this.loader.loadGLTFLoader({ signal: this.controller.signal, importModule: this.options.importModule });
        this.diagnostic("gltf_loader_loaded", { asset: kind });
        const asset = await new Loader().loadAsync(path);
        if (this.controller.signal.aborted) return this.failure("session_aborted");
        return asset;
      } catch (error) {
        if (this.controller.signal.aborted || error?.code === "session_aborted") return this.failure("session_aborted");
        const status = Number(error?.target?.status || error?.status);
        return this.failure(status === 404 || error?.code === "asset_missing" ? "asset_missing" : status >= 400 ? "asset_route_failed" : error?.code || "asset_load_failed", error);
      }
    }
    inspectAvatar(asset, profile) {
      const bones = [], meshes = [], skinnedMeshes = [], materials = new Set(), textures = new Set(); let nodeCount = 0;
      asset.scene?.traverse?.(object => {
        nodeCount++; if (object.isBone) bones.push(object.name || "(unnamed)");
        if (object.isMesh) meshes.push(object.name || "(unnamed)");
        if (object.isSkinnedMesh) skinnedMeshes.push(object.name || "(unnamed)");
        const ownedMaterials = Array.isArray(object.material) ? object.material : [object.material];
        ownedMaterials.forEach(material => { if (!material) return; materials.add(material); Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); }); });
      });
      const animations = (asset.animations || []).map(clip => { const tracks = clip.tracks || [], morphTrackCount = tracks.filter(track => /morphTargetInfluences/.test(track.name)).length; return Object.freeze({ name: clip.name || "(unnamed)", duration: clip.duration, trackCount: tracks.length, skeletalTrackCount: tracks.length - morphTrackCount, morphTrackCount }); });
      const rawNames = (asset.parser?.json?.nodes || []).map(node => node.name).filter(Boolean), loadedNames = new Set(); asset.scene?.traverse?.(object => { if (object.name) loadedNames.add(object.name); });
      const sanitizedNameCount = rawNames.filter(name => !loadedNames.has(name)).length;
      const skeletonRoot = bones.find(name => { let found; asset.scene?.traverse?.(object => { if (object.name === name) found = object; }); return found && !found.parent?.isBone; }) || bones[0] || null;
      return Object.freeze({ avatarProfileId: profile?.avatarId || null, sourceAsset: profile?.source || null, assetUrl: profile?.assetUrl || null, rootName: asset.scene?.name || "(unnamed)", skeletonRoot, nodeCount, meshCount: meshes.length, meshes: Object.freeze(meshes), boneCount: bones.length, jointCount: bones.length, boneNames: Object.freeze(bones), boneNameSample: Object.freeze(bones.slice(0, 12)), skinnedMeshCount: skinnedMeshes.length, skinnedMeshes: Object.freeze(skinnedMeshes), skinCount: asset.parser?.json?.skins?.length ?? (skinnedMeshes.length ? 1 : 0), materialCount: materials.size, textureCount: textures.size, animationCount: animations.length, animations: Object.freeze(animations), nameNormalization: Object.freeze({ rawNameCount: rawNames.length, sanitizedNameCount, rule: "Three.js PropertyBinding removes reserved [] . : / characters and replaces whitespace with underscores" }) });
    }
    frameAvatar(root) {
      root?.updateMatrixWorld?.(true);
      const bounds = new this.THREE.Box3().setFromObject(root), size = bounds.getSize(new this.THREE.Vector3()), center = bounds.getCenter(new this.THREE.Vector3());
      if (![size.x, size.y, size.z, center.x, center.y, center.z].every(Number.isFinite) || size.y <= 0) return null;
      const fit = calculateCameraFit(size, center, this.camera.aspect, this.camera.fov, 1.2);
      this.camera.position.set(fit.center.x, fit.center.y, fit.center.z + fit.distance); this.camera.near = fit.near; this.camera.far = fit.far;
      this.camera.lookAt(fit.center.x, fit.center.y, fit.center.z); this.camera.updateProjectionMatrix(); return fit;
    }
    disposeObjectResources(root) {
      const geometries = new Set(), materials = new Set(), textures = new Set();
      root?.traverse?.(object => { if (object.geometry) geometries.add(object.geometry); const values = Array.isArray(object.material) ? object.material : [object.material]; values.forEach(material => { if (!material) return; materials.add(material); Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); }); }); });
      textures.forEach(texture => texture.dispose?.()); materials.forEach(material => material.dispose?.()); geometries.forEach(geometry => geometry.dispose?.());
      return Object.freeze({ geometries: geometries.size, materials: materials.size, textures: textures.size });
    }
    async loadAvatar(profileOrPath) {
      this.unloadAvatar(); const version = this.avatarLoadVersion, profile = typeof profileOrPath === "string" ? Object.freeze({ avatarId: "legacy-path", source: profileOrPath, assetUrl: profileOrPath }) : profileOrPath;
      if (!profile?.assetUrl || profile.developmentOnly === false) return this.failure("avatar_profile_invalid");
      const asset = await this.loadAsset(profile.assetUrl, "avatar"); if (asset?.status === "failed") return asset;
      if (version !== this.avatarLoadVersion) { this.disposeObjectResources(asset.scene); return this.failure("avatar_load_superseded"); }
      const diagnostics = this.inspectAvatar(asset, profile);
      if (!diagnostics.boneCount || !diagnostics.skinnedMeshCount) { this.disposeObjectResources(asset.scene); return this.failure("avatar_invalid"); }
      this.avatarAsset = asset; this.avatarProfile = profile; this.avatar = asset.scene; this.scene.add(this.avatar); this.mesh.visible = false; const cameraFit = this.frameAvatar(this.avatar);
      this.mixer = new this.THREE.AnimationMixer(this.avatar); this.clock = new this.THREE.Clock();
      this.diagnostic("avatar_loaded");
      const box = cameraFit ? Object.freeze({ center: cameraFit.center, dimensions: Object.freeze({ ...new this.THREE.Box3().setFromObject(this.avatar).getSize(new this.THREE.Vector3()) }) }) : null;
      return Object.freeze({ status: "ready", diagnostics: Object.freeze({ ...diagnostics, boundingBox: box, cameraFit }) });
    }
    async loadAnimation(path) {
      if (!this.avatar || !this.mixer) return this.failure("avatar_required");
      if (this.avatarProfile?.avatarId === "avaturn-personalized-candidate") return this.failure("incompatible_avatar_profile");
      const asset = await this.loadAsset(path); if (asset?.status === "failed") return asset;
      const clip = asset.animations?.[0]; if (!clip) return this.failure("animation_missing");
      this.unloadMotion(); this.animationFixture = asset; this.sessionClip = clip; this.action = this.mixer.clipAction(clip, this.avatar); this.setLoop(this.loop);
      const bones = new Set(this.inspectAvatar({ scene: this.avatar, animations: [] }, this.avatarProfile).boneNames);
      const tracks = clip.tracks || [], unboundTracks = tracks.map(track => track.name.split(".")[0]).filter(name => !bones.has(name));
      return Object.freeze({ status: "ready", diagnostics: Object.freeze({ clipName: clip.name || "(unnamed)", duration: clip.duration, trackCount: tracks.length, unboundTrackCount: unboundTracks.length, unboundTracks: Object.freeze(unboundTracks) }) });
    }
    inspectClipBindings(clip) {
      const tracks = clip?.tracks || [], unboundTracks = [];
      for (const track of tracks) {
        let target = null, propertyName = null, parsedAvailable = false;
        try {
          const parsed = this.THREE.PropertyBinding?.parseTrackName?.(track.name);
          parsedAvailable = Boolean(parsed);
          propertyName = parsed?.propertyName || null;
          target = parsed && this.THREE.PropertyBinding.findNode(this.avatar, parsed.nodeName);
          if (target && propertyName && !(propertyName in target)) target = null;
        } catch (_) { target = null; }
        if (!target && !parsedAvailable) {
          const nodeName = track.name.slice(0, track.name.lastIndexOf("."));
          this.avatar?.traverse?.(object => { if (!target && object.name === nodeName) target = object; });
        }
        if (!target) unboundTracks.push(track.name);
      }
      return Object.freeze({ boundTrackCount: tracks.length - unboundTracks.length, unboundTrackCount: unboundTracks.length, unboundTracks: Object.freeze(unboundTracks) });
    }
    async loadExtractedAnimation(fixture) {
      if (!this.avatar || !this.mixer) return this.failure("avatar_required");
      if (!fixture?.developmentOnly || this.avatarProfile?.avatarId !== fixture.compatibleAvatarProfile || this.avatarProfile?.skeletonProfile !== fixture.skeletonProfile) return this.failure("retarget_required");
      const asset = await this.loadAsset(fixture.assetUrl, "fixture"); if (asset?.status === "failed") return asset;
      const clip = asset.animations?.find(candidate => candidate.name === fixture.clipName);
      if (!clip) return this.failure("animation_missing");
      const binding = this.inspectClipBindings(clip), tracks = clip.tracks || [];
      if (!Number.isInteger(fixture.expectedTrackCount) || tracks.length !== fixture.expectedTrackCount) { this.disposeObjectResources(asset.scene); return this.failure("animation_track_count_invalid", `expected ${fixture.expectedTrackCount}, found ${tracks.length}`); }
      if (binding.unboundTrackCount) { this.disposeObjectResources(asset.scene); return this.failure("animation_binding_failed", binding.unboundTracks.join(", ")); }
      this.unloadMotion(); this.animationFixture = asset; this.sessionClip = clip; this.action = this.mixer.clipAction(clip, this.avatar); this.setLoop(this.loop);
      this.diagnostic("fixture_loaded");
      return Object.freeze({ status: "ready", diagnostics: Object.freeze({ motionId: fixture.motionId, fixtureId: fixture.fixtureId,
        skeletonProfile: fixture.skeletonProfile, avatarProfileId: this.avatarProfile.avatarId, animationSource: "extracted-independent-push-up-fixture", bindingMode: "NATIVE",
        clipName: clip.name, duration: clip.duration, trackCount: tracks.length, intendedTrackCount: fixture.expectedTrackCount, ...binding, playbackState: "ready" }) });
    }
    loadNativeAnimation(mode = "full") {
      if (!this.avatar || !this.mixer || !this.avatarAsset) return this.failure("avatar_required");
      if (this.avatarProfile?.avatarId !== "avaturn-personalized-candidate") return this.failure("native_animation_incompatible_profile");
      const sourceClip = this.avatarAsset.animations?.find(clip => clip.name === "avaturn_animation") || this.avatarAsset.animations?.[0];
      if (!sourceClip) return this.failure("animation_missing");
      if (mode !== "full" && mode !== "body-window") return this.failure("playback_mode_invalid");
      this.unloadMotion();
      this.nativeSourceClip = sourceClip;
      this.sessionClip = sourceClip;
      if (mode === "body-window") {
        this.sessionClip = sourceClip.clone();
        this.sessionClip.duration = 1.533333;
        this.sessionClip.trim();
        this.sessionClip.name = sourceClip.name + " [body-motion-window]";
      }
      const binding = this.inspectClipBindings(this.sessionClip), tracks = this.sessionClip.tracks || [];
      const morphTrackCount = tracks.filter(track => /morphTargetInfluences/.test(track.name)).length;
      this.action = this.mixer.clipAction(this.sessionClip, this.avatar); this.setLoop(this.loop);
      return Object.freeze({ status: "ready", diagnostics: Object.freeze({
        avatarProfileId: this.avatarProfile.avatarId, animationSource: "native-embedded-avaturn", bindingMode: "NATIVE",
        clipName: sourceClip.name || "(unnamed)", sourceDuration: sourceClip.duration, activePlaybackRange: mode === "full" ? Object.freeze({ start: 0, end: sourceClip.duration, mode: "FULL SOURCE CLIP" }) : Object.freeze({ start: 0, end: 1.533333, mode: "BODY-MOTION WINDOW" }),
        trackCount: tracks.length, skeletalTrackCount: tracks.length - morphTrackCount, morphTrackCount, ...binding
      }) });
    }
    loadMotionSpec(spec, compiler) {
      if (!this.avatar || !this.mixer) return this.failure("avatar_required");
      const built = compiler?.compile?.(this.THREE, spec, this.avatar); if (!built || built.status !== "ready") return built || this.failure("motion_compile_failed");
      this.unloadMotion(); this.motionSpec = spec; this.motionDiagnostics = built.diagnostics; this.sessionClip = built.clip; this.action = this.mixer.clipAction(built.clip, this.avatar); this.setLoop(this.loop);
      return Object.freeze({ status: "ready", diagnostics: Object.freeze({ ...built.diagnostics, clipName: built.clip.name, clipDuration: built.clip.duration }) });
    }
    unloadMotion() { this.stop(); if (this.action && this.mixer && this.sessionClip) this.mixer.uncacheAction?.(this.sessionClip, this.avatar); this.action = null; this.animationFixture = null; this.nativeSourceClip = null; this.sessionClip = null; this.motionSpec = null; this.motionDiagnostics = null; return { status: "ready" }; }
    currentMotionPhase() { if (!this.motionSpec || !this.action) return null; const duration = this.motionSpec.durationSeconds, normalized = duration > 0 ? Math.max(0, Math.min(1, Number(this.action.time || 0) / duration)) : 0; return this.motionSpec.phases.slice().reverse().find(phase => normalized >= phase.normalizedTime)?.id || this.motionSpec.phases[0]?.id || null; }
    unloadAvatar() { this.avatarLoadVersion++; this.unloadMotion(); if (this.avatar) { this.scene?.remove?.(this.avatar); this.disposeObjectResources(this.avatar); } this.avatar = this.avatarAsset = this.avatarProfile = this.mixer = this.clock = null; if (this.mesh) this.mesh.visible = true; return { status: "ready" }; }
    play() { if (!this.action) return this.failure("animation_required"); this.action.paused = false; this.action.play(); return { status: "playing" }; }
    pause() { if (!this.action) return this.failure("animation_required"); this.action.paused = true; return { status: "paused" }; }
    resume() { return this.play(); }
    stop() { this.action?.stop?.(); this.mixer?.stopAllAction?.(); return { status: "stopped" }; }
    restart() { if (!this.action) return this.failure("animation_required"); this.action.reset(); return this.play(); }
    setLoop(enabled) { this.loop = Boolean(enabled); if (this.action) this.action.setLoop(this.loop ? this.THREE.LoopRepeat : this.THREE.LoopOnce, this.loop ? Infinity : 1); return { status: "ready", loop: this.loop }; }
    playbackDiagnostics() { return Object.freeze({ state: !this.action ? "unloaded" : this.action.paused ? "paused" : this.action.isRunning?.() ? "playing" : "ready", loop: this.loop, currentTime: Number(this.action?.time || 0) }); }
    ownershipDiagnostics() { return Object.freeze({ actions: this.action ? 1 : 0, mixers: this.mixer ? 1 : 0, avatarRoots: this.avatar ? 1 : 0, gltfAssetReferences: (this.avatarAsset ? 1 : 0) + (this.animationFixture ? 1 : 0), clipsOwnedBySession: this.sessionClip && this.sessionClip !== this.nativeSourceClip ? 1 : 0, sceneAvatarObjects: this.avatar && this.scene?.children?.includes?.(this.avatar) ? 1 : 0, pendingRequests: this.state === "initializing" ? 1 : 0 }); }
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
