"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createWorldBridgeApp } = require("../world-bridge-server");
const { createAvatarBridge } = require("../src/world/avatarBridge");
const { glb, nodes } = require("./avatar-glb-validator.test");

async function fixture(t) {
  const env = { NODE_ENV: "test", PILOT_LOGIN_PASSWORD: "world-avatar-test", AUTH_TEST_LOGIN_FIXTURE_ENABLED: "true" };
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "world-avatar-"));
  let server;
  t.after(async () => {
    if (server?.listening) await new Promise(resolve => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const rootDir = path.join(root, "app");
  const dataDir = path.join(root, "persistent", "data");
  const avatarUploadDir = path.join(root, "persistent", "avatars");
  fs.mkdirSync(path.join(rootDir, "public", "exercise-db"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "public", "exercise-db", "index.json"), "[]");
  let clock = 1_800_000_000_000;
  const app = createWorldBridgeApp({
    rootDir, dataDir, avatarUploadDir,
    worldBridgeSecureCookie: false, worldBridgeNow: () => clock, worldBridgeTtlMs: 60_000,
    backendPublicUrl: "https://backend.example.test"
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (url, options) => fetch(`${base}${url}`, options);

  async function login(userId) {
    const response = await request("/api/auth/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: `${userId}@example.test`, password: env.PILOT_LOGIN_PASSWORD, testUserId: userId })
    });
    assert.equal(response.status, 200);
    return (await response.json()).token;
  }

  async function upload(token, label) {
    const bytes = glb([...nodes, { name: `fixture_${label}` }]);
    const form = new FormData();
    form.append("avatar", new Blob([bytes]), "member.glb");
    const response = await request("/api/avatar/upload", {
      method: "POST", headers: { authorization: `Bearer ${token}` }, body: form
    });
    assert.equal(response.status, 201);
    return { ...(await response.json()).data, bytes };
  }

  async function launch(token) {
    const response = await request("/api/game/sessions", {
      method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ experienceType: "PUSH_UP_ARENA", challengeId: "push_up" })
    });
    assert.equal(response.status, 201);
    const launch = (await response.json()).data;
    const ticket = new URLSearchParams(new URL(launch.launchUrl).hash.slice(1)).get("ticket");
    const exchange = await request("/api/game/session-exchange", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ticket })
    });
    assert.equal(exchange.status, 200);
    const setCookie = exchange.headers.get("set-cookie");
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /Path=\/api\/game/);
    return setCookie.split(";")[0];
  }

  async function bootstrap(cookie) {
    const response = await request("/api/game/bootstrap", { headers: { cookie } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    return (await response.json()).data;
  }

  async function select(token, avatar, extra = {}) {
    const response = await request("/api/me/profile", {
      method: "PUT", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ profile: { avatar, ...extra } })
    });
    assert.equal(response.status, 200);
    return response.json();
  }

  return { root, dataDir, avatarUploadDir, request, login, upload, launch, bootstrap, select, advance: ms => { clock += ms; } };
}

const profileAvatar = (asset, updatedAt = 1_800_000_000_000) => ({
  avatarProvider: "avaturn", avatarModelUrl: asset.avatarModelUrl, avatarUpdatedAt: updatedAt
});

test("production entry connects a real canonical upload to the arena bootstrap and exact GLB bytes", async t => {
  const f = await fixture(t);
  const token = await f.login("world_avatar_a");
  const uploaded = await f.upload(token, "member_a");
  const cookie = await f.launch(token);
  const payload = await f.bootstrap(cookie);
  assert.equal(payload.protocolVersion, 1);
  assert.equal(payload.member.id, "world_avatar_a");
  assert.equal(payload.avatar.avatarId, uploaded.assetId);
  assert.equal(payload.avatar.format, "glb");
  assert.match(payload.avatar.profileVersion, /^[a-f0-9]{32}$/);
  assert.equal(payload.avatar.assetUrl, `/api/game/avatar/asset?version=${payload.avatar.profileVersion}`);
  assert.equal(payload.avatarState.status, "AVAILABLE");
  assert.deepEqual(Object.keys(payload.avatar).sort(), ["assetUrl", "avatarId", "format", "profileVersion"]);
  const text = JSON.stringify(payload);
  for (const privateValue of [token, cookie, uploaded.avatarModelUrl, f.root, "@example.test", "password"]) {
    assert.equal(text.includes(privateValue), false);
  }
  const response = await f.request(payload.avatar.assetUrl, { headers: { cookie } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^model\/gltf-binary/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.match(response.headers.get("vary"), /Cookie/);
  assert.equal(response.headers.get("x-pocketpt-avatar-version"), payload.avatar.profileVersion);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), uploaded.bytes);
  assert.ok(fs.existsSync(path.join(f.avatarUploadDir, `${uploaded.assetId}.glb`)));
  assert.equal(fs.existsSync(path.join(f.root, "app", "public", "uploads", "avatars", `${uploaded.assetId}.glb`)), false);
  assert.deepEqual((await f.bootstrap(cookie)).avatar, payload.avatar, "unchanged selection has a stable revision");
});

