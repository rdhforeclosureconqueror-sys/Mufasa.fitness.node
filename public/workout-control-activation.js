(function initWorkoutControlActivation(global) {
  "use strict";
  function visibleStatus(message, bad = false) { const target = global.document?.getElementById("poseStatus"); if (target) { target.textContent = message; target.classList?.toggle?.("status-bad", bad); } }
  function bindCamera() {
    const button = global.document?.getElementById("connectBtn"); if (!button || button.dataset.cameraActivationBound === "true") return false;
    button.dataset.cameraActivationBound = "true";
    button.onclick = function connectCameraFromGesture() { if (typeof global.WorkoutRuntime?.connectCamera !== "function") { visibleStatus("Camera setup is currently unavailable. Refresh and try again.", true); return false; } return global.WorkoutRuntime.connectCamera(); };
    return true;
  }
  function bindAvatarFallback() {
    const button = global.document?.getElementById("avatarCreateBtn"); if (!button || button.dataset.avatarActivationBound === "true") return false;
    button.dataset.avatarActivationBound = "true";
    button.onclick = function openAvatarSetupImmediately() {
      const modal = global.document?.getElementById("avatarModal"), status = global.document?.getElementById("avatarCreationStatus");
      if (!modal) { visibleStatus("Avatar setup is currently unavailable. Refresh and try again.", true); return false; }
      if (modal) modal.classList.remove("hidden");
      if (status) status.textContent = "Idle.";
      diagnostic("avatarDiagRuntime", "LOADING");
      Promise.resolve().then(() => global.AvatarRuntime?.ensureThreeModules?.()).then((runtime) => diagnostic("avatarDiagRuntime", runtime ? "MOUNTED" : "NOT ATTEMPTED")).catch((error) => { diagnostic("avatarDiagRuntime", "FAILED"); fail(error, "Optional avatar runtime failed; modal controls still work."); });
      return true;
    }; return true;
  }
  function diagnostic(id, value) { const node = global.document?.getElementById(id); if (node) node.textContent = value; }
  function fail(error, fallback) { diagnostic("avatarDiagError", String(error?.message || error || fallback)); }
  function formatBytes(bytes) { const value=Number(bytes)||0; return value < 1024 ? `${value} B` : value < 1048576 ? `${(value/1024).toFixed(1)} KB` : `${(value/1048576).toFixed(1)} MB`; }
  function bindAvatarModalControls() {
    const get=(id)=>global.document?.getElementById(id), modal=get("avatarModal"), close=get("closeAvatarModalBtn"), launch=get("launchAvaturnBtn"), file=get("avatarFileInput"), upload=get("uploadAvatarBtn"), save=get("saveAvatarBtn"), clear=get("clearAvatarBtn");
    if (!modal || !close || !launch || !file || !upload || !save || !clear) { diagnostic("avatarDiagControls", "FAILED"); fail(null,"Required modal control missing."); return false; }
    close.onclick=()=>{ modal.classList.add("hidden"); return true; };
    launch.onclick=()=>{ diagnostic("avatarDiagLaunch","OPENING"); let opened=null; try { opened=global.open?.("https://www.avaturn.me/","_blank"); } catch(error) { fail(error,"Avaturn could not open."); } if(opened){ diagnostic("avatarDiagLaunch","OPENED"); } else { diagnostic("avatarDiagLaunch","FAILED"); fail(null,"Avaturn could not open. Allow popups and retry."); } return Boolean(opened); };
    file.onchange=()=>{ const selected=file.files?.[0]; diagnostic("avatarDiagFile", selected ? `${selected.name} — ${formatBytes(selected.size)}${selected.type ? ` — ${selected.type}` : ""}` : "NONE"); diagnostic("avatarDiagUpload", selected ? "READY" : "IDLE"); };
    upload.onclick=async()=>{ if(upload.dataset.pending==="true") return false; upload.dataset.pending="true"; upload.disabled=true; diagnostic("avatarDiagUpload","UPLOADING"); diagnostic("avatarDiagError","NONE"); try { const result=await global.ProfileWriteRuntime?.uploadAvatarFile?.(); if(!result?.ok) throw new Error(result?.reason||"Upload did not complete."); diagnostic("avatarDiagUpload","SUCCESS"); return true; } catch(error) { diagnostic("avatarDiagUpload","FAILED"); fail(error,"Upload failed."); return false; } finally { upload.dataset.pending="false"; upload.disabled=false; } };
    save.onclick=async()=>{ diagnostic("avatarDiagProfile","SAVING"); try { const result=await global.ProfileWriteRuntime?.saveAvatarFromInputs?.(); if(!result?.ok) throw new Error(result?.reason||"Profile save failed."); diagnostic("avatarDiagProfile","SUCCESS"); return true; } catch(error) { diagnostic("avatarDiagProfile","FAILED"); fail(error,"Profile save failed."); return false; } };
    clear.onclick=async()=>{ diagnostic("avatarDiagProfile","SAVING"); try { const result=await global.ProfileWriteRuntime?.clearAvatarMetadata?.(); if(!result?.ok) throw new Error(result?.reason||"Remove failed."); diagnostic("avatarDiagProfile","SUCCESS"); return true; } catch(error) { diagnostic("avatarDiagProfile","FAILED"); fail(error,"Remove saved avatar failed."); return false; } };
    diagnostic("avatarDiagControls","READY"); return true;
  }
  function bind() { return { camera: bindCamera(), avatar: bindAvatarFallback(), avatarModal: bindAvatarModalControls() }; }
  if (global.document?.readyState === "loading") global.document.addEventListener("DOMContentLoaded", bind, { once: true }); else bind();
  global.WorkoutControlActivation = Object.freeze({ bind, bindCamera, bindAvatarFallback, bindAvatarModalControls });
})(window);
