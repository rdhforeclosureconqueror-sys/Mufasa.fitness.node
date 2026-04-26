"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { createApp } = require("../server");
const { createAuthTokenLib } = require("../src/lib/authToken");
const { runRouteDiagnostics } = require("../src/lib/diagnosticRouteChecker");
const { summarizeDiagnosticWithOpenAI, safeParseJson } = require("../src/lib/diagnosticSummarizer");

function withMockFetch(t, impl) {
  const prev = global.fetch;
  global.fetch = impl;
  t.after(() => {
    global.fetch = prev;
  });
}

async function withServer(t, fn) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-diag-test-"));
  fs.mkdirSync(path.join(tmpRoot, "public", "exercise-db"), { recursive: true });
  fs.copyFileSync(path.join(process.cwd(), "public", "index.html"), path.join(tmpRoot, "public", "index.html"));
  fs.writeFileSync(path.join(tmpRoot, "public", "form-engine.js"), "window.__MUFASA_FORM_ENGINE={};");
  fs.writeFileSync(path.join(tmpRoot, "public", "backend-read.js"), "window.MufasaBackendRead={};");
  fs.writeFileSync(path.join(tmpRoot, "public", "session-write.js"), "window.MufasaSessionWrite={};");
  fs.writeFileSync(path.join(tmpRoot, "public", "fitness.js"), "window.MufasaFitness={};");
  fs.writeFileSync(path.join(tmpRoot, "public", "exercise-db", "index.json"), "[]");

  const prevBootstrap = process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS;
  process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS = "diag_admin";
  t.after(() => {
    if (prevBootstrap == null) delete process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS;
    else process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS = prevBootstrap;
  });
  const app = createApp({ rootDir: tmpRoot });
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const authTokenLib = createAuthTokenLib({ secret: process.env.AUTH_TOKEN_SECRET || "dev-only-secret-change-me" });
  const adminToken = authTokenLib.issueUserToken({
    userId: "diag_admin",
    provider: "manual",
    providerSubject: "diag-admin-subject",
    providerVerified: false,
    identityClass: "manual_unverified"
  }).token;
  return fn({ baseUrl, tmpRoot, adminToken });
}

