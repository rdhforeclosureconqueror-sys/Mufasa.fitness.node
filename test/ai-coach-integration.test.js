"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { createCoachContextService } = require("../src/ai/coachContextService");
const { buildCoachPrompt } = require("../src/ai/coachPromptBuilder");
const { createAiCoachService } = require("../src/services/aiCoachService");

function fixture() {
  const users = new Map([
    ["member-a", { userId:"member-a", profile:{name:"Amina"}, goalsBaseline:{goal:"strength",baseline:{squat:50}}, workoutTracking:[{workoutId:"w1",ts:100,completionStatus:"completed",formScore:82,reps:40,exercisesCompleted:["Squat"]}], latestRewardSummary:{workoutCompleted:true,totalReps:40}, checkIns:[{ts:90,energy:3,soreness:2,sleepHours:8}], program:{programId:"p1",title:"Foundation",daysPerWeek:3,movementFocus:["strength"]} }],
    ["member-b", { userId:"member-b", profile:{name:"Ben"}, goalsBaseline:{goal:"running"}, workoutTracking:[] }]
  ]);
  return { loadUser:id=>structuredClone(users.get(id)||{userId:id}), updateUser(id,fn){users.set(id,fn(structuredClone(users.get(id)||{userId:id})));return users.get(id)} };
}
function gamification(id){return id==="member-a"?{level:{current:3,lifetimeXp:240,nextLevelMinimumXp:300,xpToNextLevel:60},streaks:[{days:4}],achievements:[{id:"first",name:"First Step",state:"earned"}],badges:[{id:"badge",name:"First Step"}],recentRewards:[{xp:20,source:"workout"}]}:{level:{current:1,lifetimeXp:0,nextLevelMinimumXp:100,xpToNextLevel:100},streaks:[],achievements:[],badges:[],recentRewards:[]}}

test("authoritative context combines workout, goal, recovery and gamification read models without recalculation",()=>{const context=createCoachContextService({userStore:fixture(),memberGamificationService:{get:gamification},clock:()=>0}).build("member-a");assert.equal(context.progress.lifetimeXp,240);assert.equal(context.progress.xpToNextLevel,60);assert.equal(context.progress.latestAchievement.name,"First Step");assert.equal(context.workouts.recent[0].totalReps,40);assert.equal(context.goals.goal,"strength");assert.equal(context.recovery.sleep,8)});

test("missing authoritative data remains null rather than inferred",()=>{const context=createCoachContextService({userStore:fixture(),memberGamificationService:null,clock:()=>0}).build("member-b");assert.equal(context.progress,null);assert.equal(context.recovery,null);assert.equal(context.workouts.upcoming,null);assert.deepEqual(context.workouts.recent,[])});

test("modular prompt separates behavior, member, workout, gamification and bounded history",()=>{const context=createCoachContextService({userStore:fixture(),memberGamificationService:{get:gamification}}).build("member-a");const prompt=buildCoachPrompt({context,message:"How did I do?",history:Array.from({length:20},(_,i)=>({role:"user",content:String(i)}))});assert.deepEqual(prompt.slice(0,6).map(x=>x.name),["behavior","platform_context","member_context","workout_context","gamification_context","conversation_contract"]);assert.equal(prompt.at(-1).content,"How did I do?");assert.equal(prompt.length,19);assert.match(prompt[0].content,/Never calculate or award XP/)});

test("coach passes authoritative workout and progression context to responder and stores bounded memory",async()=>{const store=fixture();let received;const contexts=createCoachContextService({userStore:store,memberGamificationService:{get:gamification}});const coach=createAiCoachService({userStore:store,contextService:contexts,responder:async input=>(received=input,"Your backend recorded 40 reps and 20 recent XP.")});const result=await coach.ask("member-a","How did I do?");assert.match(result.answer,/40 reps/);assert.equal(received.context.progress.lifetimeXp,240);assert.ok(received.prompt.some(x=>x.name==="workout_context"));assert.equal(coach.overview("member-a").history.length,2)});

test("conversation memory and authoritative context are isolated by authenticated member id",async()=>{const store=fixture();const contexts=createCoachContextService({userStore:store,memberGamificationService:{get:gamification}});const coach=createAiCoachService({userStore:store,contextService:contexts,responder:async({userId})=>`Hello ${userId}`});await coach.ask("member-a","My progress?");assert.equal(coach.overview("member-b").history.length,0);assert.equal(coach.overview("member-b").context.member.displayName,"Ben");assert.equal(coach.overview("member-b").context.progress.lifetimeXp,0)});

test("fallback acknowledges provider unavailability and reports only available facts",async()=>{const store=fixture();const contexts=createCoachContextService({userStore:store,memberGamificationService:null});const result=await createAiCoachService({userStore:store,contextService:contexts}).ask("member-b","Recovery?");assert.match(result.answer,/recorded goal is running/i);assert.match(result.answer,/temporarily unavailable/i);assert.match(result.answer,/won't guess/i)});

test("coach interface is responsive, semantic, keyboard accessible, and reduced-motion safe",()=>{const html=fs.readFileSync(require.resolve("../public/coach.html"),"utf8"),css=fs.readFileSync(require.resolve("../public/ai-coach.css"),"utf8"),js=fs.readFileSync(require.resolve("../public/ai-coach.js"),"utf8");assert.match(html,/role="log"[^>]+aria-live="polite"/);assert.match(html,/<form id="coachForm">/);assert.match(html,/aria-label="Suggested questions"/);assert.match(css,/@media\(max-width:760px\)/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/:focus-visible/);assert.doesNotThrow(()=>new vm.Script(js))});
