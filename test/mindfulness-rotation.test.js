"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../public");
const schedule=JSON.parse(fs.readFileSync(path.join(root,"mindfulness-schedule-v1.json"),"utf8"));
const starter=JSON.parse(fs.readFileSync(path.join(root,"mindfulness-starter-v1.json"),"utf8"));
const learning=JSON.parse(fs.readFileSync(path.join(root,"mindfulness-learning-v1.json"),"utf8"));
test("all seven weekdays map consistently across the content sources",()=>{const names=["Root","Sacral","Solar Plexus","Heart","Throat","Third Eye","Crown"];assert.equal(schedule.days.length,7);assert.equal(starter.days.length,7);assert.equal(learning.chakras.length,7);for(let i=0;i<7;i++){assert.equal(schedule.days[i].weekday,i);assert.equal(schedule.days[i].chakra,names[i]);assert.equal(starter.days[i].chakra,names[i]);assert.equal(learning.chakras[i].name,names[i]);}});
test("learning records contain useful, nonempty fields",()=>{for(const c of learning.chakras){for(const field of ["sanskrit","element","location","context","practice"])assert.ok(typeof c[field]==="string"&&c[field].trim().length>5,c.name+" "+field)}});
test("page includes midnight, visibility and focus refresh hooks",()=>{const script=fs.readFileSync(path.join(root,"mindfulness-interactive-v1.js"),"utf8");assert.match(script,/setInterval\(refresh,60000\)/);assert.match(script,/visibilitychange/);assert.match(script,/window\.addEventListener\('focus',refresh\)/);});
