(function initLiveAvatarMirrorLab(global) {
  "use strict";
  const $ = id => global.document.getElementById(id), video = $("camera"), cameraStage = $("cameraStage"), canvas = $("landmarks"), context = canvas.getContext("2d");
  const startButton = $("start"), stopButton = $("stop");
  let camera = null, detector = null, poseLoop = null, session = null, mirror = null, lastRenderAt = null, resizeObserver = null;
  const connections = [[5,7],[7,9],[6,8],[8,10],[5,6],[5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16]];
  const set = (id, value) => { $(id).textContent = value; };
  const percent = value => `${Math.round((Number(value) || 0) * 100)}%`;
  function ownership() { const d = global.PocketPTDisposableMotionSession.diagnostics(); set("ownership", `${d.activeSessions} session · ${d.activeRafs} RAF · ${d.canvases} canvas`); }
  function resize() { const rect=cameraStage.getBoundingClientRect(),dpr=global.devicePixelRatio||1;canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));context.setTransform(dpr,0,0,dpr,0,0); }
  function draw(packet) {
    const points=packet?.keypoints||[],w=cameraStage.clientWidth,h=cameraStage.clientHeight,sourceW=packet?.video?.width||1,sourceH=packet?.video?.height||1;
    const scale=Math.max(w/sourceW,h/sourceH),offsetX=(w-sourceW*scale)/2,offsetY=(h-sourceH*scale)/2,map=p=>({x:p.x*scale+offsetX,y:p.y*scale+offsetY});
    context.clearRect(0,0,w,h);context.strokeStyle="#75e6b3";context.fillStyle="#75e6b3";context.lineWidth=3;
    for(const [a,b] of connections){if((points[a]?.score||0)<.3||(points[b]?.score||0)<.3)continue;const p=map(points[a]),q=map(points[b]);context.beginPath();context.moveTo(p.x,p.y);context.lineTo(q.x,q.y);context.stroke();}
    for(const point of points){if((point?.score||0)<.3)continue;const p=map(point);context.beginPath();context.arc(p.x,p.y,4,0,Math.PI*2);context.fill();}
  }
  function poseStatus(frame, diagnostics) {
    set("bodyState",frame.confidence.bodyDetected?"YES":"NO");set("shoulderConfidence",percent(frame.rightShoulder?.confidence));set("elbowConfidence",percent(frame.rightElbow?.confidence));set("mirrorState",diagnostics.state);
    const d=frame.rightUpperArmDirection;set("direction",d?`x ${d.x.toFixed(3)} · y ${d.y.toFixed(3)} · z 0 (camera plane)`:"—");
  }
  async function start() {
    startButton.disabled=true;$("error").textContent="";
    try {
      set("moveNetState","INITIALIZING");await global.__ensurePoseRuntime?.();await global.tf.ready();detector=await global.PoseRuntime.initMoveNetDetector();set("moveNetState","READY");
      camera=new global.PushUpChallenge.CameraController({video});await camera.initial();cameraStage.classList.toggle("mirrored",camera.isMirrored);resize();
      set("avatarState","LOADING");let mirrorRef=null;
      session=global.PocketPTDisposableMotionSession.createMotionSession({showProbe:false,onFrame:active=>{const now=performance.now(),dt=lastRenderAt==null?0:(now-lastRenderAt)/1000;lastRenderAt=now;mirrorRef?.update(dt,Date.now());ownership();}});
      const started=await session.start($("avatarStage"));if(started.status!=="ready")throw new Error(started.code);const loaded=await session.loadAvatar(global.PocketPTAvatarProfiles.profiles.personalized);if(loaded.status!=="ready")throw new Error(loaded.code);
      mirror=mirrorRef=new global.PocketPTLiveAvatarMirror.LiveAvatarMirror({eventTarget:global,session,cameraState:()=>({facingMode:camera.selectedFacingMode,isMirrored:camera.isMirrored}),onPose:poseStatus});set("avatarState","READY");
      poseLoop=global.PoseRuntime.startPoseLoop({detector,video,isRunning:()=>Boolean(poseLoop),onPoseFrame:({posePacket})=>draw(posePacket),onError:error=>{$("error").textContent=String(error?.message||error);set("moveNetState","ERROR");}});
      stopButton.disabled=false;ownership();
    } catch(error) { $("error").textContent=String(error?.message||error);set("avatarState",session?.avatar?"READY":"ERROR");set("moveNetState",detector?"READY":"ERROR");stop(); }
  }
  function stop() {
    poseLoop?.stop();poseLoop=null;mirror?.dispose();mirror=null;session?.dispose();session=null;camera?.stop();camera=null;detector?.dispose?.();detector=null;lastRenderAt=null;
    context.clearRect(0,0,canvas.width,canvas.height);set("mirrorState","WAITING");set("bodyState","NO");stopButton.disabled=true;startButton.disabled=false;ownership();
  }
  startButton.addEventListener("click",start);stopButton.addEventListener("click",stop);resizeObserver=new ResizeObserver(resize);resizeObserver.observe(cameraStage);
  global.addEventListener("pagehide",()=>{stop();resizeObserver.disconnect();},{once:true});resize();ownership();
})(window);
