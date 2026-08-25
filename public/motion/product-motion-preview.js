(function (root, factory) {
  const session = typeof module === "object" && module.exports ? require("./disposable-motion-session") : root.PocketPTDisposableMotionSession;
  const camera = typeof module === "object" && module.exports ? require("./product-motion-camera") : root.ProductMotionCamera;
  const registry = typeof module === "object" && module.exports ? require("./registry/motion-registry") : root.PocketPTMotionRegistry;
  const api = factory(session, camera, registry, root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ProductMotionPreview = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (DisposableMotionSession, ProductMotionCamera, MotionRegistry, globalScope) {
  "use strict";

  // Product states exposed to the page. Internal Motion Lab vocabulary is not leaked.
  const PRODUCT_STATES = Object.freeze(["idle", "loading", "ready", "playing", "paused", "failed", "disposed"]);

  // ---------------------------------------------------------------------------
  // Product avatar URL resolution
  // Resolves the avatar path against the canonical backend origin using the
  // established MaatApiClient helper (api-client.js).  Falls back to the
  // runtime config or the hard-coded production backend so it always produces
  // an absolute URL regardless of which frontend host serves the page.
  // ---------------------------------------------------------------------------
  function resolveProductAvatarUrl(scope, avatarRecord) {
    const avatarPath = avatarRecord.assetUrl;
    if (typeof scope.MaatApiClient?.resolve === "function") {
      return scope.MaatApiClient.resolve(avatarPath);
    }
    const backend = scope.MAAT_BACKEND_ORIGIN
      || scope.__MAAT_RUNTIME_CONFIG__?.backendOrigin
      || "https://mufasa-fitness-node.onrender.com";
    return new URL(avatarPath, backend + "/").href;
  }

  // ---------------------------------------------------------------------------
  // Authenticated product loader
  // Wraps a base loader so that the member-gated avatar GLB is retrieved with
  // an Authorization: ****** (using AuthStateRuntime — the established
  // frontend→backend auth mechanism) and then parsed from the ArrayBuffer.
  // The animation fixture and all other assets continue through the base loader
  // unchanged: the fixture is served from the public static route and requires
  // no authentication.
  // SECURITY: the bearer token is never written to any diagnostic event.
  // ---------------------------------------------------------------------------
  function buildAuthenticatedProductLoader(baseLoader, avatarAbsoluteUrl, tokenFn, diagnosticFn, fetchFn) {
    return {
      probeCapability: baseLoader.probeCapability,
      loadThree: (opts) => baseLoader.loadThree(opts),
      loadGLTFLoader: async (opts) => {
        const BaseLoader = await baseLoader.loadGLTFLoader(opts);
        return class ProductGLTFLoader extends BaseLoader {
          async loadAsync(url, onProgress) {
            if (url !== avatarAbsoluteUrl) {
              return super.loadAsync(url, onProgress);
            }
            // Authenticated fetch for the gated avatar asset.
            const token = tokenFn();
            const headers = {};
            if (token) headers["Authorization"] = "Bearer " + token;
            let response;
            try {
              response = await fetchFn(url, { method: "GET", headers, credentials: "omit", cache: "no-store" });
            } catch (networkError) {
              diagnosticFn("avatar_fetch_failed", { code: "network_error" });
              throw networkError;
            }
            if (!response.ok) {
              diagnosticFn("avatar_fetch_failed", { code: "http_" + response.status, httpStatus: response.status });
              throw Object.assign(
                new Error("Avatar asset fetch failed: " + response.status),
                { target: { status: response.status }, status: response.status }
              );
            }
            diagnosticFn("avatar_fetch_pass", {});
            let buffer;
            try {
              buffer = await response.arrayBuffer();
            } catch (bufferError) {
              diagnosticFn("avatar_fetch_failed", { code: "buffer_error" });
              throw bufferError;
            }
            // Parse the GLB from the ArrayBuffer; use parseAsync when available.
            let result;
            if (typeof this.parseAsync === "function") {
              result = await this.parseAsync(buffer, "");
            } else {
              result = await new Promise((resolve, reject) => {
                this.parse(buffer, "", resolve, reject);
              });
            }
            diagnosticFn("avatar_parse_pass", {});
            return result;
          }
        };
      }
    };
  }

  // ---------------------------------------------------------------------------
  // ProductMotionPreview
  // ---------------------------------------------------------------------------

  function create(options) {
    if (!options || !options.container) throw new TypeError("ProductMotionPreview.create: container is required");

    const container = options.container;
    const defaultExercise = MotionRegistry.resolveDefaultExercise();
    const exerciseId = options.exerciseId || defaultExercise.exerciseId;
    const avatarProfileId = options.avatarProfileId || defaultExercise.avatarProfileId;
    const autoplay = options.autoplay !== false;
    const onStatus = typeof options.onStatus === "function" ? options.onStatus : () => {};
    const onError = typeof options.onError === "function" ? options.onError : () => {};
    const onDiagnostic = typeof options.onDiagnostic === "function" ? options.onDiagnostic : () => {};

    // No rendering, no network side-effects at create time.
    let status = "idle";
    let session = null;
    let viewController = null;
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
        const resolved = MotionRegistry.resolveExerciseMotion(exerciseId, avatarProfileId);
        if (options.motionId && options.motionId !== resolved.motion.motionId) throw Object.assign(new Error("Requested motion does not match exercise registry"), { code: "unknown_motion" });
        if (options.fixtureId && options.fixtureId !== resolved.fixture.fixtureId) throw Object.assign(new Error("Requested fixture does not match motion registry"), { code: "unknown_fixture" });
        const { avatar: avatarRecord, fixture: fixtureRecord, exercise } = resolved;
        const loop = options.loop === undefined ? exercise.loop : options.loop !== false;
        const cameraPreset = options.cameraPreset || exercise.cameraPreset;
        const expectedBindings = Object.freeze({ intended: fixtureRecord.expectedTrackCount, bound: fixtureRecord.expectedBoundTrackCount, unbound: fixtureRecord.expectedUnboundTrackCount });
        diagnostic("avatar_record_resolved");
        diagnostic("fixture_record_resolved");

        // 3. Create exactly one DisposableMotionSession with an authenticated loader.
        // The product loader intercepts the member-gated avatar URL and fetches it
        // using the bearer token from AuthStateRuntime before parsing via GLTFLoader.
        const env = options.environment || globalScope;

        // In production (no test loader override), resolve the avatar to an
        // absolute backend URL and wrap the loader so it carries the auth header.
        // In test mode options.loader is provided and used as-is; runtimeAvatarRecord
        // keeps the relative URL that test harnesses expect.
        let sessionLoader = options.loader;
        let runtimeAvatarRecord = avatarRecord;
        if (!options.loader) {
          const avatarAbsoluteUrl = resolveProductAvatarUrl(env, avatarRecord);
          runtimeAvatarRecord = Object.freeze({ ...avatarRecord, assetUrl: avatarAbsoluteUrl });
          const baseLoader = env.PocketPTShared3DLoader;
          if (baseLoader) {
            const tokenFn = () => (env.AuthStateRuntime?.getAuthToken?.() || null);
            const fetchFn = env.fetch || (typeof fetch !== "undefined" ? fetch : null);
            if (fetchFn) {
              sessionLoader = buildAuthenticatedProductLoader(baseLoader, avatarAbsoluteUrl, tokenFn, diagnostic, fetchFn);
            }
          }
        }

        session = DisposableMotionSession.createMotionSession({
          environment: env,
          importModule: options.importModule,
          probeCapability: options.probeCapability,
          createRenderer: options.createRenderer,
          loader: sessionLoader,
          showProbe: false,
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
        const avatarResult = await session.loadAvatar(runtimeAvatarRecord);
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

        // 8. Sample the complete clip once and orbit around its world-space envelope.
        const animatedBounds = ProductMotionCamera.sampleAnimatedBounds(session, { samples: options.boundsSamples || 17 });
        viewController = ProductMotionCamera.createViewController({ session, bounds: animatedBounds, container, initialPreset: cameraPreset === "exercise-side" ? "side" : cameraPreset, environment: env, onDiagnostic: diagnostic });
        diagnostic("animated_bounds_sampled", { sampleCount: animatedBounds.sampleCount });
        diagnostic("framing_applied");

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
        if (viewController) { try { viewController.dispose(); } catch (_) {} viewController = null; }
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

    function setView(preset) { return !disposed && viewController ? viewController.setPreset(preset) : false; }
    function resetView() { return !disposed && viewController ? viewController.reset() : false; }

    function dispose() {
      if (disposed) return;
      disposed = true;
      mounted = false;
      mountGeneration++;
      if (viewController) { try { viewController.dispose(); } catch (_) {} viewController = null; }
      if (session) { try { session.dispose(); } catch (_) {} session = null; }
      emitStatus("disposed");
    }

    function getStatus() { return status; }

    return Object.freeze({ mount, play, pause, resume, setView, resetView, dispose, getStatus });
  }

  // Expose internals for testing only.
  return Object.freeze({
    create,
    _registry: MotionRegistry,
    _productStates: PRODUCT_STATES,
    _resolveProductAvatarUrl: resolveProductAvatarUrl,
    _buildAuthenticatedProductLoader: buildAuthenticatedProductLoader
  });
});
