"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=name=>fs.readFileSync(path.join(root,name),"utf8");

test("residential Run Club CTAs preserve register mode and free-club return destination",()=>{
 const page=read("public/apartment-wellness.html");
 const hrefs=[...page.matchAll(/href="([^"]+)"/g)].map(match=>match[1].replaceAll("&amp;","&"));
 const runLinks=hrefs.filter(href=>href.startsWith("/run-club-login.html"));
 assert.equal(runLinks.length,4,"expected all four resident Run Club CTAs");
 for(const href of runLinks){
  const url=new URL(href,"https://milele.example");
  assert.equal(url.searchParams.get("mode"),"register");
  assert.equal(url.searchParams.get("returnTo"),"/free-run-club.html");
 }
 const visibleCopy=page.split("<main>")[1].split("</main>")[0];
 assert.doesNotMatch(visibleCopy,/(?:LYLE|LUXIA|Gallery House)/i);
});
test("redirect shim preserves safe returnTo and registration mode",()=>{
 const shim=read("public/run-club-login.html");
 assert.match(shim,/target\.searchParams\.set\('returnTo'/);
 assert.match(shim,/params\.get\('mode'\)==='register'/);
 assert.match(shim,/!value\.startsWith\('\/\/'\)/);
});
test("canonical login only bypasses trial on explicit Free Run Club registration",()=>{
 const login=read("public/login.js");
 assert.match(login,/const requestedReturn=safeReturn\(\);/);
 assert.match(login,/register\?\(requestedReturn==="\/free-run-club\.html"\?requestedReturn:"\/trial\.html"\):requestedReturn/);
 assert.match(read("public/auth-navigation.js"),/target\.origin !== global\.location\.origin/);
});
