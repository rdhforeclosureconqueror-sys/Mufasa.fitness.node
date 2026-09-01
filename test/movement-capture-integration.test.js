"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const recorder = require("../public/motion/movement-recorder");
const studio = require("../public/motion/movement-capture-studio");
const roadmap = require("../public/motion/movement-recording-roadmap");

test("workout telemetry uses canonical authentication and keeps anonymous events local", () => {
  const html = fs.readFileSync(path.join(__dirname,"../public/workout.html"),"utf8");
  const source = html.slice(html.indexOf("function trackPilotEvent("),html.indexOf("function emitPilotEvent("));
  const requests=[],local=[];
  let token=null;
  const env={window:{AuthStateRuntime:{getAuthToken:()=>token}},USER_ID:"capture-test",navigator:{userAgent:"test"},mobileDevice:false,
    NODE_PILOT_EVENTS_URL:"https://backend.example.test/api/pilot/events",getRenderMode:()=>"camera",
    appendPilotEventLocal:entry=>local.push(entry),fetch:(url,options)=>{requests.push({url,options});return Promise.resolve();}};
  vm.runInNewContext(source,env);
  env.trackPilotEvent("app_loaded");
  assert.equal(local.length,1);
  assert.equal(requests.length,0);
  token="local-test-token";
  env.trackPilotEvent("workout_started",{status:"ready",privateNote:"local only"});
  assert.equal(requests.length,1);
  assert.equal(requests[0].options.headers.Authorization,"Bearer local-test-token");
  assert.equal(requests[0].options.keepalive,true);
  assert.deepEqual(JSON.parse(requests[0].options.body),{event:"workout_started",payload:{route:"/workout.html",status:"ready"}});
  env.trackPilotEvent("render_mode_changed");
  assert.equal(requests.length,1);
  env.trackPilotEvent("app_loaded");
  assert.equal(JSON.parse(requests[1].options.body).event,"workout_opened");
});

function storage() {
  const memory = new Map();
  return { getItem:key => memory.get(key), setItem:(key,value) => memory.set(key,value) };
}
const recording = (id,primitiveId,view) => ({
  recordingId:id,
  meta:{ primitiveId,captureView:view,movementId:primitiveId,movementName:primitiveId },
  frames:[{t:0,joints:{}},{t:100,joints:{}},{t:200,joints:{}}],
  summary:{frameCount:3,usableFrameCount:3}
});

test("saved and exported captures retain identity, view and checkpoints", () => {
  const store = storage(), front = recording("front-1","crouch","front");
  recorder.saveLocalRecording(front,store);
  // A selection change must not relabel an already captured front view.
  const annotated = studio.annotateLatest(store,{recordingId:"front-1",primitiveId:"crouch",captureView:"side"});
  assert.equal(annotated.meta.captureView,"front");
  assert.ok(annotated.poseCheckpoints.length);
  assert.deepEqual(recorder.recordingForExport(front,store),annotated);
  const before = store.getItem(recorder.STORAGE_KEY);
  assert.equal(studio.annotateLatest(store,{recordingId:"missing",primitiveId:"plank",captureView:"side"}),null);
  assert.equal(store.getItem(recorder.STORAGE_KEY),before);
});

test("repeated Save cannot turn one capture into a front/side pair", () => {
  const store = storage(), front = recording("one-capture","crouch","front");
  for(let i=0;i<3;i++) {
    recorder.saveLocalRecording(front,store);
    studio.annotateLatest(store,{recordingId:front.recordingId,primitiveId:"crouch",captureView:i?"side":"front"});
  }
  const saved = recorder.readLocalRecordings(store);
  assert.equal(saved.length,1);
  assert.equal(studio.coverage(saved,"crouch").complete,false);
  assert.equal(studio.coverage(saved,"crouch").front,true);
});

test("the bounded cache fits all eight foundation front/side pairs", () => {
  const tasks = JSON.parse(fs.readFileSync(path.join(__dirname,"../public/motion/registry/movement-recording-roadmap.v1.json"),"utf8")).foundationSession.tasks;
  const store = storage();
  for(const task of tasks) for(const view of task.requiredViews) recorder.saveLocalRecording(recording(task.id+"-"+view,task.primaryBlockId,view),store);
  const saved = recorder.readLocalRecordings(store);
  assert.equal(saved.length,16);
  assert.equal(roadmap.sessionProgress(tasks,saved).complete,true);
  assert.equal(saved.length,recorder.MAX_LOCAL_RECORDINGS);
});

