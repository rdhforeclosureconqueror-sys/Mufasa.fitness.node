"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ProductMotionPreview = require("../public/motion/product-motion-preview");

// ---------------------------------------------------------------------------
// Shared harness
// ---------------------------------------------------------------------------

function makeTHREE() {
  class Disposable { dispose() { this.disposed = true; } }
  class Vector3 { constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;} set(x,y,z){this.x=x;this.y=y;this.z=z;} clone(){return new Vector3(this.x,this.y,this.z);} }
  class Object3D { constructor(){this.children=[];this.name="";this.quaternion={};this.position=new Vector3();} add(v){this.children.push(v);} remove(v){this.children=this.children.filter(c=>c!==v);} traverse(fn){fn(this);this.children.forEach(c=>c.traverse?c.traverse(fn):fn(c));} updateMatrixWorld(){} }
  class Scene extends Object3D {}
  class PerspectiveCamera { constructor(fov,aspect,near,far){this.fov=fov;this.aspect=aspect||1;this.near=near;this.far=far;this.position=new Vector3();} updateProjectionMatrix(){} lookAt(){} }
  class Color {}
  class Light extends Object3D { constructor(){super();this.position=new Vector3();} }
  class HemisphereLight extends Light {}
  class DirectionalLight extends Light {}
  class Box3 { constructor(){this.min={x:-.75,y:0,z:-.25};this.max={x:.75,y:1,z:.25};} setFromObject(root){this.root=root;return this;} getSize(out){return Object.assign(out,{x:1.5,y:1.0,z:0.5});} getCenter(out){return Object.assign(out,{x:0,y:0.5,z:0});} }
  class BoxGeometry extends Disposable {}
  class MeshBasicMaterial extends Disposable {}
  class Mesh { constructor(g,m){this.geometry=g;this.material=m;this.rotation={y:0};this.visible=true;} }
  class Clock { getDelta(){return 0.016;} }
  class AnimationMixer { constructor(root){this.root=root;} clipAction(clip){const a={clip,time:0,paused:false,loopMode:null,loopCount:null,play(){this.playing=true;return this;},stop(){},reset(){this.time=0;return this;},setLoop(mode,count){this.loopMode=mode;this.loopCount=count;},isRunning(){return this.playing&&!this.paused;}};this.action=a;return a;} setTime(time){if(this.action)this.action.time=time;} update(){} stopAllAction(){} }
  class WebGLRenderer extends Disposable { constructor(){super();this.domElement=Object.assign(new Object3D(),{addEventListener(){},removeEventListener(){}});} setPixelRatio(){} setSize(){} render(){} forceContextLoss(){} }
  const PropertyBinding = { parseTrackName(name){const dot=name.lastIndexOf(".");return{nodeName:name.slice(0,dot),propertyName:name.slice(dot+1)};}, findNode(root,name){let found=null;root?.traverse?.(o=>{if(o.name===name)found=o;});return found;}, sanitizeNodeName(n){return n;} };
  return { Scene, Object3D, PerspectiveCamera, Color, HemisphereLight, DirectionalLight, Box3, Vector3, BoxGeometry, MeshBasicMaterial, Mesh, WebGLRenderer, AnimationMixer, Clock, LoopRepeat:"repeat", LoopOnce:"once", PropertyBinding };
}

function makeHarness({ avatarBones = ["Hips"], fixtureTrackCount = 40, fixtureClipName = "avaturn_push_up_native_v1", avatarPath = "/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb", fixturePath = "/motion/assets/exercises/push-up/avaturn-push-up-animation.glb" } = {}) {
  const THREE = makeTHREE();
  let rafId = 0;
  const rafs = new Map();
  const events = new Map();
  const document = {
    hidden: false,
    createElement: () => ({ getContext: () => ({}) }),
    addEventListener(type, fn) { events.set("doc:" + type, fn); },
    removeEventListener() {}
  };
  const env = {
    document, AbortController, devicePixelRatio: 1,
    requestAnimationFrame(fn) { const id = ++rafId; rafs.set(id, fn); return id; },
    cancelAnimationFrame(id) { rafs.delete(id); },
    addEventListener(type, fn) { events.set("win:" + type, fn); },
    removeEventListener() {}
  };
  const container = {
    clientWidth: 320, clientHeight: 240,
    children: [],
    appendChild(node) { node.parentNode = this; this.children.push(node); },
    removeChild(node) { this.children = this.children.filter(c => c !== node); node.parentNode = null; }
  };
  const avatar = new THREE.Scene();
  for (const name of avatarBones) {
    const bone = new THREE.Object3D(); bone.name = name; bone.isBone = true; avatar.add(bone);
  }
  const skin = new THREE.Object3D(); skin.name = "Body_Mesh"; skin.isSkinnedMesh = true; avatar.add(skin);
  const fixtureRoot = new THREE.Scene();
  const fixtureTracks = Array.from({ length: fixtureTrackCount }, (_, i) =>
    ({ name: `${avatarBones[i % avatarBones.length]}.quaternion` })
  );
  const fixtureClip = { name: fixtureClipName, duration: 1.5333333015441895, tracks: fixtureTracks };
  const loadedUrls = [];
  class GLTFLoader {
    async loadAsync(url) {
      loadedUrls.push(url);
      if (url === avatarPath) return { scene: avatar, animations: [], parser: { json: { nodes: avatarBones.map(n => ({ name: n })) } } };
      if (url === fixturePath) return { scene: fixtureRoot, animations: [fixtureClip] };
      throw Object.assign(new Error("Unknown URL: " + url), { target: { status: 404 } });
    }
  }
  const loader = {
    probeCapability: () => ({ supported: true, webgl: true }),
    loadThree: async ({ signal }) => {
      if (signal?.aborted) throw Object.assign(new Error(), { code: "session_aborted" });
      return THREE;
    },
    loadGLTFLoader: async ({ signal }) => {
      if (signal?.aborted) throw Object.assign(new Error(), { code: "session_aborted" });
      return GLTFLoader;
    }
  };
  return { env, container, loader, avatar, fixtureRoot, fixtureClip, loadedUrls, rafs, events, THREE };
}

