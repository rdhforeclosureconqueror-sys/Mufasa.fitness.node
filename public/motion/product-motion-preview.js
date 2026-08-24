(function (root, factory) {
  const session = typeof module === "object" && module.exports ? require("./disposable-motion-session") : root.PocketPTDisposableMotionSession;
  const api = factory(session, root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ProductMotionPreview = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (DisposableMotionSession, globalScope) {
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
  // Product avatar URL resolution
  // Resolves the avatar path against the canonical backend origin using the
  // established MaatApiClient helper (api-client.js).  Falls back to the
  // runtime config or the hard-coded production backend so it always produces
  // an absolute URL regardless of which frontend host serves the page.
  // ---------------------------------------------------------------------------
  function resolveProductAvatarUrl(scope) {
    const avatarPath = PRODUCT_AVATAR_RECORD.assetUrl;
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

        // 3. Create exactly one DisposableMotionSession.
        const env = options.environment || globalScope;

        // In production (no test loader override), resolve the avatar to an
        // absolute backend URL and wrap the loader so it carries the auth header.
        // In test mode options.loader is provided and used as-is; runtimeAvatarRecord
        // keeps the relative URL that test harnesses expect.
        let sessionLoader = options.loader;
        let runtimeAvatarRecord = avatarRecord;
        if (!options.loader) {
          const avatarAbsoluteUrl = resolveProductAvatarUrl(env);
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
    _productStates: PRODUCT_STATES,
    _resolveProductAvatarUrl: resolveProductAvatarUrl,
    _buildAuthenticatedProductLoader: buildAuthenticatedProductLoader
  });
});
