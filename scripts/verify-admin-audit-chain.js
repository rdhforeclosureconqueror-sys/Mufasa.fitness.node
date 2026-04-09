#!/usr/bin/env node
"use strict";

const path = require("path");
const { createAdminAuditLog } = require("../src/lib/adminAuditLog");

const jsonOnly = process.argv.includes("--json");
const rootDir = process.cwd();
const auditPath = process.env.ADMIN_AUDIT_PATH || path.join(rootDir, "data", "ops", "admin-audit.ndjson");
const maxArchives = Number(process.env.ADMIN_AUDIT_MAX_ARCHIVES || 4);

const log = createAdminAuditLog({
  filePath: auditPath,
  maxArchives,
  hashChain: process.env.ADMIN_AUDIT_HASH_CHAIN !== "false"
});

const result = log.verifyFullChain();
if (jsonOnly) {
  process.stdout.write(`${JSON.stringify({ check: "admin_audit_chain", ...result })}\n`);
  process.exit(result.verified ? 0 : 1);
}

if (result.verified) {
  console.log("PASS admin audit chain verified", JSON.stringify({
    entryCount: result.entryCount,
    filesScanned: result.filesScanned.length,
    filePath: result.filePath
  }));
  process.exit(0);
}

console.error("FAIL admin audit chain verification", JSON.stringify({
  issueCount: result.issueCount,
  issues: result.issues,
  entryCount: result.entryCount,
  filesScanned: result.filesScanned
}));
process.exit(1);
