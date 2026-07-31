#!/usr/bin/env node
"use strict";
const { validateEnvironment } = require("../src/diagnostics/environmentValidator");
const profileArg = process.argv.find(arg => arg.startsWith("--profile="));
const profile = profileArg ? profileArg.split("=")[1] : process.env.NODE_ENV || "development";
const report = validateEnvironment(process.env, { profile });
for (const entry of report.entries) console.log(`${entry.status.padEnd(14)} ${entry.name}`);
console.log(JSON.stringify({ profile, counts: report.counts, aliases: report.aliases }, null, 2));
if (report.counts.invalid || report.counts.placeholder || report.counts.missing) process.exitCode = 1;
