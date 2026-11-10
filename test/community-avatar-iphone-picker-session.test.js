"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
test("Community Avatar Studio preserves the unrestricted iOS file picker and original GLB validator",()=>{
 const html=read("public/push-up-release.html");
 assert.match(html,/<input id="releaseAvatarFileInput" type="file">/);
 assert.doesNotMatch(html.match(/<input id="releaseAvatarFileInput"[^>]*>/)[0],/accept=/);
 const upload=read("public/profile-write-runtime.js");
 assert.match(upload,/AVATAR_FILE_EXTENSION/);
 assert.match(upload,/uploadAvatarFile/);
 assert.match(html,/push-up-avatar-validation\.js/);
});
test("existing member auth uses canonical runtime; only signed-out members see registration controls",()=>{
 const release=read("public/push-up-release.js");
 assert.match(release,/AuthStateRuntime\?\.whenReady/);
 assert.match(release,/if \(!auth\) \{[\s\S]*?renderSignedOut\(\)/);
 assert.match(release,/get\('avatarSetup'\) === 'community'/);
 assert.match(release,/\? '\/push-up-release\.html\?avatarSetup=community' : '\/push-up\.html'/);
});
test("community helper explains files browsing and never implements a second uploader",()=>{
 const mode=read("public/community-avatar-setup-mode.js");
 assert.match(mode,/Browse in Files/);
 assert.match(mode,/No file selected/);
 assert.match(mode,/\.glb avatar export/);
 assert.match(mode,/releaseAvatarFileInput/);
 assert.match(mode,/data-community-reused-validation/);
 assert.doesNotMatch(mode,/FormData\(|fetch\(|\/api\/avatar\/upload/);
});
