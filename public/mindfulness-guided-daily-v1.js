(()=>{'use strict';
if(new URLSearchParams(location.search).get('community')==='pac')return;
const $=id=>document.getElementById(id);
const snapshot=document.querySelector('[aria-label="Daily snapshot"]');
const learning=$('daily-learning'),affirm=$('guided-affirmation'),breath=$('guided-breath'),reflect=$('guided-reflection');
if(!snapshot||!learning||!affirm||!breath||!reflect)return;
snapshot.after(learning,affirm,breath,reflect);
const names=['Root','Sacral','Solar Plexus','Heart','Throat','Third Eye','Crown'];
const guides=[
['grounding, safety, and stability','I am supported as I take one steady step.','I create safety through…','What helped me feel grounded today?'],
['creativity, feeling, and flow','I welcome creativity and honor what I feel.','I give myself permission to…','Where did I allow joy or creativity today?'],
['confidence, choice, and agency','I trust myself to take purposeful action.','I choose to act with confidence when…','What decision did I make with intention?'],
['compassion, connection, and care','I offer myself compassion while honoring my boundaries.','I show compassion by…','Where did I practice care with healthy boundaries?'],
['truth, expression, and communication','I speak my truth with clarity, confidence, and love.','I express my truth with kindness when…','What did I communicate honestly today?'],
['insight, discernment, and reflection','I pause and question my assumptions with curiosity.','I trust my discernment when…','What thought did I examine more carefully?'],
['meaning, purpose, and connection','I make space for stillness and meaningful connection.','I feel connected to purpose when…','What gave my actions meaning today?']
];
let items=null,day='',timer=null,remaining=60,started=0,phase='ready';
const text=$('guided-aff-text'),options=$('guided-aff-options'),words=$('guided-breath-words');
function setWords(){words.textContent='“'+(text.value.trim()||'Choose or write your affirmation above.')+'”'}
function stop(){if(timer!==null){clearInterval(timer);timer=null}phase='ready';$('guided-breath-start').disabled=false;$('guided-breath-phase').textContent='Ready to begin'}
function render(){const now=new Date(),date=now.getFullYear()+'-'+(now.getMonth()+1)+'-'+now.getDate();if(date===day)return;day=date;stop();remaining=60;$('guided-breath-clock').textContent='1:00';
const i=now.getDay(),g=guides[i],list=items?.sets?.[names[i]]||[];
const dayNumber=Math.floor(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000);
const week=Math.floor(dayNumber/7),rotation=list.length?list[((week%list.length)+list.length)%list.length]:g[1];
$('guided-aff-theme').textContent='Today: '+names[i]+' chakra — '+g[0]+'. Choose an example, complete the prompt, or write your own intention.';
options.replaceChildren();
const choices=[rotation,g[1],g[2]];
choices.forEach((value,index)=>{const button=document.createElement('button');button.type='button';button.textContent=index===0?'Today’s example':index===1?'Another example':'Guided starter';button.title=value;button.addEventListener('click',()=>{text.value=value;setWords();$('guided-aff-status').textContent='Selected: '+value;for(const b of options.children)b.setAttribute('aria-pressed',String(b===button))});button.setAttribute('aria-pressed',String(index===0));options.append(button)});
text.value=rotation;setWords();$('guided-aff-status').textContent='Today’s example: '+rotation;
$('guided-reflect-question').textContent=g[3];
const snapshotAff=$('snapshot-affirmation');if(snapshotAff)snapshotAff.textContent=rotation;
const standardAff=$('affirmation');if(standardAff)standardAff.textContent=rotation;
}
text.addEventListener('input',()=>{$('guided-aff-status').textContent='Your personal affirmation is ready for the breath practice.';for(const b of options.children)b.setAttribute('aria-pressed','false');setWords()});
$('guided-breath-start').addEventListener('click',()=>{if(timer!==null)return;remaining=60;started=Date.now();$('guided-breath-start').disabled=true;const tick=()=>{const elapsed=Math.floor((Date.now()-started)/1000);remaining=Math.max(0,60-elapsed);$('guided-breath-clock').textContent=Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');if(!remaining){stop();$('guided-breath-phase').textContent='Practice complete. Take a moment to notice how you feel.';return}const cycle=elapsed%10;$('guided-breath-phase').textContent=cycle<4?'Inhale gently':'Exhale comfortably; speak your affirmation when ready'};tick();timer=setInterval(tick,250)});
$('guided-breath-stop').addEventListener('click',()=>{stop();$('guided-breath-clock').textContent='1:00'});
$('guided-copy').addEventListener('click',async()=>{const result='Milele Fit · '+names[new Date().getDay()]+' chakra\nAffirmation: '+text.value+'\nReflection: '+$('guided-reflect-text').value;try{await navigator.clipboard.writeText(result);$('guided-copy-status').textContent='Copied.'}catch{$('guided-copy-status').textContent='Copy unavailable. Select and copy your text manually.'}});
fetch('/mindfulness-affirmation-library-v1.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('library unavailable');return r.json()}).then(data=>{items=data;day='';render()}).catch(()=>{$('guided-aff-status').textContent='Affirmation library unavailable; using the chakra-specific example.';day='';render()});
render();document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else render()});window.addEventListener('focus',render);setInterval(render,60000);
})();