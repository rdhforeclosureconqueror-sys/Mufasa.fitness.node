(function initWorkoutPerformanceRuntime(global) {
  'use strict';
  const BUILD = '20260724-focus2';
  const enabled = new URLSearchParams(global.location?.search || '').get('debugWorkoutPerformance') === '1';
  const counters = global.__workoutPerformance = global.__workoutPerformance || {
    build: BUILD, runtimeInitializations: 1, activeAnimationFrames: 0, activeIntervals: 0,
    activeTimeouts: 0, eventListeners: 0, domMutations: 0, cameraStreams: 0,
    poseInferenceCalls: 0, hudRenders: 0, timerUpdates: 0, voiceRequests: 0,
    abortedVoiceRequests: 0, sessionCompletionRequests: 0
  };
  global.__POCKET_PT_FOCUS_BUILD = BUILD;
  if (!enabled || counters.instrumented) return;
  counters.instrumented = true;
  const wrapScheduler = (setName, clearName, counter) => {
    const originalSet = global[setName]?.bind(global), originalClear = global[clearName]?.bind(global);
    if (!originalSet || !originalClear) return;
    const live = new Set();
    global[setName] = (callback, delay, ...args) => {
      let id;
      const wrapped = (...cbArgs) => { if (setName === 'setTimeout') { live.delete(id); counters[counter] = live.size; } return callback(...cbArgs); };
      id = originalSet(wrapped, delay, ...args); live.add(id); counters[counter] = live.size; return id;
    };
    global[clearName] = (id) => { live.delete(id); counters[counter] = live.size; return originalClear(id); };
  };
  wrapScheduler('setTimeout', 'clearTimeout', 'activeTimeouts');
  wrapScheduler('setInterval', 'clearInterval', 'activeIntervals');
  if (global.requestAnimationFrame && global.cancelAnimationFrame) {
    const raf = global.requestAnimationFrame.bind(global), caf = global.cancelAnimationFrame.bind(global), live = new Set();
    global.requestAnimationFrame = (callback) => { let id; id = raf((at) => { live.delete(id); counters.activeAnimationFrames = live.size; callback(at); }); live.add(id); counters.activeAnimationFrames = live.size; return id; };
    global.cancelAnimationFrame = (id) => { live.delete(id); counters.activeAnimationFrames = live.size; return caf(id); };
  }
  const originalAdd = global.EventTarget?.prototype?.addEventListener;
  if (originalAdd) global.EventTarget.prototype.addEventListener = function(type, listener, options) { counters.eventListeners += 1; return originalAdd.call(this, type, listener, options); };
  const observer = global.MutationObserver && global.document ? new global.MutationObserver((items) => { counters.domMutations += items.length; }) : null;
  observer?.observe(global.document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  const marker = global.document?.createElement?.('output');
  if (marker) { marker.id = 'workoutBuildMarker'; marker.textContent = `Workout build: ${BUILD}`; marker.style.cssText = 'position:fixed;z-index:2147483647;right:4px;bottom:4px;padding:4px 7px;background:#052e16;color:#dcfce7;font:12px monospace;border:1px solid #22c55e'; global.document.body?.appendChild(marker); }
  global.setInterval(() => console.info('[WORKOUT_PERF]', { ...counters }), 5000);
  console.info('[WORKOUT_PERF] instrumentation active', { build: BUILD });
})(typeof window !== 'undefined' ? window : globalThis);
