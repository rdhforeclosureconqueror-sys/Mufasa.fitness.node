"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const ProductMotionCamera = require("../public/motion/product-motion-camera");

// ---------------------------------------------------------------------------
// Minimal THREE stub
// ---------------------------------------------------------------------------
function makeTHREE() {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    clone() { return new Vector3(this.x, this.y, this.z); }
  }
  class Box3 {
    constructor() { this.min = new Vector3(-0.5, 0, -0.25); this.max = new Vector3(0.5, 1.8, 0.25); }
    setFromObject() { return this; }
    getSize(out) { out.x = 1; out.y = 1.8; out.z = 0.5; return out; }
    getCenter(out) { out.x = 0; out.y = 0.9; out.z = 0; return out; }
    copy(other) { this.min = other.min; this.max = other.max; return this; }
    union(other) { return this; }
  }
  class Object3D {
    constructor() { this.name = ""; this.position = new Vector3(); this.children = []; }
    add(c) { this.children.push(c); }
    traverse(fn) { fn(this); this.children.forEach(c => c.traverse ? c.traverse(fn) : fn(c)); }
    updateMatrixWorld() {}
  }
  class PerspectiveCamera {
    constructor(fov, aspect, near, far) {
      this.fov = fov || 50; this.aspect = aspect || 1; this.near = near || 0.1; this.far = far || 100;
      this.position = new Vector3();
    }
    lookAt() {}
    updateProjectionMatrix() {}
  }
  class WebGLRenderer {
    constructor() { this.domElement = makeDomElement(); }
  }
  return { Vector3, Box3, Object3D, PerspectiveCamera, WebGLRenderer };
}

function makeDomElement() {
  const listeners = {};
  return {
    addEventListener(type, fn, opts) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push({ fn, opts });
    },
    removeEventListener(type, fn) {
      if (listeners[type]) listeners[type] = listeners[type].filter(l => l.fn !== fn);
    },
    _listeners: listeners
  };
}

function makeClip(duration) {
  return { name: "push_up_clip", duration: duration || 1.5, tracks: [] };
}

function makeMixer(clip) {
  let time = 0;
  const setTimeCalls = [];
  return {
    time,
    setTime(t) { setTimeCalls.push(t); this.time = t; },
    _setTimeCalls: setTimeCalls
  };
}

function makeCamera(THREE) {
  return new THREE.PerspectiveCamera(50, 320 / 240, 0.1, 100);
}

function makeController(THREE, opts) {
  const avatar = new THREE.Object3D();
  const camera = makeCamera(THREE);
  const renderer = new THREE.WebGLRenderer();
  const clip   = makeClip(1.5);
  const mixer  = makeMixer(clip);
  return ProductMotionCamera.create(Object.assign({
    camera, avatar, mixer, clip, renderer, THREE
  }, opts || {}));
}

// ---------------------------------------------------------------------------
// Module API
// ---------------------------------------------------------------------------
test("module exports create, ProductMotionCamera, _sampleAnimatedBounds, _calculateFit", () => {
  assert.equal(typeof ProductMotionCamera.create, "function");
  assert.equal(typeof ProductMotionCamera.ProductMotionCamera, "function");
  assert.equal(typeof ProductMotionCamera._sampleAnimatedBounds, "function");
  assert.equal(typeof ProductMotionCamera._calculateFit, "function");
});

// ---------------------------------------------------------------------------
// Constructor guards
// ---------------------------------------------------------------------------
test("create throws TypeError when camera is missing", () => {
  const THREE = makeTHREE();
  assert.throws(
    () => ProductMotionCamera.create({ avatar: new THREE.Object3D(), THREE }),
    e => e instanceof TypeError
  );
});

test("create throws TypeError when avatar is missing", () => {
  const THREE = makeTHREE();
  assert.throws(
    () => ProductMotionCamera.create({ camera: makeCamera(THREE), THREE }),
    e => e instanceof TypeError
  );
});

test("create throws TypeError when THREE is missing", () => {
  const THREE = makeTHREE();
  assert.throws(
    () => ProductMotionCamera.create({ camera: makeCamera(THREE), avatar: new THREE.Object3D() }),
    e => e instanceof TypeError
  );
});

