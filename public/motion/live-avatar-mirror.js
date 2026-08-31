(function (root, factory) {
  const normalized = typeof module === "object" && module.exports ? require("./normalized-pose") : root.PocketPTNormalizedPose;
  const solverApi = typeof module === "object" && module.exports ? require("./avaturn-live-pose-solver") : root.PocketPTAvaturnLivePoseSolver;
  const api = factory(normalized, solverApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTLiveAvatarMirror = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (normalized, solverApi) {
  "use strict";

  const PRESENTATION_DEFAULTS = Object.freeze({ smoothingAlpha: .58, coastMs: 220, targetFps: 30 });
  const LIVE_SOLVER_DEFAULTS = Object.freeze({ rootTranslationScale: .9, rootTranslationClamp: .75 });
  const BODY_FOLLOW_DEFAULTS = Object.freeze({
    minimumConfidence: .35,
    calibrationFrames: 8,
    minimumBodyHeight: .1,
    lateralScale: .62,
    lateralDirection: -1,
    lateralClamp: .48,
    smoothingLambda: 10,
    missingFrameReturnMs: 320
  });
  const CALIBRATION_DEFAULTS = Object.freeze({
    minimumConfidence: .35,
    minimumBodyHeight: .35,
    stableFrames: 8,
    promptIntervalMs: 3200,
    settleMs: 1500,
    countdownStepMs: 1000,
    baseHoldMs: 1500
  });
  const SPEECH_DEFAULTS = Object.freeze({ duplicateWindowMs: 4500, rateLimitCooldownMs: 12000 });

  class AvatarPresentationStabilizer {
    constructor({ now=()=>Date.now(), ...options }={}){this.now=now;this.options={...PRESENTATION_DEFAULTS,...options};this.previous=null;this.current=null;this.lastPresented=null;this.interpolatedFrames=0;this.coastedFrames=0;this.reacquiredFrames=0;this.presentationFrames=0;this.sampleTimes=[];}
    blend(a,b,t,timestamp=b.timestamp){const joints={};for(const name of new Set([...Object.keys(a?.joints||{}),...Object.keys(b?.joints||{})])){const x=a?.joints?.[name],y=b?.joints?.[name];if(!x||!y){joints[name]=y||x;continue;}joints[name]=Object.freeze({...y,x:x.x+(y.x-x.x)*t,y:x.y+(y.y-x.y)*t,confidence:y.confidence});}const directions={};for(const name of new Set([...Object.keys(a?.directions||{}),...Object.keys(b?.directions||{})])){const x=a?.directions?.[name],y=b?.directions?.[name];if(!x||!y){directions[name]=y||x;continue;}const vx=x.x+(y.x-x.x)*t,vy=x.y+(y.y-x.y)*t,length=Math.hypot(vx,vy)||1;directions[name]=Object.freeze({x:vx/length,y:vy/length,z:0});}const landmarks={};for(const name of new Set([...Object.keys(a?.landmarks||{}),...Object.keys(b?.landmarks||{})])){const x=a?.landmarks?.[name],y=b?.landmarks?.[name];if(Number.isFinite(x)&&Number.isFinite(y))landmarks[name]=x+(y-x)*t;else if(x&&y&&Number.isFinite(x.x)&&Number.isFinite(y.x))landmarks[name]=Object.freeze({...y,x:x.x+(y.x-x.x)*t,y:x.y+(y.y-x.y)*t,confidence:y.confidence});else landmarks[name]=y??x;}for(const name of ["shoulderLine","hipLine","torsoAxis","bodyAxis"])landmarks[name]=directions[name]||landmarks[name];return Object.freeze({...b,timestamp,joints:Object.freeze(joints),directions:Object.freeze(directions),landmarks:Object.freeze(landmarks),rightShoulder:joints.right_shoulder,rightElbow:joints.right_elbow,rightUpperArmDirection:directions.rightUpperArm});}
    observe(frame){if(!frame)return;const hadGap=this.current&&frame.timestamp-this.current.timestamp>this.options.coastMs;const smoothed=this.current?this.blend(this.current,frame,this.options.smoothingAlpha,frame.timestamp):frame;this.previous=this.current;this.current=smoothed;if(hadGap)this.reacquiredFrames++;}
    sample(at=this.now()){if(!this.current)return null;const age=Math.max(0,at-this.current.timestamp);if(age>this.options.coastMs)return null;let frame=this.current;if(this.previous&&this.current.timestamp>this.previous.timestamp){const interval=this.current.timestamp-this.previous.timestamp,t=Math.max(0,Math.min(1,(at-this.previous.timestamp)/interval));if(t<1){frame=this.blend(this.previous,this.current,t,at);this.interpolatedFrames++;}else if(age>0)this.coastedFrames++;}else if(age>0)this.coastedFrames++;this.presentationFrames++;this.sampleTimes.push(at);if(this.sampleTimes.length>60)this.sampleTimes.shift();this.lastPresented=frame;return frame;}
    reset(){this.previous=this.current=this.lastPresented=null;}
    diagnostics(at=this.now()){const elapsed=this.sampleTimes.length>1?this.sampleTimes.at(-1)-this.sampleTimes[0]:0;return{avatarPresentationFps:elapsed>0?(this.sampleTimes.length-1)*1000/elapsed:0,interpolatedAvatarFrames:this.interpolatedFrames,coastedAvatarFrames:this.coastedFrames,reacquiredFrames:this.reacquiredFrames,avatarPoseAgeMs:this.current?Math.max(0,at-this.current.timestamp):null,avatarPresentationLatencyMs:this.lastPresented?Math.max(0,at-this.lastPresented.timestamp):null};}
  }

  function browserSpeak(text) {
    const runtime = typeof globalThis !== "undefined" ? globalThis.CoachRuntime : null;
    if (runtime?.getState?.().muted) return Promise.resolve({ ok:false, skipped:true, reason:"coach_runtime_muted" });
    try {
      const synth = typeof globalThis !== "undefined" ? globalThis.speechSynthesis : null;
      const Utterance = typeof globalThis !== "undefined" ? globalThis.SpeechSynthesisUtterance : null;
      if (!synth || !Utterance) return Promise.resolve({ ok:false, reason:"browser_speech_unavailable" });
      return new Promise((resolve) => {
        const utterance = new Utterance(String(text || ""));
        utterance.rate = .96;
        utterance.pitch = 1;
        utterance.onend = () => resolve({ ok:true, fallback:true });
        utterance.onerror = event => resolve({ ok:false, fallback:true, reason:`browser_speech_error:${event?.error||"unknown"}` });
        synth.speak(utterance);
      });
    } catch (error) { return Promise.resolve({ ok:false, reason:String(error?.message||error||"browser_speech_failed") }); }
  }

  class AvatarCalibrationSpeechArbiter {
    constructor({ now=()=>Date.now(), ...options }={}){this.now=now;this.options={...SPEECH_DEFAULTS,...options};this.tail=Promise.resolve();this.lastText="";this.lastQueuedAt=0;this.cooldownUntil=0;this.spoken=0;this.skipped=0;this.rateLimited=0;}
    isMuted(){return Boolean(globalThis?.CoachRuntime?.getState?.().muted);}
    queue(text){const phrase=String(text||"").trim();if(!phrase)return Promise.resolve({ok:false,skipped:true,reason:"empty"});const at=this.now();if(this.isMuted()){this.skipped++;return Promise.resolve({ok:false,skipped:true,reason:"coach_runtime_muted"});}if(phrase===this.lastText&&at-this.lastQueuedAt<this.options.duplicateWindowMs){this.skipped++;return Promise.resolve({ok:false,skipped:true,reason:"duplicate"});}this.lastText=phrase;this.lastQueuedAt=at;this.tail=this.tail.then(()=>this.speakOne(phrase)).catch(()=>({ok:false,reason:"speech_queue_failed"}));return this.tail;}
    async speakOne(phrase){if(this.isMuted()){this.skipped++;return{ok:false,skipped:true,reason:"coach_runtime_muted"};}const at=this.now();if(at<this.cooldownUntil){this.skipped++;return{ok:false,skipped:true,reason:"rate_limited_cooldown"};}const runtime=globalThis?.CoachRuntime;let result=null;if(runtime&&typeof runtime.speak==="function"){try{result=await runtime.speak(phrase,"avatar-calibration");}catch(error){result={ok:false,reason:String(error?.message||error||"coach_speech_failed")};}}if(result?.ok){this.spoken++;return result;}const reason=String(result?.reason||result?.backendReason||"").toLowerCase();if(reason.includes("429")||reason.includes("rate_limited")||reason.includes("too many requests")){this.rateLimited++;this.cooldownUntil=at+this.options.rateLimitCooldownMs;return{ok:false,skipped:true,reason:"rate_limited_cooldown"};}if(this.isMuted()){this.skipped++;return{ok:false,skipped:true,reason:"coach_runtime_muted"};}const fallback=await browserSpeak(phrase);if(fallback?.ok)this.spoken++;else this.skipped++;return fallback;}
    diagnostics(){return Object.freeze({speechQueueSpoken:this.spoken,speechQueueSkipped:this.skipped,speechQueueRateLimited:this.rateLimited,speechCooldownUntil:this.cooldownUntil});}
  }

  const sharedSpeechArbiter = new AvatarCalibrationSpeechArbiter();
  function canonicalCoachSpeak(text){return sharedSpeechArbiter.queue(text);}

  function activateCanonicalCoachVoice() {
    const runtime = typeof globalThis !== "undefined" ? globalThis.CoachRuntime : null;
    if (!runtime || typeof runtime.activateVoice !== "function") return Promise.resolve({ ok:false, reason:"coach_runtime_unavailable" });
    if (runtime.getState?.().muted === true && globalThis.__POCKETPT_EXPLICIT_VOICE_MUTE__ === true) return Promise.resolve({ ok:false, skipped:true, reason:"coach_runtime_muted" });
    return Promise.resolve(runtime.activateVoice()).catch(error=>({ok:false,reason:String(error?.message||error||"coach_voice_activation_failed")}));
  }

  class AvatarMirrorCalibration {
    constructor({ now=()=>Date.now(), speak=canonicalCoachSpeak, onCue=()=>{}, ...options }={}){this.now=now;this.speak=speak;this.onCue=onCue;this.options={...CALIBRATION_DEFAULTS,...options};this.state="FRAMING";this.stableFrames=0;this.promptCount=0;this.lastPromptAt=null;this.stateStartedAt=this.now();this.countdownSpoken=new Set();this.lastFrame=null;}
    framed(frame){const joints=frame?.joints||{},required=["left_shoulder","right_shoulder","left_hip","right_hip","left_ankle","right_ankle"];if(!frame?.confidence?.bodyDetected)return false;for(const name of required)if(Number(joints[name]?.confidence||0)<this.options.minimumConfidence)return false;return Number(frame?.landmarks?.bodyHeightNormalized||0)>=this.options.minimumBodyHeight;}
    cue(text){this.onCue(text,this.state);Promise.resolve(this.speak?.(text)).catch(()=>{});}
    observe(frame,at=Number(frame?.timestamp||this.now())){this.lastFrame=frame;if(this.state==="READY")return true;const inFrame=this.framed(frame);if(this.state==="FRAMING"){if(!inFrame){this.stableFrames=0;if(this.lastPromptAt==null||at-this.lastPromptAt>=this.options.promptIntervalMs){if(this.promptCount<2)this.cue("Step back so I can see your full body.");else if(this.promptCount===2)this.cue("I'll resume when you're in position.");this.promptCount++;this.lastPromptAt=at;}return false;}this.stableFrames++;if(this.stableFrames>=this.options.stableFrames){this.state="SETTLING";this.stateStartedAt=at;this.cue("I can see you. Get into your base position and hold still.");}return false;}
      if((this.state==="SETTLING"||this.state==="COUNTDOWN"||this.state==="CAPTURING")&&!inFrame){this.state="FRAMING";this.stableFrames=0;this.countdownSpoken.clear();this.stateStartedAt=at;this.cue("I lost your full-body position. Step back so I can see you.");return false;}
      if(this.state==="SETTLING"&&at-this.stateStartedAt>=this.options.settleMs){this.state="COUNTDOWN";this.stateStartedAt=at;this.countdownSpoken.clear();this.cue("Taking your base position in 3... 2... 1... Hold.");this.countdownSpoken.add(3);return false;}
      if(this.state==="COUNTDOWN"){if(at-this.stateStartedAt>=this.options.countdownStepMs*3){this.state="CAPTURING";this.stateStartedAt=at;return true;}return false;}
      if(this.state==="CAPTURING"){if(at-this.stateStartedAt>=this.options.baseHoldMs){this.state="READY";this.cue("Base position set. Start moving.");}return true;}
      return this.state==="READY";}
    captureEnabled(){return this.state==="CAPTURING"||this.state==="READY";}
    ready(){return this.state==="READY";}
    diagnostics(){return Object.freeze({calibrationState:this.state,calibrationReady:this.ready(),calibrationStableFrames:this.stableFrames,calibrationPromptCount:this.promptCount});}
  }

  class AvatarBodyFollower {
    constructor({ avatar, now=()=>Date.now(), ...options }={}){if(!avatar)throw new TypeError("avatar is required");this.avatar=avatar;this.now=now;this.options={...BODY_FOLLOW_DEFAULTS,...options};this.restX=Number(avatar.position?.x||0);this.samples=[];this.calibrated=false;this.neutralHip=null;this.neutralBodyHeight=null;this.targetLateral=0;this.lateral=0;this.lastGoodAt=null;this.appliedFrames=0;}
    clamp(value,limit){return Math.max(-limit,Math.min(limit,value));}
    observe(frame){const hip=frame?.landmarks?.hipCenter,bodyHeight=Number(frame?.landmarks?.bodyHeightNormalized||0),confidence=Math.min(Number(hip?.confidence||0),Number(frame?.confidence?.overall??1));if(!hip||!Number.isFinite(hip.x)||!Number.isFinite(hip.y)||confidence<this.options.minimumConfidence||bodyHeight<this.options.minimumBodyHeight)return false;this.lastGoodAt=Number(frame.timestamp||this.now());if(!this.calibrated){this.samples.push({x:hip.x,bodyHeight});if(this.samples.length>=this.options.calibrationFrames){const mean=key=>this.samples.reduce((sum,s)=>sum+s[key],0)/this.samples.length;this.neutralHip=Object.freeze({x:mean("x")});this.neutralBodyHeight=Math.max(this.options.minimumBodyHeight,mean("bodyHeight"));this.calibrated=true;this.samples.length=0;}return true;}const height=Math.max(this.options.minimumBodyHeight,this.neutralBodyHeight||bodyHeight),lateralNormalized=(hip.x-this.neutralHip.x)/height;this.targetLateral=this.clamp(lateralNormalized*this.options.lateralScale*this.options.lateralDirection,this.options.lateralClamp);return true;}
    markMissing(at=this.now()){if(this.lastGoodAt!=null&&at-this.lastGoodAt>this.options.missingFrameReturnMs)this.targetLateral=0;}
    apply(deltaSeconds){const alpha=1-Math.exp(-this.options.smoothingLambda*Math.max(0,Number(deltaSeconds)||0));this.lateral+=(this.targetLateral-this.lateral)*alpha;if(this.avatar?.position){this.avatar.position.x=this.restX+this.lateral;this.appliedFrames+=1;}}
    restore(){this.targetLateral=0;this.lateral=0;if(this.avatar?.position)this.avatar.position.x=this.restX;}
    diagnostics(){return Object.freeze({bodyFollowCalibrated:this.calibrated,bodyFollowLateral:this.lateral,bodyFollowTargetLateral:this.targetLateral,bodyFollowFrames:this.appliedFrames});}
  }

  class LiveAvatarMirror {
    constructor({eventTarget,session,cameraState=()=>({}),now=()=>Date.now(),solverOptions={},stabilizerOptions={},bodyFollowOptions={},calibrationOptions={},speak=canonicalCoachSpeak,activateVoice=activateCanonicalCoachVoice,onCalibrationCue=()=>{},onPose=()=>{}}={}){if(!eventTarget||!session?.avatar||!session?.THREE)throw new TypeError("eventTarget and a loaded motion session are required");this.eventTarget=eventTarget;this.session=session;this.cameraState=cameraState;this.onPose=onPose;this.now=now;this.disposed=false;this.poseFramesReceived=0;this.retargetFramesExecuted=0;this.lastRetargetAt=null;this.authoritativeTimes=[];this.lastBoundsAt=0;this.boundsProof={avatarWorldBoundsCenter:null,avatarWorldBoundsSize:null};this.voiceActivationState="REQUESTED";this.voiceActivationResult=null;session.unloadMotion?.();this.solver=new solverApi.AvaturnLivePoseSolver({THREE:session.THREE,avatar:session.avatar,now,...LIVE_SOLVER_DEFAULTS,...solverOptions});this.stabilizer=new AvatarPresentationStabilizer({now,...stabilizerOptions});this.bodyFollower=new AvatarBodyFollower({avatar:session.avatar,now,...bodyFollowOptions});this.calibration=new AvatarMirrorCalibration({now,speak,onCue:onCalibrationCue,...calibrationOptions});Promise.resolve(activateVoice?.()).then(result=>{this.voiceActivationResult=result||null;this.voiceActivationState=result?.ok===false?"DEGRADED":"ACTIVE";}).catch(error=>{this.voiceActivationResult={ok:false,reason:String(error?.message||error||"coach_voice_activation_failed")};this.voiceActivationState="DEGRADED";});this.onFrame=event=>{const camera=this.cameraState()||{},frame=normalized.fromMoveNetPosePacket(event?.detail?.posePacket,{cameraFacing:camera.facingMode,previewMirrored:camera.isMirrored});this.poseFramesReceived+=1;this.authoritativeTimes.push(frame.timestamp);if(this.authoritativeTimes.length>60)this.authoritativeTimes.shift();this.stabilizer.observe(frame);const allowed=this.calibration.observe(frame,frame.timestamp);if(allowed&&this.calibration.captureEnabled())this.bodyFollower.observe(frame);this.onPose(frame,{...this.solver.diagnostics(),...this.calibration.diagnostics(),...sharedSpeechArbiter.diagnostics(),voiceActivationState:this.voiceActivationState});};eventTarget.addEventListener("pose-runtime:frame",this.onFrame);}
    update(deltaSeconds,at=this.now()){const frame=this.stabilizer.sample(at);if(frame&&this.calibration.captureEnabled())this.solver.observe(frame);else if(!frame){this.solver.updateTrackingState(at);this.bodyFollower.markMissing(at);}const state=this.solver.update(deltaSeconds,at);if(this.calibration.captureEnabled())this.bodyFollower.apply(deltaSeconds);if(this.solver.diagnostics().changedBones.length){this.retargetFramesExecuted+=1;this.lastRetargetAt=Number(at||Date.now());}return state;}
    diagnostics(){const elapsed=this.authoritativeTimes.length>1?this.authoritativeTimes.at(-1)-this.authoritativeTimes[0]:0,at=this.now(),avatar=this.session.avatar,canvas=this.session.renderer?.domElement||this.session.canvas||null,computed=canvas&&typeof getComputedStyle==="function"?getComputedStyle(canvas):null;if(at-this.lastBoundsAt>=500&&this.session.THREE.Box3){const box=new this.session.THREE.Box3().setFromObject(avatar);if(!box.isEmpty())this.boundsProof={avatarWorldBoundsCenter:Object.freeze(box.getCenter(new this.session.THREE.Vector3()).toArray()),avatarWorldBoundsSize:Object.freeze(box.getSize(new this.session.THREE.Vector3()).toArray())};this.lastBoundsAt=at;}let attached=false;for(let node=avatar;node;node=node.parent)if(node===this.session.scene){attached=true;break}return Object.freeze({...this.solver.diagnostics(),...this.stabilizer.diagnostics(),...this.bodyFollower.diagnostics(),...this.calibration.diagnostics(),...sharedSpeechArbiter.diagnostics(),voiceActivationState:this.voiceActivationState,voiceActivationResult:this.voiceActivationResult,...this.boundsProof,authoritativePoseFps:elapsed>0?(this.authoritativeTimes.length-1)*1000/elapsed:0,poseFramesReceived:this.poseFramesReceived,retargetFramesExecuted:this.retargetFramesExecuted,lastRetargetAt:this.lastRetargetAt,avatarCanvasFound:Boolean(canvas),avatarCanvasDisplay:canvas?.style?.display||"",avatarCanvasVisibility:canvas?.style?.visibility||"",avatarCanvasComputedDisplay:computed?.display||null,avatarCanvasComputedVisibility:computed?.visibility||null,avatarModelFound:Boolean(avatar),avatarModelVisible:avatar?.visible!==false,avatarModelAttachedToScene:attached,avatarRoot:avatar});}
    dispose(){if(this.disposed)return;this.eventTarget.removeEventListener("pose-runtime:frame",this.onFrame);this.bodyFollower.restore();this.solver.dispose();this.disposed=true;}
  }

  return Object.freeze({LiveAvatarMirror,AvatarPresentationStabilizer,AvatarMirrorCalibration,AvatarBodyFollower,AvatarCalibrationSpeechArbiter,canonicalCoachSpeak,activateCanonicalCoachVoice,PRESENTATION_DEFAULTS,LIVE_SOLVER_DEFAULTS,BODY_FOLLOW_DEFAULTS,CALIBRATION_DEFAULTS,SPEECH_DEFAULTS});
});