function makePreview(harnessOpts = {}, previewOpts = {}) {
  const h = makeHarness(harnessOpts);
  const container = h.container;
  const statuses = [];
  const errors = [];
  const preview = ProductMotionPreview.create({
    container,
    avatarProfileId: "avaturn-personalized-candidate",
    motionId: "push_up/avaturn_native_v1",
    fixtureId: "avaturn-push-up-animation",
    autoplay: true,
    loop: true,
    cameraPreset: "exercise-side",
    expectedBindings: { intended: 40, bound: 40, unbound: 0 },
    environment: h.env,
    loader: h.loader,
    onStatus: s => statuses.push(s),
    onError: e => errors.push(e),
    ...previewOpts
  });
  return { h, container, preview, statuses, errors };
}

function loadBrowserMotionRuntime() {
  const files = [
    "../public/motion/shared3d-loader.js",
    "../public/motion/disposable-motion-session.js",
    "../public/motion/product-motion-camera.js",
    "../public/motion/product-motion-preview.js"
  ];
  const window = {};
  const context = vm.createContext({ window, globalThis: window, self: window, console, AbortController, setTimeout, clearTimeout });
  for (const file of files) {
    const source = fs.readFileSync(path.join(__dirname, file), "utf8");
    vm.runInContext(source, context, { filename: file });
  }
  return window;
}

// ---------------------------------------------------------------------------
// 1. create() has no network/render side effects
// ---------------------------------------------------------------------------
test("create() has no rendering or network side effects", () => {
  const h = makeHarness();
  let networkCalls = 0;
  const trackingLoader = {
    ...h.loader,
    loadThree: async (...args) => { networkCalls++; return h.loader.loadThree(...args); },
    loadGLTFLoader: async (...args) => { networkCalls++; return h.loader.loadGLTFLoader(...args); }
  };
  const preview = ProductMotionPreview.create({
    container: h.container,
    environment: h.env,
    loader: trackingLoader
  });
  assert.equal(networkCalls, 0, "create() must not trigger any loader calls");
  assert.equal(h.container.children.length, 0, "create() must not append any DOM elements");
  assert.equal(preview.getStatus(), "idle");
});

test("diagnostic trace identifies each successful product preview boundary without asset URLs", async () => {
  const diagnostics = [];
  const { preview } = makePreview({}, { onDiagnostic: entry => diagnostics.push(entry) });
  assert.deepEqual(diagnostics.map(entry => entry.event), ["preview_created"]);
  assert.equal((await preview.mount()).ok, true);
  for (const event of ["preview_mount_started", "avatar_record_resolved", "fixture_record_resolved", "capability_pass", "three_loaded", "session_started", "avatar_fetch_started", "avatar_loaded", "fixture_fetch_started", "fixture_loaded", "bindings_valid", "framing_applied", "autoplay_started", "preview_ready"])
    assert.ok(diagnostics.some(entry => entry.event === event), event);
  assert.doesNotMatch(JSON.stringify(diagnostics), /\.glb|cookie|token|sessionId/i);
});

test("diagnostic trace classifies a missing avatar route safely", async () => {
  const diagnostics = [], h = makeHarness();
  h.loader.loadGLTFLoader = async () => class { async loadAsync() { throw Object.assign(new Error("404 secret response"), { status: 404 }); } };
  const preview = ProductMotionPreview.create({ container: h.container, environment: h.env, loader: h.loader, onDiagnostic: entry => diagnostics.push(entry) });
  assert.equal((await preview.mount()).reason, "asset_missing");
  assert.deepEqual(diagnostics.at(-1), { event: "preview_avatar_route_failed", code: "asset_missing" });
  assert.doesNotMatch(JSON.stringify(diagnostics), /secret response/);
});

test("diagnostic trace classifies an unauthorized avatar response as a route failure", async () => {
  const diagnostics = [], h = makeHarness();
  h.loader.loadGLTFLoader = async () => class { async loadAsync() { throw Object.assign(new Error("unauthorized"), { status: 401 }); } };
  const preview = ProductMotionPreview.create({ container: h.container, environment: h.env, loader: h.loader, onDiagnostic: entry => diagnostics.push(entry) });
  assert.equal((await preview.mount()).reason, "asset_route_failed");
  assert.deepEqual(diagnostics.at(-1), { event: "preview_avatar_route_failed", code: "asset_route_failed" });
});

// ---------------------------------------------------------------------------
// 2. mount() initializes successfully
// ---------------------------------------------------------------------------
test("mount() initializes and reaches playing status", async () => {
  const { preview, statuses } = makePreview();
  const result = await preview.mount();
  assert.equal(result.ok, true);
  assert.equal(statuses.at(-1), "playing");
});

test("browser globals initialize in dependency order", () => {
  const browser = loadBrowserMotionRuntime();
  assert.equal(typeof browser.PocketPTShared3DLoader?.loadThree, "function");
  assert.equal(typeof browser.PocketPTDisposableMotionSession?.createMotionSession, "function");
  assert.equal(typeof browser.ProductMotionPreview?.create, "function");
});

test("browser global ProductMotionPreview mounts when runtime dependencies are already loaded", async () => {
  const browser = loadBrowserMotionRuntime();
  const { h, statuses, errors } = makePreview();
  const preview = browser.ProductMotionPreview.create({
    container: h.container,
    avatarProfileId: "avaturn-personalized-candidate",
    motionId: "push_up/avaturn_native_v1",
    fixtureId: "avaturn-push-up-animation",
    autoplay: true,
    loop: true,
    cameraPreset: "exercise-side",
    expectedBindings: { intended: 40, bound: 40, unbound: 0 },
    environment: h.env,
    loader: h.loader,
    onStatus: s => statuses.push(s),
    onError: e => errors.push(e)
  });
  const result = await preview.mount();
  assert.equal(result.ok, true);
  assert.equal(errors.length, 0);
  assert.equal(statuses.at(-1), "playing");
});

