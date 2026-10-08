(()=>{'use strict';
const verses=[
'With feet on the ground, my strength can be found.',
'I welcome the flow and give joy room to grow.',
'With courage in sight, I choose what is right.',
'With care in my heart, I make a kind start.',
'With words that are true, I let my voice come through.',
'I pause and I see what my thoughts ask of me.',
'With purpose in view, I live what is true.'
];
const prompts=[
'Notice one moment when you feel supported. What helps you feel steady?',
'Notice one moment of creativity or enjoyment. Can you welcome it without rushing?',
'Notice one decision you can make intentionally today.',
'Notice a chance to offer compassion while honoring a boundary.',
'Notice when you want to speak. Can you express yourself clearly and listen?',
'Notice an assumption today. What changes when you question it?',
'Notice an action that reflects what matters most to you.'
];
const themes=['Grounding · Safety · Stability','Creativity · Feeling · Flow','Confidence · Choice · Agency','Compassion · Connection · Care','Expression · Truth · Communication','Insight · Reflection · Discernment','Meaning · Connection · Purpose'];
const names=['Muladhara · Root','Svadhisthana · Sacral','Manipura · Solar Plexus','Anahata · Heart','Vishuddha · Throat','Ajna · Third Eye','Sahasrara · Crown'];
const $=id=>document.getElementById(id);let last='';
function refresh(){const now=new Date(),key=now.toDateString();if(last===key)return;last=key;const i=now.getDay();$('snapshot-date').textContent=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(now);$('snapshot-chakra').textContent=names[i];$('snapshot-theme').textContent=themes[i];$('snapshot-verse').textContent='“'+verses[i]+'”';$('snapshot-prompt').textContent=prompts[i];window.MileleChakraSymbols?.render(i)}
function content(){return ['MILELE FIT · SNAPSHOT OF THE DAY',$('snapshot-date').textContent,$('snapshot-chakra').textContent,verses[new Date().getDay()],$('snapshot-prompt').textContent,'https://mufasafitsite.onrender.com/mindfulness.html'].join('\n')}
$('snapshot-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(content());$('snapshot-status').textContent='Snapshot text copied. Screenshot the card to share its design.'}catch{$('snapshot-status').textContent='Copy unavailable. You can still screenshot the card.'}});
$('snapshot-share').addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:'Milele Fit · Snapshot of the Day',text:content()});else{await navigator.clipboard.writeText(content());$('snapshot-status').textContent='Text copied. Screenshot the card for its visual design.'}}catch(e){if(e.name!=='AbortError')$('snapshot-status').textContent='Sharing unavailable; try copying or taking a screenshot.'}});
refresh();document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});window.addEventListener('focus',refresh);setInterval(refresh,60000);
})();