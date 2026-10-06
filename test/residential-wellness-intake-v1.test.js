"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("apartment landing routes community CTAs into residential intake and preserves opaque campaign",()=>{
 const page=read("public/apartment-wellness.html");
 assert.match(page,/\/residential-wellness\.html/);
 assert.doesNotMatch(page.split("<main>")[1].split("</main>")[0],/(?:LYLE|LUXIA|Gallery House)/i);
});
test("residential wellness intake offers all approved interests and consent",()=>{
 const page=read("public/residential-wellness.html");
 for(const v of ["run_walk","yoga","sound_bath","meditation_breathwork","mobility","personal_training","general_wellness"]) assert.match(page,new RegExp('value="'+v+'"'));
 assert.match(page,/communicationConsent/);assert.match(page,/communityInviteConsent/);
});
test("service uses allowlisted opaque campaign and canonical userStore",()=>{
 const s=read("src/services/residentialWellnessService.js");
 assert.match(s,/LYLE-OCT26/);assert.match(s,/userStore\.updateUser/);assert.match(s,/communicationConsent/);
});
test("world bridge installs authenticated residential wellness routes",()=>{
 const s=read("world-bridge-server.js");
 assert.match(s,/createResidentialWellnessService/);assert.match(s,/installResidentialWellnessRoutes/);assert.match(s,/installResidentialWellness\(app, options\)/);
});
test("registration may return to residential wellness intake",()=>{
 const s=read("public/login.js");
 assert.match(s,/requestedReturn\.startsWith\("\/residential-wellness\.html"\)/);
});