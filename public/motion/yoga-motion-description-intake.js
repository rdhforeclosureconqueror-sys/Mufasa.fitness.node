(function (window, document) {
  "use strict";

  const STORAGE_KEY = "pocketpt.motionGenerationRequest.v1";
  const TEMPLATE_URL = "/dev/motion-lab-assets/yoga/motion-description-template.v1.json";
  const REGISTRY_URL = "/dev/motion-lab-assets/yoga/beginner-flow-motion-descriptions.v1.json";
  const REQUIRED = ["exerciseId","displayName","source","startState","targetShape","segmentRelationships","supports","trajectory","orientation","timing","transitionIn","transitionOut","visualAcceptance"];

  function stage(id, label, status, detail) {
    return Object.freeze({ id, label, status, detail: detail || "" });
  }

  function validateDescription(description) {
    const missing = REQUIRED.filter(key => description?.[key] == null || (Array.isArray(description[key]) && description[key].length === 0));
    return Object.freeze({ valid: missing.length === 0, missing: Object.freeze(missing) });
  }

  function buildGenerationRequest(description) {
    const validation = validateDescription(description);
    if (!validation.valid) return Object.freeze({ status:"failed", code:"DESCRIPTION_TEMPLATE_INVALID", validation });
    return Object.freeze({
      schemaVersion:1,
      requestType:"motion-description-to-draft",
      source:Object.freeze({ ...description.source }),
      exerciseId:description.exerciseId,
      displayName:description.displayName,
      description,
      generationContract:Object.freeze({
        targetAvatarRole:"coach",
        targetSkeletonProfile:"avaturn-native-v1",
        generationMode:"phase-first-semantic-draft",
        autoplay:false,
        humanVisualAcceptanceRequired:true,
        preserveDescriptionAsAuthority:true
      })
    });
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache:"no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status} loading ${url}`);
    return response.json();
  }

  function readStoredRequest() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
    catch (_) { return null; }
  }

  function firstFailure(stages) {
    return stages.find(item => item.status === "FAIL") || null;
  }

  function renderPanel(model) {
    let panel = document.getElementById("yogaMotionIntakePanel");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "yogaMotionIntakePanel";
      const main = document.querySelector("main");
      const header = main?.querySelector("header");
      if (main) main.insertBefore(panel, header?.nextSibling || main.firstChild);
    }
    const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
    const failure = firstFailure(model.stages);
    panel.innerHTML = `<h2>Yoga Motion Description Intake</h2>
      <p class="measurement"><strong>Source:</strong> ${esc(model.description?.displayName || "none")} · ${esc(model.sessionId || "—")}</p>
      <p class="measurement"><strong>First failure:</strong> ${failure ? `${esc(failure.label)} — ${esc(failure.detail)}` : "NONE IN INTAKE"}</p>
      <div class="grid"><div><h3>Pipeline</h3><table><thead><tr><th>Boundary</th><th>Status</th><th>Detail</th></tr></thead><tbody>${model.stages.map(item=>`<tr><td>${esc(item.label)}</td><td>${esc(item.status)}</td><td>${esc(item.detail)}</td></tr>`).join("")}</tbody></table></div>
      <div><h3>Generation description</h3><textarea id="yogaMotionDescriptionOutput" rows="16" readonly>${esc(JSON.stringify(model.description || {}, null, 2))}</textarea><div class="controls"><button id="copyYogaMotionDescription">Copy Description</button><button id="emitYogaMotionGeneration" ${model.generationRequest ? "" : "disabled"}>Send to Motion Generator</button></div><p id="yogaMotionIntakeStatus" class="measurement" role="status">${model.generationRequest ? "Description is valid and ready for the Motion Spec generation boundary." : "Description intake is not ready."}</p></div></div>`;
    panel.querySelector("#copyYogaMotionDescription")?.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(JSON.stringify(model.description || {}, null, 2)); } catch (_) {}
    });
    panel.querySelector("#emitYogaMotionGeneration")?.addEventListener("click", () => {
      if (!model.generationRequest) return;
      window.dispatchEvent(new CustomEvent("pocketpt:motion-generation-request", { detail:model.generationRequest }));
      const status = panel.querySelector("#yogaMotionIntakeStatus");
      if (status) status.textContent = "Generation request emitted. Motion Lab generator/adapter should now convert this description into a draft Motion Spec; diagnostics must report the first downstream failure.";
    });
  }

  async function loadFromNavigation() {
    const params = new URLSearchParams(location.search);
    if (params.get("motionSource") !== "yoga") return Object.freeze({ status:"ignored" });
    const sessionId = params.get("session") || "";
    const poseId = params.get("pose") || "";
    const stages = [];
    let stored = readStoredRequest();
    stages.push(stage("handoff","Yoga handoff", stored ? "PASS" : "FAIL", stored ? "stored request found" : "no stored generation request"));

    let template = null, registry = null;
    try { [template, registry] = await Promise.all([fetchJson(TEMPLATE_URL), fetchJson(REGISTRY_URL)]); stages.push(stage("resources","Description resources","PASS","template + beginner-flow registry loaded")); }
    catch (error) { stages.push(stage("resources","Description resources","FAIL",error.message)); renderPanel({ sessionId, poseId, description:stored?.description || null, generationRequest:null, stages }); return Object.freeze({ status:"failed", code:"DESCRIPTION_RESOURCES_UNAVAILABLE" }); }

    const description = (stored?.description?.exerciseId === poseId && stored?.description?.source?.sessionId === sessionId)
      ? stored.description
      : (registry.descriptions || []).find(item => item.exerciseId === poseId && item.source?.sessionId === sessionId);
    stages.push(stage("description","Pose description", description ? "PASS" : "FAIL", description ? `${description.displayName} resolved` : `no description for ${sessionId}/${poseId}`));

    const validation = validateDescription(description);
    stages.push(stage("template","Template validation", validation.valid ? "PASS" : "FAIL", validation.valid ? `${template.templateId} required fields satisfied` : `missing: ${validation.missing.join(", ")}`));
    const generationRequest = validation.valid ? buildGenerationRequest(description) : null;
    stages.push(stage("request","Generation request", generationRequest?.status === "failed" ? "FAIL" : generationRequest ? "PASS" : "BLOCKED", generationRequest ? "phase-first semantic draft request built" : "waiting for valid description"));
    stages.push(stage("generator","Motion Spec generator","PENDING","downstream generator must translate description semantics into a canonical draft Motion Spec"));
    stages.push(stage("coach","Coach Avatar","PENDING","load/retain personalized Coach Avatar after draft generation"));
    stages.push(stage("compile","Compile / bind","PENDING","compile generated draft against Coach skeleton; fail closed on unbound/ambiguous targets"));
    stages.push(stage("playback","Playable demo","PENDING","Play enabled only after successful compilation"));

    const model = Object.freeze({ sessionId, poseId, description, generationRequest, stages:Object.freeze(stages) });
    renderPanel(model);
    if (generationRequest) window.dispatchEvent(new CustomEvent("pocketpt:motion-description-ready", { detail:generationRequest }));
    return Object.freeze({ status:generationRequest ? "ready" : "failed", model });
  }

  window.PocketPTYogaMotionDescriptionIntake = Object.freeze({ STORAGE_KEY, REQUIRED:Object.freeze(REQUIRED.slice()), validateDescription, buildGenerationRequest, loadFromNavigation });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadFromNavigation, { once:true });
  else loadFromNavigation();
})(window, document);
