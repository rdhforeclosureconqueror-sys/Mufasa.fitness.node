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
  const SIDES = ['left', 'right'];
  const CONNECTIONS = [['shoulder', 'hip'], ['hip', 'ankle']];

  const clone = value => JSON.parse(JSON.stringify(value));
  const id = () => global.crypto?.randomUUID?.() || `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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

  class PoseStabilityGate {constructor({readyFrames=5,lostFrames=3}={}){this.readyFrames=readyFrames;this.lostFrames=lostFrames;this.reset();}reset(){this.usableFrameStreak=0;this.unusableFrameStreak=0;this.poseReady=false;}update(usable){if(usable){this.usableFrameStreak++;this.unusableFrameStreak=0;if(this.usableFrameStreak>=this.readyFrames)this.poseReady=true;}else{this.unusableFrameStreak++;this.usableFrameStreak=0;if(this.unusableFrameStreak>=this.lostFrames)this.poseReady=false;}return this.poseReady;}}

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
    constructor({ profile, onFrame = () => {}, poseRuntime = global.PoseRuntime } = {}) {
      this.profile = profile; this.onFrame = onFrame; this.poseRuntime = poseRuntime; this.loop = null;this.inferenceInProgress=false;this.sideTracker=new SideTracker();this.smoother=new LandmarkSmoother();this.stability=new PoseStabilityGate();
    }
    transform(pose, dimensions, timestamp = Date.now()) {
      const threshold = this.profile.poseAnalysis.rules[0].minimumLandmarkConfidence;
      const tracked=this.sideTracker.select(pose?.keypoints||[],threshold);
      const normalized = normalizeLandmarks((tracked?.points||[]).map((point,index)=>point&&({...point,name:`${tracked.side}_${LANDMARK_NAMES[index]}`})), dimensions.width, dimensions.height);
      const confidences = LANDMARK_NAMES.map(name => normalized.landmarks[name]?.confidence || 0);
      const frameConfidence = Math.min(...confidences);
      let usable=confidences.every(score => score >= threshold)&&LANDMARK_NAMES.every(name=>{const p=normalized.landmarks[name];return p&&p.x>=.02&&p.x<=.98&&p.y>=.02&&p.y<=.98;});
      const landmarks=usable?this.smoother.apply(normalized.landmarks):Object.fromEntries(LANDMARK_NAMES.map(name=>[name,confidences[LANDMARK_NAMES.indexOf(name)]>=threshold?normalized.landmarks[name]:null]));
      return { timestamp, side: tracked?.side||normalized.side, landmarks, frameConfidence, usable, poseReady:this.stability.update(usable) };
    }
    async start(video, { detector } = {}) {
      detector = detector || await this.poseRuntime.initMoveNetDetector();
      this.loop = this.poseRuntime.startPoseLoop({ detector, video, isRunning: () => Boolean(this.loop), onPoseFrame: ({ pose }) => {if(this.inferenceInProgress)return;this.inferenceInProgress=true;try{this.onFrame(this.transform(pose,{width:video.videoWidth,height:video.videoHeight}));}finally{this.inferenceInProgress=false;}}});
      return this.loop;
    }
    stop() { this.loop?.stop?.(); this.loop = null;this.resetTracking(); }
    resetTracking(){this.inferenceInProgress=false;this.sideTracker.reset();this.smoother.reset();this.stability.reset();}
  }

  class RepetitionEventEngine {
    constructor({ movementThreshold = .045 } = {}) { this.movementThreshold = movementThreshold; this.reset(); }
    reset() { this.baseline = null; this.phase = 'top'; this.count = 0; this.events = []; }
    observe(frame) {
      if (!frame.usable || !frame.landmarks.hip) return null;
      const y = frame.landmarks.hip.y;
      if (this.baseline == null) this.baseline = y;
      this.baseline = Math.min(this.baseline, y);
      if (this.phase === 'top' && y - this.baseline >= this.movementThreshold) this.phase = 'away';
      if (this.phase === 'away' && y - this.baseline <= this.movementThreshold / 2) {
        const event = { index: ++this.count, timestamp: frame.timestamp, type: 'repetition_completed', complete: true };
        this.events.push(event); this.phase = 'top'; return event;
      }
      return null;
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
    constructor({ profile, userId = 'local-user' }) { this.profile = profile; this.userId = userId; this.session = null; }
    start({ mode, requiredViewEstablished }) {
      this.session = { schemaVersion: SESSION_SCHEMA_VERSION, sessionId: id(), userId: this.userId, mode, versionMetadata: sessionVersionMetadata(this.profile), sessionStartedAt: new Date().toISOString(), sessionEndedAt: null, requiredViewEstablished: Boolean(requiredViewEstablished), normalizedLandmarkFrames: [], repetitionEvents: [], supportedAlignmentFindings: [], summary: null, invalidationReason: null };
      return this.session;
    }
    frame(frame) { if (this.session) this.session.normalizedLandmarkFrames.push(clone(frame)); }
    repetition(event) { if (this.session) this.session.repetitionEvents.push(clone(event)); }
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
      this.session.summary = { valid: classification.valid, validRepetitions: this.session.repetitionEvents.filter(e => e.complete).length, completionTimeMs: Date.parse(this.session.sessionEndedAt) - Date.parse(this.session.sessionStartedAt), usableFramePercentage: classification.usableFramePercentage, overallConfidence: classification.overallConfidence };
      return clone(this.session);
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
      for (const [from,to] of CONNECTIONS) { const a=frame.landmarks[from], b=frame.landmarks[to]; if(!a||!b||a.confidence<this.minimumConfidence||b.confidence<this.minimumConfidence)continue;const aa=map(a),bb=map(b);ctx.beginPath();ctx.moveTo(aa.screenX,aa.screenY);ctx.lineTo(bb.screenX,bb.screenY);ctx.stroke(); }
      for (const point of Object.values(frame.landmarks)) if(point&&point.confidence>=this.minimumConfidence){const p=map(point);ctx.beginPath();ctx.arc(p.screenX,p.screenY,6,0,Math.PI*2);ctx.fill();}
    }
  }

  class ExerciseSessionEngine {
    constructor({ profile, recorder, repetitions }) { this.profile=profile;this.recorder=recorder;this.repetitions=repetitions;this.state='idle';this.mode=null; }
    start(mode, setup={}) { if(!['practice','challenge'].includes(mode))throw new Error('Unsupported mode.');this.state='active';this.mode=mode;this.repetitions.reset();this.recorder.start({mode, requiredViewEstablished:setup.requiredViewEstablished});return this.state; }
    observe(frame) { if(this.state!=='active')return null;this.recorder.frame(frame);const event=this.repetitions.observe(frame);if(event)this.recorder.repetition(event);return event; }
    finish() { if(this.state!=='active')throw new Error('No active session.');this.state='summary';return this.recorder.finish(); }
    reset() { this.state='idle';this.mode=null; }
  }

  return Object.freeze({ SESSION_SCHEMA_VERSION, POSE_MODEL, POSE_MODEL_VERSION, LANDMARK_NAMES, getPushUpProfile, sessionVersionMetadata, normalizeLandmarks, alignmentDeviation, classifySession,createVideoScreenTransform,cameraErrorMessage,CameraController,SideTracker,PoseStabilityGate,LandmarkSmoother, PoseCaptureEngine, ExerciseSessionEngine, RepetitionEventEngine, PerformanceRecorder, ComparisonEngine, GhostRenderer, PersonalBestStore });
});
