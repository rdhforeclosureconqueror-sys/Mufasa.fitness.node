"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
test("PAC Community is an approved wellness interest and opens the Eight Limbs journey",()=>{
 const page=read("public/residential-wellness.html"),client=read("public/residential-wellness.js"),service=read("src/services/residentialWellnessService.js");
 assert.match(page,/value="pac_community"/);assert.match(page,/PAC Community/);assert.match(page,/Eight Limbs \+ Adinkra community journey/);
 assert.match(client,/pac_community/);assert.match(client,/Enter PAC Community/);assert.match(client,/href="\/eight-limbs-adinkra\.html"/);
 assert.match(service,/"pac_community"/);
});
