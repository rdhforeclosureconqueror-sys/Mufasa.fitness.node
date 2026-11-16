"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../public");
const symbols=fs.readFileSync(path.join(root,"mindfulness-chakra-symbols-v1.js"),"utf8");
const html=fs.readFileSync(path.join(root,"mindfulness.html"),"utf8");
const interactive=fs.readFileSync(path.join(root,"mindfulness-interactive-v1.js"),"utf8");
test("all seven uploaded chakra teaching cards are mapped",()=>{for(const file of ['root','sacral','solar-plexus','heart','throat','third-eye','crown']){assert.match(symbols,new RegExp("card:'"+file+"\\.jpeg'"));assert.ok(fs.existsSync(path.join(root,'assets','chakras',file+'.jpeg')));}});
test("symbols load before dashboard code",()=>assert.ok(html.indexOf('mindfulness-chakra-symbols-v1.js')<html.indexOf('mindfulness-interactive-v1.js')));
test("daily refresh invokes chakra artwork renderer",()=>assert.match(interactive,/MileleChakraSymbols\?\.render\(idx\)/));