test("diagnostic POST stores NDJSON and GET returns recent", async (t) => {
  await withServer(t, async ({ baseUrl, tmpRoot, adminToken }) => {
    const body = {
      build: { appBuildVersion: "test-build", url: `${baseUrl}/` },
      runtime: { avatarRuntimeStatus: { ready: false }, formEngineStatus: { loaded: true } },
      errors: { recentConsoleErrors: [], recentConsoleWarnings: [] }
    };
    const postRes = await fetch(baseUrl + "/api/admin/diagnostics/report", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(body)
    });
    assert.equal(postRes.status, 201);
    const postJson = await postRes.json();
    assert.equal(postJson.ok, true);
    assert.equal(postJson.data.buildVersion, "test-build");
    assert.ok(postJson.data.pilotReadiness);
    assert.equal(typeof postJson.data.openAiApiKeyMissing, "boolean");

    const ndjsonPath = path.join(tmpRoot, "data", "ops", "diagnostic-reports.ndjson");
    assert.equal(fs.existsSync(ndjsonPath), true);
    const line = fs.readFileSync(ndjsonPath, "utf8").trim().split("\n").at(-1);
    const stored = JSON.parse(line);
    assert.equal(stored.buildVersion, "test-build");
    assert.ok(stored.pilotReadiness);

    const getRes = await fetch(baseUrl + "/api/admin/diagnostics/recent", {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.equal(getRes.status, 200);
    const getJson = await getRes.json();
    assert.equal(getJson.ok, true);
    assert.ok(Array.isArray(getJson.data.reports));
    assert.ok(getJson.data.reports.length >= 1);
  });
});

test("OpenAI unavailable fallback and invalid JSON parser are safe", async () => {
  const noKey = await summarizeDiagnosticWithOpenAI({}, { apiKey: "" });
  assert.equal(noKey.status, "unavailable");
  assert.match(noKey.summary.summary, /OpenAI unavailable/i);
  assert.equal(noKey.errorType, "api_key_missing");

  const parsed = safeParseJson("{not valid}");
  assert.equal(parsed.ok, false);
});

test("OpenAI summarizer handles 401 invalid key", async (t) => {
  withMockFetch(t, async () => ({
    ok: false,
    status: 401,
    text: async () => JSON.stringify({ error: { message: "Invalid API key" } })
  }));
  const result = await summarizeDiagnosticWithOpenAI({}, { apiKey: "test-key" });
  assert.equal(result.status, "error");
  assert.equal(result.errorType, "auth_error");
  assert.equal(result.httpStatus, 401);
  assert.match(result.errorMessage, /Invalid API key/);
});

test("OpenAI summarizer handles 429 rate limit", async (t) => {
  withMockFetch(t, async () => ({
    ok: false,
    status: 429,
    text: async () => JSON.stringify({ error: { message: "Rate limit exceeded" } })
  }));
  const result = await summarizeDiagnosticWithOpenAI({}, { apiKey: "test-key" });
  assert.equal(result.status, "error");
  assert.equal(result.errorType, "rate_limit");
  assert.equal(result.httpStatus, 429);
});

test("OpenAI summarizer handles 400 model/request errors", async (t) => {
  withMockFetch(t, async () => ({
    ok: false,
    status: 400,
    text: async () => JSON.stringify({ error: { message: "Invalid model" } })
  }));
  const result = await summarizeDiagnosticWithOpenAI({}, { apiKey: "test-key", model: "bad-model" });
  assert.equal(result.status, "error");
  assert.equal(result.errorType, "http_error");
  assert.equal(result.httpStatus, 400);
  assert.equal(result.model, "bad-model");
});

test("OpenAI summarizer handles invalid JSON top-level response", async (t) => {
  withMockFetch(t, async () => ({
    ok: true,
    status: 200,
    text: async () => "not-json"
  }));
  const result = await summarizeDiagnosticWithOpenAI({}, { apiKey: "test-key" });
  assert.equal(result.status, "error");
  assert.equal(result.errorType, "json_parse_error");
  assert.equal(result.httpStatus, 200);
});

test("OpenAI summarizer handles successful JSON response", async (t) => {
  withMockFetch(t, async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      output_text: JSON.stringify({ summary: "ok", likelyRootCause: "none", category: "PASS", confidence: 0.9, evidence: [], recommendedNextSteps: [], codexFixMessage: "none", severity: "low" })
    })
  }));
  const result = await summarizeDiagnosticWithOpenAI({}, { apiKey: "test-key" });
  assert.equal(result.status, "ok");
  assert.equal(result.summary.summary, "ok");
  assert.equal(result.errorType, null);
});

test("OpenAI summarizer handles successful plain text response", async (t) => {
  withMockFetch(t, async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      output_text: "Avatar runtime is failing due to missing GLB."
    })
  }));
  const result = await summarizeDiagnosticWithOpenAI({}, { apiKey: "test-key" });
  assert.equal(result.status, "ok");
  assert.equal(result.errorType, "plain_text_response");
  assert.match(result.summary.summary, /Avatar runtime is failing/);
});

test("diagnostic report endpoint includes OpenAI debug fields", async (t) => {
  const nativeFetch = global.fetch;
  global.fetch = async (url, init) => {
    if (String(url).includes("api.openai.com/v1/responses")) {
      return {
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: { message: "Invalid API key for diagnostics" } })
      };
    }
    return nativeFetch(url, init);
  };
  t.after(() => {
    global.fetch = nativeFetch;
  });
  await withServer(t, async ({ baseUrl, adminToken }) => {
    const prevKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key";
    t.after(() => {
      if (prevKey == null) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = prevKey;
    });
    const body = {
      build: { appBuildVersion: "diag-openai-fields", url: `${baseUrl}/` },
      runtime: { avatarRuntimeStatus: { ready: false }, formEngineStatus: { loaded: true } },
      errors: { recentConsoleErrors: ["boom"], recentConsoleWarnings: [] }
    };
    const postRes = await fetch(baseUrl + "/api/admin/diagnostics/report", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(body)
    });
    assert.equal(postRes.status, 201);
    const postJson = await postRes.json();
    const report = postJson.data;
    assert.equal(report.openAiSummaryStatus, "error");
    assert.equal(report.openAiErrorType, "auth_error");
    assert.equal(report.openAiHttpStatus, 401);
    assert.ok(report.openAiModel);
    assert.match(report.openAiEndpoint, /\/v1\/responses$/);
    assert.match(report.openAiRawResponsePreview, /Invalid API key/);
    assert.equal(report.openAiApiKeyMissing, false);
    assert.ok(report.routeCheck);
    assert.ok(report.pilotReadiness);
  });
});

