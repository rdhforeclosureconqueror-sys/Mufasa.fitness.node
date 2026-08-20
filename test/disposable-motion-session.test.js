"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const runtime = require("../public/motion/disposable-motion-session");
const loaderModule = require("../public/motion/shared3d-loader");

function target(extra = {}) { const events = new Map(); return Object.assign({ addEventListener(type, fn) { events.set(type, fn); }, removeEventListener(type, fn) { if (events.get(type) === fn) events.delete(type); }, dispatch(type, event = {}) { events.get(type)?.(event); }, eventCount: () => events.size }, extra); }
function harness() {
  let rafId = 0; const rafs = new Map();
  const document = target({ hidden: false, createElement: () => ({ getContext: () => ({}) }) });
  const env = target({ document, AbortController, devicePixelRatio: 3, requestAnimationFrame(fn) { const id = ++rafId; rafs.set(id, fn); return id; }, cancelAnimationFrame(id) { rafs.delete(id); }, setTimeout, clearTimeout });
  const container = { clientWidth: 2000, clientHeight: 1000, children: [], appendChild(node) { node.parentNode = this; this.children.push(node); }, removeChild(node) { this.children.splice(this.children.indexOf(node), 1); node.parentNode = null; } };
  class Disposable { dispose() { this.disposed = true; } }
  class Object3D { constructor() { this.children = []; } add(value) { this.children.push(value); } remove(value) { this.children=this.children.filter(child=>child!==value); } traverse(fn) { fn(this); this.children.forEach(child=>child.traverse?child.traverse(fn):fn(child)); } }
  class Scene extends Object3D {}
  class Vector3 { constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;} set(x,y,z){this.x=x;this.y=y;this.z=z;} }
  class PerspectiveCamera { constructor(fov,aspect,near,far) { this.fov=fov;this.aspect=aspect;this.near=near;this.far=far;this.position = new Vector3(); } updateProjectionMatrix() {} lookAt(x,y,z){this.target={x,y,z};} }
  class Color { constructor(value){this.value=value;} }
  class Light extends Object3D { constructor(color,intensity){super();this.color=color;this.intensity=intensity;this.position=new Vector3();} }
  class HemisphereLight extends Light { constructor(sky,ground,intensity){super(sky,intensity);this.ground=ground;} }
  class DirectionalLight extends Light {}
  class Box3 { setFromObject(root){this.root=root;return this;} getSize(out){return Object.assign(out,this.root.testSize||{x:1,y:2,z:.5});} getCenter(out){return Object.assign(out,this.root.testCenter||{x:0,y:1,z:0});} }
  class BoxGeometry extends Disposable {}
  class MeshBasicMaterial extends Disposable { constructor() { super(); } }
  class Mesh { constructor(geometry, material) { this.geometry = geometry; this.material = material; this.rotation = { y: 0 }; this.visible=true; } }
  class Clock { getDelta(){return 0.016;} }
  class AnimationMixer { constructor(root){this.root=root;} clipAction(clip){const action={clip,paused:false,play(){this.played=true;return this;},stop(){this.stopped=true;},reset(){this.resetCalled=true;return this;},setLoop(mode,count){this.loop=[mode,count];}};return action;} update(delta){this.delta=delta;} stopAllAction(){this.stopped=true;} }
  const renderers = [];
  class WebGLRenderer extends Disposable { constructor() { super(); this.domElement = target(); this.renderLists = new Disposable(); renderers.push(this); } setPixelRatio(v) { this.dpr = v; } setSize(w, h) { this.size = [w, h]; } render() {} forceContextLoss() { this.lost = true; } }
  const THREE = { Scene, PerspectiveCamera, Color, HemisphereLight, DirectionalLight, Box3, Vector3, BoxGeometry, MeshBasicMaterial, Mesh, WebGLRenderer, AnimationMixer, Clock, LoopRepeat:"repeat", LoopOnce:"once" };
  const loader = { probeCapability: () => ({ supported: true, webgl: true }), loadThree: async ({ signal }) => { if (signal.aborted) throw Object.assign(new Error(), { code: "session_aborted" }); return THREE; } };
  return { env, container, loader, renderers, rafs, THREE };
}

test("capability probe returns structured unsupported results", () => {
  assert.deepEqual(loaderModule.probeCapability({}), { supported: false, webgl: false, reason: "required_api_unavailable" });
  const env = { document: { createElement: () => ({ getContext: () => null }) }, AbortController, requestAnimationFrame() {} };
  assert.deepEqual(loaderModule.probeCapability(env), { supported: false, webgl: false, reason: "webgl_unavailable" });
});

