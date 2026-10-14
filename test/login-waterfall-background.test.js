"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../public/login.html"),"utf8");
test("login and registration always show the same waterfall sound bowl photo",()=>{assert.ok(html.includes("url('/waterfallsoundbowl.jpg')"));assert.ok(!html.includes("community-backgrounds.js"));assert.ok(!html.includes("community-backgrounds.manifest.js"));assert.ok(!html.includes("communityBackground"));});
test("auth form and canonical sign-in scripts remain unchanged",()=>{for(const id of ['id="form"','id="nameRow"','id="submit"'])assert.ok(html.includes(id));assert.ok(html.includes('src="/login.js'));});
