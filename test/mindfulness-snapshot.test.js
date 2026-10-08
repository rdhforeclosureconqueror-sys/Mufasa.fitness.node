"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const dir=path.resolve(__dirname,"../public");
test("snapshot script parses and has daily refresh/share handlers",()=>{const source=fs.readFileSync(path.join(dir,"mindfulness-snapshot-v1.js"),"utf8");new vm.Script(source);assert.match(source,/visibilitychange/);assert.match(source,/setInterval\(refresh,60000\)/);assert.match(source,/navigator\.share/);assert.match(source,/navigator\.clipboard/);});
test("chakra symbol script parses and includes seven Sanskrit seed syllables",()=>{const source=fs.readFileSync(path.join(dir,"mindfulness-chakra-symbols-v1.js"),"utf8");new vm.Script(source);for(const syllable of ['लं','वं','रं','यं','हं','ॐ'])assert.ok(source.includes(syllable));assert.match(source,/snapshot-symbol/);});
test("snapshot markup contains required visible elements",()=>{const html=fs.readFileSync(path.join(dir,"mindfulness.html"),"utf8");for(const id of ['snapshot-symbol','snapshot-date','snapshot-chakra','snapshot-verse','snapshot-prompt','snapshot-share','snapshot-copy'])assert.ok(html.includes('id="'+id+'"'));});
