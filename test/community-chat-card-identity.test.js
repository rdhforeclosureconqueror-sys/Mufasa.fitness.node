"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createUserStore}=require("../src/repositories/userStore");
const {createResidentialCommunityService}=require("../src/services/residentialCommunityService");
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"community-chat-card-name-"));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const store=createUserStore({userDir:dir}),service=createResidentialCommunityService({userStore:store,clock:()=>Date.parse("2026-11-10T21:00:00Z")});
 for(const id of ["alice","bob"])store.updateUser(id,user=>{user.email=id+"@example.invalid";user.name=id+" personal name";user.residentialWellness={communicationConsent:true};return user});
 return {store,service};
}
test("chat only shows Community ID display name with explicit members visibility",t=>{
 const {store,service}=fixture(t);
 store.updateUser("alice",user=>{user.communityCard={displayName:"Golden Heart",visibility:"members"};return user});
 const posted=service.post("alice",{text:"Hello wellness community"});
 assert.equal(posted.displayName,"Golden Heart");
 const list=service.messages("bob");assert.equal(list[0].displayName,"Golden Heart");
 assert.equal(list[0].text,"Hello wellness community");
 assert.doesNotMatch(JSON.stringify(list),/alice@example.invalid|personal name/);
});
test("changing Community ID to private immediately hides previously posted chat name",t=>{
 const {store,service}=fixture(t);
 store.updateUser("alice",u=>{u.communityCard={displayName:"Golden Heart",visibility:"members"};return u});
 service.post("alice",{text:"Hi"});
 store.updateUser("alice",u=>{u.communityCard.visibility="private";return u});
 assert.equal(service.messages("bob")[0].displayName,"Community Member");
 assert.equal(service.post("alice",{text:"Private mode now"}).displayName,"Community Member");
});
test("absent card never reveals profile names or email prefixes in member chat",t=>{
 const {service}=fixture(t);service.post("alice",{text:"Hi"});
 assert.equal(service.messages("bob")[0].displayName,"Community Member");
});
