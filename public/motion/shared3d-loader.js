(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTShared3DLoader = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (globalScope) {
  "use strict";

  const THREE_MODULE_URL = "/vendor/three/build/three.module.js";
  const GLTF_LOADER_MODULE_URL = "/vendor/three/examples/jsm/loaders/GLTFLoader.js";

  function probeCapability(environment = globalScope) {
    if (!environment?.document?.createElement || typeof environment.AbortController !== "function" || typeof environment.requestAnimationFrame !== "function") {
      return Object.freeze({ supported: false, webgl: false, reason: "required_api_unavailable" });
    }
    try {
      const canvas = environment.document.createElement("canvas");
      const webgl = Boolean(canvas.getContext?.("webgl2") || canvas.getContext?.("webgl"));
      return Object.freeze({ supported: webgl, webgl, reason: webgl ? null : "webgl_unavailable" });
    } catch (_) {
      return Object.freeze({ supported: false, webgl: false, reason: "webgl_unavailable" });
    }
  }

  function cacheBust(url) {
    const separator = String(url).includes("?") ? "&" : "?";
    return `${url}${separator}motion_lab_retry=${Date.now()}`;
  }

  async function importLocalModule(url, options = {}) {
    const importer = options.importModule || (value => import(value));
    try {
      return await importer(url);
    } catch (firstError) {
      // Tests/custom importers remain deterministic. Browser imports receive one
      // bounded cache-busted retry to recover stale Safari/CDN module failures.
      if (options.importModule || options.retryOnFailure === false) throw firstError;
      const retryUrl = cacheBust(url);
      try {
        return await importer(retryUrl);
      } catch (retryError) {
        retryError.firstAttempt = firstError;
        retryError.attemptedUrls = Object.freeze([url, retryUrl]);
        throw retryError;
      }
    }
  }

  async function loadThree(options = {}) {
    if (options.signal?.aborted) throw Object.assign(new Error("Motion session aborted"), { code: "session_aborted" });
    const moduleUrl = options.moduleUrl || THREE_MODULE_URL;
    try {
      // Deliberately no cached promise: every session receives a fresh bounded attempt.
      const imported = await importLocalModule(moduleUrl, options);
      if (options.signal?.aborted) throw Object.assign(new Error("Motion session aborted"), { code: "session_aborted" });
      if (!imported?.WebGLRenderer) throw new Error("Three.js exports unavailable");
      return imported;
    } catch (error) {
      if (error?.code === "session_aborted") throw error;
      throw Object.assign(new Error("Local 3D dependency could not be loaded"), {
        code: "dependency_load_failed",
        dependency: "three",
        moduleUrl,
        attemptedUrls: error?.attemptedUrls || Object.freeze([moduleUrl]),
        cause: error
      });
    }
  }

  async function loadGLTFLoader(options = {}) {
    if (options.signal?.aborted) throw Object.assign(new Error("Motion session aborted"), { code: "session_aborted" });
    const moduleUrl = options.moduleUrl || GLTF_LOADER_MODULE_URL;
    try {
      const imported = await importLocalModule(moduleUrl, options);
      if (options.signal?.aborted) throw Object.assign(new Error("Motion session aborted"), { code: "session_aborted" });
      if (typeof imported?.GLTFLoader !== "function") throw new Error("GLTFLoader export unavailable");
      return imported.GLTFLoader;
    } catch (error) {
      if (error?.code === "session_aborted") throw error;
      throw Object.assign(new Error("Local GLTF loader could not be loaded"), {
        code: "gltf_loader_failed",
        dependency: "gltf_loader",
        moduleUrl,
        attemptedUrls: error?.attemptedUrls || Object.freeze([moduleUrl]),
        cause: error
      });
    }
  }

  return Object.freeze({ THREE_MODULE_URL, GLTF_LOADER_MODULE_URL, probeCapability, loadThree, loadGLTFLoader, _cacheBust: cacheBust, _importLocalModule: importLocalModule });
});
