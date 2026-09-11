(function(window,document){"use strict";
if(window.__POCKETPT_GYM_COMPATIBILITY_ENTRY__)return;
window.__POCKETPT_GYM_COMPATIBILITY_ENTRY__=true;
var initializeButton=document.getElementById("initializeRuntime"),initializeWasDisabled=initializeButton?.disabled===true;
if(initializeButton)initializeButton.disabled=true;
function failure(firstFailure,source,detail){window.PocketPTMotionLabGymCompatibilityEntryFailure=Object.freeze({firstFailure:firstFailure,source:source,detail:detail});}
function loadIntegration(){var n=document.createElement("script");n.src="/dev/motion-lab-assets/motion-lab-gym-compatibility-integration.js";n.async=false;n.dataset.motionLabGymCompatibilityEntry="true";n.onerror=function(){failure("GYM_COMPATIBILITY_INTEGRATION_SCRIPT",n.src,"integration entrypoint failed to load");};document.head.appendChild(n);}
function installRuntimeAssignmentGuard(){
  if(window.__POCKETPT_RETARGET_RUNTIME_ASSIGNMENT_GUARD__)return true;
  var policy=window.PocketPTRetargetMotionCompatibility;
  if(!policy?.installRuntime)return false;
  var descriptor=Object.getOwnPropertyDescriptor(window,"PocketPTDisposableMotionSession");
  if(descriptor&&!descriptor.configurable)return false;
  var current=window.PocketPTDisposableMotionSession;
  Object.defineProperty(window,"PocketPTDisposableMotionSession",{configurable:true,enumerable:true,get:function(){return current;},set:function(value){current=value?.createMotionSession?(policy.installRuntime(value)||value):value;}});
  if(current?.createMotionSession)window.PocketPTDisposableMotionSession=current;
  window.__POCKETPT_RETARGET_RUNTIME_ASSIGNMENT_GUARD__=true;
  return true;
}
var safety=document.createElement("script");
safety.src="/dev/motion-lab-assets/retarget-motion-compatibility.js";
safety.async=false;
safety.dataset.motionLabRetargetSafety="true";
safety.onload=function(){
  if(!installRuntimeAssignmentGuard()){failure("RETARGET_COMPATIBILITY_ASSIGNMENT_GUARD",safety.src,"retarget runtime assignment guard could not be installed");return;}
  if(initializeButton)initializeButton.disabled=initializeWasDisabled;
  loadIntegration();
};
safety.onerror=function(){failure("RETARGET_COMPATIBILITY_POLICY",safety.src,"retarget compatibility policy failed to load; Motion Lab initialization remains blocked to prevent unsafe Thriller playback");};
document.head.appendChild(safety);
})(window,document);
