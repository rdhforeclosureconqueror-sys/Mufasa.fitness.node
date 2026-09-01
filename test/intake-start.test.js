"use strict";
const test=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");const path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"..","public","intake-start.html"),"utf8");
const js=fs.readFileSync(path.join(__dirname,"..","public","intake-start.js"),"utf8");
test("intake front door exposes four clear client brackets",()=>{for(const text of ["Lose, gain or tone","Body transformation","Athlete development","Yoga, meditation & breathwork"])assert.match(html,new RegExp(text));});
test("intake front door writes into canonical Journey intake",()=>{assert.match(js,/\/api\/me\/retention\/intake/);assert.match(js,/general_fitness/);assert.match(js,/athlete_performance/);assert.match(js,/yoga_wellness/);assert.match(js,/\/workout\.html\?journey=1/);});
test("weight-direction choices cover modest loss and gain",()=>{assert.match(js,/Lose up to about 20 lb/);assert.match(js,/Gain up to about 20 lb/);assert.match(js,/desiredWeightChange/);});