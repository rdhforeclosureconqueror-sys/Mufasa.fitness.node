"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { createApp } = require("../server");
const { runRouteDiagnostics } = require("../src/lib/diagnosticRouteChecker");
const { summarizeDiagnosticWithOpenAI, safeParseJson } = require("../src/lib/diagnosticSummarizer");

async function withServer(t, fn) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-diag-test-"));
  fs.mkdirSync(path.join(tmpRoot, "public", "exercise-db"), { recursive: true });
  fs.copyFileSync(path.join(process.cwd(), "public", "index.html"), path.join(tmpRoot, "public", "index.html"));
  fs.writeFileSync(path.join(tmpRoot, "public", "form-engine.js"), "window.__MUFASA_FORM_ENGINE={};");
  fs.writeFileSync(path.join(tmpRoot, "public", "backend-read.js"), "window.MufasaBackendRead={};");
  fs.writeFileSync(path.join(tmpRoot, "public", "session-write.js"), "window.MufasaSessionWrite={};");
  fs.writeFileSync(path.join(tmpRoot, "public", "fitness.js"), "window.MufasaFitness={};");
  fs.writeFileSync(path.join(tmpRoot, "public", "exercise-db", "index.json"), "[]");

  const app = createApp({ rootDir: tmpRoot });
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return fn({ baseUrl, tmpRoot });
}

test("diagnostic POST stores NDJSON and GET returns recent", async (t) => {
  await withServer(t, async ({ baseUrl, tmpRoot }) => {
    const body = {
      build: { appBuildVersion: "test-build", url: `${baseUrl}/` },
      runtime: { avatarRuntimeStatus: { ready: false }, formEngineStatus: { loaded: true } },
      errors: { recentConsoleErrors: [], recentConsoleWarnings: [] }
    };
    const postRes = await fetch(baseUrl + "/api/admin/diagnostics/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    assert.equal(postRes.status, 201);
    const postJson = await postRes.json();
    assert.equal(postJson.ok, true);
    assert.equal(postJson.data.buildVersion, "test-build");

    const ndjsonPath = path.join(tmpRoot, "data", "ops", "diagnostic-reports.ndjson");
    assert.equal(fs.existsSync(ndjsonPath), true);
    const line = fs.readFileSync(ndjsonPath, "utf8").trim().split("\n").at(-1);
    const stored = JSON.parse(line);
    assert.equal(stored.buildVersion, "test-build");

    const getRes = await fetch(baseUrl + "/api/admin/diagnostics/recent");
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

  const parsed = safeParseJson("{not valid}");
  assert.equal(parsed.ok, false);
});

test("route checker returns pass/fail structure", async (t) => {
  await withServer(t, async ({ baseUrl, tmpRoot }) => {
    const results = await runRouteDiagnostics({ baseUrl, rootDir: tmpRoot });
    assert.ok(Array.isArray(results.checks));
    assert.ok(typeof results.passCount === "number");
    assert.ok(typeof results.failCount === "number");
    assert.ok(Object.prototype.hasOwnProperty.call(results.cdnCheck, "threeCdnPresent"));
  });
});
