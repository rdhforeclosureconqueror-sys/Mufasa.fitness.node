const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const workout = fs.readFileSync(path.join(root, "public/workout.html"), "utf8");
const avatarRuntime = fs.readFileSync(path.join(root, "public/avatar-runtime.js"), "utf8");
const motionLab = fs.readFileSync(path.join(root, "motion-lab/live-avatar-mirror.html"), "utf8");

test("production workout loads the existing Phase 1B module graph in dependency order", () => {
  const build = "2026-08-28-full-rig-live-mirror-v1";
  const modules = [
    "/motion/normalized-pose.js",
    "/motion/avaturn-live-pose-solver.js",
    "/motion/live-avatar-mirror.js"
  ];
  const positions = modules.map(module => workout.indexOf(`src="${module}`));
  assert.ok(positions.every(position => position > 0));
  assert.ok(positions[0] < positions[1] && positions[1] < positions[2]);
  for (const module of modules) assert.match(workout, new RegExp(`${module.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\?v=${build}`));
  assert.equal((workout.match(new RegExp(build, "g")) || []).length, modules.length);
  for (const module of modules) assert.match(motionLab, new RegExp(`${module.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\?v=${build}`));
  assert.equal((motionLab.match(new RegExp(build, "g")) || []).length, modules.length);
});

test("one mirror owns the actual mounted Avaturn root and existing render RAF update seam", () => {
  assert.match(workout, /const avatar = runtime\?\.modelRoot;/);
  assert.match(workout, /new window\.PocketPTLiveAvatarMirror\.LiveAvatarMirror\(\{/);
  assert.match(workout, /session: avatarControl/);
  assert.match(workout, /liveAvatarMirror\?\.update\(deltaSeconds, Date\.now\(\)\);/);
  assert.match(workout, /runtime\.renderer\.render\(runtime\.scene, runtime\.camera\);/);
  assert.equal((workout.match(/new window\.PocketPTLiveAvatarMirror\.LiveAvatarMirror/g) || []).length, 1);
  assert.doesNotMatch(workout, /PocketPTDisposableMotionSession\.createMotionSession/);
});

test("AvatarRuntime writer is suspended while normalized full-rig mirror has exclusive bone ownership", () => {
  const guard = avatarRuntime.indexOf("isLiveAvatarMirrorActive?.()");
  const legacyWriter = avatarRuntime.indexOf("return renderAvatar3d(posePacket)", guard);
  assert.ok(guard > 0 && legacyWriter > guard);
  assert.match(workout, /isLiveAvatarMirrorActive: \(\) => Boolean\(liveAvatarMirror\)/);
  assert.match(workout, /runtime\.avatarMixer\?\.stopAllAction\?\.\(\)/);
});

test("camera and both avatar modes have bounded, repeatable ownership transitions", () => {
  assert.match(workout, /const liveMode = mode === "avatar_overlay" \|\| mode === "avatar_only";/);
  assert.match(workout, /if \(!liveMode\) \{\s*disposeLiveAvatarMirror\(\);/);
  assert.match(workout, /if \(liveAvatarMirror && liveAvatarMirrorAvatar === avatar\) return true;/);
  assert.match(workout, /liveAvatarMirror\?\.dispose\(\);/);
  assert.match(workout, /window\.addEventListener\("pagehide", disposeLiveAvatarMirror, \{ once: true \}\)/);
  assert.match(workout, /if \(animId\?\.stop\) return animId;/);
  assert.match(workout, /setAvatar3dCanvasVisibility\(avatarVisible\)/);
  assert.match(workout, /setPersonLayerSuppressed\(mode === "avatar_only"\)/);
  assert.match(workout, /applyLiveAvatarRenderPresentation\(getRenderMode\(\)\); lastRenderMode = getRenderMode\(\)/);
});

test("production mirror reuses the existing camera, detector, PoseRuntime stream, renderer and RAF", () => {
  assert.match(workout, /if \(!detector\) await initDetector\(\);/);
  assert.match(workout, /if \(!animId\) runPoseLoop\(\);/);
  assert.match(workout, /isRunning: \(\) => Boolean\(videoEl\?\.srcObject/);
  assert.doesNotMatch(workout, /new\s+CameraController/);
  assert.doesNotMatch(workout, /new\s+AvaturnLivePoseSolver/);
  assert.equal((workout.match(/new threeRef\.WebGLRenderer/g) || []).length, 1);
  assert.equal((workout.match(/function ensureAvatarRenderLoop/g) || []).length, 1);
  assert.match(workout, /poseListenerOwners: liveAvatarMirror \? 1 : 0/);
  assert.match(workout, /diagnosticsMatchLoadedAvatar: Boolean\(proof\.avatarRoot && proof\.avatarRoot === avatarThreeRuntime\?\.modelRoot\)/);
});

test("normalized mirror maps the full bilateral rig", () => {
  const solver = fs.readFileSync(path.join(root, "public/motion/avaturn-live-pose-solver.js"), "utf8");
  const mirror = fs.readFileSync(path.join(root, "public/motion/live-avatar-mirror.js"), "utf8");
  assert.match(mirror, /addEventListener\("pose-runtime:frame"/);
  assert.match(mirror, /normalized\.fromMoveNetPosePacket/);
  assert.match(mirror, /new solverApi\.AvaturnLivePoseSolver/);
  assert.match(solver, /b\.bone\.quaternion\.copy\(b\.currentQuaternion\)/);
  for (const segment of ["leftUpperArm", "rightUpperArm", "leftForearm", "rightForearm", "leftThigh", "rightThigh", "leftLowerLeg", "rightLowerLeg"]) assert.match(solver, new RegExp(segment));
});
