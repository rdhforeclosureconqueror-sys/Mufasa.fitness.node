"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../public/nutrition.html"),"utf8");
const runtime=fs.readFileSync(path.join(__dirname,"../public/nutrition-runtime.js"),"utf8");
const ids=["nutritionResearchMic","nutritionResearchListen","nutritionResearchStop","nutritionResearchReferences","nutritionResearchDeep","nutritionResearchAsk","botanicalSearchBtn","barcodeCropRead","barcodeCheckBtn","saveMealBtn","refreshBtn","createWeeklyPlanBtn","generateWeeklyMissionsBtn","addCustomGroceryBtn","loadWeeklyReviewBtn","startScanBtn","stopScanBtn","readNumbersBtn","lookupBarcodeBtn","foodSearchBtn","draftBtn","loadRecentBtn","saveNutritionGoals"];
const panels=["scanPanel","searchPanel","naturalPanel","recentPanel","customPanel"];
const weekly=["weeklyThisWeek","weeklyGroceryBuilder","weeklyPantry","weeklyMissions","weeklyReview"];
test("all static nutrition buttons have inventoried actions",()=>{
 const tags=[...html.matchAll(/<button\b[^>]*>/g)].map(m=>m[0]);
 assert.equal(tags.length,33,"New buttons require explicit inventory updates");
 for(const tag of tags){
  const id=tag.match(/\bid="([^"]+)"/)?.[1];
  const panel=tag.match(/\bdata-open="([^"]+)"/)?.[1];
  const tab=tag.match(/\bdata-weekly-tab="([^"]+)"/)?.[1];
  assert.ok(id||panel||tab,"Missing button action: "+tag);
  if(id){assert.ok(ids.includes(id),"Unknown button: "+id);assert.ok(["nutritionResearchMic","nutritionResearchListen","nutritionResearchStop","nutritionResearchReferences","nutritionResearchDeep","nutritionResearchAsk","botanicalSearchBtn","barcodeCropRead","barcodeCheckBtn"].includes(id)||runtime.includes('$("#'+id+'")')||runtime.includes('$("'+id+'")'),"Missing handler: "+id);}
  if(panel){assert.ok(panels.includes(panel),"Unknown panel: "+panel);assert.ok(html.includes('id="'+panel+'"'),"Missing panel: "+panel);}
  if(tab){assert.ok(weekly.includes(tab),"Unknown weekly tab: "+tab);assert.ok(html.includes('id="'+tab+'"'),"Missing weekly tab: "+tab);}
 }
});
test("research chat button is bound in dedicated client",()=>{ const client=fs.readFileSync(path.join(__dirname,"../public/nutrition-research-chat.js"),"utf8"); assert.match(client,/nutritionResearchAsk/); assert.match(client,/nutritionResearchDeep/); assert.match(client,/addEventListener\("click"/); });
test("dynamic nutrition action handlers remain present",()=>{
 for(const action of ["customSaveBtn","data-delete","data-edit","data-select","data-grocery-state","data-manual-mission","data-search"])assert.ok(runtime.includes(action),"Missing dynamic handler: "+action);
});

test("nutrition research script parses and archive is hidden while assistant remains visible",()=>{
 const vm=require("node:vm");
 const client=fs.readFileSync(path.join(__dirname,"../public/nutrition-research-chat.js"),"utf8");
 assert.doesNotThrow(()=>new vm.Script(client));
 assert.match(html,/<section class="card" id="botanicalWisdom" hidden/);
 assert.match(html,/<section class="card" id="nutritionIntelligence"/);
 assert.ok(html.includes("#botanicalWisdom[hidden] { display:none !important; }"));
});

test("voice, references and disclaimer controls exist",()=>{
 const vm=require("node:vm");
 const client=fs.readFileSync(path.join(__dirname,"../public/nutrition-research-chat.js"),"utf8");
 assert.doesNotThrow(()=>new vm.Script(client));
 for(const id of ["nutritionResearchMic","nutritionResearchListen","nutritionResearchStop","nutritionResearchReferences"]) assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/Educational information only/);
});

test("nutrition read aloud uses Mufasa backend voice, not browser speech",()=>{
 const script=fs.readFileSync(path.join(__dirname,"../public/nutrition-research-chat.js"),"utf8");
 assert.match(script,/\/api\/speak/);
 assert.match(script,/new Audio\(\)/);
 assert.doesNotMatch(script,/speechSynthesis/);
 assert.match(script,/speechChunks/);
});

test("nutrition follow-up voice remains available after deeper answers",()=>{
 const script=fs.readFileSync(path.join(__dirname,"../public/nutrition-research-chat.js"),"utf8");
 assert.doesNotThrow(()=>new (require("node:vm").Script)(script));
 assert.match(script,/conversationContext/);
 assert.match(script,/New user question:/);
 assert.match(script,/question\.placeholder = "Ask a follow-up/);
 assert.match(script,/recording = false/);
 assert.match(script,/deepButton\.hidden = false/);
});
