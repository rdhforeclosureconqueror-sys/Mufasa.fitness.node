"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
test("Community Hub exposes nutrition in both wellness discovery sections",()=>{
 const html=read("public/community-hub.html");
 assert.match(html,/Nutrition Journal & Meal Planning<\/a>/);
 assert.match(html,/Nutrition & Healthy Eating<\/a>/);
 assert.equal((html.match(/href="\/nutrition\.html"/g)||[]).length,2);
});
test("Wellness intake leads to existing nutrition journal",()=>{
 assert.match(read("public/residential-wellness.html"),/href="\/nutrition\.html">Explore nutrition<\/a>/);
});
test("Nutrition journal returns to community and uses canonical login return",()=>{
 const html=read("public/nutrition.html");
 assert.match(html,/href="\/community-hub\.html">Community Wellness<\/a>/);
 assert.match(html,/href="\/login\.html\?returnTo=%2Fnutrition\.html">Sign in to Nutrition<\/a>/);
 assert.match(html,/nutrition-runtime\.js/);
 assert.match(read("public/nutrition-runtime.js"),/AuthStateRuntime\?\.getAuthToken/);
});
