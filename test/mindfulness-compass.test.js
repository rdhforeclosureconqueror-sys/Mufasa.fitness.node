"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const dir=path.resolve(__dirname,"../public");
const compass=JSON.parse(fs.readFileSync(path.join(dir,"mindfulness-compass-v1.json"),"utf8"));
const learning=JSON.parse(fs.readFileSync(path.join(dir,"mindfulness-learning-v1.json"),"utf8"));
test("all chakras have five signs per state and three practices",()=>{assert.equal(compass.chakras.length,7);for(let i=0;i<7;i++){const c=compass.chakras[i];assert.equal(c.name,learning.chakras[i].name);for(const k of ["underactive","balanced","overactive"])assert.equal(c[k].length,5);assert.equal(c.practices.length,3);}});
test("progressive disclosure and share support are present",()=>{const js=fs.readFileSync(path.join(dir,"mindfulness-interactive-v1.js"),"utf8");assert.match(js,/chakra balance compass/);assert.match(js,/navigator\.share/);assert.match(js,/navigator\.clipboard/);assert.match(js,/details/);});