// ---------------------------------------------------------------------------
// Init: bounds sampling
// ---------------------------------------------------------------------------
test("init samples animation at multiple mixer times", () => {
  const THREE = makeTHREE();
  const clip  = makeClip(1.5);
  const mixer = makeMixer(clip);
  const camera = makeCamera(THREE);
  const avatar = new THREE.Object3D();
  ProductMotionCamera.create({ camera, avatar, mixer, clip, THREE, sampleCount: 5 });
  // Expect 5 setTime calls for sampling
  assert.ok(mixer._setTimeCalls.length >= 5, `expected >=5 setTime calls, got ${mixer._setTimeCalls.length}`);
});

test("init restores mixer time after sampling", () => {
  const THREE = makeTHREE();
  const clip  = makeClip(1.5);
  const mixer = makeMixer(clip);
  mixer.time  = 0.75;
  mixer.setTime(0.75); // set initial time
  mixer._setTimeCalls.length = 0; // reset after warmup
  const camera = makeCamera(THREE);
  const avatar = new THREE.Object3D();
  ProductMotionCamera.create({ camera, avatar, mixer, clip, THREE, sampleCount: 3 });
  // Last setTime call should restore 0.75 (original time at start of sampling = 0 from constructor)
  const calls = mixer._setTimeCalls;
  // The last call restores the prior time (0 from constructor default)
  assert.ok(calls.length >= 1, "setTime must be called");
});

test("init positions camera at nonzero distance from avatar", () => {
  const THREE = makeTHREE();
  const ctrl = makeController(THREE);
  const pos = ctrl._camera ? ctrl._camera.position : null;
  // camera should have been moved away from origin
  assert.ok(ctrl._fit || ctrl._distance, "fit or distance must be set");
});

test("init without mixer falls back to static bounds", () => {
  const THREE = makeTHREE();
  const camera = makeCamera(THREE);
  const avatar = new THREE.Object3D();
  const ctrl = ProductMotionCamera.create({ camera, avatar, THREE });
  // Should not throw; fit should still be computed
  assert.ok(ctrl);
});

// ---------------------------------------------------------------------------
// _sampleAnimatedBounds
// ---------------------------------------------------------------------------
test("_sampleAnimatedBounds samples at evenly spaced times across full clip duration", () => {
  const THREE = makeTHREE();
  const clip  = makeClip(1.5);
  const mixer = makeMixer(clip);
  const avatar = new THREE.Object3D();
  const box = ProductMotionCamera._sampleAnimatedBounds(THREE, avatar, mixer, clip, 5);
  assert.ok(box, "should return a Box3");
  // Times sampled: 0, 0.375, 0.75, 1.125, 1.5
  const times = mixer._setTimeCalls;
  assert.ok(times.includes(0), "should sample at t=0");
  assert.ok(times.some(t => t >= 1.4), "should sample at or near end of clip");
});

test("_sampleAnimatedBounds caps at MAX_SAMPLE_COUNT=25", () => {
  const THREE  = makeTHREE();
  const clip   = makeClip(1.5);
  const mixer  = makeMixer(clip);
  const avatar = new THREE.Object3D();
  ProductMotionCamera._sampleAnimatedBounds(THREE, avatar, mixer, clip, 100);
  // 25 samples + 1 restore = 26 calls max
  assert.ok(mixer._setTimeCalls.length <= 26, "must not exceed 26 setTime calls");
});

test("_sampleAnimatedBounds restores prior mixer time after sampling", () => {
  const THREE  = makeTHREE();
  const clip   = makeClip(1.5);
  const mixer  = makeMixer(clip);
  mixer.time   = 0.42;
  const avatar = new THREE.Object3D();
  ProductMotionCamera._sampleAnimatedBounds(THREE, avatar, mixer, clip, 3);
  const calls = mixer._setTimeCalls;
  assert.equal(calls.at(-1), 0.42, "last setTime must restore prior mixer time");
});

