"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
test("ZXing fallback owns camera and stops decoder controls",()=>{
 const s=read("public/nutrition-runtime.js");
 const block=s.slice(s.indexOf("async function startScanner()"),s.indexOf("async function handleDetected("));
 assert.match(block,/await reader\.decodeFromVideoDevice\(undefined, video/);
 assert.doesNotMatch(block.slice(block.indexOf("ZXing owns the camera stream")),/getUserMedia\(/);
 assert.match(s,/state\.zxingControls\?\.stop/);
});
test("Nutrition navigation stays in Community Hub",()=>{
 const s=read("public/nutrition.html");
 const nav=s.match(/<nav aria-label="Nutrition navigation">([\s\S]*?)<\/nav>/)?.[1];
 assert.ok(nav);
 assert.match(nav,/href="\/community-hub\.html"/);
 assert.doesNotMatch(nav,/href="\/(?:workout|dashboard)\.html"|href="\/"/);
 assert.doesNotMatch(s,/Camera access requires HTTPS in production/);
});
