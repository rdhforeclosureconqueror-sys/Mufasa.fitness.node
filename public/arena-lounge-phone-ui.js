(function(root){
  "use strict";
  // Reuse the reviewed Godot movement protocol without loading exercise
  // microphone, camera, pose tracker, challenge engine or motion-mirror.
  function mount({mark=()=>{},send=()=>{}}={}){
    const $=id=>root.document.getElementById(id);
    const panel=$("arenaPhonePanel"),stick=$("arenaJoystick"),knob=$("arenaJoystickKnob");
    if(!panel||!stick||!knob||!root.PocketPTArenaPhoneFlow)return null;
    let scope=null,pointer=null;
    const flow=root.PocketPTArenaPhoneFlow.create({
      send,mark,stopCamera:()=>{},
      onChange:state=>{
        panel.hidden=!state.canMove;
        $("arenaPhoneMessage").textContent=state.canMove?"Drag to explore the lounge. Release to stop.":"Connecting movement controls…";
        // This social-only controller never enters camera or exercise contexts.
      }
    });
    function release(){
      if(pointer){
        try{if(stick.hasPointerCapture?.(pointer))stick.releasePointerCapture(pointer);}catch(_){}
      }
      pointer=null;knob.style.transform="translate(0,0)";flow.release();
    }
    function update(event){
      const box=stick.getBoundingClientRect();
      const radius=Math.max(1,Math.min(box.width,box.height)/2);
      let x=(event.clientX-box.left-box.width/2)/radius;
      let y=(event.clientY-box.top-box.height/2)/radius;
      const length=Math.hypot(x,y);
      if(length>1){x/=length;y/=length;}
      knob.style.transform=`translate(${(x*radius*.55).toFixed(1)}px,${(y*radius*.55).toFixed(1)}px)`;
      flow.moveVector(x,y);
    }
    stick.addEventListener("pointerdown",event=>{
      if(pointer!==null||event.button!==0||!flow.snapshot().canMove)return;
      event.preventDefault();pointer=event.pointerId;
      try{stick.setPointerCapture(event.pointerId);}catch(_){release();return;}
      update(event);
    });
    stick.addEventListener("pointermove",event=>{
      if(pointer===event.pointerId){event.preventDefault();update(event);}
    });
    for(const type of ["pointerup","pointercancel","lostpointercapture"]){
      stick.addEventListener(type,event=>{if(pointer===event.pointerId)release();});
    }
    const directions={ArrowLeft:"MOVE_LEFT",ArrowRight:"MOVE_RIGHT",ArrowUp:"MOVE_FORWARD",ArrowDown:"MOVE_BACKWARD"};
    stick.addEventListener("keydown",event=>{
      if(!directions[event.key]||event.repeat)return;
      event.preventDefault();flow.hold(directions[event.key]);
    });
    stick.addEventListener("keyup",event=>{
      if(!directions[event.key])return;
      event.preventDefault();flow.release();
    });
    root.addEventListener("blur",release);
    root.addEventListener("pagehide",release);
    root.addEventListener("orientationchange",release);
    return {
      connect(){if(!scope){scope=root.crypto.randomUUID();flow.connect(scope);}},
      accept:data=>flow.accept(data),
      suspend(){release();flow.suspend();},
      reset(){release();scope=null;flow.reset();},
      close(){release();scope=null;flow.close();}
    };
  }
  root.PocketPTArenaPhoneUI=Object.freeze({mount});
})(window);