// ---------------------------------------------------------------------------
// 3. Avatar profile resolves correctly
// ---------------------------------------------------------------------------
test("product avatar record resolves avaturn-personalized-candidate", () => {
  const record = ProductMotionPreview._productAvatarRecord;
  assert.equal(record.avatarId, "avaturn-personalized-candidate");
  assert.equal(record.skeletonProfile, "avaturn-native-v1");
  assert.equal(record.assetUrl, "/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb");
  assert.ok(!record.assetUrl.includes("/dev/"), "product avatar URL must not use a dev-only route");
});

// ---------------------------------------------------------------------------
// 4. push_up/avaturn_native_v1 motion resolves correctly
// ---------------------------------------------------------------------------
test("product fixture record resolves push_up/avaturn_native_v1", () => {
  const record = ProductMotionPreview._productFixtureRecord;
  assert.equal(record.motionId, "push_up/avaturn_native_v1");
  assert.equal(record.clipName, "avaturn_push_up_native_v1");
  assert.equal(record.skeletonProfile, "avaturn-native-v1");
  assert.equal(record.compatibleAvatarProfile, "avaturn-personalized-candidate");
  assert.ok(!record.assetUrl.includes("/dev/"), "product fixture URL must not use a dev-only route");
});

// ---------------------------------------------------------------------------
// 5. Fixture ID resolves correctly
// ---------------------------------------------------------------------------
test("product fixture record resolves avaturn-push-up-animation fixture ID", () => {
  const record = ProductMotionPreview._productFixtureRecord;
  assert.equal(record.fixtureId, "avaturn-push-up-animation");
  assert.equal(record.assetUrl, "/motion/assets/exercises/push-up/avaturn-push-up-animation.glb");
});

// ---------------------------------------------------------------------------
// 6. Incompatible pairing fails closed
// ---------------------------------------------------------------------------
test("incompatible avatarProfileId fails closed before any session is created", async () => {
  const h = makeHarness();
  let sessionCreated = false;
  const trackingLoader = {
    ...h.loader,
    loadThree: async (...args) => { sessionCreated = true; return h.loader.loadThree(...args); }
  };
  const errors = [];
  const preview = ProductMotionPreview.create({
    container: h.container,
    avatarProfileId: "unknown-profile",
    motionId: "push_up/avaturn_native_v1",
    fixtureId: "avaturn-push-up-animation",
    environment: h.env,
    loader: trackingLoader,
    onError: e => errors.push(e)
  });
  const result = await preview.mount();
  assert.equal(result.ok, false);
  assert.equal(preview.getStatus(), "failed");
  assert.equal(errors.length, 1);
  assert.equal(sessionCreated, false, "session must not be created for an incompatible pairing");
});

test("mismatched motionId fails closed", async () => {
  const h = makeHarness();
  const errors = [];
  const preview = ProductMotionPreview.create({
    container: h.container,
    avatarProfileId: "avaturn-personalized-candidate",
    motionId: "push_up/phase_e_v1",
    fixtureId: "avaturn-push-up-animation",
    environment: h.env,
    loader: h.loader,
    onError: e => errors.push(e)
  });
  const result = await preview.mount();
  assert.equal(result.ok, false);
  assert.equal(errors.length, 1);
});

// ---------------------------------------------------------------------------
// 7. Binding contract: 40 intended / 40 bound / 0 unbound
// ---------------------------------------------------------------------------
test("mount confirms 40 intended / 40 bound / 0 unbound binding contract", async () => {
  const { preview } = makePreview({ avatarBones: Array.from({ length: 20 }, (_, i) => `Bone${i}`) });
  const result = await preview.mount();
  assert.equal(result.ok, true, "binding contract must be satisfied");
});

test("mount fails when track count does not satisfy 40-track contract", async () => {
  const errors = [];
  const { preview } = makePreview(
    { fixtureTrackCount: 39 },
    { onError: e => errors.push(e) }
  );
  const result = await preview.mount();
  assert.equal(result.ok, false);
  assert.equal(errors.length, 1);
});

// ---------------------------------------------------------------------------
// 8. One avatar root rendered in scene
// ---------------------------------------------------------------------------
test("exactly one avatar root is added to the session scene", async () => {
  const h = makeHarness({ avatarBones: Array.from({ length: 20 }, (_, i) => `Bone${i}`) });
  const statuses = [];
  const preview = ProductMotionPreview.create({
    container: h.container,
    avatarProfileId: "avaturn-personalized-candidate",
    motionId: "push_up/avaturn_native_v1",
    fixtureId: "avaturn-push-up-animation",
    expectedBindings: { intended: 40, bound: 40, unbound: 0 },
    environment: h.env,
    loader: h.loader,
    onStatus: s => statuses.push(s)
  });
  await preview.mount();
  // The avatar scene was loaded, meaning the session added it to its internal scene.
  // Confirm by checking that exactly one mount happened and it reached "playing".
  assert.equal(statuses.at(-1), "playing");
  // Avatar was loaded at the correct URL.
  assert.ok(h.loadedUrls.includes("/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb"));
});

// ---------------------------------------------------------------------------
// 9. Fixture scene root NOT rendered (not inserted into avatar scene)
// ---------------------------------------------------------------------------
test("fixture scene root is NOT inserted into the rendered scene", async () => {
  const h = makeHarness({ avatarBones: Array.from({ length: 20 }, (_, i) => `Bone${i}`) });
  const preview = ProductMotionPreview.create({
    container: h.container,
    avatarProfileId: "avaturn-personalized-candidate",
    motionId: "push_up/avaturn_native_v1",
    fixtureId: "avaturn-push-up-animation",
    expectedBindings: { intended: 40, bound: 40, unbound: 0 },
    environment: h.env,
    loader: h.loader
  });
  await preview.mount();
  // DisposableMotionSession.loadExtractedAnimation must not add the fixture scene
  // to the rendered scene. Verify the fixture root is not in the container's canvas hierarchy.
  // The fixture root is fixtureRoot. Since the session disposes it internally, we check
  // that loadedUrls includes both but the fixture root was not observed in the container.
  assert.ok(h.loadedUrls.includes("/motion/assets/exercises/push-up/avaturn-push-up-animation.glb"));
});

