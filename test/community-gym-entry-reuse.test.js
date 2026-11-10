"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");

test("community identity exposes guided avatar studio and existing Lion's Den gateway",()=>{
 const html=read("public/community-entrance.html");
 assert.match(html,/push-up-release\.html\?avatarSetup=community/);
 assert.match(html,/communityAvatarRunCheck/);
 assert.match(html,/communityAvatarCopyCheck/);
 assert.match(html,/id="communityEnterGym"/);
 assert.match(html,/communityGymFirstFailure/);
 assert.match(html,/world-bridge-launch\.js/);
 assert.match(html,/community-gym-gateway\.js/);
});
test("community avatar studio is presentation-only and preserves canonical upload and validation components",()=>{
 const original=read("public/push-up-release.html");
 assert.match(original,/profile-write-runtime\.js/);
 assert.match(original,/push-up-avatar-validation\.js/);
 assert.match(original,/community-avatar-setup-mode\.js/);
 assert.match(original,/id="avatarDiagUpload"/);
 assert.match(original,/id="releaseAvatarDebugFirstFailure"/);
 const mode=read("public/community-avatar-setup-mode.js");
 assert.match(mode,/avatarSetup/);
 assert.match(mode,/community/);
 assert.match(mode,/community-entrance\.html/);
 assert.doesNotMatch(mode,/fetch\(|\/api\/avatar\/upload|createArenaSession/);
});
test("gym gateway delegates to original world session launcher and preserves experience contract",()=>{
 const gym=read("public/community-gym-gateway.js");
 const launcher=read("public/world-bridge-launch.js");
 const protocol=read("src/world/worldBridge.js");
 assert.match(gym,/PocketPTWorldLaunch/);
 assert.match(gym,/createArenaSession\(\)/);
 assert.match(gym,/FIRST FAILURE/);
 assert.match(launcher,/POST|\/api\/game\/sessions/);
 assert.match(protocol,/PUSH_UP_ARENA/);
 assert.match(protocol,/launchUrl/);
 const lobby=read("src/world/lobbyBridge.js");
 assert.match(lobby,/ROOM_SNAPSHOT/);
 assert.match(lobby,/PLAYER_JOINED/);
});
test("old arena and fitness paths do not change to community-only routes",()=>{
 assert.match(read("public/arena-push-up.html"),/bridgeDebugBoard/);
 assert.match(read("public/push-up-release.js"),/ProfileWriteRuntime/);
 assert.match(read("public/community-avatar-diagnostics.js"),/communityAvatarFirstFailure/);
});
