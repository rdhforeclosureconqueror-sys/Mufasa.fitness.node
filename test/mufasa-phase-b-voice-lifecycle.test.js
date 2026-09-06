'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness({ muted=false, listening=true }={}) {
  const calls=[];
  const runtimeState={ muted, listening };
  const runtime={
    getState:()=>({ ...runtimeState }),
    activateVoice:async()=>{ runtimeState.muted=false; runtimeState.listening=true; calls.push('activate'); return {ok:true,listening:true}; },
    toggleMuted:()=>{ runtimeState.muted=!runtimeState.muted; if(runtimeState.muted) runtimeState.listening=false; calls.push(`toggle:${runtimeState.muted}`); return runtimeState.muted; },
    stopAllSpeech:(reason)=>{ calls.push(`stopSpeech:${reason}`); },
    startListening:()=>{ runtimeState.listening=true; calls.push('startListening'); return {ok:true,listening:true}; },
    setMuted:(value)=>{ runtimeState.muted=Boolean(value); if(value) runtimeState.listening=false; calls.push(`setMuted:${Boolean(value)}`); return runtimeState.muted; }
  };
  const scope={ CoachRuntime:runtime, setInterval:(fn)=>{ fn(); return {unref(){}}; }, clearInterval(){}, console };
  scope.globalThis=scope;
  const source=fs.readFileSync(path.join(__dirname,'../public/mufasa-voice-lifecycle.js'),'utf8');
  vm.runInNewContext(source,scope,{filename:'mufasa-voice-lifecycle.js'});
  scope.MufasaVoiceLifecycle.install();
  return { scope, runtime, runtimeState, calls };
}

test('calibration resumes Mufasa exactly when voice was listening beforehand',()=>{
  const h=harness({muted:false,listening:true});
  h.runtime.stopAllSpeech('avatar_calibration_acquire');
  h.runtimeState.listening=false;
  h.runtime.setMuted(false);
  const result=h.runtime.startListening();
  assert.equal(result.ok,true);
  assert.equal(h.calls.filter(x=>x==='startListening').length,1);
  assert.equal(h.scope.MufasaVoiceLifecycle.diagnostics().calibrationResumes,1);
});

test('calibration restores quiet state when voice was not active beforehand',()=>{
  const h=harness({muted:true,listening:false});
  h.runtime.stopAllSpeech('avatar_calibration_acquire');
  h.runtime.setMuted(false);
  const result=h.runtime.startListening();
  assert.equal(result.skipped,true);
  assert.equal(result.reason,'voice_not_active_before_calibration');
  assert.equal(h.runtimeState.listening,false);
  assert.equal(h.runtimeState.muted,true);
});

test('explicit user mute during calibration prevents post-calibration wake-word resume',()=>{
  const h=harness({muted:false,listening:true});
  h.runtime.stopAllSpeech('avatar_calibration_acquire');
  h.runtimeState.listening=false;
  const muted=h.runtime.toggleMuted();
  assert.equal(muted,true);
  const result=h.runtime.startListening();
  assert.equal(result.skipped,true);
  assert.equal(result.reason,'explicit_user_mute');
  assert.equal(h.scope.__POCKETPT_EXPLICIT_VOICE_MUTE__,true);
  assert.equal(h.runtimeState.listening,false);
});

test('Voice On during calibration is deferred and resumes after calibration',async()=>{
  const h=harness({muted:true,listening:false});
  h.runtime.stopAllSpeech('avatar_calibration_acquire');
  const activation=await h.runtime.activateVoice();
  assert.equal(activation.deferred,true);
  assert.equal(h.calls.includes('activate'),false);
  const result=h.runtime.startListening();
  assert.equal(result.ok,true);
  assert.equal(h.runtimeState.muted,false);
  assert.equal(h.scope.__POCKETPT_EXPLICIT_VOICE_MUTE__,false);
});

test('runtime config loads Phase B lifecycle controller',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../public/runtime-config.js'),'utf8');
  assert.match(source,/mufasa-voice-lifecycle\.js\?v=20260905-phase-b/);
  assert.match(source,/data-mufasa-voice-lifecycle/);
});
