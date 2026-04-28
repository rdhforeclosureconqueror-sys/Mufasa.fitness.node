#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const frontendPath = path.join(repoRoot, "public", "index.html");
const source = fs.readFileSync(frontendPath, "utf8");

const checks = [
  {
    label: "frontend uses backend absolute URL for /api/auth/bridge",
    pass: source.includes('const NODE_AUTH_BRIDGE_URL = NODE_BASE_URL + "/api/auth/bridge";')
  },
  {
    label: "no accidental post to frontend origin",
    pass: !source.includes('fetch("/api/auth/bridge"')
  },
  {
    label: "payload includes provider/trustMode/credential/googleIdToken",
    pass: source.includes('provider: "google"')
      && source.includes('trustMode: "google_verified"')
      && source.includes("credential: googleCredential")
      && source.includes("googleIdToken: googleCredential")
  },
  {
    label: "Google callback directly calls bridge fetch",
    pass: source.includes("await directGoogleBridgeFetch(googleIdToken)")
  },
  {
    label: "visible login status exists",
    pass: source.includes('setGoogleSignInStatus("Google credential received")')
      && source.includes('setGoogleSignInStatus("Sending to backend")')
      && source.includes("setGoogleSignInStatus(`Backend responded: ${res.status}`)")
      && source.includes('setGoogleSignInStatus("Signed in")')
      && source.includes("setGoogleSignInStatus(`Failed: ${reason}`)")
  }
];

let failed = false;
for (const check of checks) {
  const marker = check.pass ? "PASS" : "FAIL";
  // eslint-disable-next-line no-console
  console.log(`[${marker}] ${check.label}`);
  if (!check.pass) failed = true;
}

if (failed) process.exit(1);
