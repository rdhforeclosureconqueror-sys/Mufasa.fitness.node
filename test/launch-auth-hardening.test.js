"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createCredentialStore } = require("../src/repositories/credentialStore");
const { assertProductionSecurityConfig } = require("../server");

test("credential store persists salted password hashes and authenticates after restart", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-credentials-"));
  const filePath = path.join(root, "credentials.json");
  const first = createCredentialStore({ filePath });
  await first.register({ id: "user_1", email: "athlete@example.com", name: "Athlete", password: "correct horse battery staple" });
  const stored = fs.readFileSync(filePath, "utf8");
  assert.doesNotMatch(stored, /correct horse battery staple/);
  assert.equal(fs.statSync(filePath).mode & 0o777, 0o600);
  const restarted = createCredentialStore({ filePath });
  assert.equal((await restarted.authenticate("athlete@example.com", "correct horse battery staple")).id, "user_1");
  assert.equal(await restarted.authenticate("athlete@example.com", "wrong password"), null);
});

test("credential store serializes concurrent registrations without losing users", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-credentials-race-"));
  const store = createCredentialStore({ filePath: path.join(root, "credentials.json") });
  await Promise.all(Array.from({ length: 4 }, (_, index) => store.register({
    id: `user_${index}`,
    email: `athlete${index}@example.com`,
    name: `Athlete ${index}`,
    password: "correct horse battery staple"
  })));
  for (let index = 0; index < 4; index += 1) {
    assert.equal((await store.authenticate(`athlete${index}@example.com`, "correct horse battery staple")).id, `user_${index}`);
  }
});

test("production refuses insecure authentication and CORS configuration", () => {
  assert.throws(() => assertProductionSecurityConfig({ env: { NODE_ENV: "production", AUTH_TOKEN_SECRET: "dev-only-secret-change-me" } }), /Unsafe production security configuration/);
  assert.doesNotThrow(() => assertProductionSecurityConfig({ env: {
    NODE_ENV: "production",
    AUTH_TOKEN_SECRET: "a-high-entropy-secret-with-more-than-32-characters",
    ALLOWED_ORIGINS: "https://app.example.com",
    AUTH_BRIDGE_ALLOW_MANUAL: "false",
    AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE: "false"
  } }));
});
