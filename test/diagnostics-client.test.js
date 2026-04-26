"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const vm = require("vm");
const path = require("path");

function loadClient(globals = {}) {
  const source = fs.readFileSync(path.join(process.cwd(), "public", "diagnostics-client.js"), "utf8");
  const listeners = {};
  const context = {
    console,
    fetch: async () => ({ ok: true }),
    navigator: { userAgent: "TestAgent Mobile" },
    location: { href: "https://example.com/" },
    window: null,
    ...globals
  };
  context.addEventListener = (name, cb) => { listeners[name] = cb; };
  context.dispatchEvent = () => {};
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

test("collector includes avatarRuntimeStatus and formEngineStatus", () => {
  const ctx = loadClient({
    __avatarRuntimeStatus: { readyEventFired: false },
    __formEngineStatus: { loaded: true }
  });
  const report = ctx.__collectDiagnosticReport();
  assert.equal(report.runtime.avatarRuntimeStatus.readyEventFired, false);
  assert.equal(report.runtime.formEngineStatus.loaded, true);
});

test("collector handles missing globals safely", () => {
  const ctx = loadClient();
  const report = ctx.__collectDiagnosticReport();
  assert.equal(report.runtime.avatarRuntimeStatus, null);
  assert.equal(report.runtime.formEngineStatus, null);
});

test("collector does not include raw video/frame data", () => {
  const ctx = loadClient({ rawVideo: "abc", cameraFrame: "xyz" });
  const report = ctx.__collectDiagnosticReport();
  assert.equal("rawVideo" in report, false);
  assert.equal("cameraFrame" in report, false);
});