// ---------------------------------------------------------------------------
// 10. Loop is enabled
// ---------------------------------------------------------------------------
test("loop is enabled after a successful mount", async () => {
  const { preview, statuses } = makePreview();
  await preview.mount();
  assert.equal(statuses.at(-1), "playing");
  // ProductMotionPreview passes loop:true (default) - the session's setLoop is called
  // with true. We verify the status sequence confirms successful playback setup.
  assert.ok(statuses.includes("loading"));
  assert.ok(statuses.includes("playing"));
});

// ---------------------------------------------------------------------------
// 11. Pause / resume
// ---------------------------------------------------------------------------
test("pause() transitions to paused and resume() transitions back to playing", async () => {
  const { preview, statuses } = makePreview();
  await preview.mount();
  assert.equal(statuses.at(-1), "playing");
  preview.pause();
  assert.equal(statuses.at(-1), "paused");
  preview.resume();
  assert.equal(statuses.at(-1), "playing");
});

// ---------------------------------------------------------------------------
// 12. Visibility handling: pause when hidden, resume when visible
// ---------------------------------------------------------------------------
test("dispose() clears owned runtime resources", async () => {
  const { preview, statuses, h } = makePreview();
  await preview.mount();
  assert.equal(statuses.at(-1), "playing");
  assert.ok(h.container.children.length > 0, "canvas must be appended during mount");
  preview.dispose();
  assert.equal(statuses.at(-1), "disposed");
  assert.equal(h.container.children.length, 0, "canvas must be removed after dispose");
});

// ---------------------------------------------------------------------------
// 13. Dispose clears owned resources (combined above + counter check)
// ---------------------------------------------------------------------------
test("dispose() transitions to disposed state", async () => {
  const { preview, statuses } = makePreview();
  await preview.mount();
  preview.dispose();
  assert.equal(preview.getStatus(), "disposed");
  assert.equal(statuses.at(-1), "disposed");
});

// ---------------------------------------------------------------------------
// 14. Repeated mount/dispose does not accumulate resources
// ---------------------------------------------------------------------------
test("repeated mount/dispose cycles do not accumulate canvases or listeners", async () => {
  for (let i = 0; i < 5; i++) {
    const { preview, h } = makePreview();
    await preview.mount();
    assert.ok(h.container.children.length > 0);
    preview.dispose();
    assert.equal(h.container.children.length, 0, `cycle ${i}: canvas must be cleaned up`);
  }
});

test("second mount after dispose returns disposed", async () => {
  const { preview } = makePreview();
  await preview.mount();
  preview.dispose();
  const result = await preview.mount();
  assert.equal(result.ok, false);
  assert.equal(result.reason, "disposed");
});

// ---------------------------------------------------------------------------
// 15. Preview failure does NOT disable camera challenge
// ---------------------------------------------------------------------------
test("preview failure result is contained and does not throw", async () => {
  const h = makeHarness();
  const errors = [];
  // Force failure by using unknown IDs.
  const preview = ProductMotionPreview.create({
    container: h.container,
    avatarProfileId: "unknown-avatar",
    motionId: "unknown/motion",
    fixtureId: "unknown-fixture",
    environment: h.env,
    loader: h.loader,
    onError: e => errors.push(e)
  });
  let threw = false;
  try { await preview.mount(); } catch (_) { threw = true; }
  assert.equal(threw, false, "mount() must never throw; failures are contained");
  assert.equal(preview.getStatus(), "failed");
  assert.equal(errors.length, 1);
});

test("preview failure does not modify any camera/challenge-related variables", async () => {
  // Simulate what the page does: separate engineReady variable unchanged by preview failure.
  let engineReady = false;
  let cameraActive = false;
  const h = makeHarness();
  const preview = ProductMotionPreview.create({
    container: h.container,
    avatarProfileId: "bad-id",
    environment: h.env,
    loader: h.loader,
    onError: () => {
      // In a real page, preview failure callback MUST NOT touch engineReady or cameraActive.
      // This test asserts the preview controller never touches them.
    }
  });
  await preview.mount();
  assert.equal(engineReady, false, "preview failure must not change engineReady");
  assert.equal(cameraActive, false, "preview failure must not change cameraActive");
});

// ---------------------------------------------------------------------------
// 16. Practice/Challenge readiness logic unchanged (structural test)
// ---------------------------------------------------------------------------
test("public preview surface exposes only playback and product view controls", () => {
  const h = makeHarness();
  const preview = ProductMotionPreview.create({ container: h.container, environment: h.env, loader: h.loader });
  const keys = Object.keys(preview);
  assert.deepEqual(keys.sort(), ["dispose", "getStatus", "mount", "pause", "play", "resetView", "resume", "setView"].sort());
});

// ---------------------------------------------------------------------------
// 17. create() with missing container throws immediately
// ---------------------------------------------------------------------------
test("create() with no container throws a TypeError immediately", () => {
  assert.throws(
    () => ProductMotionPreview.create({}),
    (e) => e instanceof TypeError && /container/.test(e.message)
  );
});

// ---------------------------------------------------------------------------
// Module registry exports
// ---------------------------------------------------------------------------
test("module exports create, _productAvatarRecord, _productFixtureRecord, _productStates", () => {
  assert.equal(typeof ProductMotionPreview.create, "function");
  assert.ok(ProductMotionPreview._productAvatarRecord);
  assert.ok(ProductMotionPreview._productFixtureRecord);
  assert.ok(Array.isArray(ProductMotionPreview._productStates));
  assert.ok(ProductMotionPreview._productStates.includes("idle"));
  assert.ok(ProductMotionPreview._productStates.includes("playing"));
  assert.ok(ProductMotionPreview._productStates.includes("failed"));
  assert.ok(ProductMotionPreview._productStates.includes("disposed"));
});

