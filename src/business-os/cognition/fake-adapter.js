"use strict";
function createFakeAdapter({provider="fake",script=[]}={}){
 let calls=0;
 return Object.freeze({provider,async invoke(input){
  const step=script[Math.min(calls++,Math.max(0,script.length-1))];
  if(step?.error)throw Object.assign(new Error(step.error.message||step.error.code),step.error);
  return step?.response||{content:JSON.stringify({status:"ok"}),usage:{inputTokens:10,outputTokens:5},finishReason:"stop"};
 },get callCount(){return calls}});
}
module.exports={createFakeAdapter};
