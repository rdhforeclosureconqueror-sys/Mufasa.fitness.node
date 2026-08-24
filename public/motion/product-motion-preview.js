(function (root, factory) {
  const session = typeof module === "object" && module.exports ? require("./disposable-motion-session") : root.PocketPTDisposableMotionSession;
  const sharedLoader = typeof module === "object" && module.exports ? require("./shared3d-loader") : root.PocketPTShared3DLoader;
  const api = factory(session, sharedLoader, root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ProductMotionPreview = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (DisposableMotionSession, defaultSharedLoader, globalScope) {
  "use strict";

  // ---------------------------------------------------------------------------
  // Product-safe asset registry records
  // The avatar is served via a member-gated route added for this product path.
  // The fixture is served via the standard public static route.
  // Both records satisfy DisposableMotionSession validation invariants:
  //   loadAvatar:           rejects developmentOnly === false
  //   loadExtractedAnimation: requires developmentOnly truthy
  // ---------------------------------------------------------------------------

  const PRODUCT_AVATAR_RECORD = Object.freeze({
    avatarId: "avaturn-personalized-candidate",
    displayName: "Push-Up Challenge Avatar",
    source: "exercise-generation/source-assets/avaturn/avaturn-push-up-source.glb",
    assetUrl: "/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb",
    skeletonProfile: "avaturn-native-v1",
    status: "product-preview",
    developmentOnly: true // required by DisposableMotionSession.loadExtractedAnimation
  });

  const PRODUCT_FIXTURE_RECORD = Object.freeze({
    fixtureId: "avaturn-push-up-animation",
    motionId: "push_up/avaturn_native_v1",
    assetUrl: "/motion/assets/exercises/push-up/avaturn-push-up-animation.glb",
    clipName: "avaturn_push_up_native_v1",
    skeletonProfile: "avaturn-native-v1",
    compatibleAvatarProfile: "avaturn-personalized-candidate",
    expectedTrackCount: 40,
    developmentOnly: true // required by DisposableMotionSession.loadExtractedAnimation
  });

  // Product states exposed to the page. Internal Motion Lab vocabulary is not leaked.
  const PRODUCT_STATES = Object.freeze(["idle", "loading", "ready", "playing", "paused", "failed", "disposed"]);

  // ---------------------------------------------------------------------------
  // Authenticated product asset loader
  // ---------------------------------------------------------------------------
  // The push-up avatar GLB is served from the canonical backend under requireAuth.
  // GLTFLoader.loadAsync uses a relative URL that resolves to the frontend host and
  // does not attach an Authorization header — so the request never reaches the
  // protected route correctly. buildProductLoader wraps the base loader to perform
  // an authenticated fetch (→ ArrayBuffer → GLTFLoader.parse) for the avatar URL,
  // while leaving all other asset paths (i.e. the animation fixture) unchanged.
  // ---------------------------------------------------------------------------

  const PRODUCTION_BACKEND_ORIGIN = "https://mufasa-fitness-node.onrender.com";

  function resolveProductBackendOrigin(env) {
    const configured = env.RuntimeState?.getBackendOrigin?.()
      || env.MAAT_BACKEND_ORIGIN
      || env.__MAAT_RUNTIME_CONFIG__?.backendOrigin
      || PRODUCTION_BACKEND_ORIGIN;
    try { return new URL(configured).origin; } catch (_) { return PRODUCTION_BACKEND_ORIGIN; }
  }

  // buildProductLoader wraps the provided baseLoader.  For the product avatar URL
  // it performs an authenticated fetch using the bearer token supplied by
  // AuthStateRuntime.getAuthToken (the existing PocketPT frontend auth mechanism),
  // then parses the resulting ArrayBuffer through GLTFLoader.parse so no auth header
  // is lost in transit.  All other asset URLs (e.g. the animation fixture) continue
  // through the standard GLTFLoader.loadAsync path unchanged.
  //
  // Injectable seams (all optional — used by tests):
  //   options.fetch          – replaces globalThis.fetch / env.fetch
  //   options.getAuthToken   – replaces window.AuthStateRuntime.getAuthToken()
  //   options.backendOrigin  – overrides resolved backend origin (string or function)
  //
  // If no fetch function is resolvable the loader falls back to super.loadAsync(url)
  // so the existing test harness (which supplies its own loadAsync mock) continues
  // to work without modification.
  function buildProductLoader(baseLoader, options, diagnosticFn) {
    const AVATAR_PATH = PRODUCT_AVATAR_RECORD.assetUrl;

    async function loadGLTFLoader(loaderOptions) {
      const GLTFLoaderClass = await baseLoader.loadGLTFLoader(loaderOptions);
      const env = options.environment || globalScope;
      const signal = loaderOptions?.signal;

      // Resolve fetch, token, and backend origin once per loadAsync invocation.
      const resolveFetch = () => options.fetch || env.fetch || null;
      const resolveToken = () => {
        if (typeof options.getAuthToken === "function") return options.getAuthToken();
        return env.AuthStateRuntime?.getAuthToken?.() || null;
      };
      const resolveOrigin = () => {
        if (typeof options.backendOrigin === "function") return options.backendOrigin();
        if (typeof options.backendOrigin === "string") return options.backendOrigin;
        return resolveProductBackendOrigin(env);
      };

      class ProductGLTFLoader extends GLTFLoaderClass {
        async loadAsync(url, onProgress) {
          if (url !== AVATAR_PATH) {
            // Non-avatar asset (animation fixture): standard load path, unchanged.
            const result = await super.loadAsync(url, onProgress);
            diagnosticFn({ event: "fixture_fetch_pass" });
            return result;
          }

          // Avatar: authenticated fetch → ArrayBuffer → GLTFLoader.parse.
          const fetchFn = resolveFetch();
          if (!fetchFn) {
            // No fetch available in this environment (e.g. isolated test harness):
            // fall through to the base loader's loadAsync so mock data is returned.
            return super.loadAsync(url, onProgress);
          }

          const token = resolveToken();
          const backendOrigin = resolveOrigin();
          const avatarUrl = backendOrigin.replace(/\/+$/, "") + AVATAR_PATH;

          const headers = {};
          if (token) headers["authorization"] = "Bearer " + token;

          let response;
          try {
            response = await fetchFn(avatarUrl, {
              method: "GET",
              headers,
              cache: "no-store",
              signal
            });
          } catch (fetchError) {
            if (signal?.aborted || fetchError?.name === "AbortError") {
              throw Object.assign(new Error("session_aborted"), { code: "session_aborted" });
            }
            diagnosticFn({ event: "avatar_fetch_failed", code: "network_error" });
            throw Object.assign(fetchError, { code: fetchError.code || "asset_load_failed" });
          }

          if (!response.ok) {
            const code = response.status >= 400 ? "asset_route_failed" : "asset_load_failed";
            diagnosticFn({ event: "avatar_fetch_failed", code });
            throw Object.assign(
              new Error("Avatar asset request failed: " + response.status),
              { code, status: response.status, target: { status: response.status } }
            );
          }

          diagnosticFn({ event: "avatar_fetch_pass" });
          const buffer = await response.arrayBuffer();

          const gltf = await new Promise((resolve, reject) => {
            try { this.parse(buffer, "", resolve, reject); }
            catch (parseError) { reject(parseError); }
          });

          diagnosticFn({ event: "avatar_parse_pass" });
          return gltf;
        }
      }

      return ProductGLTFLoader;
    }

    return {
      probeCapability: baseLoader.probeCapability,
      loadThree: (...args) => baseLoader.loadThree(...args),
      loadGLTFLoader
    };
  }

  // Side-view camera preset for exercise previews (applied after avatar is framed).
  function applySideViewCamera(session, preset) {
    if (!session.camera || !session.avatar) return;
    try {
      const THREE = session.THREE;
      if (!THREE) return;
      // Re-derive bounding box and place camera at the right side, slightly elevated.
      const bounds = new THREE.Box3().setFromObject(session.avatar);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      if (!Number.isFinite(size.y) || size.y <= 0) return;
      const fovRad = (session.camera.fov || 50) * Math.PI / 180;
      const aspect = session.camera.aspect || 1;
      const vertDist = (size.y / 2) / Math.tan(fovRad / 2);
      const horizDist = (size.x / 2) / (Math.tan(fovRad / 2) * aspect);
      const distance = Math.max(vertDist, horizDist) * 1.3;
      // Position camera at right side, slightly elevated.
      const elevationRatio = 0.15;
      session.camera.position.set(
        center.x + distance,
        center.y + size.y * elevationRatio,
        center.z
      );
      session.camera.near = Math.max(0.01, distance * 0.1);
      session.camera.far = Math.max(distance * 4, 10);
      session.camera.lookAt(center.x, center.y, center.z);
      session.camera.updateProjectionMatrix();
    } catch (_) {
      // Non-fatal: avatar will remain visible with default framing.
    }
  }

  // ---------------------------------------------------------------------------
  // ProductMotionPreview
  // ---------------------------------------------------------------------------

  function create(options) {
    if (!options || !options.container) throw new TypeError("ProductMotionPreview.create: container is required");

    const container = options.container;
    const avatarProfileId = options.avatarProfileId || "avaturn-personalized-candidate";
    const motionId = options.motionId || "push_up/avaturn_native_v1";
    const fixtureId = options.fixtureId || "avaturn-push-up-animation";
    const autoplay = options.autoplay !== false;
    const loop = options.loop !== false;
    const cameraPreset = options.cameraPreset || "exercise-side";
    const expectedBindings = options.expectedBindings || { intended: 40, bound: 40, unbound: 0 };
    const onStatus = typeof options.onStatus === "function" ? options.onStatus : () => {};
    const onError = typeof options.onError === "function" ? options.onError : () => {};
    const onDiagnostic = typeof options.onDiagnostic === "function" ? options.onDiagnostic : () => {};

    // No rendering, no network side-effects at create time.
    let status = "idle";
    let session = null;
    let mountGeneration = 0;
    let mounted = false;
    let disposed = false;

    function emitStatus(next) {
      status = next;
      try { onStatus(next); } catch (_) {}
    }
    function diagnostic(event, detail = {}) { const entry = typeof event === "object" && event ? event : { event, ...detail }; try { onDiagnostic(Object.freeze(entry)); } catch (_) {} }
    function failureEvent(code) {
      if (code === "unsupported" || code === "webgl_unavailable" || code === "required_api_unavailable") return "preview_capability_failed";
      if (code === "dependency_load_failed" || code === "gltf_loader_failed" || code === "renderer_init_failed") return "preview_dependency_failed";
      if (code === "asset_missing" || code === "asset_route_failed") return session?.avatar ? "preview_fixture_route_failed" : "preview_avatar_route_failed";
      if (code === "avatar_invalid" || code === "avatar_load_failed") return "preview_avatar_load_failed";
      if (code === "animation_missing" || code === "fixture_load_failed") return "preview_fixture_load_failed";
      if (code === "incompatible_pairing" || code === "retarget_required") return "preview_compatibility_failed";
      if (code === "animation_track_count_invalid") return "preview_track_count_failed";
      if (code === "animation_binding_failed" || code === "binding_contract_failed") return "preview_binding_failed";
      if (code === "runtime_failed" || code === "context_lost") return "preview_render_failed";
      return "preview_unknown_failed";
    }
    diagnostic("preview_created");

    function resolveAvatarRecord(profileId) {
      if (profileId === PRODUCT_AVATAR_RECORD.avatarId) return PRODUCT_AVATAR_RECORD;
      return null;
    }

    function resolveFixtureRecord(fId, mId) {
      if (fId === PRODUCT_FIXTURE_RECORD.fixtureId && mId === PRODUCT_FIXTURE_RECORD.motionId) return PRODUCT_FIXTURE_RECORD;
      return null;
    }

    async function mount() {
      diagnostic("preview_mount_started");
      if (disposed) { emitStatus("disposed"); return { ok: false, reason: "disposed" }; }
      if (mounted) return { ok: false, reason: "already_mounted" };
      mounted = true;
      mountGeneration++;
      const generation = mountGeneration;

      emitStatus("loading");

      try {
        // 1. Resolve registry records.
        const avatarRecord = resolveAvatarRecord(avatarProfileId);
        if (!avatarRecord) {
          throw Object.assign(new Error("Unknown avatar profile: " + avatarProfileId), { code: "unknown_avatar_profile" });
        }
        diagnostic("avatar_record_resolved");

        const fixtureRecord = resolveFixtureRecord(fixtureId, motionId);
        if (!fixtureRecord) {
          throw Object.assign(new Error("Unknown fixture or motion ID: " + fixtureId + " / " + motionId), { code: "unknown_fixture" });
        }
        diagnostic("fixture_record_resolved");

        // 2. Validate compatibility before any network request.
        if (
          avatarRecord.skeletonProfile !== fixtureRecord.skeletonProfile ||
          avatarRecord.avatarId !== fixtureRecord.compatibleAvatarProfile
        ) {
          throw Object.assign(
            new Error("Avatar profile and fixture are not compatible"),
            { code: "incompatible_pairing" }
          );
        }

        // 3. Create exactly one DisposableMotionSession with an authenticated loader.
        // The product loader intercepts the member-gated avatar URL and fetches it
        // using the bearer token from AuthStateRuntime before parsing via GLTFLoader.
        const env = options.environment || globalScope;
        const baseLoader = options.loader || defaultSharedLoader;
        const productLoader = buildProductLoader(baseLoader, options, diagnostic);
        session = DisposableMotionSession.createMotionSession({
          environment: env,
          importModule: options.importModule,
          probeCapability: options.probeCapability,
          createRenderer: options.createRenderer,
          loader: productLoader,
          injectFailure: options.injectFailure,
          onDiagnostic: diagnostic
        });

        // 4. Start session (attaches canvas, scene, renderer, RAF).
        const startResult = await session.start(container);
        if (generation !== mountGeneration || disposed) {
          session.dispose();
          session = null;
          return { ok: false, reason: "superseded" };
        }
        if (startResult?.status !== "ready") {
          const code = startResult?.code || "session_start_failed";
          throw Object.assign(new Error("Motion session failed to start: " + code), { code });
        }

        // 5. Load avatar.
        const avatarResult = await session.loadAvatar(avatarRecord);
        if (generation !== mountGeneration || disposed) {
          session.dispose();
          session = null;
          return { ok: false, reason: "superseded" };
        }
        if (avatarResult?.status !== "ready") {
          const code = avatarResult?.code || "avatar_load_failed";
          throw Object.assign(new Error("Avatar load failed: " + code), { code });
        }

        // 6. Load extracted animation fixture.
        const fixtureResult = await session.loadExtractedAnimation(fixtureRecord);
        if (generation !== mountGeneration || disposed) {
          session.dispose();
          session = null;
          return { ok: false, reason: "superseded" };
        }
        if (fixtureResult?.status !== "ready") {
          const code = fixtureResult?.code || "fixture_load_failed";
          throw Object.assign(new Error("Fixture load failed: " + code), { code });
        }

        // 7. Verify binding contract.
        const diag = fixtureResult.diagnostics || {};
        const intendedOk = diag.intendedTrackCount === expectedBindings.intended;
        const boundOk = diag.boundTrackCount === expectedBindings.bound;
        const unboundOk = diag.unboundTrackCount === expectedBindings.unbound;
        if (!intendedOk || !boundOk || !unboundOk) {
          throw Object.assign(
            new Error(
              "Binding contract not met: expected " +
              expectedBindings.intended + "/" + expectedBindings.bound + "/0, got " +
              diag.intendedTrackCount + "/" + diag.boundTrackCount + "/" + diag.unboundTrackCount
            ),
            { code: "binding_contract_failed" }
          );
        }
        diagnostic("bindings_valid");

        // 8. Apply product-safe side-view camera framing.
        if (cameraPreset === "exercise-side") {
          applySideViewCamera(session, cameraPreset);
          diagnostic("framing_applied");
        }

        // 9. Enable loop and autoplay.
        session.setLoop(loop);
        if (autoplay) {
          session.play();
          diagnostic("autoplay_started");
        }

        emitStatus(autoplay ? "playing" : "ready");
        diagnostic("preview_ready");
        return { ok: true };

      } catch (error) {
        if (generation !== mountGeneration || disposed) return { ok: false, reason: "superseded" };
        if (session) { try { session.dispose(); } catch (_) {} session = null; }
        mounted = false;
        emitStatus("failed");
        diagnostic(failureEvent(error?.code), { code: error?.code || "mount_failed" });
        try { onError(error); } catch (_) {}
        return { ok: false, reason: error?.code || "mount_failed", error };
      }
    }

    function play() {
      if (disposed || !session) return;
      try { session.play(); emitStatus("playing"); } catch (_) {}
    }

    function pause() {
      if (disposed || !session) return;
      try { session.pause(); emitStatus("paused"); } catch (_) {}
    }

    function resume() {
      if (disposed || !session) return;
      try { session.play(); emitStatus("playing"); } catch (_) {}
    }

    function dispose() {
      if (disposed) return;
      disposed = true;
      mounted = false;
      mountGeneration++;
      if (session) { try { session.dispose(); } catch (_) {} session = null; }
      emitStatus("disposed");
    }

    function getStatus() { return status; }

    return Object.freeze({ mount, play, pause, resume, dispose, getStatus });
  }

  // Expose internals for testing only.
  return Object.freeze({
    create,
    _productAvatarRecord: PRODUCT_AVATAR_RECORD,
    _productFixtureRecord: PRODUCT_FIXTURE_RECORD,
    _productStates: PRODUCT_STATES
  });
});
