"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
test("Community ID exposes linked assessment choices without publishing them by default",()=>{const html=fs.readFileSync(path.join(root,"public/community-entrance.html"),"utf8"),js=fs.readFileSync(path.join(root,"public/community-entrance.js"),"utf8");assert.match(html,/id="assessmentCards" hidden/);assert.match(html,/Your full Love or Loyalty reading stays private/);assert.match(js,/\/api\/me\/community-assessments/);assert.match(js,/assessment-card-choice/);assert.match(js,/Saving your assessment to your private profile/);assert.match(js,/Choose any cards you want to show/);});
