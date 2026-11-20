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
      .quins-sim-player{transition:transform 900ms ease-in-out}.quins-sim-controls button[aria-pressed="true"]{outline:3px solid #fff1b9;outline-offset:2px}.quins-sim-stage{font-weight:800;color:#f4d88c}.quins-sim-plan-summary{padding:12px;background:#263d2f;border-radius:10px;margin:10px 0}
      @media(prefers-reduced-motion:reduce){.quins-sim-player{transition:none}}
    </style>
    <div class="quins-sim-progress">RUGBY IQ · INTERACTIVE 2 V 1</div>
    <h3>Build the picture. Make the decision.</h3>
    <p>Stand up the defender: commit them to the ball carrier, then use the space. Plan two steps ahead: set your support, read the cover, and choose your action before starting. You control when the outcome plays.</p>
    <svg class="quins-sim-pitch" viewBox="0 0 360 220" role="group" aria-label="Interactive rugby training pitch with ball carrier, support runner, first defender and covering defender">
      <rect width="360" height="220" fill="#16412e" rx="12"/>
      <g stroke="#a6c8a8" stroke-opacity=".45" stroke-dasharray="5 6"><path d="M12 30H348M12 190H348M120 15V205M240 15V205"/></g>
      <path id="quins-sim-pass" d="M110 110L146 63" fill="none" stroke="#f7e5ad" stroke-width="3" stroke-dasharray="6 6" opacity="0"/>
      <path id="quins-sim-traffic" d="M247 141L292 141" stroke="#ff9c83" stroke-width="10" stroke-linecap="round" opacity=".2"/>
      <g id="quins-sim-carrier" class="quins-sim-player"><circle cx="100" cy="111" r="17" fill="#e4c67f"/><text x="100" y="115" text-anchor="middle" font-size="12" font-weight="800" fill="#183324">C</text><ellipse cx="113" cy="104" rx="6" ry="4" fill="#fff"/></g>
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
    <p class="quins-sim-hint">C = carrier · S = support · D = primary defender · 2 = covering defender. S can be placed outside (space) or inside (traffic). This is a simplified training scenario.</p>
    <div class="quins-sim-controls" id="quins-sim-setup">
      <button type="button" id="quins-sim-outside">Place support outside</button>
      <button type="button" id="quins-sim-inside">Place support inside</button>

    </div>
    <div class="quins-sim-decisions" id="quins-sim-plan"><h3>Before Play · Read the picture</h3><p>Support starts behind the ball carrier. Choose how you will draw the defenders and your intended action. The defense reacts automatically. The simulation pauses approximately three yards before contact. Use Finish move directly under the pitch; you will never need to scroll to advance.</p><div class="quins-sim-controls"><button type="button" data-defense="inside">Draw defenders inside</button><button type="button" data-defense="outside">Draw defenders outside</button></div><div class="quins-sim-controls"><button type="button" data-plan="pass">Draw & pass</button><button type="button" data-plan="outside">Dummy & go outside</button><button type="button" data-plan="inside">Dummy & cut inside</button><button type="button" data-plan="kick">Kick & chase</button></div><p class="quins-sim-plan-summary" id="quins-sim-summary">1. Support: not set · 2. Draw: inside · 3. Action: not set</p><p id="quins-sim-plan-status" class="quins-sim-hint" role="status">Choose support, defender-draw intention, and intended decision.</p></div>
`;
  host.appendChild(root);
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
  let resultSnapshot = null;
  const initial = {carrier:[0,0],support:[0,0],defender:[0,0],cover:[0,0]};
  function summary(){get('quins-sim-summary').textContent='1. Support: '+(lane||'not set')+' · 2. Draw: '+(defenseLane||'not set')+' · 3. Action: '+(plannedChoice||'not set');playButton.disabled=!(lane&&defenseLane&&plannedChoice)||phase!=='setup';root.querySelectorAll('[data-plan],[data-defense]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.plan&&b.dataset.plan===plannedChoice)||(b.dataset.defense&&b.dataset.defense===defenseLane))));}
  function move(el,x,y){ el.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
  function cancel(){if(pending!==null){clearTimeout(pending);pending=null;}}
  function reset(){
    cancel();lane=null;plannedChoice=null;defenseLane=null;phase='setup';resultSnapshot=null;
    move(carrier,0,0);move(defender,0,0);move(cover,0,0);move(support,0,0);get('quins-sim-plan-status').textContent='Choose support lane, how to draw defenders, and your attacking action.';
    get('quins-sim-pass').setAttribute('opacity','0');get('quins-sim-pass').setAttribute('d','M110 110L146 63');
    get('quins-sim-traffic').setAttribute('opacity','.2');
    playButton.hidden=false;playButton.disabled=true;continueButton.hidden=true;watchButton.hidden=true;
    get('quins-sim-outside').disabled=false;get('quins-sim-inside').disabled=false;
    outcome.hidden=true;outcome.textContent='';
    status.textContent='Choose your support, draw and move below. Playback stays beside the pitch.';summary();
  }
  function place(which){
    if(phase!=='setup')return;
    lane=which;move(support,0,which==='outside'?0:94);
    support.dataset.selected='true';
    summary();
    status.textContent=which==='outside'?'Support is outside, with space beyond the primary defender.':'Support is inside, closer to the covering defender. Notice the traffic.';
  }
  function play(){
    if(phase!=='setup'||!lane||!defenseLane||!plannedChoice)return;
    phase='running';playButton.disabled=true;
    get('quins-sim-outside').disabled=true;get('quins-sim-inside').disabled=true;
    status.textContent='Play running: carrier advances, first defender commits. Watch the cover defender.';
    move(carrier,88,0);move(defender,-8,0);move(cover,-12,0);
    pending=setTimeout(function(){
      pending=null;if(phase!=='running')return;
      phase='decision';playButton.hidden=true;continueButton.hidden=false;
      status.textContent='EARLY READ · About three yards before the defender. Planned: '+plannedChoice+'. The pitch is frozen until you press Continue planned move.';
    },1050);
  }
  function choose(choice){
    if(phase!=='decision')return;
    phase='result';continueButton.hidden=true;watchButton.hidden=false;
    const outside=lane==='outside';
    let message='';
    // Coaching model: defender reactions follow the carrier's threat, not user-controlled defensive placement.
    // Illustrative heuristics, not a predictive match engine. Early ball release / poor lane alignment leave cover free.
    const aligned = (choice==='pass' && ((outside && defenseLane==='inside') || (!outside && defenseLane==='outside')));
    const committed = aligned;
    if(choice==='pass'){
      move(carrier,117,defenseLane==='inside'?14:-14);
      move(defender,-20,defenseLane==='inside'?13:-13);
      get('quins-sim-pass').setAttribute('opacity','1');
      if(committed){
        move(cover,-48,defenseLane==='inside'?-25:16);
        move(support,155,outside?0:94);
        message='DEFENDERS COMMIT · Carrier attacks the seam between both defenders, fixes their shoulders, then steps away and passes behind the collision line. Both defenders narrow toward the ball; support receives in the vacated channel. Space created, not a guaranteed try.';
      }else{
        move(cover,-14,outside?-47:12);
        move(support,112,outside?0:94);
        message='COVER STAYS AVAILABLE · The carrier did not sufficiently threaten the gap to draw both defenders. The cover tracks the support runner and can make the tackle. Reset and try a different draw line or support lane.';
      }
    }else if(choice==='outside'){
      const fooled=outside && defenseLane==='inside';
      move(carrier,135,-52);move(defender,-22,fooled?18:-10);move(cover,fooled?-38:-10,fooled?15:-40);
      message=fooled?'DUMMY CREATES SPACE · The carrier threatens the inside seam, the defense narrows, and the carrier attacks the outside shoulder. Support trails for continuity; cover may still recover.':'DUMMY READ · The defense holds width and tracks the ball. The dummy alone does not create space; the carrier meets outside cover. Try drawing defenders inward first.';
    }else if(choice==='kick'){
      move(carrier,115,0);move(support,105,lane==='outside'?0:94);
      get('quins-sim-pass').setAttribute('d','M220 110Q265 45 330 42');get('quins-sim-pass').setAttribute('opacity','1');
      move(cover,15,-40);
      message='KICK & CHASE · The ball goes beyond the first defender; cover turns and tracks it. A successful chase depends on kick weight, onside timing, support, and recovery. This is an illustrative option, not an automatic try.';
    }else if(choice==='inside'){
      const fooled=!outside && defenseLane==='outside';
      move(carrier,135,35);move(defender,-20,fooled?-18:12);move(cover,fooled?-10:-33,fooled?-30:-10);
      get('quins-sim-traffic').setAttribute('opacity',fooled?'.25':'1');
      message=fooled?'INSIDE SPACE · The carrier sells an outside threat and cover widens. The inside lane briefly opens, but the runner must maintain close support.':'TRAFFIC / ISOLATION · The defenders stay narrow. Cutting inside enters the converging defenders and separates the carrier from outside support. A tackle and slow recycle are likely.';
    }else return;
    outcome.hidden=false;outcome.textContent=message;resultSnapshot=choice;
    status.textContent='Outcome shown. Watch again or change the plan using the controls directly above.';
  }
  root.querySelectorAll('[data-defense]').forEach(b=>b.addEventListener('click',()=>{if(phase!=='setup')return;defenseLane=b.dataset.defense;move(cover,0,0);summary();get('quins-sim-plan-status').textContent='Draw '+defenseLane+'. Choose your action and press Play.';}));
  root.querySelectorAll('[data-plan]').forEach(b=>b.addEventListener('click',()=>{if(phase!=='setup')return;plannedChoice=b.dataset.plan;summary();get('quins-sim-plan-status').textContent='Planned action: '+b.textContent+'. Use Change plan to revise before replaying.';}));
  get('quins-sim-outside').addEventListener('click',()=>place('outside'));
  get('quins-sim-inside').addEventListener('click',()=>place('inside'));
  get('quins-sim-start').addEventListener('click',play);
  continueButton.addEventListener('click',()=>choose(plannedChoice));
  get('quins-sim-edit').addEventListener('click',()=>{reset();get('quins-sim-plan').scrollIntoView({behavior:'smooth',block:'nearest'});});
  watchButton.addEventListener('click',()=>{
    if(phase!=='result')return;
    cancel();phase='setup';
    move(carrier,0,0);move(defender,0,0);move(cover,0,0);move(support,0,lane==='outside'?0:94);
    get('quins-sim-pass').setAttribute('opacity','0');get('quins-sim-traffic').setAttribute('opacity','.2');
    outcome.hidden=true;watchButton.hidden=true;playButton.hidden=false;
    get('quins-sim-outside').disabled=false;get('quins-sim-inside').disabled=false;
    summary();play();
  });
  support.addEventListener('click',()=>place(lane==='outside'?'inside':'outside'));
  support.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();place(lane==='outside'?'inside':'outside');}});

  reset();
})();
