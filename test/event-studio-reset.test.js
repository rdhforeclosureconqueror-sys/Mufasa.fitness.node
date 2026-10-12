"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../public/event-studio.html"),"utf8");
const js=fs.readFileSync(path.join(__dirname,"../public/event-studio.js"),"utf8");
test("Event Studio never shadows native form.reset with named controls",()=>{
 assert.doesNotMatch(html,/(?:id|name)="reset"/);
 assert.match(html,/id="newEventBtn"/);
 assert.match(js,/HTMLFormElement\.prototype\.reset\.call\(\$\("eventForm"\)\)/);
 assert.match(js,/\$\("newEventBtn"\)\.addEventListener/);
});
test("Event Studio references cache-busted fixed script",()=>assert.match(html,/event-studio\.js\?v=2/));
