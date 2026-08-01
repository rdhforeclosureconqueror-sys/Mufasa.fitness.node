(function installGuidedExerciseSequence(root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.GuidedExerciseSequence = api;
})(typeof window !== 'undefined' ? window : globalThis, function guidedExerciseSequenceFactory(root) {
  'use strict';

  const MODES = Object.freeze({ IDLE_AUTOPLAY:'IDLE_AUTOPLAY', PAUSED:'PAUSED', SESSION_CONTROLLED:'SESSION_CONTROLLED', REDUCED_MOTION_PAUSED:'REDUCED_MOTION_PAUSED', UNAVAILABLE:'UNAVAILABLE' });
  function resolveDefinition(doc, explicitDefinition) {
    if (explicitDefinition) return explicitDefinition;
    if (root?.ActiveExerciseSequenceDefinition) return root.ActiveExerciseSequenceDefinition;
    const exerciseId=doc?.documentElement?.dataset?.exerciseSequenceId;
    const definitions=root?.ExerciseSequenceDefinitions?.definitions || (typeof require === 'function' ? require('./exercise-sequence-definitions').definitions : null);
    if (!exerciseId) throw new TypeError('The page must identify an active exercise sequence definition.');
    if (!definitions?.[exerciseId]) throw new TypeError(`No exercise sequence definition is registered for ${exerciseId}.`);
    return definitions[exerciseId];
  }
  function previewSteps(definition) {
    if (!definition?.visualTemplate?.steps?.length) throw new TypeError('Exercise definition has no preview steps.');
    const phases = new Map((definition.phases || []).map(phase => [phase.id, phase]));
    return Object.freeze(definition.visualTemplate.steps.slice().sort((a,b)=>(a.order??0)-(b.order??0)).map((step,index) => {
      const phase=phases.get(step.phaseId);if(!phase)throw new TypeError(`Preview step references unknown phase ${step.phaseId}.`);
      return Object.freeze({phaseId:step.phaseId,label:step.label||phase.label,accessibilityLabel:step.accessibilityLabel||phase.accessibilityLabel||step.label||phase.label,position:step.visualKey||step.visual||phase.visual,visualKey:step.visualKey||step.visual||phase.visual,currentInstruction:step.currentInstruction||phase.currentInstruction||step.label||phase.label,nextInstruction:step.nextInstruction||phase.nextInstruction||phase.nextLabel||'',phaseType:phase.kind,completion:Boolean(phase.completesRepetition),order:step.order??index});
    }));
  }
  class SequencePlayer {
    constructor({steps=[],intervalMs=1600,onStep=()=>{},onMode=()=>{},setTimer=setInterval,clearTimer=clearInterval,reducedMotion=false}={}){this.steps=steps;this.intervalMs=intervalMs;this.onStep=onStep;this.onMode=onMode;this.setTimer=setTimer;this.clearTimer=clearTimer;this.index=0;this.timer=null;this.mode=reducedMotion?MODES.REDUCED_MOTION_PAUSED:MODES.PAUSED;this.wasAutoplayVisible=false;this.lastAdvanceTimestamp=null;}
    render(){this.onStep(this.steps[this.index],this.index,this.mode);}
    setMode(mode){this.mode=mode;this.onMode(mode);this.render();}
    start({manual=false}={}){if(this.mode===MODES.SESSION_CONTROLLED||this.mode===MODES.UNAVAILABLE)return false;if(this.timer)return true;if(!this.steps.length)return false;this.mode=MODES.IDLE_AUTOPLAY;this.wasAutoplayVisible=true;this.onMode(this.mode);this.render();this.timer=this.setTimer(()=>{this.index=(this.index+1)%this.steps.length;this.lastAdvanceTimestamp=Date.now();this.render();},this.intervalMs);return true;}
    pause(mode=MODES.PAUSED){if(this.timer!==null){this.clearTimer(this.timer);this.timer=null;}this.mode=mode;this.onMode(mode);this.render();return false;}
    toggle(){return this.timer!==null?this.pause():this.start({manual:true});}
    showPhase(phaseId){const index=this.steps.findIndex(step=>step.phaseId===phaseId);if(index>=0)this.index=index;this.render();}
    enterSession(phaseId,trackingPaused=false){this.pause(MODES.SESSION_CONTROLLED);this.showPhase(phaseId);this.trackingPaused=trackingPaused;this.render();}
    leaveSession(){this.trackingPaused=false;return this.start();}
    activeTimerCount(){return this.timer===null?0:1;}
  }

  function mount(doc,options={}) {
    const definition=resolveDefinition(doc,options.definition), preview=doc.getElementById('movementPreview'),title=doc.getElementById('guidedPreviewTitle'),list=doc.getElementById('sequenceSteps'),toggle=doc.getElementById('previewToggle'),next=doc.getElementById('guidedPreviewNext'),status=doc.getElementById('guidedPreviewStatus');
    if(!preview||!title||!list||!toggle)throw new Error('Guided preview required DOM nodes are unavailable.');
    const steps=previewSteps(definition), reducedMotion=options.reducedMotion??Boolean(root?.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    list.replaceChildren?.(...steps.map((step,index)=>{const item=doc.createElement?.('li')||{setAttribute(){},removeAttribute(){}};item.textContent=step.label;if(index===0)item.setAttribute('aria-current','step');return item;}));
    const items=Array.from(list.children), updateMode=mode=>{const running=mode===MODES.IDLE_AUTOPLAY;toggle.textContent=running?'Pause preview':'Play preview';toggle.setAttribute('aria-pressed',String(!running));toggle.hidden=mode===MODES.SESSION_CONTROLLED;toggle.disabled=mode===MODES.UNAVAILABLE;if(status){status.textContent=mode===MODES.REDUCED_MOTION_PAUSED?'Automatic preview motion is paused because Reduce Motion is enabled.':mode===MODES.PAUSED?'Movement preview paused.':mode===MODES.SESSION_CONTROLLED?'Movement preview follows your live session.':mode===MODES.UNAVAILABLE?'Movement preview unavailable. Camera training is still available.':'';}};
    const player=new SequencePlayer({steps,intervalMs:definition.visualTemplate.intervalMs||1600,reducedMotion,setTimer:options.setTimer,clearTimer:options.clearTimer,onMode:updateMode,onStep(step,index){preview.dataset.position=step.visualKey;preview.dataset.expectedPhase=step.phaseId;preview.setAttribute('aria-label',step.accessibilityLabel);title.textContent=player?.trackingPaused?'Tracking unclear':step.currentInstruction;next&&(next.textContent=player?.trackingPaused?'Sequence progress is paused.':step.nextInstruction?`Next: ${step.nextInstruction}`:'Sequence complete');items.forEach((item,i)=>i===index?item.setAttribute('aria-current','step'):item.removeAttribute('aria-current'));}});
    const click=()=>player.toggle();toggle.addEventListener('click',click);
    player.setLiveTarget=(expected,trackingPaused=false)=>{const requested=String(expected||definition.initialPhase),phaseId=requested.toLowerCase(),phase=(definition.phases||[]).find(item=>item.id===phaseId);player.pause(MODES.SESSION_CONTROLLED);player.trackingPaused=trackingPaused;if(phase){player.onStep({phaseId:requested,label:phase.label,accessibilityLabel:phase.accessibilityLabel||phase.label,visualKey:phase.visual,currentInstruction:phase.currentInstruction||phase.label,nextInstruction:phase.nextInstruction||phase.nextLabel||'',phaseType:phase.kind,completion:Boolean(phase.completesRepetition)},-1,player.mode);}else player.showPhase(definition.initialPhase);};
    player.resumePreview=()=>player.leaveSession();
    player.dispose=()=>{player.pause();toggle.removeEventListener?.('click',click);};
    reducedMotion?(player.setMode(MODES.REDUCED_MOTION_PAUSED)):player.start();
    return player;
  }

  function bootstrap(doc=root?.document,options={}) {
    if(!root||!doc)return null;if(root.__gesePreviewInitialized)return root.__guidedSequencePlayer||null;
    root.__gesePreviewInitialized=true;
    try{const player=mount(doc,options);root.__guidedSequencePlayer=player;
      const hidden=()=>{if(doc.hidden&&player.mode===MODES.IDLE_AUTOPLAY)player.pause(MODES.PAUSED);else if(!doc.hidden&&player.mode===MODES.PAUSED&&player.wasAutoplayVisible)player.start();};
      doc.addEventListener?.('visibilitychange',hidden);root.addEventListener?.('pagehide',()=>{if(player.mode===MODES.IDLE_AUTOPLAY)player.pause(MODES.PAUSED);});root.addEventListener?.('pageshow',event=>{if(event.persisted&&player.mode===MODES.PAUSED&&player.wasAutoplayVisible)player.start();});return player;
    }catch(error){root.__gesePreviewInitializationError=String(error?.message||error);root.console?.error?.('[GESE_PREVIEW] initialization failed',error);const message=doc.getElementById?.('guidedPreviewStatus');if(message)message.textContent='Movement preview unavailable. Camera training is still available.';return null;}
  }
  function initialize(){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>bootstrap(),{once:true});else bootstrap();}
  if(typeof document!=='undefined')initialize();
  return Object.freeze({MODES,resolveDefinition,stepsFromDefinition:previewSteps,previewSteps,SequencePlayer,mount,bootstrap});
});
