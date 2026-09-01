"use strict";
const fs=require("fs");
const path=require("path");
const test=require("node:test");
const assert=require("node:assert/strict");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"public","free-run-club.html"),"utf8");
const js=fs.readFileSync(path.join(root,"public","free-run-club.js"),"utf8");
test("Run Club photo picker does not force direct camera capture on iOS",()=>{
  assert.match(html,/id="photoInput"[^>]+type="file"[^>]+accept="image\/\*"/);
  assert.doesNotMatch(html,/capture="environment"/);
  assert.match(html,/\.preview\[hidden\]\{display:none\}/);
  assert.match(js,/Photo selected ✓ Ready to post\./);
  assert.match(js,/startsWith\("image\/"\)/);
});