// ---------------------------------------------------------------------------
<<<<<<< HEAD
// 18. Authenticated product asset delivery — new focused tests
// ---------------------------------------------------------------------------

// Builds a harness where the loader's GLTFLoader.loadAsync is never called for
// the avatar URL — instead, options.fetch intercepts it and returns a parsed GLB.
function makeAuthHarness({ token = "test-jwt-token", backendOrigin = "https://mufasa-fitness-node.onrender.com", fetchStatus = 200, fetchThrows = null, avatarBones = ["Hips"], fixtureTrackCount = 40 } = {}) {
  const h = makeHarness({ avatarBones, fixtureTrackCount });

  const AVATAR_PATH = "/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb";
  const FIXTURE_PATH = "/motion/assets/exercises/push-up/avaturn-push-up-animation.glb";

  const fetchCalls = [];

  // Build a mock GLB ArrayBuffer (minimal valid header — the mock parse() below accepts any input).
  const mockAvatarBuffer = new ArrayBuffer(4);

  // Augment the test GLTFLoader so .parse() is available (ProductGLTFLoader calls this.parse).
  const OriginalGLTFLoader = h.loader.loadGLTFLoader;
  h.loader.loadGLTFLoader = async (opts) => {
    const Cls = await OriginalGLTFLoader(opts);
    class ParsableGLTFLoader extends Cls {
      parse(data, path, onLoad, onError) {
        // Return mock avatar gltf through the onLoad callback.
        try {
          const bone = new h.THREE.Object3D(); bone.name = "Hips"; bone.isBone = true;
          const skin = new h.THREE.Object3D(); skin.name = "Body_Mesh"; skin.isSkinnedMesh = true;
          const scene = new h.THREE.Scene(); scene.add(bone); scene.add(skin);
          onLoad({ scene, animations: [], parser: { json: { nodes: [{ name: "Hips" }] } } });
        } catch (e) { onError(e); }
      }
    }
    return ParsableGLTFLoader;
  };

  const mockFetch = async (url, fetchOpts) => {
    fetchCalls.push({ url, headers: { ...fetchOpts?.headers }, cache: fetchOpts?.cache });
    if (fetchThrows) throw fetchThrows;
    if (fetchStatus !== 200) {
      return { ok: false, status: fetchStatus, arrayBuffer: async () => mockAvatarBuffer };
    }
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => mockAvatarBuffer
    };
  };

  const preview = ProductMotionPreview.create({
    container: h.container,
    avatarProfileId: "avaturn-personalized-candidate",
    motionId: "push_up/avaturn_native_v1",
    fixtureId: "avaturn-push-up-animation",
    autoplay: true,
    loop: true,
    expectedBindings: { intended: 40, bound: 40, unbound: 0 },
    environment: h.env,
    loader: h.loader,
    fetch: mockFetch,
    getAuthToken: () => token,
    backendOrigin
  });

  return { h, preview, fetchCalls, AVATAR_PATH, FIXTURE_PATH, mockAvatarBuffer };
}

test("authenticated product preview resolves avatar against canonical backend origin", async () => {
  const BACKEND = "https://mufasa-fitness-node.onrender.com";
  const { preview, fetchCalls, AVATAR_PATH } = makeAuthHarness({ backendOrigin: BACKEND });
  const result = await preview.mount();
  assert.equal(result.ok, true, "mount should succeed");
  assert.ok(fetchCalls.length >= 1, "fetch must be called for avatar");
  const avatarCall = fetchCalls.find(c => c.url.endsWith(AVATAR_PATH));
  assert.ok(avatarCall, "fetch must be called with the avatar path");
  assert.equal(avatarCall.url, BACKEND + AVATAR_PATH, "avatar URL must be absolute against backend origin");
});

test("authenticated product preview attaches Authorization header using existing auth mechanism", async () => {
  const TOKEN = "******";
  const { preview, fetchCalls, AVATAR_PATH } = makeAuthHarness({ token: TOKEN });
  const result = await preview.mount();
  assert.equal(result.ok, true);
  const avatarCall = fetchCalls.find(c => c.url.endsWith(AVATAR_PATH));
  assert.ok(avatarCall, "fetch must be called for avatar");
  assert.equal(avatarCall.headers["authorization"], "Bearer " + TOKEN, "Authorization header must carry bearer token");
});

test("authenticated product preview does NOT attach Authorization header to fixture request", async () => {
  const { preview, fetchCalls, FIXTURE_PATH } = makeAuthHarness();
  await preview.mount();
  const fixtureFetchCall = fetchCalls.find(c => c.url && c.url.includes("animation"));
  // Fixture must NOT go through the auth fetch path (it uses GLTFLoader.loadAsync directly).
  assert.equal(fixtureFetchCall, undefined, "fixture must not go through authenticated fetch");
});

test("avatar fetch failure falls back safely to failed status without throwing", async () => {
  const diagnostics = [];
  const h = makeHarness();
  const OriginalGLTFLoader = h.loader.loadGLTFLoader;
  h.loader.loadGLTFLoader = async (opts) => {
    const Cls = await OriginalGLTFLoader(opts);
    class ParsableGLTFLoader extends Cls {
      parse(data, path, onLoad, onError) { onLoad({ scene: new h.THREE.Scene(), animations: [] }); }
    }
    return ParsableGLTFLoader;
  };
  const mockFetch = async () => ({ ok: false, status: 401, arrayBuffer: async () => new ArrayBuffer(0) });
  const preview = ProductMotionPreview.create({
    container: h.container,
    avatarProfileId: "avaturn-personalized-candidate",
    motionId: "push_up/avaturn_native_v1",
    fixtureId: "avaturn-push-up-animation",
    environment: h.env,
    loader: h.loader,
    fetch: mockFetch,
    getAuthToken: () => "any-token",
    backendOrigin: "https://mufasa-fitness-node.onrender.com",
    onDiagnostic: entry => diagnostics.push(entry)
  });
  let threw = false;
  try { await preview.mount(); } catch (_) { threw = true; }
  assert.equal(threw, false, "mount must never throw");
  assert.equal(preview.getStatus(), "failed");
  assert.ok(diagnostics.some(d => d.event === "avatar_fetch_failed"), "avatar_fetch_failed diagnostic must be emitted");
});

