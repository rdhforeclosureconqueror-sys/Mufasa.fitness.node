const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"..","public",name),"utf8");
test("Eight Pillars journey requires explicit start and retains full story",()=>{
 const js=read("eight-pillars-story-review.js"),html=read("eight-pillars-story-review.html");
 assert.match(js,/startJourney.*addEventListener/);
 assert.match(js,/milele-eight-pillars-start-v1/);
 assert.match(js,/currentChunks = speechChunks\(dayText\)/);
 assert.match(js,/The \(First\|Second\|Third\|Fourth\|Fifth\|Sixth\|Seventh\) Bridge/);
 assert.match(html,/id="fullStoryPanel"/);
 assert.match(html,/id="dayPicker"/);
});
test("Eight Limbs progress starts on opt-in instead of fixed calendar epoch",()=>{
 const js=read("eight-limbs-adinkra.js");
 assert.match(js,/milele-eight-limbs-start-v1/);
 assert.match(js,/startLimbJourney/);
 assert.doesNotMatch(js,/epoch = new Date\(2026/);
});