test("arena avatar delivery requires its cookie and never follows a caller-selected member or asset", async t => {
  const f = await fixture(t);
  const a = await f.login("world_owner_a"), b = await f.login("world_owner_b");
  const assetA = await f.upload(a, "a"), assetB = await f.upload(b, "b");
  const cookieA = await f.launch(a), cookieB = await f.launch(b);
  const avatarA = (await f.bootstrap(cookieA)).avatar;
  assert.equal((await f.request(avatarA.assetUrl)).status, 401);
  assert.equal((await f.request(avatarA.assetUrl, { headers: { authorization: `Bearer ${a}` } })).status, 401);
  assert.equal((await f.request(avatarA.assetUrl, { headers: { cookie: cookieB } })).status, 409);
  const ignoredSelection = await f.request(`${avatarA.assetUrl}&userId=world_owner_b&assetId=${assetB.assetId}`, { headers: { cookie: cookieA } });
  assert.equal(ignoredSelection.status, 200);
  assert.deepEqual(Buffer.from(await ignoredSelection.arrayBuffer()), assetA.bytes);

  // Even a profile containing another member's URL cannot bypass the shared owner check.
  await f.select(b, profileAvatar(assetA));
  const foreign = await f.bootstrap(cookieB);
  assert.equal(foreign.avatar, null);
  assert.equal(foreign.avatarState.reason, "AVATAR_ASSET_UNAVAILABLE");
  assert.equal(JSON.stringify(foreign).includes(assetA.assetId), false);
  assert.equal((await f.request(avatarA.assetUrl, { headers: { cookie: cookieB } })).status, 404);
  assert.equal((await f.request(assetA.avatarModelUrl, { headers: { authorization: `Bearer ${b}` } })).status, 404);
  assert.equal((await f.request(assetA.avatarModelUrl, { headers: { authorization: `Bearer ${a}` } })).status, 200);
});

test("expired, revoked, and malformed arena cookies cannot download avatars", async t => {
  const f = await fixture(t), token = await f.login("world_expiry");
  await f.upload(token, "expiry");
  const cookie = await f.launch(token), avatar = (await f.bootstrap(cookie)).avatar;
  assert.equal((await f.request(avatar.assetUrl, { headers: { cookie: "PocketPTArenaSession=%E0%A4%A" } })).status, 401);
  assert.equal((await f.request("/api/game/session", { method: "DELETE", headers: { cookie } })).status, 200);
  assert.equal((await f.request(avatar.assetUrl, { headers: { cookie } })).status, 401);
  const replacementCookie = await f.launch(token);
  f.advance(60_001);
  for (const url of ["/api/game/bootstrap", avatar.assetUrl]) {
    const response = await f.request(url, { headers: { cookie: replacementCookie } });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
});

test("replacing and removing the canonical avatar invalidates old arena downloads", async t => {
  const f = await fixture(t), token = await f.login("world_replace");
  const first = await f.upload(token, "first"), cookie = await f.launch(token);
  const old = (await f.bootstrap(cookie)).avatar;
  const second = await f.upload(token, "second");
  const current = (await f.bootstrap(cookie)).avatar;
  assert.notEqual(first.assetId, second.assetId);
  assert.equal(current.avatarId, second.assetId);
  assert.notEqual(current.profileVersion, old.profileVersion);
  const stale = await f.request(old.assetUrl, { headers: { cookie } });
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).error.code, "ARENA_AVATAR_VERSION_CHANGED");
  const download = await f.request(current.assetUrl, { headers: { cookie } });
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), second.bytes);
  await f.select(token, null);
  const cleared = await f.bootstrap(cookie);
  assert.equal(cleared.avatar, null);
  assert.equal(cleared.avatarState.reason, "AVATAR_NOT_CONFIGURED");
  assert.equal((await f.request(current.assetUrl, { headers: { cookie } })).status, 404);
});

test("a member without an avatar gets an explicit default-avatar contract and keeps their arena identity", async t => {
  const f = await fixture(t), token = await f.login("world_no_avatar"), cookie = await f.launch(token);
  const payload = await f.bootstrap(cookie);
  assert.equal(payload.member.id, "world_no_avatar");
  assert.equal(payload.avatar, null);
  assert.deepEqual(payload.avatarState, { status: "FALLBACK", reason: "AVATAR_NOT_CONFIGURED", fallback: "DEFAULT_AVATAR" });
  const response = await f.request("/api/game/avatar/asset", { headers: { cookie } });
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.details.reason, "AVATAR_NOT_CONFIGURED");
});

