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

  async function loadThree(options = {}) {
    if (options.signal?.aborted) throw Object.assign(new Error("Motion session aborted"), { code: "session_aborted" });
    try {
      // Deliberately no cached promise: every session receives a fresh bounded attempt.
      const imported = await (options.importModule || (url => import(url)))(options.moduleUrl || THREE_MODULE_URL);
      if (options.signal?.aborted) throw Object.assign(new Error("Motion session aborted"), { code: "session_aborted" });
      if (!imported?.WebGLRenderer) throw new Error("Three.js exports unavailable");
      return imported;
    } catch (error) {
      if (error?.code === "session_aborted") throw error;
      throw Object.assign(new Error("Local 3D dependency could not be loaded"), { code: "dependency_load_failed", cause: error });
    }
  }

  async function loadGLTFLoader(options = {}) {
    if (options.signal?.aborted) throw Object.assign(new Error("Motion session aborted"), { code: "session_aborted" });
    try {
      const imported = await (options.importModule || (url => import(url)))(options.moduleUrl || GLTF_LOADER_MODULE_URL);
      if (options.signal?.aborted) throw Object.assign(new Error("Motion session aborted"), { code: "session_aborted" });
      if (typeof imported?.GLTFLoader !== "function") throw new Error("GLTFLoader export unavailable");
      return imported.GLTFLoader;
    } catch (error) {
      if (error?.code === "session_aborted") throw error;
      throw Object.assign(new Error("Local GLTF loader could not be loaded"), { code: "gltf_loader_failed", cause: error });
    }
  }

  return Object.freeze({ THREE_MODULE_URL, GLTF_LOADER_MODULE_URL, probeCapability, loadThree, loadGLTFLoader });
});
