const test=require('node:test');
const assert=require('node:assert/strict');

function fresh(){const p=require.resolve('../public/motion/live-avatar-mirror');delete require.cache[p];return require(p);}

test('CoachRuntime remains the sole fallback authority during calibration',async()=>{
  let browserFallbackCalls=0;
  global.speechSynthesis={speak(){browserFallbackCalls++;},cancel(){}};
  global.SpeechSynthesisUtterance=function(){};
  global.CoachRuntime={
    getState:()=>({muted:false,listening:false}),
    speak:async()=>({ok:false,reason:'browser_fallback_failed',backendReason:'backend_failed'})
  };
  const api=fresh();
  const arbiter=new api.AvatarCalibrationSpeechArbiter({duplicateWindowMs:0});
  const result=await arbiter.queue('Hold still.');
  assert.equal(result.ok,false);
  assert.equal(browserFallbackCalls,0);
  assert.equal(arbiter.diagnostics().directFallbackCalls,0);
  delete global.CoachRuntime;delete global.speechSynthesis;delete global.SpeechSynthesisUtterance;
});

test('calibration voice activation suspends Mufasa recognition instead of starting it',async()=>{
  const calls=[];
  let listening=true;
  global.CoachRuntime={
    getState:()=>({muted:false,listening}),
    stopAllSpeech:(reason)=>calls.push(`stopSpeech:${reason}`),
    stopListening:()=>{calls.push('stopListening');listening=false;},
    setMuted:(value)=>calls.push(`muted:${value}`),
    unlockAudioOnce:async()=>{calls.push('unlock');return true;},
    startListening:()=>{calls.push('startListening');listening=true;return{ok:true};}
  };
  const api=fresh();
  const result=await api.activateCanonicalCoachVoice();
  assert.equal(result.ok,true);
  assert.equal(result.calibrationExclusive,true);
  assert.ok(calls.includes('stopListening'));
  assert.equal(calls.includes('startListening'),false);
  delete global.CoachRuntime;
});

test('Mufasa recognition resumes through the explicit post-calibration handoff',async()=>{
  let starts=0;
  global.__POCKETPT_EXPLICIT_VOICE_MUTE__=false;
  global.CoachRuntime={getState:()=>({muted:false,listening:false}),startListening:()=>{starts++;return{ok:true};}};
  const api=fresh();
  const result=await api.resumeCanonicalCoachVoice();
  assert.equal(result.ok,true);
  assert.equal(starts,1);
  delete global.CoachRuntime;delete global.__POCKETPT_EXPLICIT_VOICE_MUTE__;
});

test('explicit voice mute prevents post-calibration Mufasa resume',async()=>{
  let starts=0;
  global.__POCKETPT_EXPLICIT_VOICE_MUTE__=true;
  global.CoachRuntime={getState:()=>({muted:true,listening:false}),startListening:()=>{starts++;return{ok:true};}};
  const api=fresh();
  const result=await api.resumeCanonicalCoachVoice();
  assert.equal(result.reason,'coach_runtime_muted');
  assert.equal(starts,0);
  delete global.CoachRuntime;delete global.__POCKETPT_EXPLICIT_VOICE_MUTE__;
});
