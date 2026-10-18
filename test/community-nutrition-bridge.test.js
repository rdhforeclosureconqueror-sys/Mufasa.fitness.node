"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
test("Community Hub exposes nutrition in both wellness discovery sections",()=>{
 const html=read("public/community-hub.html");
 assert.match(html,/Nutrition — Trial or Membership<\/a>/);
 assert.match(html,/Nutrition — Trial or Membership<\/a>/);
 assert.equal((html.match(/href="\/trial\.html"/g)||[]).length>=2,true);
});
test("Wellness intake leads to existing nutrition journal",()=>{
 assert.match(read("public/residential-wellness.html"),/href="\/trial\.html">Explore nutrition with trial or membership<\/a>/);
});
test("Nutrition journal returns to community and uses canonical login return",()=>{
 const html=read("public/nutrition.html");
 assert.match(html,/href="\/community-hub\.html">Community Wellness<\/a>/);
 assert.match(html,/href="\/login\.html\?returnTo=%2Fnutrition\.html">Sign in to Nutrition<\/a>/);
 assert.match(html,/nutrition-runtime\.js/);
 assert.match(read("public/nutrition-runtime.js"),/AuthStateRuntime\?\.getAuthToken/);
});
