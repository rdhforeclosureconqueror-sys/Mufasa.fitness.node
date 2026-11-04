(() => {
"use strict";
const el = id => document.getElementById(id);
const week = el("week"), title = el("title"), story = el("story"), status = el("status");
let stories = [], index = 0, generation = 0, speaking = false, paused = false;
const available = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
function stop() { generation++; speaking = false; paused = false; if (available) speechSynthesis.cancel(); status.textContent = "Stopped."; }
function show(i) {
  stop(); index = Math.max(0, Math.min(stories.length - 1, i)); const s = stories[index];
  if (!s) return;
  week.value = String(index); title.textContent = "Week " + s.week + " · " + s.title;
  story.replaceChildren();
  s.story.split(/\n\s*\n/).filter(Boolean).forEach(t => { const p=document.createElement("p"); p.textContent=t; story.append(p); });
  el("prev").disabled = index===0; el("next").disabled = index===stories.length-1;
  history.replaceState(null,"","#week-"+s.week);
}
function read() {
  if (!available) { status.textContent="Built-in speech is unavailable on this device. You can still read the story."; return; }
  stop(); const token=++generation; speaking=true;
  const chunks = stories[index].story.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
  let at=0; status.textContent="Reading aloud with your device voice…";
  const next=()=> {
    if (token!==generation) return;
    if (at>=chunks.length) { speaking=false; status.textContent="Finished."; return; }
    const utterance=new SpeechSynthesisUtterance(chunks[at++]);
    utterance.lang="en-US"; utterance.rate=.9;
    utterance.onend=next;
    utterance.onerror=(event)=> { if(token===generation){speaking=false;status.textContent="Speech interrupted ("+event.error+"). You can continue reading the text."; } };
    speechSynthesis.speak(utterance);
  };
  next();
}
el("play").addEventListener("click",()=>{ if(paused && available){speechSynthesis.resume();paused=false;status.textContent="Resumed.";return;}read(); });
el("pause").addEventListener("click",()=>{if(!available||!speaking)return;if(paused){speechSynthesis.resume();paused=false;status.textContent="Resumed.";}else{speechSynthesis.pause();paused=true;status.textContent="Paused."; }});
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
 if(!available)el("play").disabled=true;
}).catch(e=>{title.textContent="Stories unavailable";status.textContent=e.message;el("play").disabled=true;});
})();