(function (window, document) { "use strict";
  var loaded = false, boundary = null, currentStage = "idle";
  var diagnostics = { status:"idle", stage:"idle", source:null, code:null, message:null, attempts:0, updatedAt:null };

  function publish(patch) {
    diagnostics = Object.assign({}, diagnostics, patch, { updatedAt:new Date().toISOString() });
    window.PocketPTMotionLabBootstrapDiagnostics = Object.freeze({ snapshot:function(){ return Object.freeze(Object.assign({}, diagnostics)); } });
  }

  function withRetryToken(src) { var separator = src.indexOf("?") >= 0 ? "&" : "?"; return src + separator + "motion_lab_retry=" + Date.now(); }
  function script(src) {
    return new Promise(function(resolve,reject){
      var attempt = 0;
      function load(url) {
        attempt += 1;
        publish({ status:"loading", stage:currentStage, source:src, code:null, message:null, attempts:attempt });
        var node=document.createElement("script");
        node.src=url; node.async=false;
        node.onload=function(){ publish({ status:"loaded", stage:currentStage, source:src, attempts:attempt }); resolve(); };
        node.onerror=function(){
          node.remove();
          if (attempt === 1) { load(withRetryToken(src)); return; }
          var error=new Error("Motion Lab dependency failed to load: "+src);
          error.code="dependency_load_failed"; error.stage=currentStage; error.source=src; error.attempts=attempt; reject(error);
        };
        document.head.appendChild(node);
      }
      load(src);
    });
  }
  async function loadDependency(stage, src) { currentStage=stage; return script(src); }
  function failureText(error) {
    var code=error?.code||"runtime_failed"; var stage=error?.stage||currentStage||"unknown"; var source=error?.source||error?.moduleUrl||error?.dependency||"unknown";
    return "Motion Lab runtime unavailable ("+code+").\nFirst failing stage: "+stage+"\nSource: "+source;
  }
  function installAuthoringDraftStore() {
    var out=window.PocketPTMotionLabAuthoringDraftStore?.install?.();
    if (!out?.saveDraft) {
      var error=new Error("Motion Lab authoring draft store failed to install");
      error.code="motion_lab_authoring_draft_store_install_failed";
      error.stage="authoring_draft_store_install";
      error.source="PocketPTMotionLabAuthoringDraftStore.install";
      throw error;
    }
    return out;
  }

  async function initialize() {
    if (loaded) {
      var existing=window.MotionLabRuntime?.initialize();
      window.PocketPTMotionLabInspection?.wireButtons?.();
      window.PocketPTMotionLabPoseEditor?.wireUi?.();
      window.PocketPTMotionLabPhaseAuthoring?.install?.();
      installAuthoringDraftStore();
      window.PocketPTMotionLabLungePreview?.wire?.();
      window.PocketPTMotionIntelligenceDiagnostics?.render?.();
      window.PocketPTMotionLabDiagnosticConsolidator?.refresh?.();
      return existing;
    }
    document.getElementById("initializeRuntime").disabled=true;
    publish({status:"starting",stage:"bootstrap",source:null,code:null,message:null,attempts:0});
    try {
      await loadDependency("motion_viewer_contract","/dev/motion-lab-assets/motion-viewer-contract.js");
      await loadDependency("motion_viewer_boundary","/dev/motion-lab-assets/motion-viewer-boundary.js");
      await loadDependency("shared_3d_loader","/dev/motion-lab-assets/shared3d-loader.js");
      await loadDependency("phase_e_assets","/dev/motion-lab-assets/phase-e-assets.js");
      await loadDependency("avatar_profiles","/dev/motion-lab-assets/avatar-profiles.js");
      await loadDependency("push_up_fixture","/dev/motion-lab-assets/avaturn-push-up-fixture.js");
      await loadDependency("push_up_motion_spec","/dev/motion-lab-assets/push-up-motion-spec.js");
      await loadDependency("squat_motion_spec","/dev/motion-lab-assets/squat-motion-spec.js");
      await loadDependency("lunge_motion_spec","/dev/motion-lab-assets/lunge-motion-spec.js");
      await loadDependency("avatar_motion_intelligence_core","/dev/motion-lab-assets/avatar-motion-intelligence-core.js");
      await loadDependency("motion_lab_intelligence_adapter","/dev/motion-lab-assets/motion-lab-intelligence-adapter.js");
      await loadDependency("motion_lab_authoring_adapter","/dev/motion-lab-assets/motion-lab-authoring-adapter.js");
      await loadDependency("motion_spec_clip","/dev/motion-lab-assets/motion-spec-clip.js");
      await loadDependency("motion_intelligence_diagnostics","/dev/motion-lab-assets/motion-lab-intelligence-diagnostics.js");
      await loadDependency("disposable_motion_session","/dev/motion-lab-assets/disposable-motion-session.js");
      await loadDependency("motion_spec_playback_policy","/dev/motion-lab-assets/motion-spec-playback-policy.js");
      currentStage="motion_spec_playback_policy_install";
      var playbackRuntime=window.PocketPTMotionSpecPlaybackPolicy?.install?.(window.PocketPTDisposableMotionSession);
      if (!playbackRuntime?.createMotionSession || playbackRuntime.__motionSpecPlaybackPolicyInstalled !== true) {
        var playbackError=new Error("Motion Spec playback policy failed to install"); playbackError.code="motion_spec_playback_policy_install_failed"; playbackError.stage=currentStage; playbackError.source="PocketPTMotionSpecPlaybackPolicy.install"; throw playbackError;
      }
      window.PocketPTDisposableMotionSession=playbackRuntime;
      await loadDependency("rest_pose_guard","/dev/motion-lab-assets/motion-lab-rest-pose-guard.js");
      currentStage="rest_pose_guard_install";
      var guardedRuntime=window.PocketPTMotionLabRestPoseGuard?.install?.(window.PocketPTDisposableMotionSession);
      if (!guardedRuntime?.createMotionSession || guardedRuntime.__restPoseGuardInstalled !== true) {
        var guardError=new Error("Rest-pose guard failed to produce a guarded motion runtime"); guardError.code="rest_pose_guard_install_failed"; guardError.stage=currentStage; guardError.source="PocketPTMotionLabRestPoseGuard.install"; throw guardError;
      }
      window.PocketPTDisposableMotionSession=guardedRuntime;
      await loadDependency("inspection_controls","/dev/motion-lab-assets/motion-lab-inspection-controls.js");
      await loadDependency("pose_editor","/dev/motion-lab-assets/motion-lab-pose-editor.js");
      currentStage="pose_editor_install";
      var poseEditor=window.PocketPTMotionLabPoseEditor?.install?.(window.PocketPTDisposableMotionSession);
      if (!poseEditor?.exportAdjustment || !poseEditor?.importAdjustment || window.PocketPTDisposableMotionSession?.__poseEditorInstalled !== true) {
        var poseEditorError=new Error("Motion Lab pose editor failed to install"); poseEditorError.code="motion_lab_pose_editor_install_failed"; poseEditorError.stage=currentStage; poseEditorError.source="PocketPTMotionLabPoseEditor.install"; throw poseEditorError;
      }
      currentStage="authoring_draft_store_install";
      installAuthoringDraftStore();
      await loadDependency("phase_authoring","/dev/motion-lab-assets/motion-lab-phase-authoring.js");
      currentStage="phase_authoring_install";
      var phaseAuthoring=window.PocketPTMotionLabPhaseAuthoring?.install?.();
      if (!phaseAuthoring?.samplePhase) {
        var phaseAuthoringError=new Error("Exact phase authoring failed to install"); phaseAuthoringError.code="motion_lab_phase_authoring_install_failed"; phaseAuthoringError.stage=currentStage; phaseAuthoringError.source="PocketPTMotionLabPhaseAuthoring.install"; throw phaseAuthoringError;
      }
      await loadDependency("adjusted_preview_persistence","/dev/motion-lab-assets/motion-lab-adjusted-preview-persistence.js");
      currentStage="adjusted_preview_persistence_install";
      var persistentRuntime=window.PocketPTMotionLabAdjustedPreviewPersistence?.install?.(window.PocketPTDisposableMotionSession);
      if (!persistentRuntime?.createMotionSession || persistentRuntime.__adjustedPreviewPersistenceInstalled !== true) {
        var persistenceError=new Error("Adjusted preview persistence failed to install"); persistenceError.code="motion_lab_adjusted_preview_persistence_install_failed"; persistenceError.stage=currentStage; persistenceError.source="PocketPTMotionLabAdjustedPreviewPersistence.install"; throw persistenceError;
      }
      window.PocketPTDisposableMotionSession=persistentRuntime;
      await loadDependency("motion_lab_runtime","/dev/motion-lab-runtime.js");
      await loadDependency("diagnostic_consolidator","/dev/motion-lab-assets/motion-lab-diagnostic-consolidator.js");
      currentStage="diagnostic_consolidator_install";
      var diagnosticConsolidator=window.PocketPTMotionLabDiagnosticConsolidator?.install?.();
      if (!diagnosticConsolidator?.combinedDiagnosticsText) {
        var diagnosticError=new Error("Motion Lab canonical diagnostic consolidator failed to install"); diagnosticError.code="motion_lab_diagnostic_consolidator_install_failed"; diagnosticError.stage=currentStage; diagnosticError.source="PocketPTMotionLabDiagnosticConsolidator.install"; throw diagnosticError;
      }
      await loadDependency("lunge_preview","/dev/motion-lab-assets/motion-lab-lunge-preview.js");

      currentStage="boundary_create";
      boundary=window.MotionViewerBoundary.create({enabled:true,descriptor:{exerciseId:"motion-lab-primitive"},root:document.getElementById("viewer"),
        view:{show:function(){},viewerRoot:function(){return document.getElementById("viewer");}},
        loadViewer:async function(){return {createSession:function(){return {mount:async function(root){currentStage="runtime_mount"; window.MotionLabRuntime.mount(root);return {status:"ready"};},dispose:function(){window.MotionLabRuntime.dispose();}};}};}});
      currentStage="boundary_mount"; boundary.mount();
      currentStage="boundary_retry"; await boundary.retry();
      if (boundary.getStatus?.() !== "ready") {
        var boundaryError=new Error("Motion viewer boundary did not reach ready state"); boundaryError.code="motion_viewer_boundary_failed"; boundaryError.stage="boundary_retry"; boundaryError.source="MotionViewerBoundary"; throw boundaryError;
      }
      currentStage="runtime_initialize";
      var initialized=window.MotionLabRuntime.initialize();
      if (initialized && initialized.status === "failed") {
        var initError=new Error(initialized.message||initialized.code||"Motion Lab runtime initialization failed"); initError.code=initialized.code||"runtime_failed"; initError.stage=currentStage; initError.source=initialized.dependency||initialized.moduleUrl||"MotionLabRuntime.initialize"; throw initError;
      }
      loaded=true;
      window.PocketPTMotionLabInspection?.wireButtons?.();
      window.PocketPTMotionLabPoseEditor?.wireUi?.();
      window.PocketPTMotionLabPhaseAuthoring?.install?.();
      installAuthoringDraftStore();
      window.PocketPTMotionLabLungePreview?.wire?.();
      window.PocketPTMotionIntelligenceDiagnostics?.render?.();
      window.PocketPTMotionLabDiagnosticConsolidator?.refresh?.();
      publish({status:"ready",stage:"ready",source:null,code:null,message:null});
      window.PocketPTMotionLabDiagnosticConsolidator?.refresh?.();
    } catch (error) {
      loaded=false;
      document.getElementById("initializeRuntime").disabled=false;
      publish({status:"failed",stage:error?.stage||currentStage,source:error?.source||error?.moduleUrl||error?.dependency||null,code:error?.code||"runtime_failed",message:error?.message||String(error),attempts:error?.attempts||diagnostics.attempts});
      document.getElementById("viewer").textContent=failureText(error);
      window.PocketPTMotionIntelligenceDiagnostics?.render?.();
      window.PocketPTMotionLabDiagnosticConsolidator?.refresh?.();
      console.error("[MOTION_LAB_BOOTSTRAP]",window.PocketPTMotionLabBootstrapDiagnostics.snapshot(),error);
    }
  }
  document.getElementById("initializeRuntime").addEventListener("click",initialize);
  window.addEventListener("pagehide",function(){boundary?.unmount();},{once:true});
  publish({status:"idle",stage:"idle"});
})(window,document);
