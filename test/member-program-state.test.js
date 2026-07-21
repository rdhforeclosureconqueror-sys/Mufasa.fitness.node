"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { resolveMemberProgramState } = require("../src/services/memberProgramState");
const { createUserStore } = require("../src/repositories/userStore");
const { createUserDataService } = require("../src/services/userDataService");
const os = require("node:os");

const recommendation = { programRecommendation:{ recommendedProgram:{ id:"rec" } }, generatedWorkoutPlan:{ recommendationOnly:true, plan:{ status:"recommended" } } };
test("recommendation-only member has no active program",()=>assert.equal(resolveMemberProgramState(recommendation).source,"none"));
test("coach assignment is the single active program above recommendations",()=>{const state=resolveMemberProgramState({userId:"m",...recommendation,program:{programId:"coach",assignedBy:"trainer"}});assert.equal(state.source,"coach_assigned");assert.equal(state.activeProgram.programId,"coach");assert.equal(state.recommendations.length,2)});
test("member selection is active and survives persisted-store refresh",()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),"program-state-")),store=createUserStore({userDir:dir}),service=createUserDataService({userStore:store});service.assignProgram({userId:"m",actorUserId:"m",source:"api",program:{title:"Strength",goal:"strength",durationWeeks:8,daysPerWeek:4}});const reloaded=createUserStore({userDir:dir}).loadUser("m");assert.equal(resolveMemberProgramState(reloaded).source,"member_selected");assert.equal(reloaded.program.title,"Strength")});
test("duplicate self-assignment is idempotent and explicit switch changes the program",()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),"program-switch-")),store=createUserStore({userDir:dir}),service=createUserDataService({userStore:store}),first={goal:"strength",durationWeeks:8,daysPerWeek:4};const a=service.assignProgram({userId:"m",actorUserId:"m",program:first}).program,b=service.assignProgram({userId:"m",actorUserId:"m",program:first}).program;assert.equal(b.programId,a.programId);assert.equal(store.loadUser("m").events.filter(e=>e.command==="fitness.programAssigned").length,1);const switched=service.assignProgram({userId:"m",actorUserId:"m",program:{goal:"mobility",durationWeeks:6,daysPerWeek:3}}).program;assert.equal(switched.goal,"mobility")});
test("template fallback is below assignments and an activated generated plan",()=>{assert.equal(resolveMemberProgramState({templateProgram:{id:"template"}}).source,"template_fallback");assert.equal(resolveMemberProgramState({templateProgram:{id:"template"},generatedWorkoutPlan:{recommendationOnly:false,plan:{status:"active"}}}).source,"generated_active")});
test("member UI hides assignment language and generated execution when active",()=>{const flow=fs.readFileSync(path.join(__dirname,"../public/retention-flow.js"),"utf8"),generated=fs.readFileSync(path.join(__dirname,"../public/generated-workout-runtime.js"),"utf8");assert.match(flow,/hasActiveProgram \? "Switch Program" : "Use this program"/);assert.match(flow,/window\.confirm/);assert.match(generated,/Preview only/);assert.match(generated,/Current Active Program/)});