test("route checker classifies protected routes without failing health", async (t) => {
  await withServer(t, async ({ baseUrl, tmpRoot }) => {
    const results = await runRouteDiagnostics({ baseUrl, rootDir: tmpRoot });
    assert.ok(Array.isArray(results.checks));
    assert.ok(typeof results.passCount === "number");
    assert.ok(typeof results.protectedCount === "number");
    assert.ok(typeof results.failCount === "number");
    assert.ok(Object.prototype.hasOwnProperty.call(results.cdnCheck, "threeCdnPresent"));
    const meCheck = results.checks.find((entry) => entry.route === "/api/me");
    assert.equal(meCheck.classification, "PROTECTED");
    assert.equal(meCheck.status, 401);
  });
});

test("route checker marks network errors as FAIL", async () => {
  const results = await runRouteDiagnostics({
    baseUrl: "http://127.0.0.1:1",
    rootDir: process.cwd()
  });
  assert.ok(results.failCount > 0);
  assert.ok(results.checks.every((entry) => entry.classification === "FAIL"));
});

test("diagnostics access requires auth + admin email allowlist", async (t) => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-diag-authz-test-"));
  fs.mkdirSync(path.join(tmpRoot, "public", "exercise-db"), { recursive: true });
  fs.copyFileSync(path.join(process.cwd(), "public", "index.html"), path.join(tmpRoot, "public", "index.html"));
  fs.writeFileSync(path.join(tmpRoot, "public", "form-engine.js"), "window.__MUFASA_FORM_ENGINE={};");
  fs.writeFileSync(path.join(tmpRoot, "public", "backend-read.js"), "window.MufasaBackendRead={};");
  fs.writeFileSync(path.join(tmpRoot, "public", "session-write.js"), "window.MufasaSessionWrite={};");
  fs.writeFileSync(path.join(tmpRoot, "public", "fitness.js"), "window.MufasaFitness={};");
  fs.writeFileSync(path.join(tmpRoot, "public", "exercise-db", "index.json"), "[]");

  const prevAdminEmails = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "RDHForeclosureConquer@gmail.com, GodBody3333@gmail.com";
  t.after(() => {
    if (prevAdminEmails == null) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = prevAdminEmails;
  });

  const app = createApp({ rootDir: tmpRoot });
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const authTokenLib = createAuthTokenLib({ secret: process.env.AUTH_TOKEN_SECRET || "dev-only-secret-change-me" });

  const nonAdminToken = authTokenLib.issueUserToken({
    userId: "regular_user",
    email: "regular@example.com",
    provider: "manual",
    providerSubject: "regular_user",
    providerVerified: false,
    identityClass: "manual_unverified"
  }).token;
  const firstAdminToken = authTokenLib.issueUserToken({
    userId: "email_admin_1",
    email: "RDHForeclosureConquer@gmail.com",
    provider: "manual",
    providerSubject: "email_admin_1",
    providerVerified: false,
    identityClass: "manual_unverified"
  }).token;
  const secondAdminToken = authTokenLib.issueUserToken({
    userId: "email_admin_2",
    email: "GodBody3333@gmail.com",
    provider: "manual",
    providerSubject: "email_admin_2",
    providerVerified: false,
    identityClass: "manual_unverified"
  }).token;

  const unauthenticatedRes = await fetch(baseUrl + "/api/admin/diagnostics/recent");
  assert.equal(unauthenticatedRes.status, 401);

  const nonAdminRes = await fetch(baseUrl + "/api/admin/diagnostics/recent", {
    headers: { authorization: `Bearer ${nonAdminToken}` }
  });
  assert.equal(nonAdminRes.status, 403);

  const firstAdminRes = await fetch(baseUrl + "/api/admin/diagnostics/recent", {
    headers: { authorization: `Bearer ${firstAdminToken}` }
  });
  assert.equal(firstAdminRes.status, 200);

  const secondAdminRes = await fetch(baseUrl + "/api/admin/diagnostics/recent", {
    headers: { authorization: `Bearer ${secondAdminToken}` }
  });
  assert.equal(secondAdminRes.status, 200);
});
