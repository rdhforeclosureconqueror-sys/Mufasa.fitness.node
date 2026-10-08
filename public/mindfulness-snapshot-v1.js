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
const weekly=[
['Notice','I slow my pace and give myself space.','Where did you first notice this theme today?'],
['Name','I name what I feel and honor what is real.','What feeling or thought could you name without judging it?'],
['Explore','I welcome a clue and consider what is true.','What new perspective did you discover?'],
['Practice','With one little try, I let new habits fly.','What small action could you practice right now?'],
['Reflect','I look back with care and notice what was there.','What changed when you paused before responding?'],
['Apply','I carry this light and choose what feels right.','Where can you use this teaching in an everyday interaction?'],
['Connect','With kindness I grow and let connection show.','Who might benefit from a kind word or patient listening?'],
['Integrate','I take what I know and give my growth room to show.','What have you learned about yourself across this journey?']
];
const names=['Muladhara · Root','Svadhisthana · Sacral','Manipura · Solar Plexus','Anahata · Heart','Vishuddha · Throat','Ajna · Third Eye','Sahasrara · Crown'];
const $=id=>document.getElementById(id);let last='';const epoch=new Date(2026,9,4);const weekIndex=now=>Math.floor((new Date(now.getFullYear(),now.getMonth(),now.getDate())-epoch)/604800000)%8;
function refresh(){const now=new Date(),key=now.toDateString()+'-'+weekIndex(now);if(last===key)return;last=key;const i=now.getDay(),w=((weekIndex(now)+8)%8),lesson=weekly[w];$('snapshot-week').textContent='Week '+(w+1)+' of 8 · '+lesson[0];$('snapshot-date').textContent=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(now);$('snapshot-chakra').textContent=names[i];$('snapshot-theme').textContent=themes[i];$('snapshot-verse').textContent='“'+lesson[1]+' '+verses[i]+'”';$('snapshot-prompt').textContent=prompts[i]+' '+lesson[2];window.MileleChakraSymbols?.render(i)}
function content(){return ['MILELE FIT · SNAPSHOT OF THE DAY',$('snapshot-date').textContent,$('snapshot-chakra').textContent,$('snapshot-verse').textContent,$('snapshot-prompt').textContent,'https://mufasafitsite.onrender.com/mindfulness.html'].join('\n')}
$('snapshot-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(content());$('snapshot-status').textContent='Snapshot text copied. Screenshot the card to share its design.'}catch{$('snapshot-status').textContent='Copy unavailable. You can still screenshot the card.'}});
$('snapshot-share').addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:'Milele Fit · Snapshot of the Day',text:content()});else{await navigator.clipboard.writeText(content());$('snapshot-status').textContent='Text copied. Screenshot the card for its visual design.'}}catch(e){if(e.name!=='AbortError')$('snapshot-status').textContent='Sharing unavailable; try copying or taking a screenshot.'}});
refresh();document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});window.addEventListener('focus',refresh);setInterval(refresh,60000);
})();