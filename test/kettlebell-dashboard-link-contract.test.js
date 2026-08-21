"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createApp}=require("../server");
const routes=require("../public/challenge-route-contract");

const SLUG="8-week-kettlebell-strength-power";

async function withServer(run){const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),"kb-link-contract-")),app=createApp({rootDir:path.join(__dirname,".."),challengeEnginePath:path.join(dataDir,"runtime.json"),allowInsecureTestRoutes:true}),server=app.listen(0);await new Promise((resolve,reject)=>{server.once("listening",resolve);server.once("error",reject);});try{return await run(`http://127.0.0.1:${server.address().port}`);}finally{await new Promise(resolve=>server.close(resolve));}}

test("dashboard-generated kettlebell CTA URL is a served same-origin static route bound to the canonical slug",()=>withServer(async base=>{
  const generated=routes.challengePageUrl(SLUG);
  assert.equal(generated,"/challenge.html?slug=8-week-kettlebell-strength-power");
  assert.equal(new URL(generated,base).origin,new URL(base).origin);
  assert.equal(routes.challengeSlug(new URL(generated,base)),SLUG);
  const page=await fetch(base+generated);
  assert.equal(page.status,200);
  assert.notEqual(page.status,404);
  assert.match(await page.text(),/challenge-page\.js/);
  const definition=await fetch(`${base}/api/challenges/${encodeURIComponent(routes.challengeSlug(new URL(generated,base)))}`);
  assert.equal(definition.status,200);
  assert.equal((await definition.json()).data.slug,SLUG);
}));

test("dashboard and challenge runtime consume the shared link contract and canonical backend client",()=>{
  const dashboard=fs.readFileSync(path.join(__dirname,"../public/dashboard.js"),"utf8"),page=fs.readFileSync(path.join(__dirname,"../public/challenge-page.js"),"utf8"),html=fs.readFileSync(path.join(__dirname,"../public/challenge.html"),"utf8");
  assert.match(dashboard,/ChallengeRouteContract\.challengePageUrl\(active\.challenge\.slug\)/);
  assert.match(page,/ChallengeRouteContract\.challengeSlug\(location\)/);
  assert.match(page,/MaatApiClient\.request/);
  assert.match(html,/challenge-route-contract\.js/);
  assert.match(html,/mufasa-fitness-node\.onrender\.com/);
});
