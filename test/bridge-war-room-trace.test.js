"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { createApp } = require("../server");

function makeTmpRoot() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-bridge-war-room-"));
  fs.mkdirSync(path.join(tmpRoot, "public", "exercise-db"), { recursive: true });
  fs.writeFileSync(path.join(tmpRoot, "public", "exercise-db", "index.json"), JSON.stringify({ exercises: [] }));
  return tmpRoot;
}

async function post(baseUrl, route, body, headers = {}) {
  const res = await fetch(baseUrl + route, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { res, json };
}

async function get(baseUrl, route, headers = {}) {
  const res = await fetch(baseUrl + route, { method: "GET", headers });
  let json = null;
  try { json = await res.json(); } catch {}
  return { res, json };
}

test("bridge war-room trace: strict trust mode blocks unverified, allows verified, and unlocks protected routes", async (t) => {
  const rootDir = makeTmpRoot();
  const prevAllowed = process.env.AUTH_BRIDGE_ALLOWED_TRUST_MODES;
  const prevClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  process.env.AUTH_BRIDGE_ALLOWED_TRUST_MODES = "";
  process.env.GOOGLE_OAUTH_CLIENT_ID = "pilot-client-id";
  t.after(() => {
    if (prevAllowed == null) delete process.env.AUTH_BRIDGE_ALLOWED_TRUST_MODES;
    else process.env.AUTH_BRIDGE_ALLOWED_TRUST_MODES = prevAllowed;
    if (prevClientId == null) delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    else process.env.GOOGLE_OAUTH_CLIENT_ID = prevClientId;
  });

  const app = createApp({
    rootDir,
    googleIdentityVerifier: async ({ googleIdToken }) => {
      if (googleIdToken !== "google_fixture_token_1234567890") {
        const error = new Error("invalid_fixture_token");
        error.code = "INVALID_FIXTURE_TOKEN";
        throw error;
      }
      return {
        sub: "google-sub-war-room",
        email: "war-room@example.com",
        aud: "pilot-client-id",
        iss: "https://accounts.google.com",
        exp: Math.floor(Date.now() / 1000) + 300
      };
    }
  });

  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  // A) Manual should be blocked when strict low-trust modes are disabled.
  const manualBridge = await post(baseUrl, "/api/auth/bridge", { userId: "manual_user" });
  assert.equal(manualBridge.res.status, 403);
  assert.equal(manualBridge.json?.error?.code, "TRUST_MODE_DISABLED");

  // B) googleEmail-only should be blocked when strict low-trust modes are disabled.
  const emailBridge = await post(baseUrl, "/api/auth/bridge", { googleEmail: "war-room@example.com" });
  assert.equal(emailBridge.res.status, 403);
  assert.equal(emailBridge.json?.error?.code, "TRUST_MODE_DISABLED");

  // C) Verified googleIdToken should issue auth token.
  const verifiedBridge = await post(baseUrl, "/api/auth/bridge", { googleIdToken: "google_fixture_token_1234567890" });
  assert.equal(verifiedBridge.res.status, 201);
  const issuedToken = verifiedBridge.json?.data?.auth?.token;
  assert.ok(issuedToken && issuedToken.length > 20);

  // D) Issued token should authorize /api/me/profile.
  const profile = await get(baseUrl, "/api/me/profile", { authorization: `Bearer ${issuedToken}` });
  assert.equal(profile.res.status, 200);

  // E) Issued token should pass /api/avatar/upload auth layer (400 validation expected without multipart payload).
  const upload = await fetch(baseUrl + "/api/avatar/upload", {
    method: "POST",
    headers: { authorization: `Bearer ${issuedToken}`, "content-type": "application/json" },
    body: JSON.stringify({ note: "auth layer check only" })
  });
  let uploadJson = null;
  try { uploadJson = await upload.json(); } catch {}
  assert.equal(upload.status, 400);
  assert.equal(uploadJson?.error?.code, "VALIDATION_ERROR");
});
