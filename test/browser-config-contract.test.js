"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createApp}=require("../server");

async function browserConfig(env){
  const server=createApp({rootDir:process.cwd(),env}).listen(0);
  await new Promise(resolve=>server.once("listening",resolve));
  try{return await (await fetch(`http://127.0.0.1:${server.address().port}/api/browser-config`)).json();}
  finally{await new Promise(resolve=>server.close(resolve));}
}

test("historical frontend service browser-config contract exposes only its browser key",async()=>{
  const body=await browserConfig({VITE_GOOGLE_MAPS_BROWSER_API_KEY:"historical-browser-key",GOOGLE_MAPS_API_KEY:"backend-places-secret"});
  assert.equal(body.data.googleMapsBrowserApiKey,"historical-browser-key");
  assert.equal(body.data.googleMapsBrowserApiKeyConfigured,undefined);
  assert.equal(JSON.stringify(body).includes("backend-places-secret"),false);
});

test("injected environment is authoritative with no global or wrong-variable fallback",async t=>{
  const oldBrowser=process.env.VITE_GOOGLE_MAPS_BROWSER_API_KEY,oldPlaces=process.env.GOOGLE_MAPS_API_KEY;
  process.env.VITE_GOOGLE_MAPS_BROWSER_API_KEY="unrelated-global-browser-key";
  process.env.GOOGLE_MAPS_API_KEY="unrelated-global-places-key";
  t.after(()=>{oldBrowser===undefined?delete process.env.VITE_GOOGLE_MAPS_BROWSER_API_KEY:process.env.VITE_GOOGLE_MAPS_BROWSER_API_KEY=oldBrowser;oldPlaces===undefined?delete process.env.GOOGLE_MAPS_API_KEY:process.env.GOOGLE_MAPS_API_KEY=oldPlaces;});
  const body=await browserConfig({GOOGLE_MAPS_API_KEY:"injected-places-key"});
  assert.equal(body.data.googleMapsBrowserApiKey,null);
  assert.equal(JSON.stringify(body).includes("places-key"),false);
  assert.deepEqual(Object.keys(body.data).sort(),["applicationCommit","debugMapEnabled","googleMapsBrowserApiKey"]);
});
