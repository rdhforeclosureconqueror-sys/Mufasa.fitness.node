"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");

test("social mode selects lean shell; workouts keep original route and session",()=>{
 const source=read("src/world/worldBridge.js");
 assert.match(source,/req\.query\.mode === "community"/);
 assert.match(source,/\? "arena-community\.html" : "arena-push-up\.html"/);
 assert.match(source,/\/api\/game\/session-exchange/);
 assert.match(source,/\/api\/game\/bootstrap/);
});
test("community shell never downloads exercise voice, camera, pose or motion scripts",()=>{
 const html=read("public/arena-community.html");
 const scripts=[...html.matchAll(/<script\s+defer\s+src="([^"]+)"/g)].map(m=>m[1].split("?")[0]);
 assert.deepEqual(scripts,[
   "/arena-push-up-debug-entry.js","/arena-diagnostics.js","/arena-phone-flow.js",
   "/arena-lounge-phone-ui.js","/arena-pre-ready-trace.js","/arena-push-up.js"
 ]);
 for(const module of ["/coach-runtime.js","/arena-coach-runtime.js","/push-up-challenge.js",
   "/arena-camera.js","/arena-pose-calibration.js","/arena-phone-ui.js",
   "/arena-live-motion-adapter.js","/motion/live-avatar-mirror.js"]){
   assert.ok(!html.includes(module),module+" should be omitted");
 }
 for(const id of ["status","message","game","exitArena","arenaPhonePanel","arenaJoystick","arenaJoystickKnob","bridgeDebugBoard","bridgeDebugToggle"]){
   assert.ok(html.includes('id="'+id+'"'),"missing core shell "+id);
 }
});
test("lightweight controls expose reviewed movement protocol and never start mic/camera",()=>{
 const source=read("public/arena-lounge-phone-ui.js");
 const callbacks={};
 const elements={};
 for(const id of ["arenaPhonePanel","arenaJoystick","arenaJoystickKnob","arenaPhoneMessage"]){
  elements[id]={hidden:true,style:{},listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},
   setPointerCapture(){},hasPointerCapture(){return false;},releasePointerCapture(){},
   getBoundingClientRect(){return {left:0,top:0,width:100,height:100}}};
 }
 const actions=[], sent=[];
 const window={
  document:{getElementById:id=>elements[id]},
  crypto:{randomUUID:()=>"scope"},
  addEventListener:(event,fn)=>{callbacks[event]=fn;},
  PocketPTArenaPhoneFlow:{create({send,onChange}){
   return {
    snapshot:()=>({canMove:true}),
    connect(id){actions.push(["connect",id]);onChange({canMove:true});send({type:"POCKETPT_GODOT_BRIDGE",event:"ARENA_FLOW_REQUEST"});},
    accept:data=>{actions.push(["accept",data.event]);return true;},
    moveVector(x,y){actions.push(["move",x,y]);},
    hold:x=>actions.push(["hold",x]),
    release:()=>actions.push(["STOP"]),
    suspend:()=>actions.push(["suspend"]),
    reset:()=>actions.push(["reset"]),
    close:()=>actions.push(["close"])}
  }}
 };
 vm.runInNewContext(source,{window});
 const ui=window.PocketPTArenaPhoneUI.mount({send:data=>sent.push(data)});
 assert.ok(ui);
 ui.connect();
 assert.equal(actions[0][0],"connect");
 assert.equal(sent[0].event,"ARENA_FLOW_REQUEST");
 const joystick=elements.arenaJoystick;
 joystick.listeners.pointerdown({button:0,pointerId:1,clientX:70,clientY:35,preventDefault(){}});
 assert.equal(actions.at(-1)[0],"move");
 joystick.listeners.pointerup({pointerId:1});
 assert.equal(actions.at(-1)[0],"STOP");
 ui.accept({event:"ARENA_FLOW_CAPABILITIES"});
 assert.equal(actions.at(-1)[0],"accept");
 ui.close();
 assert.equal(actions.at(-1)[0],"close");
 assert.doesNotMatch(source,/getUserMedia|SpeechRecognition|startListening|startCamera|enableCamera/);
});
