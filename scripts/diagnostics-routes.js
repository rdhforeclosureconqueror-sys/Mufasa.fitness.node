#!/usr/bin/env node
"use strict";

const { runRouteDiagnostics } = require("../src/lib/diagnosticRouteChecker");

(async () => {
  const result = await runRouteDiagnostics({
    baseUrl: process.env.BASE_URL || "http://127.0.0.1:3000",
    rootDir: process.cwd()
  });

  console.log(`Diagnostics route check @ ${result.baseUrl}`);
  for (const item of result.checks) {
    const status = item.classification || (item.ok ? "PASS" : "FAIL");
    console.log(`${status} ${item.route} (status=${item.status}, duration=${item.durationMs}ms${item.error ? `, error=${item.error}` : ""})`);
  }
  console.log(`CDN three.module.js present: ${result.cdnCheck.threeCdnPresent ? "PASS" : "FAIL"}`);
  console.log(`CDN GLTFLoader present: ${result.cdnCheck.gltfLoaderCdnPresent ? "PASS" : "FAIL"}`);
  if (result.avatarRouteCheck) {
    console.log(`${result.avatarRouteCheck.ok ? "PASS" : "FAIL"} avatar route ${result.avatarRouteCheck.route}`);
  }

  process.exitCode = result.failCount > 0 ? 1 : 0;
})();
