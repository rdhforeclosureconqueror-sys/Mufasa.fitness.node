"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("avatar upload persists the canonical GLB to member profile, untouched by Studio",()=>{
 const server=read("server.js");
 assert.match(server,/app\.post\("\/api\/avatar\/upload"/);
 assert.match(server,/user\.profile\.avatar = \{ avatarProvider: "avaturn", avatarModelUrl/);
 assert.match(server,/profileSaved: true/);
 const studio=read("public/community-avatar-studio-preview.js");
 assert.match(studio,/\/api\/me\/profile/);
 assert.match(studio,/MileleCommunityAvatar\.create/);
 assert.doesNotMatch(studio,/\/api\/avatar\/upload|FormData\(|fetch\(/);
});
test("Community Avatar Studio shows real model, clear card return and original virtual gym gate",()=>{
 const mode=read("public/community-avatar-setup-mode.js");
 assert.doesNotMatch(mode,/\.community-avatar-mode \.release-gate,\.community-avatar-mode \.footer/);
 assert.match(mode,/communityAvatarReadyCardLink/);
 assert.match(mode,/communityViewMyCard/);
 assert.match(mode,/Enter Virtual Gym/);
 const release=read("public/push-up-release.html");
 assert.match(release,/id="releaseEnterArenaBtn"/);
 assert.match(release,/community-avatar-studio-preview\.js/);
 assert.match(release,/community-avatar\.js/);
 const preview=read("public/community-avatar-studio-preview.js");
 assert.match(preview,/releaseAvatarPlaceholder/);
 assert.match(preview,/instance\.start\(url\)/);
 assert.match(preview,/result\.status/);
});
test("Community ID re-reads persisted GLB after return, browser restoration or explicit refresh",()=>{
 const html=read("public/community-entrance.html"),js=read("public/community-entrance.js");
 assert.match(html,/id="communityRefreshAvatar"/);
 assert.match(js,/pageshow/);
 assert.match(js,/event\.persisted/);
 assert.match(js,/communityRefreshAvatar/);
 assert.match(js,/\/api\/me\/profile/);
 assert.match(js,/viewer\.start\(modelUrl\)/);
});
test("existing avatar validation and multiplayer identity remain the original systems",()=>{
 assert.match(read("public/push-up-release.html"),/push-up-avatar-validation\.js/);
 assert.match(read("public/push-up-release.html"),/world-bridge-launch\.js/);
 assert.match(read("public/push-up-release.js"),/ProfileWriteRuntime\?\.uploadAvatarFile/);
 assert.match(read("public/community-gym-gateway.js"),/PocketPTWorldLaunch/);
});
