(() => {
"use strict";
const el = id => document.getElementById(id);
const week = el("week"), title = el("title"), story = el("story"), status = el("status");
let stories = [], index = 0, generation = 0, paused = false, playing = false;
let activeAudio = null, activeUrl = null, aborter = null;

const JOURNEY_KEY="milele-eight-pillars-start-v1";
let startDate=null, selectedDay=1, dayText="";
try{const saved=localStorage.getItem(JOURNEY_KEY);if(/^\d{4}-\d{2}-\d{2}$/.test(saved||""))startDate=saved;}catch{}
function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");}
function journeyDay(){if(!startDate)return 0;return Math.max(1,Math.min(56,Math.floor((Date.parse(today()+"T12:00:00")-Date.parse(startDate+"T12:00:00"))/86400000)+1));}
function chapters(full){
 const markers=[...full.matchAll(/The (First|Second|Third|Fourth|Fifth|Sixth|Seventh) Bridge\s*[—–-]\s*[^\n]+/g)];
 if(markers.length!==7)return null;
 return markers.map((m,i)=>full.slice(i===0?0:m.index,i===6?full.length:markers[i+1].index).trim());
}
function updateJourney(){
 const day=journeyDay(),active=day>0;
 el("startJourney").hidden=active;
 el("journeyInfo").textContent=active?"Journey active · Day "+day+" of 56":"Your journey has not started. Press Start My Journey when you're ready for Day One.";
 el("dayPicker").hidden=!active;
 if(!active)return;
 const max=Math.min(7,(day-1)%7+1);
 el("dayPicker").replaceChildren();
 for(let i=1;i<=7;i++){const o=document.createElement("option");o.value=String(i);o.textContent="Day "+i+(i>max?" · locked":"");o.disabled=i>max;el("dayPicker").append(o);}
 selectedDay=Math.min(selectedDay,max);el("dayPicker").value=String(selectedDay);
}
el("startJourney").addEventListener("click",()=>{if(startDate)return;startDate=today();try{localStorage.setItem(JOURNEY_KEY,startDate);}catch{}selectedDay=1;show(index);});
el("dayPicker").addEventListener("change",()=>{selectedDay=Number(el("dayPicker").value);show(index);});

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
  const active=journeyDay()>0, currentWeek=Math.floor((journeyDay()-1)/7)+1;
  const parts=chapters(s.story);
  dayText=active && s.week===currentWeek && parts ? parts[selectedDay-1] : "";
  if(dayText)dayText.split(/\n\s*\n/).filter(Boolean).forEach(t=>{const p=document.createElement("p");p.textContent=t;story.append(p);});
  else {const p=document.createElement("p");p.textContent=!active?"Start your journey to unlock Day One.":s.week!==currentWeek?"This is not your current journey week. You can read the complete story below.":"Daily chapters require the original seven-part manuscript.";story.append(p);}
  el("play").disabled=!dayText;
  el("fullStory").textContent=s.story;
  el("fullStoryPanel").open=false;
  updateJourney();
  el("prev").disabled = index===0; el("next").disabled = index===stories.length-1;
  history.replaceState(null,"","#week-"+s.week);
  prepareSections();
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
let chunkIndex = 0, currentChunks = [], activeWeek = null;
function updateSectionControls() {
  const total = currentChunks.length;
  el("sectionPrev").disabled = !total || chunkIndex <= 0;
  el("sectionNext").disabled = !total || chunkIndex >= total - 1;
  el("sectionPosition").textContent = total ? "Section " + (chunkIndex + 1) + " of " + total : "Choose a story to begin";
}
function prepareSections(reset = true) {
  const selected = stories[index];
  if (!selected) return;
  if (activeWeek !== selected.week || reset) {
    currentChunks = speechChunks(dayText);
    chunkIndex = 0;
    activeWeek = selected.week;
  }
  updateSectionControls();
}
async function playSection() {
  const token = ++generation;
  cleanupAudio(); paused = false; playing = true;
  const authToken = window.AuthStateRuntime?.getAuthToken?.();
  if (!authToken) { playing = false; status.textContent = "Sign in to Milele Fit to use the AI narrator."; return; }
  const selected = stories[index];
  if (!selected || !dayText) { playing = false; status.textContent="Start the journey and select an available daily chapter."; return; }
  if (activeWeek !== selected.week || !currentChunks.length) prepareSections();
  const thisSection = chunkIndex;
  const chunk = currentChunks[thisSection];
  const origin = (window.RuntimeState?.getBackendOrigin?.() || window.MAAT_BACKEND_ORIGIN || location.origin).replace(/\/$/, "");
  status.textContent = "Preparing AI narrator · section " + (thisSection + 1) + " of " + currentChunks.length;
  try {
    const key = selected.week + ":" + chunk;
    let blob = cache.get(key);
    if (!blob) {
      aborter = new AbortController();
      const response = await fetch(origin + "/api/speak", {
        method:"POST",
        headers:{"content-type":"application/json",authorization:"Bearer " + authToken},
        body:JSON.stringify({text:chunk,format:"mp3"}),
        signal:aborter.signal
      });
      if (!response.ok) throw Error("AI voice request failed (" + response.status + ")");
      if (!(response.headers.get("content-type") || "").toLowerCase().startsWith("audio/")) throw Error("AI voice returned no audio.");
      blob = await response.blob();
      if (token !== generation) return;
      cache.set(key,blob);
    }
    if (token !== generation) return;
    activeUrl = URL.createObjectURL(blob);
    activeAudio = new Audio(activeUrl);
    activeAudio.onended = () => {
      if (token !== generation) return;
      playing = false;
      cleanupAudio();
      if (chunkIndex < currentChunks.length - 1) {
        chunkIndex++;
        updateSectionControls();
        // iPhone browsers can block a second audio play without a fresh tap.
        // Try automatic progression, then leave a working Next section button.
        playSection();
      } else status.textContent = "Story complete.";
    };
    activeAudio.onerror = () => { if(token===generation){playing=false;status.textContent="Audio playback interrupted. Tap Play or Next section.";cleanupAudio();} };
    await activeAudio.play();
    if (token===generation) status.textContent="AI narrator playing · section " + (chunkIndex+1) + " of " + currentChunks.length;
  } catch(error) {
    if(token===generation) {
      playing=false;cleanupAudio();
      status.textContent = error.name === "NotAllowedError"
        ? "Your iPhone needs another tap. Press Play or Next section to continue."
        : "AI voice interrupted: " + String(error.message || error).slice(0,130) + ". Tap Play to retry.";
    }
  }
}
el("play").addEventListener("click",()=>{
  if (paused && activeAudio) { activeAudio.play().then(()=>{paused=false;status.textContent="AI narrator resumed.";}).catch(()=>{status.textContent="Tap Play to resume.";});return; }
  if (!playing) playSection();
});
el("pause").addEventListener("click",()=>{
  if (!activeAudio || !playing) return;
  if (paused) { activeAudio.play().then(()=>{paused=false;status.textContent="AI narrator resumed.";}).catch(()=>{}); }
  else { activeAudio.pause(); paused=true; status.textContent="AI narrator paused."; }
});
el("stop").addEventListener("click",stop);
el("sectionPrev").addEventListener("click",()=>{if(chunkIndex>0){stop();chunkIndex--;updateSectionControls();playSection();}});
el("sectionNext").addEventListener("click",()=>{if(chunkIndex<currentChunks.length-1){stop();chunkIndex++;updateSectionControls();playSection();}});
el("prev").addEventListener("click",()=>show(index-1));
el("next").addEventListener("click",()=>show(index+1));
week.addEventListener("change",()=>show(Number(week.value)));
window.addEventListener("pagehide",stop);
const loadController = new AbortController();
const loadTimeout = setTimeout(() => loadController.abort(), 12000);
Promise.all([fetch("/eight-pillars-review-stories.json", {signal:loadController.signal,cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Story data unavailable");return r.json();}),fetch("/eight-pillars-week-01-approved.txt", {signal:loadController.signal,cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Approved Week One manuscript unavailable");return r.text();})]).then(([data,weekOne])=>{ if(data.stories?.[0]?.week===1){data.stories[0].story=weekOne;data.stories[0].reviewStatus="user-provided";}
 stories=(data.stories||[]).filter(s=>typeof s.story==="string"&&typeof s.title==="string");
 if(!stories.length)throw Error("No stories available");
 stories.forEach((s,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent="Week "+s.week+" — "+s.title;week.append(o);});
 const match=location.hash.match(/^#week-([1-8])$/);show(match?Number(match[1])-1:0);

}).catch(e=>{title.textContent="Stories unavailable";status.textContent=e.name === "AbortError" ? "Loading timed out. Please refresh or try again." : e.message;el("play").disabled=true;}).finally(()=>clearTimeout(loadTimeout));
})();