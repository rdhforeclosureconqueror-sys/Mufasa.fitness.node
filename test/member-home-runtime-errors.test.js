"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function browserContext() {
  const window = { location:{ search:"", origin:"https://mufasafitsite.onrender.com" }, addEventListener(){}, console };
  window.window = window;
  const context = vm.createContext({ window, document:{ getElementById:()=>null }, localStorage:{ getItem:()=>null, setItem(){} }, URL, URLSearchParams, console, Object, String, Number, Date });
  return { window, context };
}
function load(file) { const env=browserContext(); vm.runInContext(fs.readFileSync(path.join(__dirname,"../public",file),"utf8"),env.context); return env.window; }

const dateRuntime = load("retention-flow.js").MemberHomeDateRuntime;
const recommendationRuntime = load("generated-workout-runtime.js").MemberHomeRecommendationRuntime;

test("valid ISO date string formats as canonical calendar label",()=>assert.equal(dateRuntime.normalizeCalendarDate("2026-07-20T12:00:00.000Z").label,"07-20"));
test("JavaScript Date formats without calling slice on the object",()=>assert.equal(dateRuntime.normalizeCalendarDate(new Date("2026-07-20T00:00:00Z")).key,"2026-07-20"));
test("numeric timestamp is an accepted legacy date representation",()=>assert.equal(dateRuntime.normalizeCalendarDate(Date.UTC(2026,6,20)).key,"2026-07-20"));
test("null and undefined dates use a controlled fallback",()=>{assert.equal(dateRuntime.normalizeCalendarDate(null),null);assert.equal(dateRuntime.normalizeCalendarDate(undefined),null)});
test("invalid object date does not expose or invoke slice",()=>{let called=false;const value={slice(){called=true}};assert.equal(dateRuntime.normalizeCalendarDate(value),null);assert.equal(called,false)});
test("submitted intake timestamp can use the shared non-string date contract",()=>assert.doesNotThrow(()=>dateRuntime.normalizeCalendarDate(new Date("2026-07-20"))));
test("workout calendar accepts mixed valid date representations",()=>{for(const value of ["2026-07-20",new Date("2026-07-21"),Date.UTC(2026,6,22)])assert.ok(dateRuntime.normalizeCalendarDate(value)?.key)});
test("recommendation URL resolves against production backend rather than frontend",()=>assert.equal(recommendationRuntime.resolveRecommendationUrl("/api/me/generated-workout-plan","https://mufasa-fitness-node.onrender.com"),"https://mufasa-fitness-node.onrender.com/api/me/generated-workout-plan"));
test("missing and invalid API bases produce controlled errors",()=>{assert.throws(()=>recommendationRuntime.resolveRecommendationUrl("/api/me/generated-workout-plan",""),/not configured/);assert.throws(()=>recommendationRuntime.resolveRecommendationUrl("/api/me/generated-workout-plan","not a url"),/invalid/)});
test("recommendation parser accepts the server ok/data envelope",()=>assert.deepEqual(recommendationRuntime.parseRecommendationResponse({ok:true,status:200},{ok:true,data:{available:true}}),{available:true}));
test("malformed recommendation data produces a readable error",()=>assert.throws(()=>recommendationRuntime.parseRecommendationResponse({ok:true,status:200},{ok:true,data:null}),/malformed/));
test("local workout fallback remains visible when recommendation loading fails",()=>{const source=fs.readFileSync(path.join(__dirname,"../public/generated-workout-runtime.js"),"utf8");assert.match(source,/fallback used/);assert.doesNotMatch(source,/root\.innerHTML\s*=.*Unable to load recommendation/)});
test("protected recommendation endpoints and browser request retain authentication",()=>{const server=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");const runtime=fs.readFileSync(path.join(__dirname,"../public/generated-workout-runtime.js"),"utf8");assert.match(server,/get\("\/api\/me\/generated-workout-plan", requireAuth/);assert.match(runtime,/authorization:`Bearer \$\{authToken\}`/);assert.match(runtime,/if\(!authToken\)throw/)});
test("corrected success paths contain neither production runtime error",()=>{const sources=["retention-flow.js","generated-workout-runtime.js"].map(x=>fs.readFileSync(path.join(__dirname,"../public",x),"utf8")).join("\n");assert.doesNotMatch(sources,/date\.slice\(/);assert.doesNotMatch(sources,/The string did not match the expected pattern/)});