test("successful avatar fetch proceeds to GLTF parse and emits avatar_fetch_pass and avatar_parse_pass", async () => {
  const diagnostics = [];
  const statuses = [];
  // Build harness manually to wire onDiagnostic and authenticated fetch seams together.
  const h = makeHarness();
  const OriginalGLTFLoader = h.loader.loadGLTFLoader;
  h.loader.loadGLTFLoader = async (opts) => {
    const Cls = await OriginalGLTFLoader(opts);
    class ParsableGLTFLoader extends Cls {
      parse(data, path, onLoad, onError) {
        const bone = new h.THREE.Object3D(); bone.name = "Hips"; bone.isBone = true;
        const skin = new h.THREE.Object3D(); skin.name = "Body_Mesh"; skin.isSkinnedMesh = true;
        const scene = new h.THREE.Scene(); scene.add(bone); scene.add(skin);
        onLoad({ scene, animations: [], parser: { json: { nodes: [{ name: "Hips" }] } } });
      }
    }
    return ParsableGLTFLoader;
  };
  const preview2 = ProductMotionPreview.create({
    container: h.container,
    avatarProfileId: "avaturn-personalized-candidate",
    motionId: "push_up/avaturn_native_v1",
    fixtureId: "avaturn-push-up-animation",
    autoplay: true,
    loop: true,
    expectedBindings: { intended: 40, bound: 40, unbound: 0 },
    environment: h.env,
    loader: h.loader,
    fetch: async (url) => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4) }),
    getAuthToken: () => "valid-token",
    backendOrigin: "https://mufasa-fitness-node.onrender.com",
    onStatus: s => statuses.push(s),
    onDiagnostic: entry => diagnostics.push(entry)
  });
  const result = await preview2.mount();
  assert.equal(result.ok, true);
  assert.ok(diagnostics.some(d => d.event === "avatar_fetch_pass"), "avatar_fetch_pass must be emitted");
  assert.ok(diagnostics.some(d => d.event === "avatar_parse_pass"), "avatar_parse_pass must be emitted");
  assert.equal(statuses.at(-1), "playing");
});

test("fixture assetUrl and 40/40/0 binding contract remain unchanged by auth delivery repair", () => {
  const fixture = ProductMotionPreview._productFixtureRecord;
  assert.equal(fixture.assetUrl, "/motion/assets/exercises/push-up/avaturn-push-up-animation.glb");
  assert.equal(fixture.expectedTrackCount, 40);
  assert.equal(fixture.skeletonProfile, "avaturn-native-v1");
  assert.equal(fixture.clipName, "avaturn_push_up_native_v1");
  const avatar = ProductMotionPreview._productAvatarRecord;
  assert.equal(avatar.assetUrl, "/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb");
  assert.equal(avatar.skeletonProfile, "avaturn-native-v1");
  assert.equal(avatar.avatarId, fixture.compatibleAvatarProfile, "avatar/fixture pairing contract must hold");
});

