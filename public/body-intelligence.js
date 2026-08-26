(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTBodyIntelligence = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const MOVENET_NAMES = Object.freeze(["nose","left_eye","right_eye","left_ear","right_ear","left_shoulder","right_shoulder","left_elbow","right_elbow","left_wrist","right_wrist","left_hip","right_hip","left_knee","right_knee","left_ankle","right_ankle"]);
  const CONNECTIONS = Object.freeze([["left_shoulder","right_shoulder"],["left_shoulder","left_elbow"],["left_elbow","left_wrist"],["right_shoulder","right_elbow"],["right_elbow","right_wrist"],["left_shoulder","left_hip"],["right_shoulder","right_hip"],["left_hip","right_hip"],["left_hip","left_knee"],["left_knee","left_ankle"],["right_hip","right_knee"],["right_knee","right_ankle"]]);
  const swapSide = (name) => name.startsWith("left_") ? `right_${name.slice(5)}` : name.startsWith("right_") ? `left_${name.slice(6)}` : name;

  function adaptMoveNet(keypoints, options = {}) {
    const { timestamp = Date.now(), width = 1, height = 1, mirrored = false } = options;
    const landmarks = {};
    (Array.isArray(keypoints) ? keypoints : []).slice(0, 17).forEach((point, index) => {
      const rawName = point.name || point.part || MOVENET_NAMES[index];
      if (!rawName || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) return;
      const name = mirrored ? swapSide(rawName) : rawName;
      landmarks[name] = Object.freeze({ x: Number(point.x) / width, y: Number(point.y) / height, z: Number(point.z || 0) / width, confidence: Number(point.score ?? point.confidence ?? 0) });
    });
    const confidenceValues = Object.values(landmarks).map((point) => point.confidence);
    return Object.freeze({ timestamp, provider: "movenet", coordinateSpace: "viewport_normalized", mirrored, confidence: confidenceValues.length ? confidenceValues.reduce((a,b)=>a+b,0)/confidenceValues.length : 0, landmarks: Object.freeze(landmarks) });
  }

  function normalizeLandmarks(input, options = {}) {
    if (input?.coordinateSpace === "viewport_normalized" && input.landmarks) return input;
    const entries = Array.isArray(input) ? input.map((point) => [point.name || point.part, point]) : Object.entries(input || {});
    return adaptMoveNet(entries.map(([name, point]) => ({ ...point, name, score: point.confidence ?? point.score ?? 1 })), options);
  }

  function calculateJointAngle(a, vertex, c) {
    if (![a, vertex, c].every((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y))) return null;
    const u=[a.x-vertex.x,a.y-vertex.y,(a.z||0)-(vertex.z||0)],v=[c.x-vertex.x,c.y-vertex.y,(c.z||0)-(vertex.z||0)];
    const length=Math.hypot(...u)*Math.hypot(...v); if (!length) return null;
    return Math.acos(Math.max(-1,Math.min(1,u.reduce((sum,n,i)=>sum+n*v[i],0)/length)))*180/Math.PI;
  }

  function requiredPoints(rule, frame, minimumConfidence) {
    const points=(rule.points||[]).map((name)=>frame.landmarks?.[name]);
    const missing=(rule.points||[]).filter((name,index)=>!points[index]||points[index].confidence<minimumConfidence);
    return { points, missing };
  }
  function evaluateRule(rule, frame, minimumConfidence = 0.5) {
    const {points,missing}=requiredPoints(rule,frame,minimumConfidence);
    if(missing.length)return {ruleId:rule.id,status:"not_evaluable",passed:false,missing,confidence:0};
    let passed=false,value=null,error=0;
    if(rule.type==="angle_range"){
      value=calculateJointAngle(...points); if(value===null)return {ruleId:rule.id,status:"not_evaluable",passed:false,missing:[],confidence:0};
      passed=value>=rule.range[0]&&value<=rule.range[1]; error=value<rule.range[0]?rule.range[0]-value:Math.max(0,value-rule.range[1]);
    }else if(rule.type==="alignment"){
      const values=points.map((point)=>point[rule.axis||"y"]); value=Math.max(...values)-Math.min(...values); passed=value<=rule.tolerance; error=Math.max(0,value-rule.tolerance)*180;
    }else if(rule.type==="distance_ratio"){
      const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y); value=d(points[0],points[1])/Math.max(.0001,d(points[2],points[3])); passed=value>=rule.range[0]&&value<=rule.range[1]; error=value<rule.range[0]?rule.range[0]-value:Math.max(0,value-rule.range[1]);
    }else if(rule.type==="orientation"){
      const shoulder={x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2},hip={x:(points[2].x+points[3].x)/2,y:(points[2].y+points[3].y)/2};
      value=Math.abs(Math.atan2(shoulder.x-hip.x,hip.y-shoulder.y)*180/Math.PI); passed=value<=rule.toleranceDegrees; error=Math.max(0,value-rule.toleranceDegrees);
    }else return {ruleId:rule.id,status:"unsupported",passed:false,confidence:0};
    const cue=passed?null:(rule.type==="angle_range"?(value<rule.range[0]?rule.cueLow:rule.cueHigh):rule.cue);
    return {ruleId:rule.id,status:passed?"pass":"fail",passed,value:Number(value.toFixed(2)),error:Number(error.toFixed(2)),severity:rule.severity||1,safetyImportance:rule.safetyImportance||1,confidence:Math.min(...points.map(p=>p.confidence)),cue};
  }
  function evaluateMovement(definition, frame, options = {}) {
    const phase=definition.phases.find((item)=>item.id===(options.phaseId||definition.phases[0].id));
    const minimumConfidence=options.minimumConfidence??definition.minimumConfidence??.5;
    const missing=(definition.requiredLandmarks||[]).filter((name)=>!frame?.landmarks?.[name]||frame.landmarks[name].confidence<minimumConfidence);
    if(missing.length)return {movementId:definition.id,status:"insufficient_data",aligned:false,missing,feedback:[],rules:[]};
    const rules=phase.rules.map((rule)=>evaluateRule(rule,frame,minimumConfidence));
    const failures=rules.filter((rule)=>rule.status==="fail").sort((a,b)=>b.safetyImportance-a.safetyImportance||b.severity-a.severity||b.error-a.error);
    const maximum=definition.feedback?.maximumCorrections??2;
    const score=Math.max(0,Math.round(100-rules.reduce((sum,r)=>sum+(r.passed?0:Math.min(25,r.error||10)),0)));
    return {movementId:definition.id,phaseId:phase.id,status:failures.length?"needs_adjustment":"aligned",aligned:failures.length===0,score,rules,failures,feedback:failures.slice(0,maximum).map((rule)=>rule.cue)};
  }
  function createHoldTracker(config = {}) {
    const graceMs=config.graceMs??500,resetMs=config.majorFaultResetMs??1500,targetMs=config.targetMs??20000; let accumulated=0,lastAt=null,outSince=null;
    return { update(result,now=Date.now()) { const delta=lastAt===null?0:Math.max(0,now-lastAt); lastAt=now;
      if(result?.aligned){outSince=null;accumulated=Math.min(targetMs,accumulated+delta);}else if(outSince===null)outSince=now;else if(now-outSince>resetMs)accumulated=0;
      const paused=!result?.aligned&&outSince!==null&&now-outSince>graceMs;
      return {elapsedMs:accumulated,targetMs,progress:accumulated/targetMs,complete:accumulated>=targetMs,paused}; }, reset(){accumulated=0;lastAt=null;outSince=null;} };
  }
  function targetBodyFrame(definition, phaseId) { const phase=definition.phases.find((p)=>p.id===(phaseId||definition.avatar?.phaseId||definition.phases[0].id)); return {timestamp:0,provider:"target",coordinateSpace:phase.targetBodyFrame.coordinateSpace,confidence:1,landmarks:Object.fromEntries(Object.entries(phase.targetBodyFrame.landmarks).map(([name,p])=>[name,{x:p[0],y:p[1],z:p[2]||0,confidence:1}]))}; }
  function avatarPose(definition, phaseId) { const frame=targetBodyFrame(definition,phaseId); return {movementId:definition.id,strategy:definition.avatar.strategy,landmarks:frame.landmarks,bones:CONNECTIONS.map(([from,to])=>({from,to,vector:{x:frame.landmarks[to].x-frame.landmarks[from].x,y:frame.landmarks[to].y-frame.landmarks[from].y,z:(frame.landmarks[to].z||0)-(frame.landmarks[from].z||0)}}))}; }
  return Object.freeze({MOVENET_NAMES,CONNECTIONS,adaptMoveNet,normalizeLandmarks,calculateJointAngle,evaluateRule,evaluateMovement,createHoldTracker,targetBodyFrame,avatarPose});
});
