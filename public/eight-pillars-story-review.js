(() => {
"use strict";
const el = id => document.getElementById(id);
const week = el("week"), title = el("title"), story = el("story"), status = el("status");
let stories = [], index = 0, generation = 0, paused = false, playing = false;
let activeAudio = null, activeUrl = null, aborter = null;
const cache = new Map(); // Only this page session; permanent audio storage is separate.
function cleanupAudio() {
  if (aborter) { aborter.abort(); aborter = null; }
  if (activeAudio) { activeAudio.pause(); activeAudio.removeAttribute("src"); activeAudio.load(); activeAudio = null; }
  if (activeUrl) { URL.revokeObjectURL(activeUrl); activeUrl = null; }
}
function stop() { generation++; paused = false; playing = false; cleanupAudio(); status.textContent = "Stopped."; }
function show(i) {
  stop(); index = Math.max(0, Math.min(stories.length - 1, i)); const s = stories[index];
  if (!s) return;
  week.value = String(index); title.textContent = "Week " + s.week + " · " + s.title;
  story.replaceChildren();
  s.story.split(/\\n\\s*\\n/).filter(Boolean).forEach(t => { const p=document.createElement("p"); p.textContent=t; story.append(p); });
  el("prev").disabled = index===0; el("next").disabled = index===stories.length-1;
  history.replaceState(null,"","#week-"+s.week);
}
function speechChunks(text) {
  const chunks = []; let remaining = text.trim();
  while (remaining) {
    if (remaining.length <= 950) { chunks.push(remaining); break; }
    let cut = remaining.lastIndexOf(". ", 950);
    if (cut < 350) cut = remaining.lastIndexOf(" ", 950);
    if (cut < 1) cut = 950; else if (remaining.slice(cut,cut+2)===". ") cut++;
    chunks.push(remaining.slice(0,cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  return chunks;
}
async function read() {
  const token = ++generation;
  cleanupAudio(); paused = false; playing = true;
  const authToken = window.AuthStateRuntime?.getAuthToken?.();
  if (!authToken) {
    playing = false;
    status.textContent = "Sign in to your Milele Fit account to use the AI narrator.";
    return;
  }
  const origin = (window.RuntimeState?.getBackendOrigin?.() || window.MAAT_BACKEND_ORIGIN || location.origin).replace(/\\/$/, "");
  const selected = stories[index];
  const chunks = speechChunks(selected.story);
  status.textContent = "Connecting to Milele Fit AI voice…";
  try {
    for (let i=0; i<chunks.length; i++) {
      if (token !== generation) return;
      const key = selected.week + ":" + chunks[i];
      let blob = cache.get(key);
      if (!blob) {
        aborter = new AbortController();
        const response = await fetch(origin + "/api/speak", {
          method:"POST",
          headers:{"content-type":"application/json", authorization:"Bearer " + authToken},
          body:JSON.stringify({text:chunks[i],format:"mp3"}),
          signal:aborter.signal
        });
        if (!response.ok) throw new Error("AI voice request failed (" + response.status + ")");
        if (!(response.headers.get("content-type") || "").toLowerCase().startsWith("audio/")) throw new Error("AI voice returned no audio.");
        blob = await response.blob();
        if (token !== generation) return;
        cache.set(key,blob);
      }
      activeUrl = URL.createObjectURL(blob);
      activeAudio = new Audio(activeUrl);
      status.textContent = "AI narrator playing · section " + (i+1) + " of " + chunks.length;
      await new Promise((resolve,reject)=>{
        activeAudio.onended = resolve;
        activeAudio.onerror = () => reject(new Error("Audio playback failed."));
        activeAudio.play().catch(reject);
      });
      if (token !== generation) return;
      activeAudio.removeAttribute("src"); activeAudio.load(); activeAudio=null;
      URL.revokeObjectURL(activeUrl); activeUrl=null;
    }
    if (token===generation) status.textContent="Finished listening.";
  } catch(error) {
    if (token===generation) status.textContent = error.name === "NotAllowedError"
      ? "Tap Play again to allow audio on this device."
      : "AI voice unavailable: " + String(error.message || error).slice(0,140);
  } finally {
    if (token===generation) { playing=false; paused=false; cleanupAudio(); }
  }
}
el("play").addEventListener("click",()=>{
  if (paused && activeAudio) { activeAudio.play().then(()=>{paused=false;status.textContent="AI narrator resumed.";}).catch(()=>{status.textContent="Could not resume playback.";});return; }
  if (!playing) read();
});
el("pause").addEventListener("click",()=>{
  if (!activeAudio || !playing) return;
  if (paused) { activeAudio.play().then(()=>{paused=false;status.textContent="AI narrator resumed.";}).catch(()=>{}); }
  else { activeAudio.pause(); paused=true; status.textContent="AI narrator paused."; }
});
el("stop").addEventListener("click",stop);
el("prev").addEventListener("click",()=>show(index-1));
el("next").addEventListener("click",()=>show(index+1));
week.addEventListener("change",()=>show(Number(week.value)));
window.addEventListener("pagehide",stop);
fetch("/eight-pillars-review-stories.json").then(r=>{if(!r.ok)throw Error("Story data unavailable");return r.json();}).then(data=>{
 stories=(data.stories||[]).filter(s=>typeof s.story==="string"&&typeof s.title==="string");
 if(!stories.length)throw Error("No stories available");
 stories.forEach((s,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent="Week "+s.week+" — "+s.title;week.append(o);});
 const match=location.hash.match(/^#week-([1-8])$/);show(match?Number(match[1])-1:0);

}).catch(e=>{title.textContent="Stories unavailable";status.textContent=e.message;el("play").disabled=true;});
})();