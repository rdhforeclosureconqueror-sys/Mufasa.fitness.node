(function (window, document) {
  "use strict";

  var runtime = window.PocketPTDisposableMotionSession;
  if (!runtime || typeof runtime.createMotionSession !== "function") return;

  var originalCreate = runtime.createMotionSession.bind(runtime);
  var activeSession = null;
  var view = { yaw: 0, pitch: 0 };

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function degrees(value) { return value * Math.PI / 180; }

  function targetFor(session) {
    if (!session?.THREE || !session?.avatar) return session?.THREE ? new session.THREE.Vector3(0, 0.8, 0) : null;
    session.avatar.updateMatrixWorld?.(true);
    var box = new session.THREE.Box3().setFromObject(session.avatar);
    return box.getCenter(new session.THREE.Vector3());
  }

  function radiusFor(session, target) {
    var camera = session?.camera;
    if (!camera || !target) return 2.5;
    var distance = camera.position.distanceTo(target);
    return Number.isFinite(distance) && distance > 0.05 ? distance : 2.5;
  }

  function applyView(yawDegrees, pitchDegrees) {
    var session = activeSession;
    if (!session?.camera || !session?.THREE) return { status: "failed", code: "inspection_camera_unavailable" };
    var target = targetFor(session);
    if (!target) return { status: "failed", code: "inspection_target_unavailable" };
    view.yaw = Number(yawDegrees) || 0;
    view.pitch = clamp(Number(pitchDegrees) || 0, -70, 70);
    var radius = radiusFor(session, target);
    var yaw = degrees(view.yaw), pitch = degrees(view.pitch), cp = Math.cos(pitch);
    session.camera.position.set(
      target.x + radius * Math.sin(yaw) * cp,
      target.y + radius * Math.sin(pitch),
      target.z + radius * Math.cos(yaw) * cp
    );
    session.camera.lookAt(target);
    session.camera.updateProjectionMatrix?.();
    return { status: "ready", yawDegrees: view.yaw, pitchDegrees: view.pitch };
  }

  function orbitBy(deltaYaw, deltaPitch) {
    return applyView(view.yaw + (Number(deltaYaw) || 0), view.pitch + (Number(deltaPitch) || 0));
  }

  function enableButtons(enabled) {
    ["viewFront", "viewRight", "viewBack", "viewLeft", "viewReset"].forEach(function (id) {
      var button = document.getElementById(id);
      if (button) button.disabled = !enabled;
    });
  }

  function wireButtons() {
    var presets = {
      viewFront: [0, 0],
      viewRight: [90, 0],
      viewBack: [180, 0],
      viewLeft: [-90, 0],
      viewReset: [0, 0]
    };
    Object.keys(presets).forEach(function (id) {
      var button = document.getElementById(id);
      if (!button || button.dataset.inspectionWired === "1") return;
      button.dataset.inspectionWired = "1";
      button.addEventListener("click", function () { applyView(presets[id][0], presets[id][1]); });
    });
  }

  function wireCanvas(session) {
    var canvas = session?.canvas;
    if (!canvas || canvas.dataset.inspectionOrbitWired === "1") return;
    canvas.dataset.inspectionOrbitWired = "1";
    canvas.style.touchAction = "none";
    var dragging = false, pointerId = null, lastX = 0, lastY = 0;

    session.addListener(canvas, "pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true; pointerId = event.pointerId; lastX = event.clientX; lastY = event.clientY;
      canvas.setPointerCapture?.(event.pointerId);
      event.preventDefault?.();
    });
    session.addListener(canvas, "pointermove", function (event) {
      if (!dragging || event.pointerId !== pointerId) return;
      var dx = event.clientX - lastX, dy = event.clientY - lastY;
      lastX = event.clientX; lastY = event.clientY;
      orbitBy(dx * 0.45, -dy * 0.30);
      event.preventDefault?.();
    });
    function release(event) {
      if (event.pointerId !== pointerId) return;
      dragging = false; pointerId = null;
      canvas.releasePointerCapture?.(event.pointerId);
    }
    session.addListener(canvas, "pointerup", release);
    session.addListener(canvas, "pointercancel", release);
  }

  function wrappedCreate(options) {
    var session = originalCreate(options);
    activeSession = session;
    var originalStart = session.start.bind(session);
    var originalDispose = session.dispose.bind(session);
    session.start = async function (container) {
      var out = await originalStart(container);
      if (out?.status === "ready") {
        activeSession = session;
        view = { yaw: 0, pitch: 0 };
        wireButtons(); wireCanvas(session); enableButtons(true);
      }
      return out;
    };
    session.dispose = function () {
      if (activeSession === session) { activeSession = null; enableButtons(false); }
      return originalDispose();
    };
    return session;
  }

  window.PocketPTDisposableMotionSession = Object.freeze({ ...runtime, createMotionSession: wrappedCreate });
  window.PocketPTMotionLabInspection = Object.freeze({
    wireButtons: wireButtons,
    setView: applyView,
    orbitBy: orbitBy,
    front: function () { return applyView(0, 0); },
    right: function () { return applyView(90, 0); },
    back: function () { return applyView(180, 0); },
    left: function () { return applyView(-90, 0); },
    reset: function () { return applyView(0, 0); }
  });
  wireButtons();
})(window, document);
