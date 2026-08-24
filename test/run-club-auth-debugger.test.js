"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const legacy=fs.readFileSync("public/run-club-login.html","utf8"),canonical=fs.readFileSync("public/login.js","utf8");
test("retired Run Club login is redirect-only and preserves query parameters",()=>{assert.match(legacy,/new URL\('\/login\.html'/);assert.match(legacy,/URLSearchParams\(location\.search\)/);assert.match(legacy,/location\.replace/);assert.doesNotMatch(legacy,/<form|type="password"/)});
test("canonical login diagnostics are structured and secret-safe",()=>{for(const field of ["bundle","operation","endpoint","httpStatus","requestId","failureCode","stage"])assert.match(canonical,new RegExp(field));assert.match(canonical,/AUTH_LOGIN_DIAGNOSTIC/);assert.doesNotMatch(canonical,/diagnostic\([^)]*(password|payload\.token)/i)});
