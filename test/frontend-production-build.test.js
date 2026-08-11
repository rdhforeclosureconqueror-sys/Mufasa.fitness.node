const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawnSync}=require("node:child_process");

test("static production build delivers only the frontend browser Maps key",t=>{
  const output=fs.mkdtempSync(path.join(os.tmpdir(),"mufasa-frontend-"));t.after(()=>fs.rmSync(output,{recursive:true,force:true}));
  const result=spawnSync(process.execPath,["scripts/build-frontend.js"],{cwd:path.join(__dirname,".."),encoding:"utf8",env:{...process.env,FRONTEND_BUILD_OUTPUT:output,VITE_GOOGLE_MAPS_BROWSER_API_KEY:"test-browser-key",GOOGLE_MAPS_API_KEY:"backend-must-stay-secret"}});
  assert.equal(result.status,0,result.stderr);assert.doesNotMatch(result.stdout,/test-browser-key|backend-must-stay-secret/);
  const map=fs.readFileSync(path.join(output,"trail-map.js"),"utf8"),diagnostics=fs.readFileSync(path.join(output,"map-diagnostics.js"),"utf8");
  assert.match(map,/const browserMapsApiKey="test-browser-key"/);assert.match(map,/googleMapsScriptUrl\(browserKey,callback\)/);assert.match(map,/browser_key_present/);
  assert.doesNotMatch(map,/backend-must-stay-secret|GOOGLE_MAPS_API_KEY|\/api\/browser-config/);assert.doesNotMatch(diagnostics,/\/api\/browser-config|test-browser-key/);
});
