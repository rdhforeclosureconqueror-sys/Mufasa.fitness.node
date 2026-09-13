"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("Push-Up release uses the same mobile-safe unrestricted file chooser as the proven workout avatar flow", () => {
  const release = read("public/push-up-release.html");
  const workout = read("public/workout.html");
  const releaseChooser = release.match(/<input\b[^>]*\bid="releaseAvatarFileInput"[^>]*>/)?.[0];
  const workoutChooser = workout.match(/<input\b[^>]*\bid="avatarFileInput"[^>]*>/)?.[0];
  assert.equal(releaseChooser, '<input id="releaseAvatarFileInput" type="file">');
  assert.equal(workoutChooser, '<input id="avatarFileInput" type="file" />');
  assert.doesNotMatch(releaseChooser, /\baccept=/i, "iOS must not be forced into the Avatar-tagged Files filter");

  const writer = read("public/profile-write-runtime.js");
  assert.match(writer, /if \(!\/\\\.glb\$\/i\.test\(file\.name \|\| ""\)\)/, "ProfileWriteRuntime still validates .glb after browser selection");
});

test("Push-Up release exposes the proven Avaturn upload workflow and phone diagnostics", () => {
  const html = read("public/push-up-release.html");
  for (const id of [
    "releaseCreateAvatarBtn", "releaseAvatarModal", "releaseOpenAvaturnBtn", "releaseAvatarFileInput",
    "releaseUploadAvatarBtn", "releaseAvatarModelUrlInput", "releaseAvatarThumbUrlInput",
    "releaseSaveManualAvatarBtn", "releaseRemoveAvatarBtn", "avatarModalDiagnostics",
    "avatarDiagApiOrigin", "avatarDiagContractUrl", "avatarDiagContractVersion", "avatarDiagContractStatus",
    "avatarDiagBackendBuild", "avatarDiagUploadRoute", "avatarDiagUploadMethod", "avatarDiagMultipartField",
    "avatarDiagMaxUpload", "avatarDiagUpload", "avatarDiagHttp", "avatarDiagServerCode",
    "avatarDiagCompatibility", "avatarDiagProfile", "avatarDiagReload", "avatarDiagReloadHttp",
    "avatarDiagReloadCode", "avatarDiagRuntime", "avatarDiagError", "avatarDiagCanonicalUrl"
  ]) assert.match(html, new RegExp(`id=["']${id}["']`), id);

  assert.match(html, /If your phone shows other file types too, select only the \.glb export/);
  assert.match(html, /push-up-avatar-validation\.js/);
});

test("temporary Push-Up avatar validation center is visible to normal test profiles and remains credential-safe", () => {
  const html = read("public/push-up-release.html");
  const js = read("public/push-up-avatar-validation.js");
  assert.match(html, /id="releaseAvatarValidationPanel" class="avatar-validation"/);
  assert.doesNotMatch(html.match(/<section id="releaseAvatarValidationPanel"[^>]*>/)?.[0] || "", /\bhidden\b/);
  assert.match(html, /Temporary release testing · visible to test profiles/);
  assert.match(js, /releaseTrace\.hidden = false/);
  assert.match(js, /ProfileWriteRuntime\?\.saveAvatarFromInputs/);
  assert.match(js, /ProfileWriteRuntime\?\.clearAvatarMetadata/);
  assert.match(js, /ProfileWriteRuntime\?\.getState/);
  assert.doesNotMatch(js, /role\s*===\s*["']admin|super_admin|isAdmin/i, "validation must not be admin-gated during acceptance");
  assert.doesNotMatch(js, /authorization:\s*`Bearer|sessionToken|arenaTicket/i, "copy/debug adapter must not render credentials");
});

test("ProfileWriteRuntime remains the single upload authority with contract, backend, profile reload, and runtime diagnostics", () => {
  const writer = read("public/profile-write-runtime.js");
  for (const token of [
    "verifyUploadContract", "PocketPTAvatarUploadContract", "avatarDiagContractStatus", "avatarDiagBackendBuild",
    "avatarDiagUploadRoute", "avatarDiagMultipartField", "avatarDiagUpload", "avatarDiagHttp",
    "avatarDiagServerCode", "avatarDiagCompatibility", "avatarDiagReload", "avatarDiagReloadHttp",
    "avatarDiagReloadCode", "CANONICAL_PROFILE_ADOPTION_REQUIRED"
  ]) assert.match(writer, new RegExp(token));

  const release = read("public/push-up-release.js");
  assert.match(release, /ProfileWriteRuntime\?\.uploadAvatarFile\?\.\(file\)/);
  assert.match(release, /verifyArenaAvatar\(state\.auth\.token, 'post-upload'\)/);
  assert.doesNotMatch(release, /new FormData\(/, "release adapter must not create a competing upload transport");
});
