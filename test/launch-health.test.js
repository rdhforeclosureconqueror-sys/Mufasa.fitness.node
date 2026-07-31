"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildLaunchHealth, valueState } = require("../src/lib/launchHealth");

test("launch health reports runtime evidence without exposing secret values", () => {
  const env = {
    NODE_ENV: "production",
    AUTH_TOKEN_SECRET: "a-secure-value-that-is-long-enough",
    PILOT_LOGIN_PASSWORD: "secure-pilot-password",
    LOGIN_SEED_EMAIL: "pilot@maat.test",
    ALLOWED_ORIGINS: "https://app.maat.test",
    POCKET_PT_DATA_DIR: "/var/data/pocket-pt",
    BILLING_ENABLED: "true",
    STRIPE_SECRET_KEY: "sk_test_secret",
    STRIPE_WEBHOOK_SECRET: "whsec_secret",
    STRIPE_PRICE_ID: "price_test",
    STRIPE_PUBLISHABLE_KEY: "pk_test_public",
    OPENAI_API_KEY: "configured-key"
  };
  const report = buildLaunchHealth({ env, rootDir: process.cwd(), buildVersion: "same", frontendVersion: "same" });
  assert.equal(report.authoritative, true);
  assert.equal(report.checks.find((entry) => entry.id === "deployment").ready, true);
  assert.equal(report.checks.find((entry) => entry.id === "environment").ready, true);
  assert.equal(report.checks.find((entry) => entry.id === "stripe").ready, true);
  assert.equal(JSON.stringify(report).includes("sk_test_secret"), false);
});

test("launch health distinguishes missing and placeholder configuration", () => {
  assert.equal(valueState({}, "AUTH_TOKEN_SECRET"), "missing");
  assert.equal(valueState({ AUTH_TOKEN_SECRET: "replace-with-secret" }, "AUTH_TOKEN_SECRET"), "placeholder");
  const report = buildLaunchHealth({ env: { NODE_ENV: "production" }, rootDir: process.cwd(), buildVersion: "backend", frontendVersion: "frontend" });
  assert.equal(report.checks.find((entry) => entry.id === "deployment").ready, false);
  assert.ok(report.checks.find((entry) => entry.id === "environment").evidence.requiredMissing.length > 0);
  assert.equal(report.checks.find((entry) => entry.id === "pilot_readiness").status, "blocked");
});
