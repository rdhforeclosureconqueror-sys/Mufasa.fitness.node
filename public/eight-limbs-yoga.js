(()=>{
"use strict";
const $=id=>document.getElementById(id);
const start=$("start"),state=$("journeyState"),status=$("status"),weekPicker=$("weekPicker"),dayPicker=$("dayPicker"),lessonPanel=$("lessonPanel"),completeDay=$("completeDay");
const origin=window.MAAT_BACKEND_ORIGIN||location.origin;
let journey=null,lessons=[],selectedDay=1;
async function api(path,method="GET",body){
 await window.AuthStateRuntime?.whenReady?.();
 const token=window.AuthStateRuntime?.getAuthToken?.();
 if(!token)throw Error("Sign in to start or save your journey.");
 const response=await fetch(origin+path,{method,headers:{"authorization":"Bearer "+token,"content-type":"application/json"},body:body?JSON.stringify(body):undefined,credentials:"omit",cache:"no-store"});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(typeof data.error==="string"?data.error:data.error?.message||"Journey request failed ("+response.status+")");
 return data.data||data;
}
function setText(element,label,value){
 const p=document.createElement("p"),strong=document.createElement("strong");
 strong.textContent=label+" ";p.append(strong,document.createTextNode(value));element.append(p);
}
function render(){
 const started=Boolean(journey?.startedAt),done=journey?.completedDays||[],available=journey?.availableDay||1;
 start.hidden=started;
 state.textContent=started?"Started "+new Date(journey.startedAt).toLocaleDateString()+" · "+done.length+" of 56 daily lessons completed":"Your 56-day journey has not started. You decide when Day One begins.";
 weekPicker.hidden=!started;dayPicker.hidden=!started;completeDay.hidden=!started;
 if(!lessons.length)return;
 if(!started)selectedDay=1;
 else selectedDay=Math.min(available,Math.max(1,selectedDay));
 const week=Math.ceil(selectedDay/7);
 weekPicker.replaceChildren();dayPicker.replaceChildren();
 for(let w=1;w<=8;w++){
  const option=document.createElement("option");
  option.value=String(w);option.textContent="Week "+w+" · "+lessons[(w-1)*7].limb;
  option.disabled=started&&((w-1)*7+1)>available;
  weekPicker.append(option);
 }
 weekPicker.value=String(week);
 for(let d=1;d<=7;d++){
  const number=(week-1)*7+d,option=document.createElement("option");
  option.value=String(number);option.disabled=started&&number>available;
  option.textContent="Day "+number+(done.includes(number)?" · complete":number>available?" · locked":"");
  dayPicker.append(option);
 }
 dayPicker.value=String(selectedDay);
 const lesson=lessons[selectedDay-1];
 lessonPanel.replaceChildren();
 const heading=document.createElement("h3");heading.textContent="Week "+lesson.week+" · "+lesson.limb+" · Day "+selectedDay;
 lessonPanel.append(heading);
 setText(lessonPanel,"Today's lesson:",lesson.lesson);
 setText(lessonPanel,"Reflect:",lesson.question);
 setText(lessonPanel,"Practice:",lesson.action);
 if(started){
  const next=done.length+1;
  completeDay.disabled=selectedDay!==next||selectedDay>available;
  completeDay.textContent=done.includes(selectedDay)?"Completed ✓":selectedDay===next?"Mark today's practice complete":"Complete earlier days first";
  status.textContent=status.textContent||"Day "+available+" of 56 unlocked · "+done.length+" completed.";
 }
}
weekPicker.addEventListener("change",()=>{selectedDay=(Number(weekPicker.value)-1)*7+1;status.textContent="";render();});
dayPicker.addEventListener("change",()=>{selectedDay=Number(dayPicker.value);status.textContent="";render();});
start.addEventListener("click",async()=>{
 start.disabled=true;status.textContent="Saving your start date…";
 try{journey=(await api("/api/me/eight-limbs-yoga/start","POST")).journey;selectedDay=1;status.textContent="Day One is ready. Welcome to your journey!";render();}
 catch(error){status.textContent=error.message;}finally{start.disabled=false;}
});
completeDay.addEventListener("click",async()=>{
 completeDay.disabled=true;status.textContent="Saving your daily practice…";
 try{
  journey=(await api("/api/me/eight-limbs-yoga/complete-day","POST",{day:selectedDay})).journey;
  if(selectedDay<journey.availableDay&&selectedDay<56)selectedDay++;
  status.textContent="Your practice is saved to your account.";render();
 }catch(error){status.textContent=error.message;render();}
});
(async()=>{
 try{
  const response=await fetch("/mindfulness-limbs-v1.json",{cache:"no-store"});
  if(!response.ok)throw Error("Could not load the 56-day lesson library.");
  const data=await response.json();
  if(data.lessons?.length!==56||data.lessons.some((lesson,i)=>lesson.week!==Math.floor(i/7)+1||lesson.day!==i%7+1))throw Error("The daily lesson library is incomplete.");
  lessons=data.lessons;
  try{
   journey=(await api("/api/me/eight-limbs-yoga")).journey;
   selectedDay=journey?.startedAt?Math.min(journey.availableDay,(journey.completedDays||[]).length+1):1;
  }catch(error){status.textContent=error.message;}
  render();
 }catch(error){status.textContent=error.message;start.disabled=true;}
})();
})();