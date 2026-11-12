"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
test("PAC curriculum cannot be served as public static files",()=>{
 const server=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");
 const guard=server.indexOf("const pacProtectedFiles=new Set(");
 const staticMount=server.indexOf("app.use(express.static(PUBLIC_DIR");
 assert.ok(guard>0&&staticMount>guard,"PAC denial must run before static middleware");
 for(const file of ["eight-limbs-adinkra.html","eight-limbs-adinkra.js","eight-pillars-story-review.html","eight-pillars-story-review.js"])assert.ok(server.includes('"/'+file+'"'));
 assert.match(server,/pacProtectedFiles\.has\(req\.path\)/);
 assert.match(server,/res\.status\(401\)/);
 assert.match(server,/getPanAfricanAccess\(userStore,session\.userId\)/);
 assert.match(server,/httpOnly:true/);
 for(const asset of ["eight-pillars-review-stories.json","eight-pillars-week-01-approved.txt"])assert.ok(server.includes('"/'+asset+'"'));
});
