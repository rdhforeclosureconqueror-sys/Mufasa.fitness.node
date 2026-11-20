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
      .quins-sim-outcome[hidden],.quins-sim-decisions[hidden]{display:none}
      .quins-sim-player{transition:transform 900ms ease-in-out}
      @media(prefers-reduced-motion:reduce){.quins-sim-player{transition:none}}
    </style>
    <div class="quins-sim-progress">RUGBY IQ · INTERACTIVE 2 V 1</div>
    <h3>Build the picture. Make the decision.</h3>
    <p>Stand up the defender: commit them to the ball carrier, then use the space. First position your support runner, then start the attack.</p>
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
    <p class="quins-sim-hint">C = carrier · S = support · D = primary defender · 2 = covering defender. S can be placed outside (space) or inside (traffic). This is a simplified training scenario.</p>
    <div class="quins-sim-controls" id="quins-sim-setup">
      <button type="button" id="quins-sim-outside">Place support outside</button>
      <button type="button" id="quins-sim-inside">Place support inside</button>
      <button type="button" id="quins-sim-start" disabled>Play the attack →</button>
      <button type="button" id="quins-sim-reset">Reset</button>
    </div>
    <div class="quins-sim-decisions" id="quins-sim-plan"><h3>Before Play · Read the picture</h3><p>Support starts behind the ball carrier. Choose where the covering defender waits and your intended action. The simulation pauses approximately three yards before contact to confirm or change your decision.</p><div class="quins-sim-controls"><button type="button" data-defense="inside">Cover inside</button><button type="button" data-defense="outside">Cover outside</button></div><div class="quins-sim-controls"><button type="button" data-plan="pass">Draw & pass</button><button type="button" data-plan="outside">Dummy & go outside</button><button type="button" data-plan="inside">Dummy & cut inside</button></div><p id="quins-sim-plan-status" class="quins-sim-hint" role="status">Choose a support lane, cover position, and intended decision.</p></div><p class="quins-sim-status" id="quins-sim-status" role="status" aria-live="polite">Step 1: Choose where to position your support runner.</p>
    <div id="quins-sim-decisions" class="quins-sim-decisions" hidden>
      <h3>Decision point: defender commits to you.</h3>
      <p>The defender has locked onto the carrier. Cover is waiting inside. What do you do?</p>
      <div class="quins-sim-controls">
        <button type="button" data-choice="pass">Draw and pass</button>
        <button type="button" data-choice="outside">Dummy, attack outside</button>
        <button type="button" data-choice="inside">Dummy, cut inside</button>
        <button type="button" id="quins-sim-replay">Reset play</button>
      </div>
    </div>
    <div id="quins-sim-outcome" class="quins-sim-outcome" role="status" aria-live="polite" hidden></div>`;
  host.appendChild(root);
  const get = id => root.querySelector('#' + id);
  const support = get('quins-sim-support');
  const carrier = get('quins-sim-carrier');
  const defender = get('quins-sim-defender');
  const cover = get('quins-sim-cover');
  const status = get('quins-sim-status');
  const decision = get('quins-sim-decisions');
  const outcome = get('quins-sim-outcome');
  let lane = null;
  let plannedChoice = null;
  let defenseLane = 'inside';
  let phase = 'setup';
  let pending = null;
  function move(el,x,y){ el.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
  function cancel(){if(pending!==null){clearTimeout(pending);pending=null;}}
  function reset(){
    cancel();lane=null;plannedChoice=null;defenseLane='inside';phase='setup';
    move(carrier,0,0);move(defender,0,0);move(cover,0,0);move(support,0,0);get('quins-sim-plan-status').textContent='Choose a support lane, cover position, and intended decision.';
    get('quins-sim-pass').setAttribute('opacity','0');
    get('quins-sim-traffic').setAttribute('opacity','.2');
    get('quins-sim-start').disabled=true;
    get('quins-sim-outside').disabled=false;get('quins-sim-inside').disabled=false;
    decision.hidden=true;outcome.hidden=true;outcome.textContent='';
    status.textContent='Step 1: Choose where to position your support runner.';
  }
  function place(which){
    if(phase!=='setup')return;
    lane=which;move(support,0,which==='outside'?0:94);
    support.dataset.selected='true';
    get('quins-sim-start').disabled=!plannedChoice;
    status.textContent=which==='outside'?'Support is outside, with space beyond the primary defender.':'Support is inside, closer to the covering defender. Notice the traffic.';
  }
  function play(){
    if(phase!=='setup'||!lane||!plannedChoice)return;
    phase='running';get('quins-sim-start').disabled=true;
    get('quins-sim-outside').disabled=true;get('quins-sim-inside').disabled=true;
    status.textContent='Play running: carrier advances, first defender commits. Watch the cover defender.';
    move(carrier,88,0);move(defender,0,0);
    pending=setTimeout(function(){
      pending=null;if(phase!=='running')return;
      phase='decision';decision.hidden=false;
      status.textContent='EARLY READ · Approximately three yards before the primary defender. Confirm or change your planned action.';
    },1050);
  }
  function choose(choice){
    if(phase!=='decision')return;
    phase='result';decision.hidden=true;
    const outside=lane==='outside';const coverInside=defenseLane==='inside';
    let message='';
    if(choice==='pass'){
      get('quins-sim-pass').setAttribute('opacity','1');move(carrier,108,coverInside?18:-18);move(defender,-15,coverInside?10:-10);
      if(outside){
        move(support,135,0);
        message=coverInside?'SPACE CREATED · Step toward the inside shoulder to fix the defender, shift back outside, pass to trailing support, then carry your running line through the defender. Outside support breaks free toward the try line.':'COVER OUTSIDE · The primary defender is fixed, but the second defender protects the outside channel. The pass is not automatically a try: scan the second defender and choose another space.';
      }else{
        move(support,115,94);move(cover,-38,coverInside?-12:30);
        message=coverInside?'SUPPORT INTO TRAFFIC · You feint outside and pass back inside. Both defenders converge on the narrower gap. The runner may break through, but has less room and more contact risk.':'INSIDE GAP · Cover has shifted outside. An inside pass can be effective if support is behind and the gap remains open.';
      }
    }else if(choice==='outside'){
      move(carrier,135,-52);
      message='DUMMY AND OUTSIDE · The carrier sells the pass and attacks the outside shoulder. In this picture, the outside channel has space. Keep the ball available and track support; a defender could still recover.';
    }else if(choice==='inside'){
      move(carrier,135,35);move(cover,-33,coverInside?-10:20);
      get('quins-sim-traffic').setAttribute('opacity','1');
      message='CONTACT / ISOLATION RISK · The dummy draws attention, but cutting inside takes the carrier toward covering traffic and away from outside support. A tackle and slow recycle are likely in this illustrated scenario. Scan cover and support before choosing this line.';
    }else return;
    outcome.hidden=false;outcome.textContent=message;
    status.textContent='Outcome shown. Reset and test another support position or decision.';
  }
  root.querySelectorAll('[data-defense]').forEach(b=>b.addEventListener('click',()=>{if(phase!=='setup')return;defenseLane=b.dataset.defense;move(cover,0,defenseLane==='inside'?0:-80);get('quins-sim-plan-status').textContent='Cover '+defenseLane+'. Choose your action and press Play.';}));
  root.querySelectorAll('[data-plan]').forEach(b=>b.addEventListener('click',()=>{if(phase!=='setup')return;plannedChoice=b.dataset.plan;get('quins-sim-start').disabled=!lane;get('quins-sim-plan-status').textContent='Planned action: '+b.textContent+'. You may change it at the early decision pause.';}));
  get('quins-sim-outside').addEventListener('click',()=>place('outside'));
  get('quins-sim-inside').addEventListener('click',()=>place('inside'));
  get('quins-sim-start').addEventListener('click',play);
  get('quins-sim-reset').addEventListener('click',reset);
  get('quins-sim-replay').addEventListener('click',reset);
  support.addEventListener('click',()=>place(lane==='outside'?'inside':'outside'));
  support.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();place(lane==='outside'?'inside':'outside');}});
  root.querySelectorAll('[data-choice]').forEach(button=>button.addEventListener('click',()=>choose(button.dataset.choice)));
  reset();
})();
