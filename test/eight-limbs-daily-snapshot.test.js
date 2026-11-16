"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,"public",file),"utf8");
test("Eight Limbs daily snapshot is centered on the daily lesson",()=>{
 const js=read("eight-limbs-adinkra.js"),html=read("eight-limbs-adinkra.html");
 for(const phrase of ["EIGHT LIMBS DAILY SNAPSHOT","TODAY’S REFLECTION","Supporting awareness center","Today’s affirmation","Look for this today:"])assert.match(js,new RegExp(phrase));
 assert.match(js,/lesson\?\.lesson/);
 assert.match(js,/limbSupport/);
 assert.match(html,/daily-snapshot/);
 assert.match(html,/snapshot-affirmation/);
});
