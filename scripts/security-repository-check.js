"use strict";
const fs = require("node:fs");
const path = require("node:path");
const contract = require("../config/route-authorization-contract");
const sinks = require("../config/intentional-html-sinks");
const root = path.join(__dirname, "..");
const failures = [];
const source = (file) => fs.readFileSync(path.join(root, file), "utf8");
const server = source("server.js");
const routes = [...server.matchAll(/app\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g)].map((m) => `${m[1].toUpperCase()} ${m[2]}`);
const declared = contract.map((r) => `${r.method} ${r.path}`);
if (new Set(routes).size !== routes.length) failures.push("duplicate server route declaration");
if (new Set(declared).size !== declared.length) failures.push("duplicate authorization contract entry");
if (JSON.stringify([...routes].sort()) !== JSON.stringify([...declared].sort())) failures.push("authorization contract drift");
for (const route of contract) {
  for (const key of ["authentication", "allowedRoles", "requiredPermissions", "membership", "ownership", "featureFlag", "publicOutput"]) {
    if (!(key in route)) failures.push(`${route.method} ${route.path}: missing ${key}`);
  }
}
for (const [file, review] of Object.entries(sinks)) {
  if (!fs.existsSync(path.join(root, file))) { failures.push(`${file}: missing reviewed sink file`); continue; }
  const count = (source(file).match(/\.(?:innerHTML|outerHTML)\s*(?:\+?=)|insertAdjacentHTML\s*\(/g) || []).length;
  if (count !== review.count) failures.push(`${file}: HTML sink count ${count}, reviewed ${review.count}`);
  if (!review.safety || review.safety.length < 20) failures.push(`${file}: missing safety rationale`);
}
for (const file of fs.readdirSync(path.join(root, "public")).filter((f) => /\.(?:js|html)$/.test(f))) {
  const body = source(`public/${file}`);
  const count = (body.match(/\.(?:innerHTML|outerHTML)\s*(?:\+?=)|insertAdjacentHTML\s*\(/g) || []).length;
  if (count && !sinks[`public/${file}`]) failures.push(`public/${file}: unreviewed HTML sink`);
  if (/document\.write\s*\(/.test(body)) failures.push(`public/${file}: document.write forbidden`);
  if (/\b(?:href|src|action)\s*=\s*["']\s*javascript:/i.test(body)) failures.push(`public/${file}: javascript URL forbidden`);
  if (/\b(?:href|src|action)\s*=\s*["']data:(?!,|image\/(?:png|jpeg|gif|webp);base64,)/i.test(body)) failures.push(`public/${file}: unsafe data URL`);
}
// Logger arguments may contain identifiers, bodies, credentials, provider responses, or exception text.
for (const pattern of [
  /console\.(?:log|info|warn|error)\([^\n]*req\.(?:body|headers)/,
  /console\.(?:log|info|warn|error)\([^\n]*(?:cookie\s*:|seedEmail\s*:|[^A-Za-z]email(?:Normalized)?\s*:)/i,
  /(?:payload)\s*:\s*req\.body/,
  /console\.(?:log|info|warn|error)[^\n]*(?:error\??\.message|String\(error\))/
]) if (pattern.test(server)) failures.push(`unsafe logging pattern: ${pattern}`);
if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; } else console.log(`security repository check passed: ${contract.length} routes, ${Object.keys(sinks).length} reviewed sink files`);
