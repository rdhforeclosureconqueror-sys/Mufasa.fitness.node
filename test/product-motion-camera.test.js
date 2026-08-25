"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),Camera=require("../public/motion/product-motion-camera");
const animated={min:{x:-2,y:-.2,z:-.5},max:{x:2,y:1.4,z:.5}};
function harness(){const handlers=[];const remove=function(type,fn){const i=handlers.findIndex(v=>v[0]===this&&v[1]===type&&v[2]===fn);if(i>=0)handlers.splice(i,1);};const canvas={style:{},addEventListener(type,fn,o){handlers.push([this,type,fn,o]);},removeEventListener:remove};const env={addEventListener(type,fn,o){handlers.push([this,type,fn,o]);},removeEventListener:remove};const camera={aspect:16/9,fov:50,position:{set(x,y,z){Object.assign(this,{x,y,z});}},lookAt(x,y,z){this.target={x,y,z};},updateProjectionMatrix(){}};return{handlers,canvas,env,camera,session:{camera,canvas}};}
test("animated sampling unions poses and restores playback time/state",()=>{let time=0;const action={time:.3,paused:false},avatar={updateMatrixWorld(){}},mixer={setTime(v){time=v;action.time=v;}};class Box3{setFromObject(){this.min={x:-1-time,y:0,z:-.2};this.max={x:1+time,y:1+time,z:.2};return this;}}const bounds=Camera.sampleAnimatedBounds({THREE:{Box3},avatar,mixer,action,sessionClip:{duration:1}},{samples:3});assert.deepEqual(bounds.min,{x:-2,y:0,z:-.2});assert.deepEqual(bounds.max,{x:2,y:2,z:.2});assert.equal(action.time,.3);assert.equal(action.paused,false);});
test("camera fit mathematically contains the full sampled envelope",()=>{const fit=Camera.calculateFit(animated,9/16,50,1.22),tan=Math.tan(25*Math.PI/180);assert.ok(fit.distance*tan>=fit.size.y/2);assert.ok(fit.distance*tan*(9/16)>=fit.size.x/2);assert.ok(fit.near>0&&fit.far>fit.distance);});
test("side, front, three-quarter, and reset presets resolve",()=>{const h=harness(),c=Camera.createViewController({session:h.session,bounds:animated,environment:h.env,initialPreset:"side"}),side={...h.camera.position};assert.equal(c.setPreset("front"),true);assert.ok(h.camera.position.z>h.camera.target.z);assert.equal(c.setPreset("three-quarter"),true);assert.ok(h.camera.position.x>0&&h.camera.position.z>0);c.reset();assert.ok(Math.abs(h.camera.position.x-side.x)<1e-9);assert.ok(Math.abs(h.camera.position.z-side.z)<1e-9);c.dispose();});
test("zoom clamps and disposal removes every owned listener",()=>{const h=harness(),c=Camera.createViewController({session:h.session,bounds:animated,environment:h.env}),fit=c.getFit();c.zoomBy(.000001);assert.equal(c.getDistance(),fit.minDistance);c.zoomBy(1e9);assert.equal(c.getDistance(),fit.maxDistance);assert.ok(h.handlers.length>0);c.dispose();assert.equal(h.handlers.length,0);c.dispose();});
test("product preview disables the legacy green diagnostic probe",()=>{const source=require("node:fs").readFileSync(require("node:path").join(__dirname,"../public/motion/product-motion-preview.js"),"utf8");assert.match(source,/showProbe: false/);});

test("responsive refit uses current CSS aspect and is independent of DPR",()=>{
  const fits=[];
  for(const dpr of [1,3]){
    const h=harness(),container={clientWidth:390,clientHeight:300};h.env.devicePixelRatio=dpr;h.env.setTimeout=(fn)=>{fn();return 1;};h.env.clearTimeout=()=>{};h.session.resize=host=>{h.camera.aspect=host.clientWidth/host.clientHeight;};
    const c=Camera.createViewController({session:h.session,bounds:animated,container,environment:h.env});fits.push(c.getFit());c.dispose();
  }
  assert.equal(fits[0].distance,fits[1].distance);assert.deepEqual(fits[0].center,fits[1].center);
});

test("portrait landscape portrait refits distance and reset uses current dimensions",()=>{
  const h=harness(),container={clientWidth:390,clientHeight:300};h.env.setTimeout=(fn)=>{fn();return 1;};h.env.clearTimeout=()=>{};h.session.resize=host=>{h.camera.aspect=host.clientWidth/host.clientHeight;};
  const c=Camera.createViewController({session:h.session,bounds:animated,container,environment:h.env});const portrait=c.getDistance();container.clientWidth=844;container.clientHeight=300;c.resize();const landscape=c.getDistance();assert.notEqual(landscape,portrait);container.clientWidth=390;container.clientHeight=300;c.resize();c.zoomBy(.8);c.reset();assert.equal(c.getDistance(),portrait);c.dispose();
});

test("every preset targets the envelope center in portrait",()=>{
  const h=harness(),container={clientWidth:320,clientHeight:280};h.session.resize=host=>{h.camera.aspect=host.clientWidth/host.clientHeight;};const c=Camera.createViewController({session:h.session,bounds:animated,container,environment:h.env});
  for(const preset of ["side","front","three-quarter"]){assert.equal(c.setPreset(preset),true);assert.deepEqual(h.camera.target,c.getFit().center);}c.dispose();
});

test("ResizeObserver and visualViewport updates are bounded and cleaned up",()=>{
  const h=harness(),container={clientWidth:390,clientHeight:300},viewportHandlers=[];let observerDisconnects=0,viewportRemovals=0,pending=null;
  h.env.setTimeout=fn=>{pending=fn;return 7;};h.env.clearTimeout=()=>{pending=null;};h.env.visualViewport={width:390,height:700,addEventListener(type,fn,o){viewportHandlers.push([this,type,fn,o]);},removeEventListener(){viewportRemovals++;}};h.env.ResizeObserver=class{constructor(fn){this.fn=fn;}observe(){}disconnect(){observerDisconnects++;}};h.session.resize=host=>{h.camera.aspect=host.clientWidth/host.clientHeight;};
  const c=Camera.createViewController({session:h.session,bounds:animated,container,environment:h.env});const before=c.getDiagnostics().refitCount;for(const entry of viewportHandlers)if(entry[1]==="resize")entry[2]();assert.equal(c.getDiagnostics().refitCount,before);pending?.();assert.equal(c.getDiagnostics().refitCount,before+1);c.dispose();assert.equal(observerDisconnects,1);assert.equal(h.handlers.length,0);assert.equal(viewportRemovals,2);
});
