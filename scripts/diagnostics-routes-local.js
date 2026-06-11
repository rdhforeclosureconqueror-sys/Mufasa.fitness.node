#!/usr/bin/env node
"use strict";

const { createApp } = require("../server");
const { runRouteDiagnostics } = require("../src/lib/diagnosticRouteChecker");

async function main() {
  const rootDir = process.cwd();
  const app = createApp({ rootDir });
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const result = await runRouteDiagnostics({ baseUrl, rootDir: process.cwd() });

    console.log(`Diagnostics route check @ ${result.baseUrl}`);
    for (const item of result.checks) {
      const status = item.classification || (item.ok ? "PASS" : "FAIL");
      console.log(`${status} ${item.route} (status=${item.status}, duration=${item.durationMs}ms${item.error ? `, error=${item.error}` : ""})`);
    }
    console.log(`CDN three.module.js present: ${result.cdnCheck.threeCdnPresent ? "PASS" : "FAIL"}`);
    console.log(`CDN GLTFLoader present: ${result.cdnCheck.gltfLoaderCdnPresent ? "PASS" : "FAIL"}`);
    if (result.avatarRouteCheck) console.log(`${result.avatarRouteCheck.ok ? "PASS" : "FAIL"} avatar route ${result.avatarRouteCheck.route}`);
    process.exitCode = result.failCount > 0 ? 1 : 0;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error("Local diagnostics route check failed", error);
  process.exit(1);
});
