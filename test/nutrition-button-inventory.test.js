"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../public/nutrition.html"),"utf8");
const runtime=fs.readFileSync(path.join(__dirname,"../public/nutrition-runtime.js"),"utf8");
const ids=["nutritionResearchDeep","nutritionResearchAsk","botanicalSearchBtn","barcodeCropRead","barcodeCheckBtn","saveMealBtn","refreshBtn","createWeeklyPlanBtn","generateWeeklyMissionsBtn","addCustomGroceryBtn","loadWeeklyReviewBtn","startScanBtn","stopScanBtn","readNumbersBtn","lookupBarcodeBtn","foodSearchBtn","draftBtn","loadRecentBtn"];
const panels=["scanPanel","searchPanel","naturalPanel","recentPanel","customPanel"];
const weekly=["weeklyThisWeek","weeklyGroceryBuilder","weeklyPantry","weeklyMissions","weeklyReview"];
test("all static nutrition buttons have inventoried actions",()=>{
 const tags=[...html.matchAll(/<button\b[^>]*>/g)].map(m=>m[0]);
 assert.equal(tags.length,28,"New buttons require explicit inventory updates");
 for(const tag of tags){
  const id=tag.match(/\bid="([^"]+)"/)?.[1];
  const panel=tag.match(/\bdata-open="([^"]+)"/)?.[1];
  const tab=tag.match(/\bdata-weekly-tab="([^"]+)"/)?.[1];
  assert.ok(id||panel||tab,"Missing button action: "+tag);
  if(id){assert.ok(ids.includes(id),"Unknown button: "+id);assert.ok(["nutritionResearchDeep","nutritionResearchAsk","botanicalSearchBtn","barcodeCropRead","barcodeCheckBtn"].includes(id)||runtime.includes('$("#'+id+'")')||runtime.includes('$("'+id+'")'),"Missing handler: "+id);}
  if(panel){assert.ok(panels.includes(panel),"Unknown panel: "+panel);assert.ok(html.includes('id="'+panel+'"'),"Missing panel: "+panel);}
  if(tab){assert.ok(weekly.includes(tab),"Unknown weekly tab: "+tab);assert.ok(html.includes('id="'+tab+'"'),"Missing weekly tab: "+tab);}
 }
});
test("research chat button is bound in dedicated client",()=>{ const client=fs.readFileSync(path.join(__dirname,"../public/nutrition-research-chat.js"),"utf8"); assert.match(client,/nutritionResearchAsk/); assert.match(client,/nutritionResearchDeep/); assert.match(client,/addEventListener\("click"/); });
test("dynamic nutrition action handlers remain present",()=>{
 for(const action of ["customSaveBtn","data-delete","data-edit","data-select","data-grocery-state","data-manual-mission","data-search"])assert.ok(runtime.includes(action),"Missing dynamic handler: "+action);
});