test("dependency and renderer failures normalize and dispose partial ownership", async () => {
  const one = harness(); const dependency = runtime.createMotionSession({ environment: one.env, loader: { ...one.loader, loadThree: async () => { throw Object.assign(new Error("no"), { code: "dependency_load_failed" }); } } });
  assert.equal((await dependency.start(one.container)).code, "dependency_load_failed"); assert.equal(dependency.state, "disposed");
  const two = harness(); const renderer = runtime.createMotionSession({ environment: two.env, loader: two.loader, injectFailure: "renderer_init" });
  assert.equal((await renderer.start(two.container)).code, "renderer_init_failed"); assert.equal(renderer.state, "disposed");
  assert.deepEqual(runtime.diagnostics(), { activeSessions: 0, activeRafs: 0, listeners: 0, timers: 0, canvases: 0 });
});

test("dispose during initialization aborts and ignores stale completion", async () => {
  const h = harness(); let release; h.loader.loadThree = () => new Promise(resolve => { release = resolve; });
  const session = runtime.createMotionSession({ environment: h.env, loader: h.loader }); const starting = session.start(h.container); session.dispose(); release({});
  assert.equal((await starting).code, "session_aborted"); session.dispose();
  assert.deepEqual(runtime.diagnostics(), { activeSessions: 0, activeRafs: 0, listeners: 0, timers: 0, canvases: 0 });
});

test("runtime throw and context loss stop the sole RAF and report safe failures", async () => {
  const h = harness(); let code; const session = runtime.createMotionSession({ environment: h.env, loader: h.loader, injectFailure: "runtime", onError: error => { code = error.code; } });
  await session.start(h.container); h.rafs.values().next().value(); assert.equal(code, "runtime_failed");
  const h2 = harness(); const context = runtime.createMotionSession({ environment: h2.env, loader: h2.loader, onError: error => { code = error.code; } });
  await context.start(h2.container); context.canvas.dispatch("webglcontextlost", { preventDefault() {} }); assert.equal(code, "context_lost");
  assert.deepEqual(runtime.diagnostics(), { activeSessions: 0, activeRafs: 0, listeners: 0, timers: 0, canvases: 0 });
});

test("40 complete start/dispose cycles leave no owned resources", async () => {
  for (let index = 0; index < 40; index++) { const h = harness(); const session = runtime.createMotionSession({ environment: h.env, loader: h.loader }); assert.equal((await session.start(h.container)).status, "ready"); assert.equal(h.renderers[0].dpr, 1.5); assert.deepEqual(h.renderers[0].size, [1280, 720]); session.dispose(); session.dispose(); assert.equal(h.container.children.length, 0); }
  assert.deepEqual(runtime.diagnostics(), { activeSessions: 0, activeRafs: 0, listeners: 0, timers: 0, canvases: 0 });
});

test("canonical avatar and independent clip are mixer-owned and bounded",async()=>{const h=harness(),bone={name:"mixamorig:Hips",isBone:true},skin={name:"Body",isSkinnedMesh:true},avatar=new h.THREE.Scene();avatar.add(bone);avatar.add(skin);const clip={name:"fixture",duration:2,tracks:[{name:"mixamorig:Hips.quaternion"}]};let requested=[];class GLTFLoader{async loadAsync(url){requested.push(url);return url.includes("avatar")?{scene:avatar,animations:[]}:{scene:new h.THREE.Scene(),animations:[clip]};}}h.loader.loadGLTFLoader=async()=>GLTFLoader;const session=runtime.createMotionSession({environment:h.env,loader:h.loader});await session.start(h.container);const loaded=await session.loadAvatar("avatar.glb");assert.deepEqual(loaded.diagnostics.boneNames,["mixamorig:Hips"]);const animation=await session.loadAnimation("fixture.glb");assert.equal(animation.diagnostics.unboundTrackCount,0);assert.equal(session.play().status,"playing");assert.equal(session.pause().status,"paused");assert.equal(session.resume().status,"playing");assert.equal(session.setLoop(false).loop,false);session.stop();assert.equal(session.restart().status,"playing");session.dispose();assert.deepEqual(requested,["avatar.glb","fixture.glb"]);assert.deepEqual(runtime.diagnostics(),{activeSessions:0,activeRafs:0,listeners:0,timers:0,canvases:0});});

test("missing optional GLB is a contained asset_missing result",async()=>{const h=harness();class GLTFLoader{async loadAsync(){throw{target:{status:404}};}}h.loader.loadGLTFLoader=async()=>GLTFLoader;const session=runtime.createMotionSession({environment:h.env,loader:h.loader});await session.start(h.container);assert.equal((await session.loadAvatar("missing.glb")).code,"asset_missing");assert.equal(session.state,"running");session.dispose();});

test("camera fit centers a complete avatar with padding and honors narrow viewports",()=>{
  const landscape=runtime.calculateCameraFit({x:1,y:2,z:.5},{x:.2,y:1,z:-.1},2,50,1.2);
  const portrait=runtime.calculateCameraFit({x:1,y:2,z:.5},{x:.2,y:1,z:-.1},.25,50,1.2);
  assert.deepEqual(landscape.center,{x:.2,y:1,z:-.1}); assert.ok(landscape.distance>2.5); assert.ok(portrait.distance>landscape.distance);
  assert.ok(landscape.near>0); assert.ok(landscape.far>landscape.distance);
});
