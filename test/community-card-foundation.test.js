"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {createUserStore}=require("../src/repositories/userStore");
const {createCommunityCardService}=require("../src/services/communityCardService");

const example={
 displayName:"Soul Explorer",bioShort:"Breathing, growing, connecting",
 interests:["yoga","meditation"],goals:["make_friends","mindfulness"],visibility:"private"
};
function setup(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"community-card-"));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const store=createUserStore({userDir:dir});
 return {store,service:createCommunityCardService({userStore:store})};
}
test("community cards persist to canonical user record and default to private",t=>{
 const {store,service}=setup(t);
 assert.equal(service.get("member_a"),null);
 const card=service.save("member_a",example);
 assert.equal(card.visibility,"private");
 assert.equal(service.visibleToMember("member_a"),null);
 assert.deepEqual(createCommunityCardService({userStore:store}).get("member_a"),card);
 assert.equal(service.get("member_b"),null);
});
test("only consented public projection is shared, never private user fields",t=>{
 const {store,service}=setup(t);
 store.updateUser("member_a",u=>{u.email="private@example.com";u.ohsa=[{condition:"private"}];return u;});
 service.save("member_a",{...example,visibility:"members"});
 const exposed=service.visibleToMember("member_a");
 assert.deepEqual(Object.keys(exposed).sort(),["assessmentHighlights","backgroundImage","bioShort","colorTheme","displayName","goals","interests"].sort());
 assert.equal(JSON.stringify(exposed).includes("private@example.com"),false);
 service.save("member_a",{...example,visibility:"private"});
 assert.equal(service.visibleToMember("member_a"),null);
});
test("rejects invalid, unknown, and over-sized inputs",t=>{
 const {service}=setup(t);
 for(const bad of [
  {...example,displayName:""},
  {...example,displayName:"x".repeat(49)},
  {...example,interests:["yoga","yoga"]},
  {...example,interests:["unknown"]},
  {...example,goals:["fitness"]},
  {...example,visibility:"everyone"},
  {...example,email:"sneaky"},
  {...example,bioShort:"x".repeat(181)},
  {...example,displayName:"unsafe\nname"}
 ]) assert.throws(()=>service.save("member_a",bad),{status:400});
 assert.equal(service.get("member_a"),null);
});
test("Community ID uses auth-protected routes and preserves existing hub entry",()=>{
 const route=fs.readFileSync(path.join(__dirname,"../src/routes/communityCardRoutes.js"),"utf8");
 assert.match(route,/\/api\/me\/community-card/);
 assert.match(route,/requireAuth/);
 const html=fs.readFileSync(path.join(__dirname,"../public/community-hub.html"),"utf8");
 assert.match(html,/href="\/community-entrance\.html"/);
 const page=fs.readFileSync(path.join(__dirname,"../public/community-entrance.html"),"utf8");
 assert.match(page,/Your card background/);
 assert.match(page,/How to make it yours/);
 assert.match(page,/name="colorTheme"/);
 assert.match(page,/id="avatarSpace"/);
});

test("community card stores only bounded, supported background images and palette choice",t=>{
 const {service}=setup(t);
 const background="data:image/jpeg;base64,"+"a".repeat(200);
 const card=service.save("member_a",{...example,colorTheme:"royal",backgroundImage:background});
 assert.equal(card.schemaVersion,2);
 assert.equal(card.colorTheme,"royal");
 assert.equal(card.backgroundImage,background);
 assert.equal(card.useHubBackground,false);
 assert.equal(service.save("member_a",{...example,useHubBackground:true}).useHubBackground,true);
 assert.throws(()=>service.save("member_b",{...example,colorTheme:"nope"}),{status:400});
 assert.throws(()=>service.save("member_c",{...example,backgroundImage:"https://untrusted.example/photo.jpg"}),{status:400});
 assert.throws(()=>service.save("member_d",{...example,backgroundImage:"data:image/gif;base64,abc"}),{status:400});
});

test("Community card UI requires a server readback before declaring save verified",()=>{
 const source=fs.readFileSync(path.join(__dirname,"../public/community-entrance.js"),"utf8");
 const write=source.indexOf('api("/api/me/community-card",{method:"PUT"');
 const read=source.indexOf('confirmed=await api("/api/me/community-card")',write);
 const success=source.indexOf("Your Community ID and your Hub look are saved and verified!",read);
 assert.ok(write>=0,"save request must exist");
 assert.ok(read>write,"saved value must be reloaded after write");
 assert.ok(success>read,"success message must follow canonical readback");
 assert.match(source,/fields\.every\(key=>JSON\.stringify\(confirmed\.card/);
 assert.match(source,/saved card could not be verified/);
});

test("Community ID exposes an obvious visual save action and opt-in Hub background",()=>{
 const source=fs.readFileSync(path.join(__dirname,"../public/community-entrance.js"),"utf8");
 assert.match(source,/Save My Look/);
 assert.match(source,/useHubBackground/);
 assert.match(source,/Tap Save My Look below to keep it/);
});

test("Community ID stores at most three opt-in assessment highlights without exposing a reading",t=>{
 const {service}=setup(t);
 const card=service.save("member_a",{...example,visibility:"members",assessmentHighlights:[{source:"love",label:"The Nurturer"},{source:"love",label:"Steadfast Heart"},{source:"love",label:"Sacred Mirror"}]});
 assert.deepEqual(card.assessmentHighlights,[{source:"love",label:"The Nurturer"},{source:"love",label:"Steadfast Heart"},{source:"love",label:"Sacred Mirror"}]);
 assert.deepEqual(service.visibleToMember("member_a").assessmentHighlights,[{source:"love",label:"The Nurturer"},{source:"love",label:"Steadfast Heart"},{source:"love",label:"Sacred Mirror"}]);
 assert.throws(()=>service.save("member_b",{...example,assessmentHighlights:["one","two","three","four"]}),{status:400});
});