test("external avatar URLs are not fetched or interpreted as local assets", async t => {
  const f = await fixture(t), token = await f.login("world_external"), uploaded = await f.upload(token, "external");
  const cookie = await f.launch(token), old = (await f.bootstrap(cookie)).avatar;
  await f.select(token, { ...profileAvatar(uploaded), avatarModelUrl: `https://untrusted.example.test${uploaded.avatarModelUrl}` });
  const payload = await f.bootstrap(cookie);
  assert.equal(payload.avatar, null);
  assert.equal(payload.avatarState.reason, "AVATAR_SOURCE_UNSUPPORTED");
  assert.equal(JSON.stringify(payload).includes("untrusted.example.test"), false);
  assert.equal((await f.request(old.assetUrl, { headers: { cookie } })).status, 404);
});

test("configured canonical absolute URLs and legacy uploads use the same ownership boundary", async t => {
  const f = await fixture(t), token = await f.login("world_legacy"), uploaded = await f.upload(token, "legacy");
  const cookie = await f.launch(token);
  await f.select(token, { ...profileAvatar(uploaded), avatarModelUrl: `https://backend.example.test${uploaded.avatarModelUrl}` });
  assert.equal((await f.bootstrap(cookie)).avatar.avatarId, uploaded.assetId);
  await f.select(token, { ...profileAvatar(uploaded), avatarModelUrl: `/uploads/avatars/${uploaded.assetId}.glb` });
  const metadataPath = path.join(f.avatarUploadDir, `${uploaded.assetId}.json`);
  fs.rmSync(metadataPath);
  const legacy = await f.bootstrap(cookie);
  assert.equal(legacy.avatar.avatarId, uploaded.assetId);
  assert.equal(JSON.parse(fs.readFileSync(metadataPath)).ownerUserId, "world_legacy");
  const response = await f.request(legacy.avatar.assetUrl, { headers: { cookie } });
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), uploaded.bytes);
});

test("missing GLBs and corrupt ownership metadata produce a fallback without exposing storage paths", async t => {
  const f = await fixture(t), token = await f.login("world_missing"), uploaded = await f.upload(token, "missing");
  const cookie = await f.launch(token), old = (await f.bootstrap(cookie)).avatar;
  fs.writeFileSync(path.join(f.avatarUploadDir, `${uploaded.assetId}.json`), "invalid private metadata");
  let payload = await f.bootstrap(cookie);
  assert.equal(payload.avatarState.reason, "AVATAR_ASSET_UNAVAILABLE");
  assert.equal(JSON.stringify(payload).includes(f.root), false);
  assert.equal((await f.request(old.assetUrl, { headers: { cookie } })).status, 404);
  fs.rmSync(path.join(f.avatarUploadDir, `${uploaded.assetId}.glb`));
  payload = await f.bootstrap(cookie);
  assert.equal(payload.avatar, null);
  assert.equal(payload.avatarState.reason, "AVATAR_ASSET_UNAVAILABLE");
});

test("avatar URLs require one valid revision and metadata-only profile edits keep it stable", async t => {
  const f = await fixture(t), token = await f.login("world_revision"), uploaded = await f.upload(token, "revision");
  const selected = profileAvatar(uploaded);
  await f.select(token, selected);
  const cookie = await f.launch(token), avatar = (await f.bootstrap(cookie)).avatar;
  for (const query of ["", "?version=invalid", `?version=${avatar.profileVersion}&version=${avatar.profileVersion}`]) {
    const response = await f.request(`/api/game/avatar/asset${query}`, { headers: { cookie } });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "ARENA_AVATAR_VERSION_REQUIRED");
  }
  await f.select(token, selected, { notes: "private coaching notes" });
  const updated = await f.bootstrap(cookie);
  assert.equal(updated.avatar.profileVersion, avatar.profileVersion);
  assert.equal(JSON.stringify(updated).includes("private coaching notes"), false);
});

test("canonical profile read failures return bounded JSON without internal error details", async t => {
  const f = await fixture(t), token = await f.login("world_read_error");
  await f.upload(token, "read_error");
  const cookie = await f.launch(token), avatar = (await f.bootstrap(cookie)).avatar;
  fs.writeFileSync(path.join(f.dataDir, "users", "world_read_error.json"), "private malformed profile contents");
  for (const url of ["/api/game/bootstrap", avatar.assetUrl]) {
    const response = await f.request(url, { headers: { cookie } });
    assert.equal(response.status, 503);
    assert.match(response.headers.get("content-type"), /application\/json/);
    const body = await response.json();
    assert.equal(body.error.code, "ARENA_AVATAR_READ_FAILED");
    assert.equal(JSON.stringify(body).includes(f.root), false);
    assert.equal(JSON.stringify(body).includes("malformed profile"), false);
  }
});

test("an unavailable or disabled canonical avatar capability cannot expose an asset", () => {
  assert.equal(createAvatarBridge().describe("member").avatarState.reason, "AVATAR_BRIDGE_UNAVAILABLE");
  const bridge = createAvatarBridge({ assets: { isEnabled: () => false, getMemberAvatar: () => assert.fail("must not read a disabled avatar") } });
  assert.equal(bridge.describe("member").avatarState.reason, "AVATAR_FEATURE_DISABLED");
  assert.throws(() => bridge.read("member", "a".repeat(32)), { code: "ARENA_AVATAR_UNAVAILABLE" });
});
