(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ProductMotionCamera = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const PRESETS = Object.freeze({ side: Object.freeze({ x: 1, y: 0.12, z: 0 }), front: Object.freeze({ x: 0, y: 0.12, z: 1 }), "three-quarter": Object.freeze({ x: Math.SQRT1_2, y: 0.12, z: Math.SQRT1_2 }) });
  function finiteBounds(bounds) { return bounds && [bounds.min?.x,bounds.min?.y,bounds.min?.z,bounds.max?.x,bounds.max?.y,bounds.max?.z].every(Number.isFinite) && bounds.max.x>bounds.min.x && bounds.max.y>bounds.min.y && bounds.max.z>bounds.min.z; }
  function snapshotBounds(box) { return Object.freeze({ min:Object.freeze({x:box.min.x,y:box.min.y,z:box.min.z}), max:Object.freeze({x:box.max.x,y:box.max.y,z:box.max.z}) }); }
  function sampleAnimatedBounds(session, options={}) {
    const {THREE,avatar,mixer,action,sessionClip}=session||{}, duration=Number(sessionClip?.duration);
    if(!THREE?.Box3||!avatar||!mixer||!action||!(duration>0)) throw new Error("Animated bounds unavailable");
    const samples=Math.max(2,Math.min(25,Math.floor(options.samples||17))), previousTime=Number(action.time)||0, previousPaused=Boolean(action.paused);
    const union={min:{x:Infinity,y:Infinity,z:Infinity},max:{x:-Infinity,y:-Infinity,z:-Infinity}};
    try { for(let index=0;index<samples;index++){ const time=duration*index/(samples-1); if(typeof mixer.setTime==="function")mixer.setTime(time);else{action.time=time;mixer.update?.(0);} avatar.updateMatrixWorld?.(true);const box=new THREE.Box3().setFromObject(avatar);for(const axis of ["x","y","z"]){union.min[axis]=Math.min(union.min[axis],box.min[axis]);union.max[axis]=Math.max(union.max[axis],box.max[axis]);}} }
    finally { if(typeof mixer.setTime==="function")mixer.setTime(previousTime);else{action.time=previousTime;mixer.update?.(0);} action.paused=previousPaused;avatar.updateMatrixWorld?.(true); }
    if(!finiteBounds(union))throw new Error("Animated bounds are invalid");
    return Object.freeze({...snapshotBounds(union),sampleCount:samples,duration});
  }
  function calculateFit(bounds,aspect,fovDegrees,padding=1.22){
    if(!finiteBounds(bounds))throw new TypeError("Valid bounds are required");
    const size={x:bounds.max.x-bounds.min.x,y:bounds.max.y-bounds.min.y,z:bounds.max.z-bounds.min.z},center={x:(bounds.min.x+bounds.max.x)/2,y:(bounds.min.y+bounds.max.y)/2,z:(bounds.min.z+bounds.max.z)/2};
    const halfFov=Math.max(1,Number(fovDegrees)||50)*Math.PI/360,safeAspect=Math.max(.05,Number(aspect)||1),vertical=size.y/(2*Math.tan(halfFov)),horizontal=Math.max(size.x,size.z)/(2*Math.tan(halfFov)*safeAspect),radius=Math.hypot(size.x,size.y,size.z)/2,distance=Math.max(vertical,horizontal)*Math.max(1,Number(padding)||1)+radius*.15;
    return Object.freeze({center:Object.freeze(center),size:Object.freeze(size),distance,minDistance:Math.max(radius*1.15,distance*.55),maxDistance:Math.max(distance*2.5,radius*3),near:Math.max(.01,distance-radius*1.35),far:Math.max(10,distance+radius*4)});
  }
  function createViewController({session,bounds,container,initialPreset="side",environment,onDiagnostic}={}){
    if(!session?.camera||!session?.canvas)throw new TypeError("A running motion session is required");
    const env=environment||globalThis,camera=session.camera,canvas=session.canvas,host=container||canvas.parentNode;let fit=calculateFit(bounds,camera.aspect,camera.fov),disposed=false,yaw=0,pitch=.12,distance=fit.distance,pointer=null,pinchDistance=null,resizeObserver=null,refitTimer=null,refitCount=0,lastRefitReason="mount";const listeners=[];
    const listen=(target,type,handler,options)=>{target?.addEventListener?.(type,handler,options);listeners.push([target,type,handler,options]);};
    function renderPosition(){pitch=Math.max(-.35,Math.min(.75,pitch));distance=Math.max(fit.minDistance,Math.min(fit.maxDistance,distance));const cp=Math.cos(pitch);camera.position.set(fit.center.x+distance*cp*Math.cos(yaw),fit.center.y+distance*Math.sin(pitch),fit.center.z+distance*cp*Math.sin(yaw));camera.near=fit.near;camera.far=fit.far;camera.lookAt(fit.center.x,fit.center.y,fit.center.z);camera.updateProjectionMatrix();}
    function setPreset(name){const direction=PRESETS[name];if(!direction)return false;yaw=Math.atan2(direction.z,direction.x);pitch=Math.asin(direction.y/Math.hypot(direction.x,direction.y,direction.z));distance=fit.distance;renderPosition();return true;}
    function reset(){return setPreset(initialPreset);} function zoomBy(scale){distance*=scale;renderPosition();}
    function pointerDown(event){pointer={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture?.(event.pointerId);} function pointerMove(event){if(!pointer||pointer.id!==event.pointerId)return;yaw-=(event.clientX-pointer.x)*.008;pitch+=(event.clientY-pointer.y)*.006;pointer.x=event.clientX;pointer.y=event.clientY;renderPosition();event.preventDefault?.();} function pointerUp(event){if(pointer?.id===event.pointerId)pointer=null;}
    function touchMove(event){if(event.touches?.length!==2){pinchDistance=null;return;}const[a,b]=event.touches,next=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pinchDistance)zoomBy(pinchDistance/next);pinchDistance=next;event.preventDefault?.();} function wheel(event){zoomBy(Math.exp(Math.max(-100,Math.min(100,event.deltaY))*.002));event.preventDefault?.();}
    function refit(reason="resize_observer"){if(disposed)return false;const width=Number(host?.clientWidth),height=Number(host?.clientHeight);if(!(width>0&&height>0))return false;session.resize?.(host);camera.aspect=width/height;camera.updateProjectionMatrix();fit=calculateFit(bounds,camera.aspect,camera.fov);distance=fit.distance;renderPosition();lastRefitReason=reason;refitCount++;try{onDiagnostic?.("framing_refit",{reason,width,height,devicePixelRatio:Number(env.devicePixelRatio)||1,cameraAspect:camera.aspect,fitDistance:fit.distance,center:fit.center,size:fit.size,refitCount,visualViewport:env.visualViewport?{width:env.visualViewport.width,height:env.visualViewport.height}:null});}catch(_){}return true;}
    function scheduleRefit(reason){if(disposed)return;if(refitTimer!==null)env.clearTimeout?.(refitTimer);refitTimer=env.setTimeout?.(()=>{refitTimer=null;refit(reason);},80);if(refitTimer===undefined){refitTimer=null;refit(reason);}}
    if(canvas.style){canvas.style.touchAction="none";canvas.style.width="100%";canvas.style.height="100%";canvas.style.display="block";}listen(canvas,"pointerdown",pointerDown);listen(canvas,"pointermove",pointerMove);listen(canvas,"pointerup",pointerUp);listen(canvas,"pointercancel",pointerUp);listen(canvas,"touchmove",touchMove,{passive:false});listen(canvas,"touchend",()=>{pinchDistance=null;});listen(canvas,"wheel",wheel,{passive:false});listen(env,"resize",()=>scheduleRefit("resize"));listen(env,"orientationchange",()=>scheduleRefit("orientationchange"));if(env.visualViewport){listen(env.visualViewport,"resize",()=>scheduleRefit("visual_viewport"));listen(env.visualViewport,"scroll",()=>scheduleRefit("visual_viewport"));}if(typeof env.ResizeObserver==="function"&&host){resizeObserver=new env.ResizeObserver(()=>scheduleRefit("resize_observer"));resizeObserver.observe(host);}refit("mount");reset();scheduleRefit("mount_stabilized");
    return Object.freeze({setPreset,reset,zoomBy,resize:()=>refit("manual"),getFit:()=>fit,getDistance:()=>distance,getDiagnostics:()=>Object.freeze({refitCount,lastRefitReason}),dispose(){if(disposed)return;disposed=true;if(refitTimer!==null)env.clearTimeout?.(refitTimer);refitTimer=null;resizeObserver?.disconnect?.();resizeObserver=null;for(const[target,type,handler,options]of listeners)target?.removeEventListener?.(type,handler,options);listeners.length=0;}});
  }
  return Object.freeze({PRESETS,sampleAnimatedBounds,calculateFit,createViewController});
});
