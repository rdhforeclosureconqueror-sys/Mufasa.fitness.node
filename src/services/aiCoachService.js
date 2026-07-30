"use strict";
const crypto = require("node:crypto");
const { ApiError } = require("../lib/apiResponse");
const { buildCoachPrompt } = require("../ai/coachPromptBuilder");
const { inspectInput, inspectOutput } = require("../ai/coachSafety");
const { createCircuitBreaker } = require("../ai/circuitBreaker");

const SUGGESTIONS = Object.freeze(["How did I do in my latest workout?","How close am I to leveling up?","What have I improved recently?","What should I focus on this week?","What achievements am I working toward?","What should I do for recovery?"]);
function truthfulFallback(context) { const facts=[]; if(context.workouts.latestCompletionSummary)facts.push("I can see your latest workout completion summary and can explain what it contributed.");else if(context.workouts.recent.length)facts.push(`I can see ${context.workouts.recent.length} recent workout${context.workouts.recent.length===1?"":"s"}.`);if(context.progress?.currentLevel!=null)facts.push(`Your recorded level is ${context.progress.currentLevel} with ${context.progress.lifetimeXp} lifetime XP.`);if(context.progress?.xpToNextLevel!=null)facts.push(`The platform shows ${context.progress.xpToNextLevel} XP remaining to the next level.`);if(context.goals?.goal)facts.push(`Your recorded goal is ${context.goals.goal}.`);if(!facts.length)facts.push("I don't have enough recorded platform data to personalize that yet.");return `${facts.join(" ")} The live coaching response service is temporarily unavailable, so I won't guess beyond those recorded facts.`; }

function createAiCoachService({ userStore, contextService, responder=null, provider=null, config={}, clock=Date.now }) {
  const limit=config.historyLimit||24, maxChars=config.maxMessageChars||2000, active=new Map();
  const metrics={requestsStarted:0,requestsCompleted:0,requestsCancelled:0,providerFailures:0,timeoutFailures:0,safetyInterventions:0,inputTokenEstimate:0,outputTokenEstimate:0};
  const circuit=createCircuitBreaker({threshold:config.circuitThreshold||5,cooldownMs:config.circuitCooldownMs||30000,clock});
  function history(userId){const value=userStore.loadUser(userId).aiCoachConversation;return Array.isArray(value)?value.slice(-limit):[];}
  function save(userId,items){userStore.updateUser(userId,user=>{user.aiCoachConversation=items.slice(-limit);return user;});}
  function overview(userId){return{context:contextService.build(userId),history:history(userId),suggestions:[...SUGGESTIONS]};}
  function validate(raw){const message=String(raw||"").trim();if(!message||message.length>maxChars)throw new ApiError("VALIDATION_ERROR",`message must be 1-${maxChars} characters`,400,{field:"message"});return message;}
  async function *generate(userId,rawMessage,{signal}={}){
    const message=validate(rawMessage); if(active.has(userId))throw new ApiError("COACH_GENERATION_ACTIVE","A coach response is already active",409);
    const requestId=crypto.randomUUID(), controller=new AbortController(), onAbort=()=>controller.abort(signal?.reason);signal?.addEventListener("abort",onAbort,{once:true});active.set(userId,{requestId,controller});metrics.requestsStarted++;metrics.inputTokenEstimate+=Math.ceil(message.length/4);
    let timer,visible=false,answer=""; yield {type:"response.started",requestId};
    try {
      const safety=inspectInput(message); if(safety.blocked){metrics.safetyInterventions++;answer=safety.response;yield{type:"response.delta",requestId,delta:answer};visible=true;}
      else {
        const context=contextService.build(userId), prior=history(userId), prompt=buildCoachPrompt({context,history:prior,message});
        if(!provider&&!responder){answer=truthfulFallback(context);yield{type:"response.delta",requestId,delta:answer};visible=true;}
        else if(!circuit.canRequest())throw new ApiError("COACH_UNAVAILABLE","The AI Coach is temporarily unavailable. Your other Mufasa features remain available.",503);
        else if(responder){answer=String(await responder({userId,prompt,context,signal:controller.signal})||"").trim();yield{type:"response.delta",requestId,delta:answer};visible=true;}
        else {timer=setTimeout(()=>controller.abort(new Error("provider timeout")),config.requestTimeoutMs||30000);for await(const delta of provider.stream({prompt,signal:controller.signal})){if(!delta)continue;visible=true;answer+=delta;yield{type:"response.delta",requestId,delta};}circuit.success();}
      }
      if(controller.signal.aborted)throw controller.signal.reason||new Error("cancelled");
      const checked=inspectOutput(answer);if(!checked.approved){metrics.safetyInterventions++;answer=checked.response;if(visible)yield{type:"response.replaced",requestId,content:answer};else yield{type:"response.delta",requestId,delta:answer};}
      if(!answer)throw new Error("empty provider response");const prior=history(userId);save(userId,[...prior,{role:"user",content:message},{role:"assistant",content:answer,requestId}]);metrics.requestsCompleted++;metrics.outputTokenEstimate+=Math.ceil(answer.length/4);yield{type:"response.completed",requestId};
    } catch(error){if(controller.signal.aborted){metrics.requestsCancelled++;yield{type:"response.cancelled",requestId};}else{metrics.providerFailures++;circuit.failure();yield{type:"response.failed",requestId,error:{code:error.code||"COACH_UNAVAILABLE",message:error.status===409?error.message:"The AI Coach is temporarily unavailable. Please try again."}};}}
    finally{clearTimeout(timer);signal?.removeEventListener("abort",onAbort);if(active.get(userId)?.requestId===requestId)active.delete(userId);}
  }
  async function ask(userId,message){let answer="",failure;for await(const event of generate(userId,message)){if(event.type==="response.delta")answer+=event.delta;if(event.type==="response.replaced")answer=event.content;if(event.type==="response.failed")failure=event.error;}if(failure)throw new ApiError(failure.code,failure.message,503);return{answer,history:history(userId),suggestions:[...SUGGESTIONS],contextUpdatedAt:new Date(clock()).toISOString()};}
  function cancel(userId){const job=active.get(userId);if(!job)return false;job.controller.abort(new Error("member cancelled"));return true;}
  function clear(userId){if(active.has(userId))throw new ApiError("COACH_GENERATION_ACTIVE","Stop the active response before clearing history",409);save(userId,[]);return{history:[]};}
  return Object.freeze({overview,ask,generate,cancel,clear,metrics:()=>({...metrics,circuit:circuit.status()}),circuitStatus:()=>circuit.status()});
}
module.exports={createAiCoachService,truthfulFallback,SUGGESTIONS};