test("a quota failure is reported instead of claiming evidence was saved", () => {
  const store = {getItem:()=>null,setItem(){throw new Error("QuotaExceededError");}};
  assert.throws(()=>recorder.saveLocalRecording(recording("id","crouch","front"),store),/local_evidence_save_failed/);
});

test("all 17 Lego cards link to existing repository evidence without dead asset URLs", () => {
  const repo = path.join(__dirname, "..");
  const registry = JSON.parse(fs.readFileSync(path.join(repo, "public/motion/registry/movement-lego-scavenger.v1.json"), "utf8"));
  const cards = registry.sections.flatMap(section => section.cards);
  assert.equal(cards.length, 17);
  for (const card of cards) for (const reference of card.repoEvidence) {
    const url = recorder.evidenceUrl(reference);
    assert.ok(url?.startsWith("https://github.com/rdhforeclosureconqueror-sys/Mufasa.fitness.node/blob/main/"));
    const file = url.split("/blob/main/")[1];
    assert.ok(fs.existsSync(path.join(repo, file)), reference);
  }
  assert.equal(recorder.evidenceUrl("javascript:alert(1)"), null);
  assert.equal(recorder.evidenceUrl("/motion/../../secret"), null);
});

test("recording snapshots view metadata at Start and clears the preceding capture", () => {
  const engine = new recorder.MovementRecorder({eventTarget:{addEventListener(){},removeEventListener(){}}});
  const input = {primitiveId:"crouch",captureView:"front",movementId:"slow-squat",movementName:"Slow Squat"};
  engine.start(input); input.captureView="side";
  assert.equal(engine.stop().meta.captureView,"front");
  engine.start({...input,captureView:"side"});
  assert.equal(engine.latest,null);
  assert.equal(engine.stop().meta.captureView,"side");
  engine.dispose();
});

function bootHarness() {
  const elements = new Map(), scripts=[];
  const document = {
    querySelector:()=>({}), getElementById:id=>elements.get(id)||null,
    createElement:()=>({}), head:{appendChild(node){elements.set(node.id,node);scripts.push(node);}}
  };
  const env = {
    document,location:{origin:"https://local.test",host:"local.test",search:""},
    URLSearchParams,AbortController,console:{log(){}},setTimeout:()=>1,clearTimeout(){},
    fetch:async()=>({ok:true,json:async()=>({build:"test"})})
  };
  env.window=env;vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../public/boot-core.js"),"utf8"),env);
  return {env,elements,scripts};
}

test("boot waits for each asynchronous workspace before loading its dependent panel", async () => {
  const {env,elements} = bootHarness();
  const steps=[
    ["movementRecorderRuntimeScript","PocketPTMovementRecorder","movementRecorderLoaded","movementRecordingRoadmapRuntimeScript"],
    ["movementRecordingRoadmapRuntimeScript","PocketPTMovementRecordingRoadmap","movementRoadmapLoaded","movementCaptureStudioRuntimeScript"],
    ["movementCaptureStudioRuntimeScript","PocketPTMovementCaptureStudio","movementCaptureStudioLoaded","movementCaptureDebugRuntimeScript"]
  ];
  for(const [id,api,loaded,next] of steps) {
    let release;
    env[api]={ready:new Promise(resolve=>{release=resolve;})};
    const pending=elements.get(id).onload();
    await Promise.resolve();
    assert.equal(env.__bootCoreState[loaded],false);
    assert.equal(elements.has(next),false);
    release({});await pending;
    assert.equal(env.__bootCoreState[loaded],true);
    assert.equal(elements.has(next),true);
  }
});

test("failed recorder initialization surfaces diagnostics without claiming UI readiness", async () => {
  const {env,elements} = bootHarness();
  env.PocketPTMovementRecorder={ready:Promise.resolve(null)};
  await elements.get("movementRecorderRuntimeScript").onload();
  assert.equal(env.__bootCoreState.movementRecorderLoaded,false);
  assert.equal(elements.has("movementRecordingRoadmapRuntimeScript"),false);
  assert.equal(elements.has("movementCaptureDebugRuntimeScript"),true);
  assert.equal(env.__bootCoreState.lastError,"movement_recorder_init_failed");
});