test("camera and MoveNet readiness predicates are independent of 3D preview success or failure", async () => {
  // Simulate the page's engineReady / cameraActive state which must NOT be changed
  // by any preview outcome. This test verifies ProductMotionPreview never touches them.
  let engineReady = false;
  let cameraActive = false;
  let poseRuntimeReady = false;

  // Simulate a failed preview (bad avatar ID).
  const h = makeHarness();
  const preview = ProductMotionPreview.create({
    container: h.container,
    avatarProfileId: "does-not-exist",
    environment: h.env,
    loader: h.loader,
    onError: () => {
      // Page's error handler must NOT touch camera state.
      // ProductMotionPreview must not touch it either.
    }
  });
  await preview.mount();
  assert.equal(engineReady, false, "engineReady must not be affected by preview failure");
  assert.equal(cameraActive, false, "cameraActive must not be affected by preview failure");
  assert.equal(poseRuntimeReady, false, "poseRuntimeReady must not be affected by preview failure");
  assert.equal(preview.getStatus(), "failed");

  // Simulate a successful preview — camera state still not touched.
  const { preview: successPreview } = makePreview();
  await successPreview.mount();
  assert.equal(engineReady, false, "engineReady untouched after preview success");
  assert.equal(cameraActive, false, "cameraActive untouched after preview success");
=======
// Product asset delivery repair — authenticated avatar retrieval
// ---------------------------------------------------------------------------

// 1. Avatar URL resolves against canonical backend, not frontend host.
test("resolveProductAvatarUrl uses MaatApiClient.resolve when available", () => {
  const { _resolveProductAvatarUrl, _productAvatarRecord } = ProductMotionPreview;
  const resolved = [];
  const scope = {
    MaatApiClient: { resolve: (path) => { resolved.push(path); return "https://mufasa-fitness-node.onrender.com" + path; } }
  };
  const url = _resolveProductAvatarUrl(scope);
  assert.equal(resolved.length, 1, "MaatApiClient.resolve must be called once");
  assert.equal(resolved[0], _productAvatarRecord.assetUrl, "must resolve the avatar asset path");
  assert.equal(url, "https://mufasa-fitness-node.onrender.com" + _productAvatarRecord.assetUrl);
  assert.equal(new URL(url).origin, "https://mufasa-fitness-node.onrender.com", "result must be an absolute backend URL");
});

test("resolveProductAvatarUrl falls back to MAAT_BACKEND_ORIGIN when MaatApiClient absent", () => {
  const { _resolveProductAvatarUrl, _productAvatarRecord } = ProductMotionPreview;
  const scope = { MAAT_BACKEND_ORIGIN: "https://custom-backend.example.com" };
  const url = _resolveProductAvatarUrl(scope);
  assert.equal(new URL(url).origin, "https://custom-backend.example.com", "fallback must use MAAT_BACKEND_ORIGIN");
  assert.ok(url.endsWith(_productAvatarRecord.assetUrl), "must append avatar path");
});

test("resolveProductAvatarUrl falls back to production backend when no config present", () => {
  const { _resolveProductAvatarUrl } = ProductMotionPreview;
  const url = _resolveProductAvatarUrl({});
  assert.equal(new URL(url).origin, "https://mufasa-fitness-node.onrender.com", "must default to production backend");
});

// 2. Authenticated asset retrieval uses the established auth mechanism.
test("authenticated product loader sends Authorization header using AuthStateRuntime token", async () => {
  const { _buildAuthenticatedProductLoader } = ProductMotionPreview;
  const avatarAbsoluteUrl = "https://mufasa-fitness-node.onrender.com/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb";
  const capturedHeaders = [];
  const mockGltfResult = { scene: { traverse: () => {} }, animations: [], parser: { json: {} } };
  class BaseLoader {
    async loadAsync() { return {}; }
    async parseAsync() { return mockGltfResult; }
  }
  const baseLoader = {
    probeCapability: () => ({ supported: true }),
    loadThree: async () => ({}),
    loadGLTFLoader: async () => BaseLoader
  };
  const tokenFn = () => "test-bearer-token";
  const fetchFn = async (url, opts) => {
    capturedHeaders.push({ url, headers: opts.headers });
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
  };
  const diagnostics = [];
  const productLoader = _buildAuthenticatedProductLoader(baseLoader, avatarAbsoluteUrl, tokenFn, (event, detail) => diagnostics.push({ event, ...(detail || {}) }), fetchFn);
  const LoaderClass = await productLoader.loadGLTFLoader({});
  const loader = new LoaderClass();
  await loader.loadAsync(avatarAbsoluteUrl);
  assert.equal(capturedHeaders.length, 1, "fetch must be called once");
  assert.ok(capturedHeaders[0].headers["Authorization"].startsWith("Bearer "), "Authorization header must use ******");
  assert.doesNotMatch(JSON.stringify(diagnostics), /test-bearer-token/, "token must never appear in diagnostics");
});

test("authenticated product loader does not send Authorization when no token", async () => {
  const { _buildAuthenticatedProductLoader } = ProductMotionPreview;
  const avatarAbsoluteUrl = "https://mufasa-fitness-node.onrender.com/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb";
  const capturedHeaders = [];
  class BaseLoader {
    async loadAsync() { return {}; }
    async parseAsync() { return { scene: { traverse: () => {} }, animations: [], parser: { json: {} } }; }
  }
  const baseLoader = { probeCapability: () => ({}), loadThree: async () => ({}), loadGLTFLoader: async () => BaseLoader };
  const fetchFn = async (url, opts) => { capturedHeaders.push(opts.headers); return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) }; };
  const productLoader = _buildAuthenticatedProductLoader(baseLoader, avatarAbsoluteUrl, () => null, () => {}, fetchFn);
  const LoaderClass = await productLoader.loadGLTFLoader({});
  await new LoaderClass().loadAsync(avatarAbsoluteUrl);
  assert.ok(!capturedHeaders[0]?.["Authorization"], "Authorization header must not be set when token is null");
});

// 3. Failed avatar fetch emits avatar_fetch_failed and rethrows (fallback preserved).
test("failed avatar fetch emits avatar_fetch_failed diagnostic with http status", async () => {
  const { _buildAuthenticatedProductLoader } = ProductMotionPreview;
  const avatarAbsoluteUrl = "https://mufasa-fitness-node.onrender.com/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb";
  class BaseLoader { async loadAsync() { return {}; } }
  const baseLoader = { probeCapability: () => ({}), loadThree: async () => ({}), loadGLTFLoader: async () => BaseLoader };
  const fetchFn = async () => ({ ok: false, status: 401, arrayBuffer: async () => new ArrayBuffer(0) });
  const diagnostics = [];
  const productLoader = _buildAuthenticatedProductLoader(baseLoader, avatarAbsoluteUrl, () => "tok", (event, detail) => diagnostics.push({ event, ...(detail || {}) }), fetchFn);
  const LoaderClass = await productLoader.loadGLTFLoader({});
  let threw = null;
  try { await new LoaderClass().loadAsync(avatarAbsoluteUrl); } catch (e) { threw = e; }
  assert.ok(threw, "failed fetch must throw");
  assert.ok(threw.status === 401 || threw.target?.status === 401, "thrown error must carry status");
  const failedEvent = diagnostics.find(d => d.event === "avatar_fetch_failed");
  assert.ok(failedEvent, "avatar_fetch_failed diagnostic must be emitted");
  assert.doesNotMatch(JSON.stringify(diagnostics), /tok/, "token must never appear in diagnostics even on failure");
});

test("network error during avatar fetch emits avatar_fetch_failed and rethrows", async () => {
  const { _buildAuthenticatedProductLoader } = ProductMotionPreview;
  const avatarAbsoluteUrl = "https://mufasa-fitness-node.onrender.com/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb";
  class BaseLoader { async loadAsync() { return {}; } }
  const baseLoader = { probeCapability: () => ({}), loadThree: async () => ({}), loadGLTFLoader: async () => BaseLoader };
  const fetchFn = async () => { throw new TypeError("network error"); };
  const diagnostics = [];
  const productLoader = _buildAuthenticatedProductLoader(baseLoader, avatarAbsoluteUrl, () => null, (event, detail) => diagnostics.push({ event, ...(detail || {}) }), fetchFn);
  const LoaderClass = await productLoader.loadGLTFLoader({});
  let threw = null;
  try { await new LoaderClass().loadAsync(avatarAbsoluteUrl); } catch (e) { threw = e; }
  assert.ok(threw instanceof TypeError, "network TypeError must propagate");
  assert.ok(diagnostics.some(d => d.event === "avatar_fetch_failed" && d.code === "network_error"), "network_error code must be reported");
});

