"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const {PAC_PROTECTED_ASSETS}=require("../src/config/pacProtectedAssets");
test("protected PAC assets are guarded on backend and excluded from static build",()=>{
 const server=fs.readFileSync(path.join(root,"server.js"),"utf8");
 const build=fs.readFileSync(path.join(root,"scripts/build-frontend.js"),"utf8");
 const guard=server.indexOf("const pacProtectedFiles=new Set(");
 const staticMount=server.indexOf("app.use(express.static(PUBLIC_DIR");
 assert.ok(guard>0&&staticMount>guard,"PAC guard must precede backend static middleware");
 assert.match(server,/getPanAfricanAccess\(userStore,session\.userId\)/);
 assert.match(server,/res\.status\(401\)/);
 assert.match(server,/httpOnly:true/);
 assert.ok(server.includes('app.put("/api/admin/pan-african/members/:userId"'));
 assert.ok(server.includes('app.get("/api/pan-african/enter"'));
 assert.ok(server.includes("pacNavigationTickets.delete(ticket)"));
 assert.ok(build.includes("for(const asset of PAC_PROTECTED_ASSETS)"));
 assert.ok(build.includes("fs.rmSync(destination,{force:true})"));
 for(const file of ["eight-limbs-adinkra.html","eight-limbs-adinkra.js","eight-pillars-story-review.html","eight-pillars-story-review.js","eight-pillars-review-stories.json","eight-pillars-week-01-approved.txt"]){
  assert.ok(PAC_PROTECTED_ASSETS.includes(file),file+" must be in shared protection list");
 }
});