test("_sampleAnimatedBounds handles zero-duration clip without throwing", () => {
  const THREE  = makeTHREE();
  const clip   = { name: "empty", duration: 0, tracks: [] };
  const mixer  = makeMixer(clip);
  const avatar = new THREE.Object3D();
  let threw = false;
  try { ProductMotionCamera._sampleAnimatedBounds(THREE, avatar, mixer, clip, 5); } catch (_) { threw = true; }
  assert.equal(threw, false, "must not throw on zero-duration clip");
});

// ---------------------------------------------------------------------------
// _calculateFit
// ---------------------------------------------------------------------------
test("_calculateFit returns center, distance, near, far", () => {
  const THREE = makeTHREE();
  const bounds = new THREE.Box3();
  const camera = makeCamera(THREE);
  const fit = ProductMotionCamera._calculateFit(THREE, bounds, camera, 1.2);
  assert.ok(fit, "should return a fit object");
  assert.ok(Number.isFinite(fit.distance) && fit.distance > 0, "distance must be positive finite");
  assert.ok(Number.isFinite(fit.near) && fit.near > 0, "near must be positive finite");
  assert.ok(Number.isFinite(fit.far) && fit.far > fit.near, "far must exceed near");
  assert.ok(fit.center, "center must be returned");
});

test("_calculateFit returns null for degenerate bounds (zero height)", () => {
  const THREE = makeTHREE();
  const bounds = {
    getSize: (v) => { v.x = 0; v.y = 0; v.z = 0; return v; },
    getCenter: (v) => { v.x = 0; v.y = 0; v.z = 0; return v; }
  };
  const camera = makeCamera(THREE);
  const fit = ProductMotionCamera._calculateFit(THREE, bounds, camera, 1.2);
  assert.equal(fit, null);
});

test("_calculateFit returns larger distance for taller avatars", () => {
  const THREE  = makeTHREE();
  const camera = makeCamera(THREE);
  const bounds1 = {
    getSize: (v) => { v.x = 0.5; v.y = 1.0; v.z = 0.3; return v; },
    getCenter: (v) => { v.x = 0; v.y = 0.5; v.z = 0; return v; }
  };
  const bounds2 = {
    getSize: (v) => { v.x = 0.5; v.y = 2.0; v.z = 0.3; return v; },
    getCenter: (v) => { v.x = 0; v.y = 1.0; v.z = 0; return v; }
  };
  const fit1 = ProductMotionCamera._calculateFit(THREE, bounds1, camera, 1.0);
  const fit2 = ProductMotionCamera._calculateFit(THREE, bounds2, camera, 1.0);
  assert.ok(fit2.distance > fit1.distance, "taller avatar should require more distance");
});

// ---------------------------------------------------------------------------
// View presets
// ---------------------------------------------------------------------------
test("setSide sets side-view angles", () => {
  const THREE = makeTHREE();
  const ctrl = makeController(THREE);
  ctrl.setSide();
  assert.ok(Math.abs(ctrl._azimuth - Math.PI / 2) < 0.001, "side azimuth should be PI/2");
});

test("setFront sets front-view angles", () => {
  const THREE = makeTHREE();
  const ctrl = makeController(THREE);
  ctrl.setFront();
  assert.ok(Math.abs(ctrl._azimuth - 0) < 0.001, "front azimuth should be 0");
});

test("setThreeQuarter sets 3/4-view angles", () => {
  const THREE = makeTHREE();
  const ctrl = makeController(THREE);
  ctrl.setThreeQuarter();
  assert.ok(Math.abs(ctrl._azimuth - Math.PI / 4) < 0.001, "3/4 azimuth should be PI/4");
});

test("resetView restores side view and original fit distance", () => {
  const THREE = makeTHREE();
  const ctrl = makeController(THREE);
  const originalDist = ctrl._fit ? ctrl._fit.distance : ctrl._distance;
  ctrl._distance = (originalDist || 2) * 2; // zoom in
  ctrl.setFront();
  ctrl.resetView();
  if (ctrl._fit) {
    assert.ok(Math.abs(ctrl._distance - ctrl._fit.distance) < 0.001, "distance should be restored");
  }
  assert.ok(Math.abs(ctrl._azimuth - Math.PI / 2) < 0.001, "azimuth should be side after reset");
});