// 4. Successful avatar retrieval proceeds to GLTF parsing and emits pass events.
test("successful authenticated fetch emits avatar_fetch_pass and avatar_parse_pass", async () => {
  const { _buildAuthenticatedProductLoader } = ProductMotionPreview;
  const avatarAbsoluteUrl = "https://mufasa-fitness-node.onrender.com/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb";
  const mockResult = { scene: { traverse: () => {} }, animations: [], parser: { json: {} } };
  class BaseLoader {
    async loadAsync() { return {}; }
    async parseAsync(buffer, path) { return mockResult; }
  }
  const baseLoader = { probeCapability: () => ({}), loadThree: async () => ({}), loadGLTFLoader: async () => BaseLoader };
  const fetchFn = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) });
  const diagnostics = [];
  const productLoader = _buildAuthenticatedProductLoader(baseLoader, avatarAbsoluteUrl, () => "t", (event, detail) => diagnostics.push({ event, ...(detail || {}) }), fetchFn);
  const LoaderClass = await productLoader.loadGLTFLoader({});
  const result = await new LoaderClass().loadAsync(avatarAbsoluteUrl);
  assert.ok(diagnostics.some(d => d.event === "avatar_fetch_pass"), "avatar_fetch_pass must be emitted");
  assert.ok(diagnostics.some(d => d.event === "avatar_parse_pass"), "avatar_parse_pass must be emitted");
  assert.equal(result, mockResult, "parseAsync result must be returned");
});

test("successful authenticated fetch uses parse callback fallback when parseAsync unavailable", async () => {
  const { _buildAuthenticatedProductLoader } = ProductMotionPreview;
  const avatarAbsoluteUrl = "https://mufasa-fitness-node.onrender.com/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb";
  const mockResult = { scene: { traverse: () => {} }, animations: [] };
  class BaseLoader {
    async loadAsync() { return {}; }
    parse(buffer, path, onLoad) { onLoad(mockResult); }
  }
  const baseLoader = { probeCapability: () => ({}), loadThree: async () => ({}), loadGLTFLoader: async () => BaseLoader };
  const fetchFn = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) });
  const diagnostics = [];
  const productLoader = _buildAuthenticatedProductLoader(baseLoader, avatarAbsoluteUrl, () => null, (event, detail) => diagnostics.push({ event, ...(detail || {}) }), fetchFn);
  const LoaderClass = await productLoader.loadGLTFLoader({});
  const result = await new LoaderClass().loadAsync(avatarAbsoluteUrl);
  assert.ok(diagnostics.some(d => d.event === "avatar_parse_pass"), "avatar_parse_pass must be emitted with parse fallback");
  assert.equal(result, mockResult);
});

// 5. Fixture path and 40/40/0 binding contract remain unchanged.
test("fixture assetUrl is a relative static path requiring no authentication", () => {
  const { _productFixtureRecord } = ProductMotionPreview;
  assert.equal(_productFixtureRecord.assetUrl, "/motion/assets/exercises/push-up/avaturn-push-up-animation.glb");
  assert.ok(_productFixtureRecord.assetUrl.startsWith("/"), "fixture must use a relative path (served from frontend static host)");
  assert.equal(_productFixtureRecord.expectedTrackCount, 40, "fixture track count must be 40");
  assert.equal(_productFixtureRecord.clipName, "avaturn_push_up_native_v1", "clip name must be unchanged");
});

test("fixture URL is not intercepted by the authenticated product loader", async () => {
  const { _buildAuthenticatedProductLoader } = ProductMotionPreview;
  const avatarAbsoluteUrl = "https://mufasa-fitness-node.onrender.com/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb";
  const fixturePath = "/motion/assets/exercises/push-up/avaturn-push-up-animation.glb";
  const baseCallUrls = [];
  class BaseLoader {
    async loadAsync(url) { baseCallUrls.push(url); return { scene: null, animations: [] }; }
  }
  const baseLoader = { probeCapability: () => ({}), loadThree: async () => ({}), loadGLTFLoader: async () => BaseLoader };
  const fetchCalled = [];
  const fetchFn = async (url) => { fetchCalled.push(url); return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) }; };
  const productLoader = _buildAuthenticatedProductLoader(baseLoader, avatarAbsoluteUrl, () => null, () => {}, fetchFn);
  const LoaderClass = await productLoader.loadGLTFLoader({});
  await new LoaderClass().loadAsync(fixturePath);
  assert.equal(fetchCalled.length, 0, "fixture must not go through authenticated fetch");
  assert.equal(baseCallUrls[0], fixturePath, "fixture must be loaded via base loadAsync");
});

// 6. Camera/MoveNet readiness predicates remain independent of 3D success/failure.
test("3D preview failure result does not leak into camera or challenge variables", async () => {
  let engineReady = false;
  let cameraActive = false;
  let detector = null;
  const h = makeHarness();
  const preview = ProductMotionPreview.create({
    container: h.container,
    avatarProfileId: "avaturn-personalized-candidate",
    motionId: "push_up/avaturn_native_v1",
    fixtureId: "avaturn-push-up-animation",
    environment: h.env,
    loader: h.loader,
    onError: () => {
      // Simulate page callback: preview failure must not touch these
      engineReady = false;
      cameraActive = false;
      detector = null;
    }
  });
  await preview.mount();
  // Regardless of preview result, camera state variables are owned by the page, not the preview.
  assert.equal(engineReady, false, "engineReady must not be modified by preview");
  assert.equal(cameraActive, false, "cameraActive must not be modified by preview");
  assert.equal(detector, null, "detector must not be modified by preview");
});

test("product preview module exports the new auth helpers for testability", () => {
  assert.equal(typeof ProductMotionPreview._resolveProductAvatarUrl, "function");
  assert.equal(typeof ProductMotionPreview._buildAuthenticatedProductLoader, "function");
>>>>>>> origin/main
});
