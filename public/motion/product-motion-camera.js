/* public/motion/product-motion-camera.js
 * Reusable perspective-camera controller for the Product Motion Viewer.
 *
 * Responsibilities
 * ────────────────
 * 1. Animated motion bounds sampling (deterministic, once per init).
 * 2. Mathematical perspective-camera fit to the full animated envelope.
 * 3. View presets: side, front, 3/4.
 * 4. Reset view.
 * 5. Pointer/mouse drag rotation.
 * 6. Mobile swipe rotation.
 * 7. Pinch zoom.
 * 8. Wheel zoom.
 * 9. Safe zoom limits.
 * 10. Resize/orientation updates.
 * 11. Listener disposal.
 * 12. Animation state restoration after bounds sampling.
 *
 * Contracts
 * ─────────
 * - Does NOT restart animation when view changes.
 * - Does NOT perform free panning — rotation only.
 * - Does NOT modify any GLB, animation, MoveNet, pose-runtime, or auth.
 * - All failures are contained; no throw reaches callers.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ProductMotionCamera = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  var DEFAULT_SAMPLE_COUNT = 17;
  var MAX_SAMPLE_COUNT = 25;
  var DEFAULT_PADDING = 1.25;
  var DEFAULT_FOV = 50;
  var MIN_ZOOM_FACTOR = 0.5;   // relative to fitted distance
  var MAX_ZOOM_FACTOR = 3.0;
  var MIN_POLAR = 0.1;         // radians from top
  var MAX_POLAR = Math.PI - 0.1;

  // Preset azimuth/polar angles (in radians)
  var PRESETS = {
    side:    { azimuth: Math.PI / 2,  polar: Math.PI / 2 },
    front:   { azimuth: 0,            polar: Math.PI / 2 },
    "3/4":   { azimuth: Math.PI / 4,  polar: Math.PI / 2.4 }
  };

  // ---------------------------------------------------------------------------
  // Animated bounds sampling
  // Samples `count` evenly-spaced mixer times across the clip duration,
  // unions the resulting Box3, then restores prior playback state.
  // ---------------------------------------------------------------------------
  function sampleAnimatedBounds(THREE, avatar, mixer, clip, count) {
    count = Math.min(Math.max(count || DEFAULT_SAMPLE_COUNT, 1), MAX_SAMPLE_COUNT);
    var duration = (clip && clip.duration > 0) ? clip.duration : 0;
    var box = new THREE.Box3();
    var priorTime = mixer.time;

    try {
      if (duration <= 0) {
        // No animation duration — fall back to static T-pose bounds.
        avatar.updateMatrixWorld(true);
        box.setFromObject(avatar);
      } else {
        var expanded = false;
        for (var i = 0; i < count; i++) {
          var t = (i / (count - 1)) * duration;
          mixer.setTime(t);
          avatar.updateMatrixWorld(true);
          var sample = new THREE.Box3().setFromObject(avatar);
          if (!expanded) { box.copy(sample); expanded = true; }
          else box.union(sample);
        }
      }
    } catch (_) {
      // Restoration must still occur.
    }

    // Restore mixer time.
    try { mixer.setTime(priorTime); } catch (_) {}

    return box;
  }

  // ---------------------------------------------------------------------------
  // Camera fit calculation
  // Fits a PerspectiveCamera to the full animated envelope.
  // ---------------------------------------------------------------------------
  function calculateFit(THREE, bounds, camera, padding) {
    padding = padding || DEFAULT_PADDING;
    var size = bounds.getSize(new THREE.Vector3());
    var center = bounds.getCenter(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0) return null;

    var safeAspect = Math.max((camera && camera.aspect) || 1, 0.01);
    var fov = (camera && camera.fov) || DEFAULT_FOV;
    var halfFovRad = fov * Math.PI / 360;

    var vertDist = (size.y / 2) / Math.tan(halfFovRad);
    var horizDist = (size.x / 2) / (Math.tan(halfFovRad) * safeAspect);
    var baseDist = Math.max(vertDist, horizDist) * padding;
    var depth = Math.max(size.z, 0.01);

    return {
      center: center,
      distance: baseDist,
      near: Math.max(0.01, baseDist - depth * 2),
      far: Math.max(baseDist + depth * 2, baseDist * 4, 10),
      size: size
    };
  }

  // ---------------------------------------------------------------------------
  // ProductMotionCamera constructor
  // ---------------------------------------------------------------------------

  /**
   * @param {object} options
   * @param {object} options.camera     – THREE.PerspectiveCamera
   * @param {object} options.avatar     – THREE.Object3D (avatar root)
   * @param {object} options.mixer      – THREE.AnimationMixer
   * @param {object} options.clip       – THREE.AnimationClip
   * @param {object} options.renderer   – THREE.WebGLRenderer (for domElement)
   * @param {object} options.THREE      – Three.js namespace
   * @param {number} [options.sampleCount]  – override default sample count
   * @param {number} [options.padding]      – override default padding
   */
  function ProductMotionCamera(options) {
    if (!options || !options.camera || !options.avatar || !options.THREE) {
      throw new TypeError("ProductMotionCamera: camera, avatar, and THREE are required");
    }

    this._camera   = options.camera;
    this._avatar   = options.avatar;
    this._mixer    = options.mixer  || null;
    this._clip     = options.clip   || null;
    this._renderer = options.renderer || null;
    this._THREE    = options.THREE;
    this._sampleCount = options.sampleCount || DEFAULT_SAMPLE_COUNT;
    this._padding     = options.padding     || DEFAULT_PADDING;

    this._fit       = null;   // cached fit result
    this._azimuth   = PRESETS.side.azimuth;
    this._polar     = PRESETS.side.polar;
    this._distance  = null;   // set after fit
    this._minDist   = null;
    this._maxDist   = null;
    this._disposed  = false;
    this._listeners = [];

    // Drag state
    this._dragging  = false;
    this._lastX     = 0;
    this._lastY     = 0;

    // Pinch state
    this._pinchDist = null;
  }

  // ---------------------------------------------------------------------------
  // Initialise: sample bounds, fit camera, attach controls.
  // ---------------------------------------------------------------------------
  ProductMotionCamera.prototype.init = function () {
    if (this._disposed) return this;
    try {
      this._sampleBoundsAndFit();
      this._applyCameraFromAngles();
      if (this._renderer && this._renderer.domElement) {
        this._attachListeners(this._renderer.domElement);
      }
    } catch (_) {}
    return this;
  };

  ProductMotionCamera.prototype._sampleBoundsAndFit = function () {
    var THREE = this._THREE;
    var bounds;

    if (this._mixer && this._clip) {
      bounds = sampleAnimatedBounds(THREE, this._avatar, this._mixer, this._clip, this._sampleCount);
    } else {
      this._avatar.updateMatrixWorld(true);
      bounds = new THREE.Box3().setFromObject(this._avatar);
    }

    var fit = calculateFit(THREE, bounds, this._camera, this._padding);
    if (!fit) return;

    this._fit = fit;
    this._distance = fit.distance;
    this._minDist  = fit.distance * MIN_ZOOM_FACTOR;
    this._maxDist  = fit.distance * MAX_ZOOM_FACTOR;
    this._camera.near = fit.near;
    this._camera.far  = fit.far;
    this._camera.updateProjectionMatrix();
  };

  // ---------------------------------------------------------------------------
  // Apply camera position from current spherical coordinates.
  // ---------------------------------------------------------------------------
  ProductMotionCamera.prototype._applyCameraFromAngles = function () {
    if (!this._fit) return;
    var THREE  = this._THREE;
    var center = this._fit.center;
    var dist   = this._distance || this._fit.distance;

    var x = center.x + dist * Math.sin(this._polar) * Math.sin(this._azimuth);
    var y = center.y + dist * Math.cos(this._polar);
    var z = center.z + dist * Math.sin(this._polar) * Math.cos(this._azimuth);

    this._camera.position.set(x, y, z);
    this._camera.lookAt(center.x, center.y, center.z);
    this._camera.updateProjectionMatrix();
  };

  // ---------------------------------------------------------------------------
  // View presets
  // ---------------------------------------------------------------------------
  ProductMotionCamera.prototype.setSide = function () {
    this._azimuth = PRESETS.side.azimuth;
    this._polar   = PRESETS.side.polar;
    this._applyCameraFromAngles();
    return this;
  };

  ProductMotionCamera.prototype.setFront = function () {
    this._azimuth = PRESETS.front.azimuth;
    this._polar   = PRESETS.front.polar;
    this._applyCameraFromAngles();
    return this;
  };

  ProductMotionCamera.prototype.setThreeQuarter = function () {
    this._azimuth = PRESETS["3/4"].azimuth;
    this._polar   = PRESETS["3/4"].polar;
    this._applyCameraFromAngles();
    return this;
  };

  ProductMotionCamera.prototype.resetView = function () {
    if (this._fit) this._distance = this._fit.distance;
    this.setSide();
    return this;
  };

  // ---------------------------------------------------------------------------
  // Resize: recalculate fit if viewport changed.
  // ---------------------------------------------------------------------------
  ProductMotionCamera.prototype.handleResize = function () {
    if (this._disposed) return;
    try {
      this._sampleBoundsAndFit();
      this._applyCameraFromAngles();
    } catch (_) {}
  };

  // ---------------------------------------------------------------------------
  // Zoom helpers
  // ---------------------------------------------------------------------------
  ProductMotionCamera.prototype._zoomBy = function (delta) {
    if (!this._fit) return;
    var next = this._distance * delta;
    this._distance = Math.max(this._minDist, Math.min(this._maxDist, next));
    this._applyCameraFromAngles();
  };

  // ---------------------------------------------------------------------------
  // Rotate helpers
  // ---------------------------------------------------------------------------
  ProductMotionCamera.prototype._rotateBy = function (dAz, dPol) {
    this._azimuth += dAz;
    this._polar    = Math.max(MIN_POLAR, Math.min(MAX_POLAR, this._polar + dPol));
    this._applyCameraFromAngles();
  };

  // ---------------------------------------------------------------------------
  // Listener attachment / disposal
  // ---------------------------------------------------------------------------
  ProductMotionCamera.prototype._addListener = function (target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._listeners.push([target, type, fn, opts]);
  };

  ProductMotionCamera.prototype._attachListeners = function (el) {
    var self = this;

    // ----- Mouse/pointer drag -----
    var onPointerDown = function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      if (e.touches && e.touches.length === 2) return; // let pinch handle it
      self._dragging = true;
      self._lastX = e.clientX !== undefined ? e.clientX : (e.touches ? e.touches[0].clientX : 0);
      self._lastY = e.clientY !== undefined ? e.clientY : (e.touches ? e.touches[0].clientY : 0);
    };
    var onPointerMove = function (e) {
      if (!self._dragging) return;
      if (e.touches && e.touches.length === 2) { self._dragging = false; return; }
      var cx = e.clientX !== undefined ? e.clientX : (e.touches ? e.touches[0].clientX : self._lastX);
      var cy = e.clientY !== undefined ? e.clientY : (e.touches ? e.touches[0].clientY : self._lastY);
      var dx = cx - self._lastX;
      var dy = cy - self._lastY;
      self._lastX = cx;
      self._lastY = cy;
      self._rotateBy(-dx * 0.005, dy * 0.005);
    };
    var onPointerUp = function () { self._dragging = false; };

    self._addListener(el, "mousedown",   onPointerDown);
    self._addListener(el, "mousemove",   onPointerMove);
    self._addListener(el, "mouseup",     onPointerUp);
    self._addListener(el, "mouseleave",  onPointerUp);
    self._addListener(el, "touchstart",  onPointerDown,  { passive: true });
    self._addListener(el, "touchmove",   onPointerMove,  { passive: true });
    self._addListener(el, "touchend",    onPointerUp);
    self._addListener(el, "touchcancel", onPointerUp);

    // ----- Pinch zoom -----
    var onTouchStart = function (e) {
      if (e.touches.length === 2) {
        var dx = e.touches[1].clientX - e.touches[0].clientX;
        var dy = e.touches[1].clientY - e.touches[0].clientY;
        self._pinchDist = Math.sqrt(dx * dx + dy * dy);
      }
    };
    var onTouchMovePinch = function (e) {
      if (e.touches.length !== 2 || self._pinchDist === null) return;
      var dx = e.touches[1].clientX - e.touches[0].clientX;
      var dy = e.touches[1].clientY - e.touches[0].clientY;
      var newDist = Math.sqrt(dx * dx + dy * dy);
      if (self._pinchDist > 0) {
        var ratio = self._pinchDist / newDist;
        self._zoomBy(ratio);
      }
      self._pinchDist = newDist;
    };
    var onTouchEnd = function (e) {
      if (e.touches.length < 2) self._pinchDist = null;
    };
    self._addListener(el, "touchstart",  onTouchStart,    { passive: true });
    self._addListener(el, "touchmove",   onTouchMovePinch, { passive: true });
    self._addListener(el, "touchend",    onTouchEnd);

    // ----- Wheel zoom -----
    var onWheel = function (e) {
      e.preventDefault();
      var factor = e.deltaY > 0 ? 1.1 : 0.9;
      self._zoomBy(factor);
    };
    self._addListener(el, "wheel", onWheel, { passive: false });
  };

  // ---------------------------------------------------------------------------
  // Dispose
  // ---------------------------------------------------------------------------
  ProductMotionCamera.prototype.dispose = function () {
    if (this._disposed) return;
    this._disposed = true;
    for (var i = 0; i < this._listeners.length; i++) {
      var l = this._listeners[i];
      try { l[0].removeEventListener(l[1], l[2], l[3]); } catch (_) {}
    }
    this._listeners.length = 0;
    this._fit = null;
    this._camera = null;
    this._avatar = null;
    this._mixer  = null;
    this._clip   = null;
    this._renderer = null;
  };

  // ---------------------------------------------------------------------------
  // Public factory
  // ---------------------------------------------------------------------------
  function create(options) {
    var ctrl = new ProductMotionCamera(options);
    ctrl.init();
    return ctrl;
  }

  return Object.freeze({
    create: create,
    ProductMotionCamera: ProductMotionCamera,
    _sampleAnimatedBounds: sampleAnimatedBounds,
    _calculateFit: calculateFit
  });
});