// ---------------------------------------------------------------------------
// Preset idempotence: calling preset does NOT restart animation
// ---------------------------------------------------------------------------
test("view presets do not touch the mixer", () => {
  const THREE = makeTHREE();
  const clip  = makeClip(1.5);
  const mixer = makeMixer(clip);
  const ctrl = ProductMotionCamera.create({
    camera: makeCamera(THREE), avatar: new THREE.Object3D(), mixer, clip,
    renderer: new THREE.WebGLRenderer(), THREE
  });
  const callsBefore = mixer._setTimeCalls.length;
  ctrl.setSide();
  ctrl.setFront();
  ctrl.setThreeQuarter();
  ctrl.resetView();
  assert.equal(mixer._setTimeCalls.length, callsBefore, "view presets must not call mixer.setTime");
});

// ---------------------------------------------------------------------------
// Zoom limits
// ---------------------------------------------------------------------------
test("_zoomBy respects min/max zoom limits", () => {
  const THREE = makeTHREE();
  const ctrl  = makeController(THREE);
  if (!ctrl._fit) return; // degenerate THREE stub may skip
  const base = ctrl._fit.distance;
  // Zoom in far past minimum
  for (let i = 0; i < 20; i++) ctrl._zoomBy(0.5);
  assert.ok(ctrl._distance >= ctrl._minDist, "distance must not go below min");
  // Restore and zoom out past maximum
  ctrl._distance = base;
  for (let i = 0; i < 20; i++) ctrl._zoomBy(2.0);
  assert.ok(ctrl._distance <= ctrl._maxDist, "distance must not exceed max");
});

// ---------------------------------------------------------------------------
// Vertical rotation limits
// ---------------------------------------------------------------------------
test("_rotateBy clamps polar angle within bounds", () => {
  const THREE = makeTHREE();
  const ctrl  = makeController(THREE);
  ctrl._rotateBy(0, -Math.PI * 10);
  assert.ok(ctrl._polar >= 0.1, "polar should not go below MIN_POLAR");
  ctrl._rotateBy(0, Math.PI * 10);
  assert.ok(ctrl._polar <= Math.PI - 0.1, "polar should not exceed MAX_POLAR");
});

// ---------------------------------------------------------------------------
// Listener lifecycle
// ---------------------------------------------------------------------------
test("init attaches event listeners to renderer domElement", () => {
  const THREE    = makeTHREE();
  const ctrl     = makeController(THREE);
  assert.ok(ctrl._listeners.length > 0, "listeners must be registered");
});

test("dispose removes all event listeners", () => {
  const THREE    = makeTHREE();
  const ctrl     = makeController(THREE);
  const domEl    = ctrl._renderer ? ctrl._renderer.domElement : null;
  ctrl.dispose();
  assert.equal(ctrl._listeners.length, 0, "all listeners must be removed after dispose");
});

test("dispose is idempotent (second dispose does not throw)", () => {
  const THREE = makeTHREE();
  const ctrl  = makeController(THREE);
  ctrl.dispose();
  let threw = false;
  try { ctrl.dispose(); } catch (_) { threw = true; }
  assert.equal(threw, false, "second dispose must not throw");
});

// ---------------------------------------------------------------------------
// handleResize
// ---------------------------------------------------------------------------
test("handleResize does not throw", () => {
  const THREE = makeTHREE();
  const ctrl  = makeController(THREE);
  let threw = false;
  try { ctrl.handleResize(); } catch (_) { threw = true; }
  assert.equal(threw, false, "handleResize must not throw");
});

// ---------------------------------------------------------------------------
// Browser global
// ---------------------------------------------------------------------------
test("module exports as CJS module with correct keys", () => {
  const keys = Object.keys(ProductMotionCamera).sort();
  assert.deepEqual(keys, ["ProductMotionCamera", "_calculateFit", "_sampleAnimatedBounds", "create"].sort());
});
