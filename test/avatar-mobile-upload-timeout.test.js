"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
test("mobile avatar uploads use a size-aware XHR transport and name first failure clearly",()=>{
 const source=fs.readFileSync(path.join(__dirname,"../public/profile-write-runtime.js"),"utf8");
 assert.match(source,/MOBILE_UPLOAD_MAX_TIMEOUT_MS = 180000/);
 assert.match(source,/function avatarUploadTimeoutMs\(file\)/);
 assert.match(source,/timeoutMs = avatarUploadTimeoutMs\(file\)/);
 assert.match(source,/function postAvatarMultipart\(/);
 assert.match(source,/xhr\.upload\.onprogress/);
 assert.match(source,/REQUEST_DISPATCHED/);
 assert.match(source,/UPLOAD_NETWORK_ERROR/);
 assert.match(source,/Upload did not reach the server/);
 assert.match(source,/code === "UPLOAD_TIMEOUT"/);
 assert.match(source,/before the server could finish receiving it/);
});
