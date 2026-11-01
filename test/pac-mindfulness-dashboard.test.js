"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"..","public",file),"utf8");
test("PAC start opens the Mindfulness Dashboard in PAC Community mode",()=>{
 const start=read("eight-limbs-adinkra.js"),dashboard=read("mindfulness-snapshot-v1.js");
 assert.match(start,/mindfulness\.html\?community=pac#pac-community-today/);
 assert.match(dashboard,/get\(['"]community['"]\)!==['"]pac['"]/);
 assert.match(dashboard,/PAC COMMUNITY · WEEK/);
 assert.match(dashboard,/DAY \$\{dayOfWeek\} OF 7/);
 assert.match(dashboard,/mindfulness-limbs-v1\.json/);
 assert.match(dashboard,/mindfulness-weekly-stories-v1\.json/);
});
test("PAC dashboard maps all eight weeks to an Adinkra weekly asset slot",()=>{
 const dashboard=read("mindfulness-snapshot-v1.js"),assets=read("assets/adinkra-symbols/README.md");
 for(const value of ["Mpatapo","Sankofa","Aya","Nkonsonkonson","Akofena","Nyame Nti","Adinkrahene","Funtunfunefu Denkyemfunefu"]) assert.match(dashboard,new RegExp(value));
 assert.match(dashboard,/assets\/adinkra-symbols/);
 assert.match(assets,/week-01-mpatapo\.svg/);
 assert.match(assets,/week-08-funtunfunefu-denkyemfunefu\.svg/);
});
