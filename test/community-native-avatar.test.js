"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const viewer=require("../public/community-avatar");
const {createCommunityCardService}=require("../src/services/communityCardService");
const {createUserStore}=require("../src/repositories/userStore");
const os=require("node:os");
test("avatar asset URLs are owner-gated canonical paths, never third-party or arbitrary URLs",()=>{
 assert.equal(viewer.allowedAvatarPath("/api/me/avatar/assets/86d5288f-4c22-43d2-a657-23177ec02287"),"/api/me/avatar/assets/86d5288f-4c22-43d2-a657-23177ec02287");
 for(const path of ["https://evil.example/avatar.glb","//evil.example/asset","/api/me/avatar/assets/../../admin","/uploads/avatars/evil.js","/motion/assets/avatar.glb",null])assert.equal(viewer.allowedAvatarPath(path),null);
});
test("native animation choice belongs to each loaded asset, not global library",()=>{
 const clips=viewer.nativeClips({animations:[{name:"Rest",duration:1,tracks:[{}]},{name:"Wave",duration:2,tracks:[{}]},{name:"Invalid",duration:0,tracks:[{}]}]});
 assert.deepEqual(clips.map(c=>c.name),["Rest","Wave"]);
 assert.equal(viewer.chooseClip(clips,"Wave"),"Wave");
 assert.equal(viewer.chooseClip(clips,"unknown"),"Rest");
 assert.equal(viewer.chooseClip([],null),null);
});
test("preferred animation name saves and reloads for the member-card avatar renderer",t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"community-animation-"));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const store=createUserStore({userDir:dir}),service=createCommunityCardService({userStore:store});
 const input={displayName:"Soul",bioShort:"",interests:[],goals:[],visibility:"members",animationClip:"Wave"};
 assert.equal(service.save("member_1",input).animationClip,"Wave");
 assert.equal(createCommunityCardService({userStore:store}).get("member_1").animationClip,"Wave");
 assert.equal(service.visibleToMember("member_1").animationClip,"Wave");
 assert.throws(()=>service.save("member_1",{...input,animationClip:"x".repeat(150)}),{status:400});
});
test("viewer is wired into community page without touching Push-Up Arena",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../public/community-entrance.html"),"utf8");
 const js=fs.readFileSync(path.join(__dirname,"../public/community-entrance.js"),"utf8");
 assert.match(html,/\/community-avatar\.js/);
 assert.match(html,/id="avatarAnimation"/);
 assert.match(js,/\/api\/me\/profile/);
 assert.match(js,/animationClip:chosenClip/);
 assert.match(js,/viewer\.selectClip/);
});
