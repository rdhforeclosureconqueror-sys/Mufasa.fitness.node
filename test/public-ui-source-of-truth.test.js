const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {execFileSync}=require("node:child_process");
const root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("canonical public workout owns the complete avatar and Phase 1C UI",()=>{
  const html=read("public/workout.html");
  for(const text of ["Connect Camera","Create Avatar","Open Avaturn Creator","Choose File","Upload Avatar","Avatar Overlay","Avatar Only","avatarDiagUpload"])
    assert.match(html,new RegExp(text),text);
  for(const script of ["/motion/normalized-pose.js","/motion/avaturn-live-pose-solver.js","/motion/live-avatar-mirror.js","/workout-control-activation.js"])
    assert.match(html,new RegExp(script.replace(/[./-]/g,"\\$&")),script);
  assert.match(html,/window\.ENABLE_AVATAR_FEATURE = true/);
  assert.doesNotMatch(html,/avatar disabled for pilot/i);
});

test("frontend artifact is generated only from public and carries commit identity",()=>{
  const output=path.join(root,".tmp-public-ui-artifact");
  try{
    execFileSync(process.execPath,[path.join(root,"scripts/build-frontend.js")],{cwd:root,env:{...process.env,FRONTEND_BUILD_OUTPUT:output,VITE_GOOGLE_MAPS_BROWSER_API_KEY:"test-browser-key",GIT_COMMIT:"2473213a39e9eacdf9adad12c23521acd18db3e2"}});
    const html=fs.readFileSync(path.join(output,"workout.html"),"utf8");
    const manifest=JSON.parse(fs.readFileSync(path.join(output,"__frontend-version.json"),"utf8"));
    assert.equal(manifest.sourceDirectory,"public");
    assert.equal(manifest.commit,"2473213a39e9eacdf9adad12c23521acd18db3e2");
    assert.doesNotMatch(html,/__FRONTEND_(?:BUILD_VERSION|COMMIT)__/);
    assert.equal(fs.existsSync(path.join(root,"workout.html")),false,"no root workout copy");
    assert.deepEqual(fs.readdirSync(root).filter(name=>name==="avatar-runtime.js"),[],"no root avatar runtime copy");
  }finally{fs.rmSync(output,{recursive:true,force:true});}
});

test("deployment contract publishes public artifact and preserves backend security ownership",()=>{
  const render=read("render.yaml"),server=read("server.js"),client=read("public/api-client.js");
  assert.match(render,/staticPublishPath: \.\/dist/);
  assert.match(render,/ALLOWED_ORIGINS\n\s+value: https:\/\/mufasafitsite\.onrender\.com/);
  for(const route of ["/api/me/profile","/api/me/avatar/assets/:assetId","/api/avatar/upload"]){assert.match(server,new RegExp(route.replace(/[./:]/g,"\\$&")));}
  assert.match(server,/app\.post\("\/api\/avatar\/upload", requireAuth/);
  assert.match(server,/app\.get\("\/api\/me\/avatar\/assets\/:assetId", requireAuth/);
  assert.match(client,/PRODUCTION_BACKEND_ORIGIN = "https:\/\/mufasa-fitness-node\.onrender\.com"/);
  assert.match(client,/headers\.set\("Authorization", "Bearer " \+ authToken\)/);
});
