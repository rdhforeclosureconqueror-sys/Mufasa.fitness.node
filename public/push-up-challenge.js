(function initPushUpChallenge(globalScope, factory) {
  'use strict';
  const api = factory(globalScope);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (globalScope) globalScope.PushUpChallenge = api;
})(typeof window !== 'undefined' ? window : globalThis, function challengeFactory(global) {
  'use strict';

  const SESSION_SCHEMA_VERSION = 1;
  const POSE_MODEL = 'MoveNet.SinglePose.Lightning';
  const POSE_MODEL_VERSION = '2.1.3';
  const LANDMARK_NAMES = ['shoulder', 'hip', 'ankle'];
  const SEQUENCE_LANDMARK_NAMES = ['shoulder', 'elbow', 'wrist', 'hip', 'ankle'];
  const SIDES = ['left', 'right'];
  const CONNECTIONS = [['shoulder', 'hip'], ['hip', 'ankle']];
  const TRACKING_STATES = Object.freeze({ SEARCHING:'SEARCHING', STABILIZING:'STABILIZING', LOCKED:'LOCKED', DEGRADED:'DEGRADED', RECOVERING:'RECOVERING', LOST:'LOST' });
  const TRACKING_DEFAULTS = Object.freeze({ dropoutGraceMs:750, hardLossMs:2000, recoveryRequiredFrames:4, initialLockRequiredFrames:5, confidenceAlpha:.35, trackingMargin:.08, displayPredictionMs:180 });

  const clone = value => JSON.parse(JSON.stringify(value));
  const id = () => global.crypto?.randomUUID?.() || `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  class RepetitionEventCorrelator {
    constructor({windowMs=350,expiryMs=700}={}){this.windowMs=windowMs;this.expiryMs=Math.max(expiryMs,windowMs);this.pending={legacy:[],sequence:[]};this.matches=[];this.seen=new Set();}
    add(source,event,now=Number(event?.timestamp)){if(!['legacy','sequence'].includes(source)||!event)return[];const eventId=event.eventId||`${source}:${event.index??'event'}:${event.timestamp}`;if(this.seen.has(eventId))return[];this.seen.add(eventId);const normalized={eventId,source,timestamp:Number(event.timestamp),interrupted:Boolean(event.interrupted)};const other=source==='legacy'?'sequence':'legacy',candidates=this.pending[other].filter(candidate=>!candidate.interrupted&&!normalized.interrupted&&Math.abs(candidate.timestamp-normalized.timestamp)<=this.windowMs).sort((a,b)=>Math.abs(a.timestamp-normalized.timestamp)-Math.abs(b.timestamp-normalized.timestamp));if(candidates.length===1){const match=candidates[0];this.pending[other]=this.pending[other].filter(item=>item!==match);const result={classification:'both_counted',legacyEventId:source==='legacy'?eventId:match.eventId,sequenceEventId:source==='sequence'?eventId:match.eventId,timestamp:Math.max(normalized.timestamp,match.timestamp)};this.matches.push(result);return[result];}if(candidates.length>1){const result={classification:'unmatched_or_ambiguous',eventId,timestamp:normalized.timestamp,reason:'multiple_candidates'};this.matches.push(result);return[result];}this.pending[source].push(normalized);return this.expire(now);}
    expire(now=Date.now(),force=false){const out=[];for(const source of ['legacy','sequence']){const retained=[];for(const event of this.pending[source]){if(force||now-event.timestamp>this.expiryMs){const result={classification:event.interrupted?'unmatched_or_ambiguous':source==='legacy'?'legacy_only':'sequence_only',eventId:event.eventId,timestamp:event.timestamp,reason:event.interrupted?'tracking_interruption':'expired'};out.push(result);this.matches.push(result);}else retained.push(event);}this.pending[source]=retained;}return out;}
    status(){return{pendingLegacy:this.pending.legacy.length,pendingSequence:this.pending.sequence.length,matches:this.matches.slice()};}
  }
  const finite = value => Number.isFinite(Number(value));

  function createVideoScreenTransform({sourceWidth,sourceHeight,containerWidth,containerHeight,objectFit='cover',isMirrored=false,devicePixelRatio=1}={}) {
    if (![sourceWidth,sourceHeight,containerWidth,containerHeight].every(value => Number(value) > 0)) throw new TypeError('Video and container dimensions must be positive.');
    const scale=(objectFit==='contain'?Math.min:Math.max)(containerWidth/sourceWidth,containerHeight/sourceHeight);
    const renderedWidth=sourceWidth*scale,renderedHeight=sourceHeight*scale;
    const offsetX=(containerWidth-renderedWidth)/2,offsetY=(containerHeight-renderedHeight)/2;
    const map=point=>{
      let screenX=Number(point.x)*sourceWidth*scale+offsetX;
      if(isMirrored)screenX=containerWidth-screenX;
      return {...point,screenX,screenY:Number(point.y)*sourceHeight*scale+offsetY};
    };
    return Object.freeze({scale,renderedWidth,renderedHeight,offsetX,offsetY,screenX:x=>map({x,y:0}).screenX,screenY:y=>map({x:0,y}).screenY,map,devicePixelRatio});
  }

  function cameraErrorMessage(error,mediaDevices=global.navigator?.mediaDevices) {
    if(global.isSecureContext===false)return'Camera access requires HTTPS.';
    if(!mediaDevices?.getUserMedia)return'This browser does not support camera access.';
    if(error?.name==='NotAllowedError'||error?.name==='SecurityError')return'Camera permission was denied.';
    if(error?.name==='NotFoundError'||error?.name==='DevicesNotFoundError')return error?.selectedDevice?'The selected camera is no longer available.':'No camera device was found.';
    if(error?.name==='NotReadableError'||error?.name==='TrackStartError')return'The camera is already in use by another application.';
    if(error?.code==='ENUMERATION_FAILED')return'Camera device enumeration failed.';
    if(error?.code==='VIDEO_PLAYBACK_FAILED')return'Camera video playback failed.';
    return`Camera stream startup failed${error?.message?`: ${error.message}`:'.'}`;
  }

  class CameraController {
    constructor({mediaDevices=global.navigator?.mediaDevices,storage=global.localStorage,storageKey='mufasa.push-up.camera.v1',video=null,onStatus=()=>{}}={}){this.mediaDevices=mediaDevices;this.storage=storage;this.storageKey=storageKey;this.video=video;this.onStatus=onStatus;this.stream=null;this.devices=[];this.selectedDeviceId='';this.selectedCameraLabel='';this.selectedFacingMode='user';this.isMirrored=true;this.loading=false;}
    savedDeviceId(){try{return this.storage?.getItem(this.storageKey)||'';}catch(_){return'';}}
    constraints(deviceId){return{audio:false,video:{width:{ideal:640},height:{ideal:480},...(deviceId?{deviceId:{exact:deviceId}}:{facingMode:{ideal:'user'}})}};}
    friendlyLabel(device,index){if(device.label)return device.label;const hint=`${device.label||''} ${device.deviceId||''}`.toLowerCase();if(/front|user|facetime/.test(hint))return'Front Camera';if(/back|rear|environment/.test(hint))return'Back Camera';return`Camera ${index+1}`;}
    async enumerate(){try{this.devices=(await this.mediaDevices.enumerateDevices()).filter(device=>device.kind==='videoinput').map((device,index)=>({...device,friendlyLabel:this.friendlyLabel(device,index)}));return this.devices;}catch(error){error.code='ENUMERATION_FAILED';throw error;}}
    inferFacing(device){const text=`${device?.label||''} ${device?.friendlyLabel||''}`.toLowerCase();return/back|rear|environment/.test(text)?'environment':'user';}
    async initial(){const saved=this.savedDeviceId();let stream;
      if(saved){try{stream=await this.open(saved);}catch(error){/* A stale local preference falls back to the front camera. */}}
      if(!stream)stream=await this.open();return stream;
    }
    async open(deviceId=''){if(!this.mediaDevices?.getUserMedia)throw Object.assign(new Error('getUserMedia unavailable'),{name:'NotSupportedError'});this.loading=true;this.onStatus('loading');
      try{const next=await this.mediaDevices.getUserMedia(this.constraints(deviceId));await this.replace(next);await this.enumerate();const track=next.getVideoTracks?.()[0],settings=track?.getSettings?.()||{};this.selectedDeviceId=settings.deviceId||deviceId||this.devices[0]?.deviceId||'';const selected=this.devices.find(d=>d.deviceId===this.selectedDeviceId)||this.devices[0];this.selectedCameraLabel=selected?.friendlyLabel||'Camera';this.selectedFacingMode=settings.facingMode||this.inferFacing(selected);this.isMirrored=this.selectedFacingMode!=='environment';try{if(this.selectedDeviceId)this.storage?.setItem(this.storageKey,this.selectedDeviceId);}catch(_){}this.onStatus('active');return next;
      }catch(error){this.stop();this.onStatus('error',error);throw error;}finally{this.loading=false;}}
    async replace(next){this.stop();this.stream=next;if(!this.video)return;this.video.srcObject=null;this.video.srcObject=next;await new Promise((resolve,reject)=>{if(this.video.readyState>=1)return resolve();const done=()=>{cleanup();resolve();},fail=()=>{cleanup();reject(Object.assign(new Error('Video metadata failed to load.'),{code:'VIDEO_PLAYBACK_FAILED'}));},cleanup=()=>{this.video.removeEventListener?.('loadedmetadata',done);this.video.removeEventListener?.('error',fail);};this.video.addEventListener?.('loadedmetadata',done,{once:true});this.video.addEventListener?.('error',fail,{once:true});});try{await this.video.play();}catch(error){error.code='VIDEO_PLAYBACK_FAILED';throw error;}}
    async switchTo(deviceId){if(!deviceId)throw Object.assign(new Error('Camera device is unavailable.'),{name:'NotFoundError',selectedDevice:true});this.stop();try{return await this.open(deviceId);}catch(error){error.selectedDevice=true;throw error;}}
    stop(){this.stream?.getTracks?.().forEach(track=>track.stop());this.stream=null;if(this.video)this.video.srcObject=null;}
    get state(){return{selectedDeviceId:this.selectedDeviceId,selectedCameraLabel:this.selectedCameraLabel,selectedFacingMode:this.selectedFacingMode,isMirrored:this.isMirrored,cameraCount:this.devices.length,loading:this.loading,active:Boolean(this.stream)};}
  }

  function getPushUpProfile(metadata = global.ExerciseMetadata) {
    const profile = metadata?.getDefaultRegistry?.().resolve('push_up');
    if (!profile || profile.exerciseId !== 'push_up' || !profile.metadataFingerprint) {
      throw new Error('The runtime-authoritative Push-Up profile is unavailable.');
    }
    return profile;
  }

  function sessionVersionMetadata(profile) {
    return Object.freeze({
      exerciseId: profile.exerciseId,
      canonicalProfileFingerprint: profile.metadataFingerprint,
      profileVersion: profile.profileVersion,
      generatorVersion: profile.generatorVersion,
      capabilityRegistryVersion: profile.capabilityRegistryVersion,
      thresholdVersion: profile.rulesVersion,
      poseModel: POSE_MODEL,
      poseModelVersion: POSE_MODEL_VERSION
    });
  }

  function selectSide(keypoints) {
    const byName = new Map((keypoints || []).map(point => [point.name || point.part, point]));
    return SIDES.map(side => ({
      side,
      points: Object.fromEntries(LANDMARK_NAMES.map(name => [name, byName.get(`${side}_${name}`)])),
      score: LANDMARK_NAMES.reduce((sum, name) => sum + Number(byName.get(`${side}_${name}`)?.score || 0), 0)
    })).sort((a, b) => b.score - a.score)[0];
  }

  class SideTracker {
    constructor({sideSwitchConfidenceMargin=.15,sideSwitchRequiredFrames=3,initialSideRequiredFrames=3}={}){Object.assign(this,{sideSwitchConfidenceMargin,sideSwitchRequiredFrames,initialSideRequiredFrames});this.reset();}
    reset(){this.activeSide=null;this.candidate=null;this.streak=0;}
    select(keypoints,threshold){const candidates=SIDES.map(side=>{const points=LANDMARK_NAMES.map(name=>(keypoints||[]).find(p=>(p.name||p.part)===`${side}_${name}`));return{side,points,score:points.reduce((s,p)=>s+Number(p?.score||0),0)/LANDMARK_NAMES.length,usable:points.every(p=>Number(p?.score||0)>=threshold)};});const best=candidates.sort((a,b)=>b.score-a.score)[0];if(!this.activeSide){if(best.usable&&this.candidate===best.side)this.streak++;else{this.candidate=best.usable?best.side:null;this.streak=best.usable?1:0;}if(this.streak>=this.initialSideRequiredFrames){this.activeSide=best.side;this.streak=0;}return this.activeSide?candidates.find(x=>x.side===this.activeSide):best;}const current=candidates.find(x=>x.side===this.activeSide),alternative=candidates.find(x=>x.side!==this.activeSide);if(!current.usable&&alternative.usable||alternative.usable&&alternative.score>=current.score+this.sideSwitchConfidenceMargin){this.streak=this.candidate===alternative.side?this.streak+1:1;this.candidate=alternative.side;if(this.streak>=this.sideSwitchRequiredFrames){this.activeSide=alternative.side;this.streak=0;}}else{this.candidate=null;this.streak=0;}return candidates.find(x=>x.side===this.activeSide);}
  }

  class TrackingStateMachine {
    constructor(options={}){Object.assign(this,TRACKING_DEFAULTS,options);this.reset();}
    reset(){this.state=TRACKING_STATES.SEARCHING;this.usableFrameStreak=0;this.unusableFrameStreak=0;this.recoveryFrameStreak=0;this.dropoutStartedAt=null;this.lastSuccessfulPoseAt=null;this.longestDropoutMs=0;this.totalTrackingLossMs=0;this.recoveryEvents=0;this.lastTimestamp=null;this.recoveredThisFrame=false;}
    update(analysisUsable,timestamp=Date.now()){
      this.recoveredThisFrame=false;const elapsed=this.lastTimestamp==null?0:Math.max(0,timestamp-this.lastTimestamp);this.lastTimestamp=timestamp;
      if(analysisUsable){this.lastSuccessfulPoseAt=timestamp;this.usableFrameStreak++;this.unusableFrameStreak=0;
        if(this.dropoutStartedAt!=null){const duration=Math.max(0,timestamp-this.dropoutStartedAt);this.longestDropoutMs=Math.max(this.longestDropoutMs,duration);this.dropoutStartedAt=null;}
        if(this.state===TRACKING_STATES.SEARCHING||this.state===TRACKING_STATES.STABILIZING){this.state=this.usableFrameStreak>=this.initialLockRequiredFrames?TRACKING_STATES.LOCKED:TRACKING_STATES.STABILIZING;}
        else if(this.state===TRACKING_STATES.DEGRADED||this.state===TRACKING_STATES.LOST||this.state===TRACKING_STATES.RECOVERING){if(this.state!==TRACKING_STATES.RECOVERING){this.recoveryFrameStreak=0;this.recoveryEvents++;}this.state=TRACKING_STATES.RECOVERING;this.recoveryFrameStreak++;if(this.recoveryFrameStreak>=this.recoveryRequiredFrames){this.state=TRACKING_STATES.LOCKED;this.recoveredThisFrame=true;this.recoveryFrameStreak=0;}}
      }else{this.totalTrackingLossMs+=elapsed;this.unusableFrameStreak++;this.usableFrameStreak=0;this.recoveryFrameStreak=0;if(this.dropoutStartedAt==null)this.dropoutStartedAt=timestamp;const duration=timestamp-this.dropoutStartedAt;this.longestDropoutMs=Math.max(this.longestDropoutMs,duration);if(this.state===TRACKING_STATES.SEARCHING||this.state===TRACKING_STATES.STABILIZING)this.state=duration>=this.hardLossMs?TRACKING_STATES.LOST:TRACKING_STATES.SEARCHING;else this.state=duration>=this.hardLossMs?TRACKING_STATES.LOST:TRACKING_STATES.DEGRADED;}
      return this.state;
    }
    get currentDropoutMs(){return this.dropoutStartedAt==null?0:Math.max(0,(this.lastTimestamp||Date.now())-this.dropoutStartedAt);}
  }

  /* Backward-compatible readiness adapter; capture uses the richer state machine above. */
  class PoseStabilityGate {constructor({readyFrames=5,lostFrames=3}={}){this.readyFrames=readyFrames;this.lostFrames=lostFrames;this.reset();}reset(){this.usableFrameStreak=0;this.unusableFrameStreak=0;this.poseReady=false;}update(usable){if(usable){this.usableFrameStreak++;this.unusableFrameStreak=0;if(this.usableFrameStreak>=this.readyFrames)this.poseReady=true;}else{this.unusableFrameStreak++;this.usableFrameStreak=0;if(this.unusableFrameStreak>=this.lostFrames)this.poseReady=false;}return this.poseReady;}}

  class LandmarkContinuity {
    constructor(options={}){Object.assign(this,TRACKING_DEFAULTS,options);this.reset();}
    reset(){this.history=Object.fromEntries(LANDMARK_NAMES.map(name=>[name,{lastReliablePosition:null,lastReliableTimestamp:null,previousReliablePosition:null,confidenceEMA:null,missingDurationMs:0}]));}
    update(landmarks,threshold,timestamp){const analysis={},display={};for(const name of LANDMARK_NAMES){const point=landmarks[name],item=this.history[name],confidence=Number(point?.confidence||0);item.confidenceEMA=item.confidenceEMA==null?confidence:this.confidenceAlpha*confidence+(1-this.confidenceAlpha)*item.confidenceEMA;const reliable=Boolean(point&&confidence>=threshold);analysis[name]=reliable?point:null;if(reliable){item.previousReliablePosition=item.lastReliablePosition;item.lastReliablePosition={...point};item.lastReliableTimestamp=timestamp;item.missingDurationMs=0;display[name]={...point,cached:false};}else{item.missingDurationMs=item.lastReliableTimestamp==null?0:timestamp-item.lastReliableTimestamp;const held=item.lastReliablePosition;if(held&&item.missingDurationMs<=this.dropoutGraceMs){let x=held.x,y=held.y;if(item.previousReliablePosition&&item.lastReliableTimestamp!=null&&item.missingDurationMs<=this.displayPredictionMs){const vx=held.x-item.previousReliablePosition.x,vy=held.y-item.previousReliablePosition.y;x=Math.max(0,Math.min(1,x+vx));y=Math.max(0,Math.min(1,y+vy));}display[name]={...held,x,y,cached:true,displayOnly:true};}else display[name]=null;}}
      return{analysis,display,diagnostics:Object.fromEntries(LANDMARK_NAMES.map(name=>[name,{confidence:landmarks[name]?.confidence||0,...this.history[name]}]))};}
  }

  class LandmarkSmoother {constructor(alpha=.45){this.alpha=alpha;this.reset();}reset(){this.previous=null;}apply(landmarks){const next={};for(const name of LANDMARK_NAMES){const point=landmarks[name],old=this.previous?.[name];next[name]=point?{...point,x:old?this.alpha*point.x+(1-this.alpha)*old.x:point.x,y:old?this.alpha*point.y+(1-this.alpha)*old.y:point.y}:null;}this.previous=next;return next;}}

  function normalizeLandmarks(keypoints, width, height) {
    if (!(width > 0) || !(height > 0)) throw new TypeError('Frame dimensions must be positive.');
    const selected = selectSide(keypoints);
    const landmarks = {};
    for (const name of LANDMARK_NAMES) {
      const point = selected.points[name];
      landmarks[name] = point && finite(point.x) && finite(point.y) ? {
        x: Math.max(0, Math.min(1, Number(point.x) / width)),
        y: Math.max(0, Math.min(1, Number(point.y) / height)),
        confidence: Math.max(0, Math.min(1, Number(point.score || 0)))
      } : null;
    }
    return { side: selected.side, landmarks };
  }

  function alignmentDeviation(landmarks) {
    const [a, b, c] = LANDMARK_NAMES.map(name => landmarks[name]);
    if (!a || !b || !c) return null;
    const v1 = { x: a.x - b.x, y: a.y - b.y }, v2 = { x: c.x - b.x, y: c.y - b.y };
    const lengths = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
    if (!lengths) return null;
    const degrees = Math.acos(Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / lengths))) * 180 / Math.PI;
    return Math.abs(180 - degrees);
  }

  class PoseCaptureEngine {
    constructor({ profile, onFrame = () => {}, onStatus=()=>{}, poseRuntime = global.PoseRuntime, trackingOptions={}, now=()=>Date.now(), setTimer=global.setInterval?.bind(global), clearTimer=global.clearInterval?.bind(global) } = {}) {
      this.profile=profile;this.onFrame=onFrame;this.onStatus=onStatus;this.poseRuntime=poseRuntime;this.trackingOptions=trackingOptions;this.now=now;this.setTimer=setTimer;this.clearTimer=clearTimer;this.loop=null;this.video=null;this.detector=null;this.inferenceInProgress=false;this.sideTracker=new SideTracker();this.smoother=new LandmarkSmoother();this.tracking=new TrackingStateMachine(trackingOptions);this.stability=this.tracking;this.continuity=new LandmarkContinuity(trackingOptions);this.personLock=null;this.lastInferenceStartedAt=null;this.lastInferenceCompletedAt=null;this.lastSuccessfulPoseAt=null;this.consecutiveInferenceErrors=0;this.poseLoopRestartCount=0;this.restartAttempts=0;this.watchdogTimer=null;this.inferenceSamples=[];
    }
    transform(pose, dimensions, timestamp = Date.now()) {
      const threshold = this.profile.poseAnalysis.rules[0].minimumLandmarkConfidence;
      const tracked=this.sideTracker.select(pose?.keypoints||[],threshold);
      const normalized = normalizeLandmarks((tracked?.points||[]).map((point,index)=>point&&({...point,name:`${tracked.side}_${LANDMARK_NAMES[index]}`})).filter(Boolean), dimensions.width, dimensions.height);
      const byName=new Map((pose?.keypoints||[]).map(point=>[point.name||point.part,point]));
      const sequenceLandmarks=Object.fromEntries(SEQUENCE_LANDMARK_NAMES.map(name=>{const point=byName.get(`${tracked.side}_${name}`);return[name,point&&finite(point.x)&&finite(point.y)?{x:Number(point.x)/dimensions.width,y:Number(point.y)/dimensions.height,confidence:Math.max(0,Math.min(1,Number(point.score||0)))}:null];}));
      const confidences = LANDMARK_NAMES.map(name => normalized.landmarks[name]?.confidence || 0);
      const frameConfidence = Math.min(...confidences);
      let usable=confidences.every(score => score >= threshold)&&LANDMARK_NAMES.every(name=>{const p=normalized.landmarks[name];return p&&p.x>=.02&&p.x<=.98&&p.y>=.02&&p.y<=.98;});
      const torso=this.torsoReference(normalized.landmarks);if(usable&&!this.acceptPerson(torso))usable=false;const continuity=this.continuity.update(normalized.landmarks,threshold,timestamp);const landmarks=usable?this.smoother.apply(continuity.analysis):continuity.analysis;const trackingState=this.tracking.update(usable,timestamp);if(usable)this.lastSuccessfulPoseAt=timestamp;
      return {timestamp,side:tracked?.side||normalized.side,landmarks,sequenceLandmarks,displayLandmarks:continuity.display,landmarkDiagnostics:continuity.diagnostics,frameConfidence,usable,analysisUsable:usable,displayTrackable:Object.values(continuity.display).some(Boolean),sessionComparable:usable,trackingState,poseReady:trackingState===TRACKING_STATES.LOCKED,recoveredThisFrame:this.tracking.recoveredThisFrame,torsoCenter:torso?.center||this.personLock?.center||null,torsoScale:torso?.scale||this.personLock?.scale||null};
    }
    torsoReference(landmarks){const shoulder=landmarks.shoulder,hip=landmarks.hip;if(!shoulder||!hip)return null;return{center:{x:(shoulder.x+hip.x)/2,y:(shoulder.y+hip.y)/2},scale:Math.max(.001,Math.hypot(shoulder.x-hip.x,shoulder.y-hip.y))};}
    acceptPerson(torso){if(!torso)return false;if(!this.personLock){this.personLock=torso;return true;}const distance=Math.hypot(torso.center.x-this.personLock.center.x,torso.center.y-this.personLock.center.y),ratio=torso.scale/this.personLock.scale;if(distance>Math.max(.25,this.personLock.scale*2.5)||ratio<.45||ratio>2.2)return false;this.personLock=torso;return true;}
    async start(video, { detector } = {}) {
      if(this.loop)return this.loop;this.video=video;this.detector=detector||await this.poseRuntime.initMoveNetDetector();this.startLoop();this.startWatchdog();
      return this.loop;
    }
    startLoop(){if(this.loop)return this.loop;this.loop=this.poseRuntime.startPoseLoop({detector:this.detector,video:this.video,isRunning:()=>Boolean(this.loop),onPoseFrame:({pose,inferenceMs})=>{if(this.inferenceInProgress)return;this.inferenceInProgress=true;this.lastInferenceStartedAt=this.now();try{if(Number.isFinite(inferenceMs)){this.inferenceSamples.push(inferenceMs);if(this.inferenceSamples.length>3600)this.inferenceSamples.shift();}if(!this.video?.videoWidth||!this.video?.videoHeight)return;const frame=this.transform(pose,{width:this.video.videoWidth,height:this.video.videoHeight},this.now());this.consecutiveInferenceErrors=0;this.onFrame(frame);}catch(error){this.consecutiveInferenceErrors++;console.error('[PUSH_UP_TRACKING] frame processing failed',error);}finally{this.lastInferenceCompletedAt=this.now();this.inferenceInProgress=false;}},onError:error=>{this.consecutiveInferenceErrors++;this.inferenceInProgress=false;console.warn('[PUSH_UP_TRACKING] transient inference error; retrying',error);}});return this.loop;}
    startWatchdog(){if(this.watchdogTimer||!this.setTimer)return;this.watchdogTimer=this.setTimer(()=>this.watchdogTick(this.now()),500);this.watchdogTimer?.unref?.();}
    watchdogTick(now=this.now()){if(!this.loop||this.inferenceInProgress)return false;const reference=this.lastInferenceCompletedAt||this.lastInferenceStartedAt;if(reference==null||now-reference<2500)return false;if(this.restartAttempts>=3){this.onStatus('Pose tracking needs attention. Finish Session remains available.');return false;}const old=this.loop;this.loop=null;old.stop?.();this.restartAttempts++;this.poseLoopRestartCount++;this.lastInferenceCompletedAt=now;this.onStatus('Pose tracking paused — restarting safely…');this.startLoop();return true;}
    stop(){this.loop?.stop?.();this.loop=null;if(this.watchdogTimer!=null)this.clearTimer?.(this.watchdogTimer);this.watchdogTimer=null;this.resetTracking();}
    resetTracking(){this.inferenceInProgress=false;this.sideTracker.reset();this.smoother.reset();this.tracking.reset();this.continuity.reset();this.personLock=null;this.restartAttempts=0;}
    diagnostics(){return{trackingState:this.tracking.state,lastSuccessfulPoseAt:this.lastSuccessfulPoseAt,currentDropoutDurationMs:this.tracking.currentDropoutMs,longestDropoutDurationMs:this.tracking.longestDropoutMs,usableFrameStreak:this.tracking.usableFrameStreak,unusableFrameStreak:this.tracking.unusableFrameStreak,recoveryFrameStreak:this.tracking.recoveryFrameStreak,activeSide:this.sideTracker.activeSide,torsoCenter:this.personLock?.center||null,lastInferenceStartedAt:this.lastInferenceStartedAt,lastInferenceCompletedAt:this.lastInferenceCompletedAt,averageInferenceMs:this.inferenceSamples.length?this.inferenceSamples.reduce((a,b)=>a+b,0)/this.inferenceSamples.length:null,inferenceSampleCount:this.inferenceSamples.length,consecutiveInferenceErrors:this.consecutiveInferenceErrors,poseLoopRestartCount:this.poseLoopRestartCount,landmarks:this.continuity.history};}
  }

  class RepetitionEventEngine {
    constructor({ movementThreshold = .045 } = {}) { this.movementThreshold = movementThreshold; this.reset(); }
    reset() { this.baseline=null;this.phase='top';this.lastConfirmedRepPhase='top';this.lastConfirmedRepTimestamp=null;this.trackingInterruptionStartedAt=null;this.requiresSafeReestablishment=false;this.count=0;this.events=[]; }
    observe(frame) {
      if(!frame.usable||frame.trackingState&&frame.trackingState!==TRACKING_STATES.LOCKED||!frame.landmarks.hip){if(this.trackingInterruptionStartedAt==null)this.trackingInterruptionStartedAt=frame.timestamp;this.requiresSafeReestablishment=true;return null;}
      const y = frame.landmarks.hip.y;
      if (this.baseline == null) this.baseline = y;
      if(this.requiresSafeReestablishment){this.trackingInterruptionStartedAt=null;this.requiresSafeReestablishment=false;this.baseline=Math.min(this.baseline,y);if(this.phase==='away'&&y-this.baseline<=this.movementThreshold/2)this.phase='top';this.lastConfirmedRepPhase=this.phase;this.lastConfirmedRepTimestamp=frame.timestamp;return null;}
      this.baseline = Math.min(this.baseline, y);
      if (this.phase === 'top' && y - this.baseline >= this.movementThreshold) this.phase = 'away';
      if (this.phase === 'away' && y - this.baseline <= this.movementThreshold / 2) {
        const event = { index: ++this.count, timestamp: frame.timestamp, type: 'repetition_completed', complete: true };
        this.events.push(event); this.phase = 'top'; return event;
      }
      this.lastConfirmedRepPhase=this.phase;this.lastConfirmedRepTimestamp=frame.timestamp;return null;
    }
  }

  function classifySession(session, profile) {
    const reasons = [];
    const frames = session.normalizedLandmarkFrames || [], usable = frames.filter(frame => frame.usable);
    const usablePercentage = frames.length ? usable.length / frames.length * 100 : 0;
    const overallConfidence = frames.length ? frames.reduce((sum, frame) => sum + Number(frame.frameConfidence || 0), 0) / frames.length : 0;
    const metadata = session.versionMetadata || {};
    if (!session.requiredViewEstablished) reasons.push('required_side_view_not_established');
    if (overallConfidence < profile.poseAnalysis.minimumOverallConfidence) reasons.push('overall_confidence_below_threshold');
    if (usablePercentage < profile.poseAnalysis.minimumUsableFramePercentage) reasons.push('insufficient_usable_frames');
    if (!frames.length || frames.filter(f => LANDMARK_NAMES.every(n => f.landmarks?.[n])).length / Math.max(1, frames.length) < .6) reasons.push('required_landmarks_unavailable');
    const expected = sessionVersionMetadata(profile);
    if (['exerciseId','canonicalProfileFingerprint','profileVersion','generatorVersion','capabilityRegistryVersion','thresholdVersion'].some(key => metadata[key] !== expected[key])) reasons.push('exercise_version_incompatible');
    if (!session.repetitionEvents?.length || session.repetitionEvents.some(event => !event.complete)) reasons.push('repetition_data_incomplete');
    return { valid: reasons.length === 0, invalidationReason: reasons[0] || null, invalidationReasons: reasons, usableFramePercentage: usablePercentage, overallConfidence };
  }

  class PerformanceRecorder {
    constructor({ profile, userId = 'local-user', sequenceDefinition = global.PushUpSequenceEngine?.PUSH_UP_SEQUENCE_DEFINITION }) { this.profile = profile; this.userId = userId; this.sequenceDefinition = sequenceDefinition; this.session = null; }
    start({ mode, requiredViewEstablished }) {
      this.session = { schemaVersion: SESSION_SCHEMA_VERSION, sessionId: id(), userId: this.userId, mode, versionMetadata: sessionVersionMetadata(this.profile), sequenceId:this.sequenceDefinition?.sequenceId||null,sequenceVersion:this.sequenceDefinition?.sequenceVersion||null,templateFingerprint:this.sequenceDefinition?.templateFingerprint||null, sessionStartedAt: new Date().toISOString(), sessionEndedAt: null, requiredViewEstablished: Boolean(requiredViewEstablished), normalizedLandmarkFrames: [], repetitionEvents: [], phaseEvents:[],transitionEvents:[],repetitionExplanations:[],completedSequenceRepetitions:0,interruptedTransitions:0,unscorableDurationMs:0,phaseEvaluations:0,phaseMismatches:0,transitionEvaluations:0,transitionMismatches:0,legacySequenceAgreement:{bothCounted:0,sequenceOnly:0,legacyOnly:0,neitherCounted:0}, supportedAlignmentFindings: [], summary: null, invalidationReason: null };
      return this.session;
    }
    frame(frame) { if(this.session){const observed={...frame};delete observed.displayLandmarks;delete observed.landmarkDiagnostics;this.session.normalizedLandmarkFrames.push(clone(observed));} }
    repetition(event) { if (this.session) this.session.repetitionEvents.push(clone(event)); }
    sequence(diagnostics, agreement) { if(this.session){Object.assign(this.session,clone(diagnostics));if(agreement&&Object.prototype.hasOwnProperty.call(this.session.legacySequenceAgreement,agreement))this.session.legacySequenceAgreement[agreement]++;} }
    finish() {
      this.session.sessionEndedAt = new Date().toISOString();
      const rule = this.profile.poseAnalysis.rules[0], frames = this.session.normalizedLandmarkFrames;
      const affected = frames.filter(frame => frame.usable && alignmentDeviation(frame.landmarks) > rule.thresholds.maximumDeviationDegrees);
      let runStart = null, longestRunMs = 0;
      for (const frame of frames) {
        const isAffected = frame.usable && alignmentDeviation(frame.landmarks) > rule.thresholds.maximumDeviationDegrees;
        if (isAffected && runStart == null) runStart = frame.timestamp;
        if (isAffected) longestRunMs = Math.max(longestRunMs, frame.timestamp - runStart);
        else runStart = null;
      }
      const affectedFramePercentage = affected.length / Math.max(1, frames.length) * 100;
      if (affectedFramePercentage >= rule.minimumAffectedFramePercentage && longestRunMs >= rule.minimumConsecutiveDurationMs) this.session.supportedAlignmentFindings.push({ measurement: rule.measurement, finding: 'alignment_needs_attention', affectedFramePercentage, consecutiveDurationMs: longestRunMs });
      const classification = classifySession(this.session, this.profile);
      this.session.invalidationReason = classification.invalidationReason;
      let totalTrackingLossDurationMs=0,longestContinuousDropoutMs=0,trackingRunStart=null,lastTrackingFrame=null,recoveryEvents=0;for(const frame of frames){if(!frame.usable){if(trackingRunStart==null)trackingRunStart=frame.timestamp;if(lastTrackingFrame!=null)totalTrackingLossDurationMs+=Math.max(0,frame.timestamp-lastTrackingFrame);longestContinuousDropoutMs=Math.max(longestContinuousDropoutMs,frame.timestamp-trackingRunStart);}else if(trackingRunStart!=null){recoveryEvents++;trackingRunStart=null;}lastTrackingFrame=frame.timestamp;}
      this.session.summary = { valid: classification.valid, validRepetitions: this.session.repetitionEvents.filter(e => e.complete).length, completionTimeMs: Date.parse(this.session.sessionEndedAt) - Date.parse(this.session.sessionStartedAt), usableFramePercentage: classification.usableFramePercentage, overallConfidence: classification.overallConfidence,totalTrackingLossDurationMs,longestContinuousDropoutMs,recoveryEvents };
      return clone(this.session);
    }
    developerTelemetry() {
      if (!this.session) return null;
      const s=this.session,frames=s.normalizedLandmarkFrames,agreement=s.legacySequenceAgreement;
      const decisions=agreement.bothCounted+agreement.sequenceOnly+agreement.legacyOnly;
      const recoveries=frames.filter(frame=>frame.recoveredThisFrame).length;
      return {developerOnly:true,sequenceCompletionPercentage:s.repetitionEvents.length?Math.min(100,s.completedSequenceRepetitions/s.repetitionEvents.length*100):0,averageRecoveryDurationMs:recoveries?s.unscorableDurationMs/recoveries:0,averageTrackingConfidence:frames.length?frames.reduce((sum,frame)=>sum+Number(frame.frameConfidence||0),0)/frames.length:0,phaseMismatchPercentage:s.phaseEvaluations?s.phaseMismatches/s.phaseEvaluations*100:0,transitionMismatchPercentage:s.transitionEvaluations?s.transitionMismatches/s.transitionEvaluations*100:0,legacySequenceAgreementPercentage:decisions?agreement.bothCounted/decisions*100:0,legacySequenceAgreement:{...agreement}};
    }
    serialize() { return JSON.stringify(this.session); }
  }

  class ComparisonEngine {
    compatible(current, previous) {
      if (!current?.summary?.valid || !previous?.summary?.valid) return { compatible: false, reason: 'session_not_valid' };
      const a = current.versionMetadata, b = previous.versionMetadata;
      const keys = ['exerciseId','canonicalProfileFingerprint','profileVersion','generatorVersion','capabilityRegistryVersion','thresholdVersion','poseModel','poseModelVersion'];
      const mismatch = keys.find(key => a?.[key] !== b?.[key]);
      return mismatch ? { compatible: false, reason: `version_mismatch:${mismatch}` } : { compatible: true, reason: null };
    }
    compare(current, previous) {
      const compatibility = this.compatible(current, previous);
      if (!compatibility.compatible) return compatibility;
      return { ...compatibility, repetitionDelta: current.summary.validRepetitions - previous.summary.validRepetitions, completionTimeDeltaMs: current.summary.completionTimeMs - previous.summary.completionTimeMs };
    }
  }

  class PersonalBestStore {
    constructor(storage = global.localStorage, key = 'mufasa.push-up.sessions.v1') { this.storage = storage; this.key = key; }
    all() { try { return JSON.parse(this.storage?.getItem(this.key) || '[]'); } catch (_) { return []; } }
    save(session) { const sessions = this.all(); sessions.push(clone(session)); this.storage?.setItem(this.key, JSON.stringify(sessions.slice(-10))); }
    best() { return this.all().filter(s => s.summary?.valid).sort((a,b) => b.summary.validRepetitions - a.summary.validRepetitions || a.summary.completionTimeMs - b.summary.completionTimeMs)[0] || null; }
  }

  class GhostRenderer {
    constructor(canvas) { this.canvas = canvas; this.context = canvas?.getContext?.('2d');this.transform=null;this.minimumConfidence=.75; }
    setTransform(transform){this.transform=transform;}
    frameAt(session, elapsedMs) {
      const frames = session?.normalizedLandmarkFrames || []; if (!frames.length) return null;
      const origin = frames[0].timestamp, duration = Math.max(1, frames[frames.length - 1].timestamp - origin), target = origin + (elapsedMs % (duration + 1));
      return frames.reduce((best, frame) => Math.abs(frame.timestamp - target) < Math.abs(best.timestamp - target) ? frame : best, frames[0]);
    }
    draw(frame, color = 'rgba(255,211,90,.75)') {
      if (!this.context || !frame) return; const ctx = this.context, w = this.canvas.clientWidth||this.canvas.width, h = this.canvas.clientHeight||this.canvas.height,dpr=this.transform?.devicePixelRatio||1,map=p=>this.transform?this.transform.map(p):{screenX:p.x*w,screenY:p.y*h};
      ctx.setTransform?.(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,w,h); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 4;
      const points=frame.displayLandmarks||frame.landmarks,degraded=frame.trackingState===TRACKING_STATES.DEGRADED||frame.trackingState===TRACKING_STATES.RECOVERING;ctx.globalAlpha=degraded ? .45 : 1;ctx.setLineDash?.(degraded?[8,6]:[]);
      for (const [from,to] of CONNECTIONS) { const a=points[from], b=points[to]; if(!a||!b||(!a.cached&&a.confidence<this.minimumConfidence)||(!b.cached&&b.confidence<this.minimumConfidence))continue;const aa=map(a),bb=map(b);ctx.beginPath();ctx.moveTo(aa.screenX,aa.screenY);ctx.lineTo(bb.screenX,bb.screenY);ctx.stroke(); }
      for (const point of Object.values(points)) if(point&&(point.cached||point.confidence>=this.minimumConfidence)){const p=map(point);ctx.beginPath();ctx.arc(p.screenX,p.screenY,6,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;ctx.setLineDash?.([]);
    }
  }

  class ExerciseSessionEngine {
    constructor({ profile, recorder, repetitions, sequenceMatcher = global.PushUpSequenceEngine ? new global.PushUpSequenceEngine.PushUpSequenceMatcher() : null, correlator=new RepetitionEventCorrelator() }) { this.profile=profile;this.recorder=recorder;this.repetitions=repetitions;this.sequenceMatcher=sequenceMatcher;this.correlator=correlator;this.state='idle';this.mode=null; }
    start(mode, setup={}) { if(!['practice','challenge'].includes(mode))throw new Error('Unsupported mode.');this.state='active';this.mode=mode;this.correlator=new RepetitionEventCorrelator({windowMs:this.correlator.windowMs,expiryMs:this.correlator.expiryMs});this.repetitions.reset();this.sequenceMatcher?.reset();this.recorder.start({mode, requiredViewEstablished:setup.requiredViewEstablished});return this.state; }
    observe(frame) { if(this.state!=='active')return null;this.recorder.frame(frame);const event=this.repetitions.observe(frame);if(event)this.recorder.repetition(event);const sequenceResult=this.sequenceMatcher?.observe(frame)||null,correlations=[];if(event)correlations.push(...this.correlator.add('legacy',event,frame.timestamp));if(sequenceResult?.repetitionCompleted){const events=this.sequenceMatcher.engine?.repetitionEvents||[],sequenceEvent=events[events.length-1]||{index:this.sequenceMatcher.repetitions,timestamp:frame.timestamp};correlations.push(...this.correlator.add('sequence',sequenceEvent,frame.timestamp));}correlations.push(...this.correlator.expire(frame.timestamp));const map={both_counted:'bothCounted',legacy_only:'legacyOnly',sequence_only:'sequenceOnly',unmatched_or_ambiguous:'neitherCounted'};if(this.sequenceMatcher){this.recorder.sequence(this.sequenceMatcher.diagnostics());for(const item of correlations)this.recorder.sequence(this.sequenceMatcher.diagnostics(),map[item.classification]);}const latest=correlations[correlations.length-1];return {legacyEvent:event,sequenceResult,agreement:latest?.classification||null,correlations}; }
    finish() { if(this.state!=='active')throw new Error('No active session.');this.state='summary';return this.recorder.finish(); }
    reset() { this.state='idle';this.mode=null; }
  }

  return Object.freeze({ SESSION_SCHEMA_VERSION, POSE_MODEL, POSE_MODEL_VERSION, LANDMARK_NAMES,SEQUENCE_LANDMARK_NAMES,TRACKING_STATES,TRACKING_DEFAULTS,getPushUpProfile,sessionVersionMetadata,normalizeLandmarks,alignmentDeviation,classifySession,createVideoScreenTransform,cameraErrorMessage,CameraController,SideTracker,PoseStabilityGate,TrackingStateMachine,LandmarkContinuity,LandmarkSmoother,PoseCaptureEngine,ExerciseSessionEngine,RepetitionEventCorrelator,RepetitionEventEngine,PerformanceRecorder,ComparisonEngine,GhostRenderer,PersonalBestStore });
});
