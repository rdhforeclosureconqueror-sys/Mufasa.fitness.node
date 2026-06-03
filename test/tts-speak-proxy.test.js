"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { createApp } = require("../server");

function setEnv(t, values) {
  const previous = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] == null) delete process.env[key];
    else process.env[key] = values[key];
  }
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

async function withAppServer(t, fn) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-tts-test-"));
  fs.mkdirSync(path.join(tmpRoot, "public", "exercise-db"), { recursive: true });
  fs.writeFileSync(path.join(tmpRoot, "public", "exercise-db", "index.json"), "[]");

  const app = createApp({ rootDir: tmpRoot });
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(() => server.close());

  const { port } = server.address();
  return fn(`http://127.0.0.1:${port}`);
}

async function withVoiceProvider(t, handler) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const bodyText = Buffer.concat(chunks).toString("utf8");
    const record = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: JSON.parse(bodyText || "{}")
    };
    requests.push(record);
    handler(req, res, record);
  });
  server.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(() => server.close());

  const { port } = server.address();
  return { baseUrl: `http://127.0.0.1:${port}`, requests };
}

async function postSpeak(baseUrl, body) {
  return fetch(`${baseUrl}/api/speak`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

test("/api/speak sends x-internal-token and compatible body to AIVOICE_URL /speak", async (t) => {
  const provider = await withVoiceProvider(t, (_req, res) => {
    res.writeHead(200, { "content-type": "audio/mpeg" });
    res.end("audio-bytes");
  });
  setEnv(t, {
    AIVOICE_URL: provider.baseUrl,
    OPENVOICE_UPSTREAM_URL: null,
    SKILL_WORLD_TTS_TOKEN: "skill-world-secret",
    AIVOICE_API_KEY: "legacy-secret"
  });

  await withAppServer(t, async (baseUrl) => {
    const res = await postSpeak(baseUrl, {
      text: "Begin workout",
      voice: "garvey",
      format: "mp3",
      speed: 1.05,
      pitch: 0.95
    });

    assert.equal(res.status, 200);
    assert.equal(await res.text(), "audio-bytes");
    assert.equal(provider.requests.length, 1);
    assert.equal(provider.requests[0].method, "POST");
    assert.equal(provider.requests[0].url, "/speak");
    assert.equal(provider.requests[0].headers["x-internal-token"], "skill-world-secret");
    assert.equal(provider.requests[0].headers["x-aivoice-key"], "legacy-secret");
    assert.deepEqual(provider.requests[0].body, {
      text: "Begin workout",
      voice: "garvey",
      format: "mp3",
      speed: 1.05,
      pitch: 0.95
    });
  });
});

test("/api/speak returns safe error when SKILL_WORLD_TTS_TOKEN is missing", async (t) => {
  const provider = await withVoiceProvider(t, (_req, res) => {
    res.writeHead(200, { "content-type": "audio/mpeg" });
    res.end("should-not-be-called");
  });
  setEnv(t, {
    AIVOICE_URL: provider.baseUrl,
    OPENVOICE_UPSTREAM_URL: null,
    SKILL_WORLD_TTS_TOKEN: null,
    AIVOICE_API_KEY: "legacy-secret"
  });

  await withAppServer(t, async (baseUrl) => {
    const res = await postSpeak(baseUrl, { text: "Begin workout" });
    const json = await res.json();

    assert.equal(res.status, 500);
    assert.deepEqual(json, { ok: false, error: "TTS_INTERNAL_TOKEN_MISSING" });
    assert.equal(provider.requests.length, 0);
  });
});

test("/api/speak maps provider 401 to TTS_PROVIDER_AUTH_FAILED", async (t) => {
  const provider = await withVoiceProvider(t, (_req, res) => {
    res.writeHead(401, { "content-type": "text/plain" });
    res.end("upstream unauthorized");
  });
  setEnv(t, {
    AIVOICE_URL: `${provider.baseUrl}/speak`,
    OPENVOICE_UPSTREAM_URL: null,
    SKILL_WORLD_TTS_TOKEN: "skill-world-secret",
    AIVOICE_API_KEY: null
  });

  await withAppServer(t, async (baseUrl) => {
    const res = await postSpeak(baseUrl, { text: "Begin workout" });
    const json = await res.json();

    assert.equal(res.status, 502);
    assert.deepEqual(json, { ok: false, error: "TTS_PROVIDER_AUTH_FAILED" });
    assert.equal(provider.requests.length, 1);
    assert.equal(provider.requests[0].url, "/speak");
  });
});

test("/api/speak does not log or return TTS token values", async (t) => {
  const secret = "super-secret-token-value";
  const legacySecret = "legacy-secret-value";
  const logs = [];
  const originalInfo = console.info;
  const originalWarn = console.warn;
  console.info = (...args) => logs.push(args);
  console.warn = (...args) => logs.push(args);
  t.after(() => {
    console.info = originalInfo;
    console.warn = originalWarn;
  });

  const provider = await withVoiceProvider(t, (_req, res) => {
    res.writeHead(401, { "content-type": "text/plain" });
    res.end(`unauthorized ${secret} ${legacySecret}`);
  });
  setEnv(t, {
    AIVOICE_URL: provider.baseUrl,
    OPENVOICE_UPSTREAM_URL: null,
    SKILL_WORLD_TTS_TOKEN: secret,
    AIVOICE_API_KEY: legacySecret
  });

  await withAppServer(t, async (baseUrl) => {
    const res = await postSpeak(baseUrl, { text: "Begin workout" });
    const responseText = await res.text();
    const logText = JSON.stringify(logs);

    assert.equal(res.status, 502);
    assert.doesNotMatch(responseText, new RegExp(secret));
    assert.doesNotMatch(responseText, new RegExp(legacySecret));
    assert.doesNotMatch(logText, new RegExp(secret));
    assert.doesNotMatch(logText, new RegExp(legacySecret));
    assert.match(logText, /\[redacted\]/);
  });
});
