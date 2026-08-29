(function (root, factory) {
  const normalized = typeof module === "object" && module.exports ? require("./normalized-pose") : root.PocketPTNormalizedPose;
  const solverApi = typeof module === "object" && module.exports ? require("./avaturn-live-pose-solver") : root.PocketPTAvaturnLivePoseSolver;
  const api = factory(normalized, solverApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTLiveAvatarMirror = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (normalized, solverApi) {
  "use strict";
  const PRESENTATION_DEFAULTS = Object.freeze({ smoothingAlpha: .58, coastMs: 220, targetFps: 30 });
  class AvatarPresentationStabilizer {
    constructor({ now=()=>Date.now(), ...options }={}){this.now=now;this.options={...PRESENTATION_DEFAULTS,...options};this.previous=null;this.current=null;this.lastPresented=null;this.interpolatedFrames=0;this.coastedFrames=0;this.reacquiredFrames=0;this.presentationFrames=0;this.sampleTimes=[];}
    blend(a,b,t,timestamp=b.timestamp){const joints={};for(const name of new Set([...Object.keys(a?.joints||{}),...Object.keys(b?.joints||{})])){const x=a?.joints?.[name],y=b?.joints?.[name];if(!x||!y){joints[name]=y||x;continue;}joints[name]=Object.freeze({...y,x:x.x+(y.x-x.x)*t,y:x.y+(y.y-x.y)*t,confidence:y.confidence});}const directions={};for(const name of new Set([...Object.keys(a?.directions||{}),...Object.keys(b?.directions||{})])){const x=a?.directions?.[name],y=b?.directions?.[name];if(!x||!y){directions[name]=y||x;continue;}const vx=x.x+(y.x-x.x)*t,vy=x.y+(y.y-x.y)*t,length=Math.hypot(vx,vy)||1;directions[name]=Object.freeze({x:vx/length,y:vy/length,z:0});}const landmarks={};for(const name of new Set([...Object.keys(a?.landmarks||{}),...Object.keys(b?.landmarks||{})])){const x=a?.landmarks?.[name],y=b?.landmarks?.[name];if(Number.isFinite(x)&&Number.isFinite(y))landmarks[name]=x+(y-x)*t;else if(x&&y&&Number.isFinite(x.x)&&Number.isFinite(y.x))landmarks[name]=Object.freeze({...y,x:x.x+(y.x-x.x)*t,y:x.y+(y.y-x.y)*t,confidence:y.confidence});else landmarks[name]=y??x;}for(const name of ["shoulderLine","hipLine","torsoAxis","bodyAxis"])landmarks[name]=directions[name]||landmarks[name];return Object.freeze({...b,timestamp,joints:Object.freeze(joints),directions:Object.freeze(directions),landmarks:Object.freeze(landmarks),rightShoulder:joints.right_shoulder,rightElbow:joints.right_elbow,rightUpperArmDirection:directions.rightUpperArm});}
    observe(frame){if(!frame)return;const hadGap=this.current&&frame.timestamp-this.current.timestamp>this.options.coastMs;const smoothed=this.current?this.blend(this.current,frame,this.options.smoothingAlpha,frame.timestamp):frame;this.previous=this.current;this.current=smoothed;if(hadGap)this.reacquiredFrames++;}
    sample(at=this.now()){if(!this.current)return null;const age=Math.max(0,at-this.current.timestamp);if(age>this.options.coastMs)return null;let frame=this.current;if(this.previous&&this.current.timestamp>this.previous.timestamp){const interval=this.current.timestamp-this.previous.timestamp,t=Math.max(0,Math.min(1,(at-this.previous.timestamp)/interval));if(t<1){frame=this.blend(this.previous,this.current,t,at);this.interpolatedFrames++;}else if(age>0)this.coastedFrames++;}else if(age>0)this.coastedFrames++;this.presentationFrames++;this.sampleTimes.push(at);if(this.sampleTimes.length>60)this.sampleTimes.shift();this.lastPresented=frame;return frame;}
    reset(){this.previous=this.current=this.lastPresented=null;}
    diagnostics(at=this.now()){const elapsed=this.sampleTimes.length>1?this.sampleTimes.at(-1)-this.sampleTimes[0]:0;return{avatarPresentationFps:elapsed>0?(this.sampleTimes.length-1)*1000/elapsed:0,interpolatedAvatarFrames:this.interpolatedFrames,coastedAvatarFrames:this.coastedFrames,reacquiredFrames:this.reacquiredFrames,avatarPoseAgeMs:this.current?Math.max(0,at-this.current.timestamp):null,avatarPresentationLatencyMs:this.lastPresented?Math.max(0,at-this.lastPresented.timestamp):null};}
  }
  class LiveAvatarMirror {
    constructor({ eventTarget, session, cameraState = () => ({}), now = () => Date.now(), solverOptions = {}, stabilizerOptions = {}, onPose = () => {} } = {}) {
      if (!eventTarget || !session?.avatar || !session?.THREE) throw new TypeError("eventTarget and a loaded motion session are required");
      this.eventTarget = eventTarget; this.session = session; this.cameraState = cameraState; this.onPose = onPose; this.now=now; this.disposed = false; this.poseFramesReceived = 0; this.retargetFramesExecuted = 0; this.lastRetargetAt = null;this.authoritativeTimes=[];
      session.unloadMotion?.();
      this.solver = new solverApi.AvaturnLivePoseSolver({ THREE: session.THREE, avatar: session.avatar, now, ...solverOptions });
      this.stabilizer=new AvatarPresentationStabilizer({now,...stabilizerOptions});
      this.onFrame = event => {
        const camera = this.cameraState() || {};
        const frame = normalized.fromMoveNetPosePacket(event?.detail?.posePacket, { cameraFacing: camera.facingMode, previewMirrored: camera.isMirrored });
        this.poseFramesReceived += 1;this.authoritativeTimes.push(frame.timestamp);if(this.authoritativeTimes.length>60)this.authoritativeTimes.shift();this.stabilizer.observe(frame); this.onPose(frame, this.solver.diagnostics());
      };
      eventTarget.addEventListener("pose-runtime:frame", this.onFrame);
    }
    update(deltaSeconds, at=this.now()) {const frame=this.stabilizer.sample(at);if(frame)this.solver.observe(frame);else this.solver.updateTrackingState(at); const state = this.solver.update(deltaSeconds, at); if (this.solver.diagnostics().changedBones.length) { this.retargetFramesExecuted += 1; this.lastRetargetAt = Number(at || Date.now()); } return state; }
    diagnostics() {const elapsed=this.authoritativeTimes.length>1?this.authoritativeTimes.at(-1)-this.authoritativeTimes[0]:0;return Object.freeze({ ...this.solver.diagnostics(),...this.stabilizer.diagnostics(),authoritativePoseFps:elapsed>0?(this.authoritativeTimes.length-1)*1000/elapsed:0, poseFramesReceived: this.poseFramesReceived, retargetFramesExecuted: this.retargetFramesExecuted, lastRetargetAt: this.lastRetargetAt, avatarRoot: this.session.avatar }); }
    dispose() { if (this.disposed) return; this.eventTarget.removeEventListener("pose-runtime:frame", this.onFrame); this.solver.dispose(); this.disposed = true; }
  }
  return Object.freeze({ LiveAvatarMirror,AvatarPresentationStabilizer,PRESENTATION_DEFAULTS });
});
