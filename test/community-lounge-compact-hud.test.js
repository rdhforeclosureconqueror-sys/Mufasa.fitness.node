"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");

test("community entrance sets presentation mode without replacing session launcher",()=>{
  const source=read("public/community-gym-gateway.js");
  assert.match(source,/launcher\.createArenaSession\(\)/);
  assert.match(source,/new URL\(launch\.launchUrl,global\.location\.href\)/);
  assert.match(source,/url\.searchParams\.set\("mode","community"\)/);
  assert.match(source,/global\.location\.assign\(url\.href\)/);
});

test("community lounge retains the full exercise arena as default",()=>{
  const html=read("public/arena-push-up.html");
  assert.match(html,/get\("mode"\)==="community"/);
  assert.match(html,/dataset\.communityLounge="true"/);
  assert.match(html,/UNLEASH THE BEAST — PUSH-UP ARENA/);
  assert.match(html,/Milele Fit · Community Lounge/);
  assert.match(html,/arenaJoystick/);
  assert.match(html,/arenaCameraStage/);
  assert.match(html,/bridgeDebugBoard/);
});

test("lounge shows full-height world with an overlay joystick and hidden exercise controls",()=>{
  const html=read("public/arena-push-up.html");
  assert.match(html,/html\[data-community-lounge="true"\] \.stage\{flex:1;min-height:0!important\}/);
  assert.match(html,/html\[data-community-lounge="true"\] \.phone-panel\{[\s\S]*?position:fixed/);
  assert.match(html,/html\[data-community-lounge="true"\] \.phone-actions,/);
  assert.match(html,/html\[data-community-lounge="true"\] \.locomotion-mode,/);
  assert.match(html,/prefers-reduced-motion:reduce/);
});
