(function () {
  'use strict';
  const host = document.getElementById('quins-structure-lesson');
  if (!host) return;
  const root = document.createElement('div');
  root.className = 'quins-simulator';
  root.innerHTML = `
    <style>
      .quins-simulator{color:#eef5ee}.quins-simulator h3{margin:8px 0;font-size:1.18rem}.quins-simulator p{font-size:.92rem;line-height:1.5}
      .quins-sim-progress{font-size:.75rem;letter-spacing:.12em;color:#e4ca8d;font-weight:800}
      .quins-sim-pitch{display:block;width:100%;height:auto;border:1px solid #66876d;border-radius:13px;background:#143c2b;touch-action:manipulation}
      .quins-sim-piece{cursor:pointer;outline:none}.quins-sim-piece:focus-visible circle{stroke:#fff;stroke-width:5}
      .quins-sim-piece circle{stroke:#12241c;stroke-width:2.5}.quins-sim-piece text{fill:#10291c;font-size:12px;font-weight:800;text-anchor:middle;pointer-events:none}
      .quins-sim-piece[data-selected="true"] circle{stroke:#fff3c6;stroke-width:5}
      .quins-sim-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0}
      .quins-sim-controls button{font-size:.85rem;line-height:1.25;min-height:48px;padding:10px;white-space:normal}
      .quins-sim-controls button:disabled{opacity:.48;cursor:not-allowed}
      .quins-sim-status{min-height:52px;padding:12px;border:1px solid #54715a;border-radius:11px;background:#213b2b}
      .quins-sim-hint{font-size:.78rem;color:#c5d1c6}
      .quins-sim-outcome{padding:13px;border-left:4px solid #d9bd7b;background:#263d2f;border-radius:8px}
      .quins-sim-outcome[hidden],.quins-sim-decisions[hidden],.quins-sim-toolbar button[hidden]{display:none}.quins-sim-toolbar{position:relative;grid-template-columns:repeat(2,minmax(0,1fr));margin:8px 0}.quins-sim-toolbar button{min-height:50px}
      .quins-sim-player{transition:transform 420ms ease-in-out}.quins-sim-ball{transition:opacity 120ms;pointer-events:none}.quins-sim-pass-guide{transition:opacity 150ms}.quins-sim-controls button[aria-pressed="true"]{outline:3px solid #fff1b9;outline-offset:2px}.quins-sim-stage{font-weight:800;color:#f4d88c}.quins-sim-plan-summary{padding:12px;background:#263d2f;border-radius:10px;margin:10px 0}
      @media(prefers-reduced-motion:reduce){.quins-sim-player,.quins-sim-ball{transition:none}}
    </style>
    <div class="quins-sim-progress">RUGBY IQ · INTERACTIVE 2 V 1 / 2 V 2</div><div class="quins-sim-controls" aria-label="Defender count"><button type="button" data-format="2v1" aria-pressed="true">2v1 · One defender</button><button type="button" data-format="2v2" aria-pressed="false">2v2 · Cover defender</button></div>
    <h3>Build the picture. Make the decision.</h3>
    <p>Stand up the defender: commit them to the ball carrier, then use the space. Plan two steps ahead: set your support, read the cover, and choose your action before starting. You control when the outcome plays.</p>
    <svg class="quins-sim-pitch" viewBox="0 0 360 220" role="group" aria-label="Interactive rugby training pitch with two attackers and one or two defenders">
      <rect width="360" height="220" fill="#16412e" rx="12"/>
      <g stroke="#a6c8a8" stroke-opacity=".45" stroke-dasharray="5 6"><path d="M12 30H348M12 190H348M120 15V205M240 15V205"/></g>
      <path id="quins-sim-pass" d="M110 110L146 63" fill="none" stroke="#f7e5ad" stroke-width="3" stroke-dasharray="6 6" opacity="0"/>
      <ellipse id="quins-sim-ball" class="quins-sim-ball" cx="113" cy="104" rx="7" ry="4" fill="#fff3c6" stroke="#684e28" stroke-width="1.5"/><path id="quins-sim-traffic" d="M247 141L292 141" stroke="#ff9c83" stroke-width="10" stroke-linecap="round" opacity=".2"/>
      <g id="quins-sim-carrier" class="quins-sim-player"><circle cx="100" cy="111" r="17" fill="#e4c67f"/><text x="100" y="115" text-anchor="middle" font-size="12" font-weight="800" fill="#183324">C</text></g>
      <g id="quins-sim-support" class="quins-sim-player quins-sim-piece" tabindex="0" role="button" aria-label="Support runner: tap to change position" data-selected="false"><circle cx="55" cy="65" r="17" fill="#e4c67f"/><text x="55" y="69">S</text></g>
      <g id="quins-sim-defender" class="quins-sim-player"><circle cx="242" cy="110" r="16" fill="#db7773"/><text x="242" y="114" fill="#fff" text-anchor="middle" font-size="12" font-weight="800">D</text></g>
      <g id="quins-sim-cover" class="quins-sim-player"><circle cx="291" cy="145" r="16" fill="#db7773"/><text x="291" y="149" fill="#fff" text-anchor="middle" font-size="12" font-weight="800">2</text></g>
      <text x="14" y="211" fill="#e9f1e9" font-size="10">ATTACK →</text><text x="252" y="211" fill="#e9f1e9" font-size="10">COVER DEFENSE</text>
    </svg>
    <div class="quins-sim-controls quins-sim-toolbar" aria-label="Playback controls">
      <button type="button" id="quins-sim-start" disabled>▶ Play scenario</button>
      <button type="button" id="quins-sim-continue" hidden>▶ Finish move</button>
      <button type="button" id="quins-sim-watch" hidden>↺ Watch again</button>
      <button type="button" id="quins-sim-edit">✎ Change plan</button>
    </div>
    <p class="quins-sim-status" id="quins-sim-status" role="status" aria-live="polite">Choose your setup below, then play here.</p>
    <div id="quins-sim-outcome" class="quins-sim-outcome" role="status" aria-live="polite" hidden></div>
    <p class="quins-sim-hint">C = carrier · S = support · D = primary defender. 2 = covering defender only in 2v2 mode. Support can be placed outside or inside. This is a simplified training scenario.</p>
    <div class="quins-sim-controls" id="quins-sim-setup">
      <button type="button" id="quins-sim-outside">Place support outside</button>
      <button type="button" id="quins-sim-inside">Place support inside</button>

    </div>
    <div class="quins-sim-decisions" id="quins-sim-plan"><h3>Before Play · Read the picture</h3><p>Support starts behind the ball carrier. Choose how you will draw the defenders and your intended action. The defense reacts automatically. Play runs the entire selected move automatically: draw the defender, dummy or pass, then finish. The stage narration appears beside the pitch.</p><div class="quins-sim-controls"><button type="button" data-defense="inside">Draw defenders inside</button><button type="button" data-defense="outside">Draw defenders outside</button></div><div class="quins-sim-controls"><button type="button" data-plan="pass">Position & pass</button><button type="button" data-plan="outside">Dummy & go outside</button><button type="button" data-plan="inside">Dummy & cut inside</button><button type="button" data-plan="kick">Kick & chase</button></div><p class="quins-sim-plan-summary" id="quins-sim-summary">1. Support: not set · 2. Draw: inside · 3. Action: not set</p><p id="quins-sim-plan-status" class="quins-sim-hint" role="status">Choose support, defender-draw intention, and intended decision.</p></div>
`;
  host.appendChild(root);
  const pitch=root.querySelector('.quins-sim-pitch');
  const ball=root.querySelector('#quins-sim-ball');
  // Ball inherits the player's SVG transform while carried; never teleport it ahead.
  function attachBall(player,x,y){player.appendChild(ball);ball.setAttribute('cx',String(x));ball.setAttribute('cy',String(y));}
  const get = id => root.querySelector('#' + id);
  const support = get('quins-sim-support');
  const carrier = get('quins-sim-carrier');
  const defender = get('quins-sim-defender');
  const cover = get('quins-sim-cover');
  const status = get('quins-sim-status');
  const playButton=get('quins-sim-start');const continueButton=get('quins-sim-continue');const watchButton=get('quins-sim-watch');
  const outcome = get('quins-sim-outcome');
  let lane = null;
  let plannedChoice = null;
  let defenseLane = null;
  let phase = 'setup';
  let pending = null;
  let sequenceTimers = [];
  let ballFrame=null;
  let ballOwner='carrier';
  let autoReplay=false;let format='2v1';
  let carrierPosition={x:100,y:111};
  let supportPosition={x:55,y:65};
  function carryBall(){ballOwner='carrier';attachBall(carrier,113,104);}
  function receiveBall(){ballOwner='support';attachBall(support,68,58);}
  function positionCarrier(x,y){carrierPosition={x:100+x,y:111+y};move(carrier,x,y);}
  function positionSupport(x,y){supportPosition={x:55+x,y:65+y};move(support,x,y);}
  function stopBall(){if(ballFrame!==null){cancelAnimationFrame(ballFrame);ballFrame=null;}}
  function animateBall(from,to,duration,onArrive){stopBall();ballAt(from.x,from.y);const started=performance.now();const tick=(now)=>{if(phase!=='result')return;const t=Math.min(1,(now-started)/duration);const eased=t*t*(3-2*t);ballAt(from.x+(to.x-from.x)*eased,from.y+(to.y-from.y)*eased);if(t<1){ballFrame=requestAnimationFrame(tick);}else{ballFrame=null;if(onArrive)onArrive();}};ballFrame=requestAnimationFrame(tick);}

  function later(fn,ms){const id=setTimeout(()=>{sequenceTimers=sequenceTimers.filter(t=>t!==id);fn();},ms);sequenceTimers.push(id);}
  function clearSequence(){sequenceTimers.forEach(clearTimeout);sequenceTimers=[];}
  function ballAt(x,y){get("quins-sim-ball").setAttribute("cx",String(x));get("quins-sim-ball").setAttribute("cy",String(y));}
  function narration(t){status.textContent=t;}
  let resultSnapshot = null;
  const initial = {carrier:[0,0],support:[0,0],defender:[0,0],cover:[0,0]};
  function summary(){get('quins-sim-summary').textContent='1. Support: '+(lane||'MISSING')+' · 2. Draw: '+(defenseLane||'MISSING')+' · 3. Action: '+(plannedChoice||'MISSING')+' · '+format;get('quins-sim-plan-status').textContent=lane&&defenseLane&&plannedChoice?'All three commands ready. Press Play to watch the full move.':'Missing: '+[!lane?'support':null,!defenseLane?'defender draw':null,!plannedChoice?'finishing action':null].filter(Boolean).join(', ')+'.';playButton.disabled=!(lane&&defenseLane&&plannedChoice)||phase!=='setup';root.querySelectorAll('[data-plan],[data-defense]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.plan&&b.dataset.plan===plannedChoice)||(b.dataset.defense&&b.dataset.defense===defenseLane))));}
  function move(el,x,y){ el.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
  function cancel(){stopBall();clearSequence();if(pending!==null){clearTimeout(pending);pending=null;}}
  function reset(){
    cancel();autoReplay=false;lane=null;plannedChoice=null;defenseLane=null;phase='setup';resultSnapshot=null;
    ballOwner='carrier';positionCarrier(0,0);move(defender,0,0);move(cover,0,0);cover.style.display=format==='2v1'?'none':'';positionSupport(0,0);carryBall();get("quins-sim-ball").style.opacity="1";get('quins-sim-plan-status').textContent='Choose support lane, how to draw defenders, and your attacking action.';
    get('quins-sim-pass').setAttribute('opacity','0');get('quins-sim-pass').setAttribute('d','M110 110L146 63');
    get('quins-sim-traffic').setAttribute('opacity','.2');
    playButton.hidden=false;playButton.disabled=true;continueButton.hidden=true;watchButton.hidden=true;
    get('quins-sim-outside').disabled=false;get('quins-sim-inside').disabled=false;
    outcome.hidden=true;outcome.textContent='';
    status.textContent='Choose your support, draw and move below. Playback stays beside the pitch.';summary();
  }
  function place(which){
    if(phase!=='setup')return;
    lane=which;positionSupport(0,which==='outside'?0:94);
    support.dataset.selected='true';
    summary();
    status.textContent=which==='outside'?'Support is outside, with space beyond the primary defender.':'Support is inside, closer to the covering defender. Notice the traffic.';
  }
  function play(){
    if(phase!=='setup'||!lane||!defenseLane||!plannedChoice){summary();return;}
    phase='running';playButton.disabled=true;
    get('quins-sim-outside').disabled=true;get('quins-sim-inside').disabled=true;
    status.textContent='APPROACH · Carrier advances to the five-yard decision area.';
    positionCarrier(67,0);move(defender,0,0);move(cover,0,0);
    pending=setTimeout(function(){
      pending=null;if(phase!=='running')return;
      phase='decision';playButton.hidden=true;continueButton.hidden=true;autoReplay=false;
      status.textContent='DRAW '+defenseLane.toUpperCase()+' · Defender commits to the carrier. FINISHING MOVE · '+plannedChoice.toUpperCase()+'.';
      choose(plannedChoice);
    },1050);
  }
  function choose(choice){
    if(phase!=='decision')return;
    phase='result';continueButton.hidden=true;watchButton.hidden=true;
    const outside=lane==='outside';
    let message='';
    // Coaching model: defender reactions follow the carrier's threat, not user-controlled defensive placement.
    // Illustrative heuristics, not a predictive match engine. Early ball release / poor lane alignment leave cover free.
    const aligned = (choice==='pass' && ((outside && defenseLane==='inside') || (!outside && defenseLane==='outside')));
    const committed = aligned;
    if(choice==='pass'){
      // Carrier attacks away from support to fix the inside defender, then
      // straightens into a legal passing channel without screening contact.
      const inside=defenseLane==='inside'?26:-26;
      const supportY=outside?65:159;
      const guide=get('quins-sim-pass');
      guide.setAttribute('opacity','0');
      carryBall();
      narration('DRAW INSIDE · Step away from outside support and threaten the defender’s inside shoulder.');
      positionCarrier(79,inside);positionSupport(55,outside?0:94);
      later(()=>{
        if(phase!=='result')return;
        narration('DEFENDER FIXED · Defender follows the carrier inward, away from outside support.');
        move(defender,-9,inside*.65);
        if(format==='2v2')move(cover,committed?-12:-5,committed?-12:0);
      },800);
      later(()=>{
        if(phase!=='result')return;
        narration('STRAIGHTEN TO PASS · Step back toward the support-side channel, still ahead of support.');
        positionCarrier(93,inside*.35);
        if(committed)move(defender,-14,inside*.8);
      },1650);
      later(()=>{
        if(phase!=='result')return;
        narration('RELEASE · Pass backward into outside support’s running line before contact.');
        positionCarrier(105,inside*.18);
        ballOwner='flight';
        // Reparent only at release, preserving the on-screen hand position.
        const releaseFromHands={x:carrierPosition.x+13,y:carrierPosition.y-7};
        pitch.appendChild(ball);ballAt(releaseFromHands.x,releaseFromHands.y);
        positionSupport(103,outside?0:94);
        const catchAtHands={x:supportPosition.x+13,y:supportPosition.y-7};
        guide.setAttribute('d','M'+releaseFromHands.x+' '+releaseFromHands.y+'L'+catchAtHands.x+' '+catchAtHands.y);
        guide.setAttribute('opacity','.65');
        animateBall(releaseFromHands,catchAtHands,1150,()=>{
          if(phase!=='result')return;
          guide.setAttribute('opacity','0');
          receiveBall();get('quins-sim-ball').style.opacity='1';
          narration('CATCH · Support receives the ball in stride and accelerates away from contact.');
          if(committed){move(defender,-18,-17);move(cover,-37,-12);}
          else{move(cover,-27,outside?-42:10);}
          later(()=>{
            if(phase!=='result')return;
            positionSupport(committed?208:145,outside?0:94);
            outcome.hidden=false;outcome.textContent=message;watchButton.hidden=false;
            narration('PLAY COMPLETE · '+(committed?'Defenders held distinct outside-shoulder and inside-hip positions while support broke into space.':'Cover stayed available and can close on the support runner.'));
          },650);
        });
      },2550);
      message=committed
        ?'SPACE CREATED · Carrier steps inward away from support, fixes the defender, straightens toward the passing channel and releases backward before contact. Support attacks the available outside space; not a guaranteed try.'
        :'COVER RECOVERS · The carrier did not sufficiently fix both defenders. The backward pass reaches support, but cover can track the receiver.';
    }else if(choice==='outside'){
      // One continuous inside threat, one dummy, then the outside acceleration.
      // Do not teleport directly to the finish or invent a second defender draw.
      const fooled=defenseLane==='inside';
      narration('5 METRES · DRAW INSIDE · Carrier threatens the defender\'s inside shoulder.');
      positionCarrier(82,18);positionSupport(48,lane==='outside'?0:94);
      later(()=>{
        if(phase!=='result')return;
        narration('DEFENDER COMMITS · Defender tracks the inside running line.');
        move(defender,-12,18);if(format==='2v2')move(cover,-9,fooled?8:-8);
      },650);
      later(()=>{
        if(phase!=='result')return;
        narration('DUMMY INSIDE · Carrier sells the pass or inside continuation while retaining the ball.');
        positionCarrier(95,22);
        move(defender,-18,fooled?25:4);
      },1250);
      later(()=>{
        if(phase!=='result')return;
        narration('GO OUTSIDE · One sharp change of direction; accelerate into the outside channel.');
        positionCarrier(140,-45);positionSupport(88,lane==='outside'?0:94);
        if(format==='2v2')move(cover,fooled?-18:-5,fooled?5:-25);
      },1950);
      later(()=>{
        if(phase!=='result')return;
        message=fooled?'OUTSIDE SPACE · Defender followed the inside threat and the carrier cut outside. Support stays available; this is not a guaranteed try.':'DEFENDER HOLDS · The inside dummy did not commit the defender; outside space is contested.';
        outcome.hidden=false;outcome.textContent=message;watchButton.hidden=false;
        narration('PLAY COMPLETE · '+message);
      },2850);
    }else if(choice==='kick'){
      // Draw first, kick only after the defender has reacted, then show the chase.
      // Ball travels independently of the carrier; do not model a guaranteed recovery.
      const drawY=defenseLane==='inside'?23:-23;
      const supportY=lane==='outside'?0:94;
      const guide=get('quins-sim-pass');
      guide.setAttribute('opacity','0');
      carryBall();
      narration('DRAW '+defenseLane.toUpperCase()+' · Carrier threatens the defender’s '+defenseLane+' shoulder before kicking.');
      positionCarrier(82,drawY);positionSupport(55,supportY);
      later(()=>{
        if(phase!=='result')return;
        narration('DEFENDER COMMITS '+defenseLane.toUpperCase()+' · The defender follows the ball carrier’s running line.');
        move(defender,-16,drawY*.85);
        if(format==='2v2')move(cover,-8,drawY*.3);
      },750);
      later(()=>{
        if(phase!=='result')return;
        narration('KICK INTO SPACE · Carrier releases the ball beyond the committed defender.');
        positionCarrier(102,drawY*.75);
        ballOwner='flight';
        const from={x:carrierPosition.x+13,y:carrierPosition.y-7};
        const to={x:332,y:drawY>0?49:169};
        pitch.appendChild(ball);ballAt(from.x,from.y);
        guide.setAttribute('d','M'+from.x+' '+from.y+'Q'+(from.x+42)+' '+(from.y-34)+' '+to.x+' '+to.y);
        guide.setAttribute('opacity','.75');
        animateBall(from,to,1150,()=>{
          if(phase!=='result')return;
          narration('CHASE · Carrier and support accelerate toward the landing area. Defender turns to recover.');
          positionCarrier(158,drawY*.5);positionSupport(146,supportY);
          move(defender,-2,drawY*.35);
          if(format==='2v2')move(cover,8,drawY*.25);
          later(()=>{
            if(phase!=='result')return;
            guide.setAttribute('opacity','0');
            outcome.hidden=false;outcome.textContent=message;watchButton.hidden=false;
            narration('PLAY COMPLETE · '+message);
          },850);
        });
      },1600);
      message='KICK & CHASE · Carrier drew the defender '+defenseLane+', kicked into space, then chased with support. Recovery is contested; kick weight, onside timing and defender reaction determine the result. This is an illustrative training sequence, not a guaranteed try.';
    }else if(choice==='inside'){
      narration('DUMMY PASS · DRAW OUTSIDE, THEN FINISH INSIDE.');const fooled=!outside && defenseLane==='outside';
      move(carrier,135,35);move(defender,-20,fooled?-18:12);move(cover,fooled?-10:-33,fooled?-30:-10);
      get('quins-sim-traffic').setAttribute('opacity',fooled?'.25':'1');
      message=fooled?'INSIDE SPACE · The carrier sells an outside threat and cover widens. The inside lane briefly opens, but the runner must maintain close support.':'TRAFFIC / ISOLATION · The defenders stay narrow. Cutting inside enters the converging defenders and separates the carrier from outside support. A tackle and slow recycle are likely.';
    }else return;
    if(choice!=='pass'&&choice!=='outside'){outcome.hidden=false;outcome.textContent=message;watchButton.hidden=false;}resultSnapshot=choice;
    if(choice!=='pass'&&choice!=='outside')status.textContent='FINISHING MOVE · '+message;
  }
  root.querySelectorAll('[data-format]').forEach(b=>b.addEventListener('click',()=>{if(phase==='running'||phase==='decision')return;format=b.dataset.format;reset();root.querySelectorAll('[data-format]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));status.textContent=format==='2v1'?'2v1: one defender. Choose all three commands, then Play.':'2v2: covering defender added. Choose all three commands, then Play.';}));
  root.querySelectorAll('[data-defense]').forEach(b=>b.addEventListener('click',()=>{if(phase!=='setup')return;defenseLane=b.dataset.defense;move(cover,0,0);summary();get('quins-sim-plan-status').textContent='Draw '+defenseLane+'. Choose your action and press Play.';}));
  root.querySelectorAll('[data-plan]').forEach(b=>b.addEventListener('click',()=>{if(phase!=='setup')return;plannedChoice=b.dataset.plan;summary();get('quins-sim-plan-status').textContent='Planned action: '+b.textContent+'. Use Change plan to revise before replaying.';}));
  get('quins-sim-outside').addEventListener('click',()=>place('outside'));
  get('quins-sim-inside').addEventListener('click',()=>place('inside'));
  get('quins-sim-start').addEventListener('click',play);
  continueButton.addEventListener('click',()=>choose(plannedChoice));
  get('quins-sim-edit').addEventListener('click',()=>{reset();get('quins-sim-plan').scrollIntoView({behavior:'smooth',block:'nearest'});});
  function replaySelected(){
    if(phase!=='result')return false;
    cancel();phase='setup';autoReplay=true;
    ballOwner='carrier';positionCarrier(0,0);move(defender,0,0);move(cover,0,0);positionSupport(0,lane==='outside'?0:94);carryBall();get('quins-sim-ball').style.opacity='1';
    get('quins-sim-pass').setAttribute('opacity','0');get('quins-sim-traffic').setAttribute('opacity','.2');
    outcome.hidden=true;watchButton.hidden=true;playButton.hidden=false;
    get('quins-sim-outside').disabled=false;get('quins-sim-inside').disabled=false;
    summary();play();return true;
  }
  watchButton.addEventListener('click',replaySelected);
  // The expanded Three.js portal invokes this directly, independent of hidden source buttons.
  root.addEventListener('quins:replay-selected',()=>{replaySelected();});
  support.addEventListener('click',()=>place(lane==='outside'?'inside':'outside'));
  support.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();place(lane==='outside'?'inside':'outside');}});

  reset();
})();
