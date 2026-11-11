const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = file => fs.readFileSync(path.join(__dirname,"..","public",file),"utf8");
test("story review uses authenticated server AI voice instead of browser synthesis",()=>{
 const js=read("eight-pillars-story-review.js");
 const html=read("eight-pillars-story-review.html");
 assert.match(js,/AuthStateRuntime\?\.getAuthToken/);
 assert.match(js,/\/api\/speak/);
 assert.match(js,/authorization:"Bearer "/);
 assert.doesNotMatch(js,/speechSynthesis|SpeechSynthesisUtterance/);
 assert.match(html,/auth-state-runtime\.js/);
 assert.match(html,/runtime-config\.js/);
 assert.match(html,/Play AI narrator/);
});
test("story AI narration is chunked for existing 1000-character server limit",()=>{
 const js=read("eight-pillars-story-review.js");
 assert.match(js,/remaining\.length <= 950/);
 assert.match(js,/new Audio\(activeUrl\)/);
 assert.match(js,/aborter\.abort\(\)/);
});
