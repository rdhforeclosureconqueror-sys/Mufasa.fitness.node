"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"../public",p),"utf8");
test("remaining community pages load shared background assets",()=>{for(const page of ["login.html","mindfulness.html","awareness-journey.html","event-studio.html"]){const html=read(page);for(const asset of ["community-backgrounds.css","community-backgrounds.manifest.js","community-backgrounds.js"])assert.ok(html.includes(asset),page+" missing "+asset);}});
test("shared login excludes noncommunity login journeys",()=>{const html=read("login.html");assert.ok(html.includes('dataset.communityBackground="off"'));assert.ok(html.includes('get("returnTo")'));assert.ok(html.includes('get("source")==="community"'));});
test("community booking retains background rotation",()=>{assert.ok(read("private-sessions.html").includes("community-backgrounds.js"));});
