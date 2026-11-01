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
const $=id=>document.getElementById(id);let last='';
function refresh(){const now=new Date(),key=now.toDateString();if(last===key)return;last=key;const i=now.getDay(),lesson=weekly[i];$('snapshot-week').textContent='Today’s Reflection · '+lesson[0];$('snapshot-date').textContent=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(now);$('snapshot-chakra').textContent=names[i];$('snapshot-theme').textContent=themes[i];$('snapshot-verse').textContent='“'+lesson[1]+' '+verses[i]+'”';$('snapshot-prompt').textContent=prompts[i]+' '+lesson[2];window.MileleChakraSymbols?.render(i)}
function content(){return ['MILELE FIT · SNAPSHOT OF THE DAY',$('snapshot-date').textContent,$('snapshot-chakra').textContent,$('snapshot-verse').textContent,$('snapshot-prompt').textContent,'https://mufasafitsite.onrender.com/mindfulness.html'].join('\n')}
$('snapshot-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(content());$('snapshot-status').textContent='Snapshot text copied. Screenshot the card to share its design.'}catch{$('snapshot-status').textContent='Copy unavailable. You can still screenshot the card.'}});
$('snapshot-share').addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:'Milele Fit · Snapshot of the Day',text:content()});else{await navigator.clipboard.writeText(content());$('snapshot-status').textContent='Text copied. Screenshot the card for its visual design.'}}catch(e){if(e.name!=='AbortError')$('snapshot-status').textContent='Sharing unavailable; try copying or taking a screenshot.'}});
refresh();document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});window.addEventListener('focus',refresh);setInterval(refresh,60000);
})();

(()=>{'use strict';
if(new URLSearchParams(location.search).get('community')!=='pac')return;
const weeks=[
 {limb:'Yama',symbol:'Mpatapo',meaning:'reconciliation and peacemaking',bridge:'How we relate to others becomes practice. Choose non-harm, truth and boundaries that restore relationship.',focus:'Where can I respond with both honesty and care?',asset:'week-01-mpatapo.svg'},
 {limb:'Niyama',symbol:'Sankofa',meaning:'return, learn and carry wisdom forward',bridge:'Personal practice includes remembering what has already taught you. Look back with purpose, then move forward cleaner.',focus:'What lesson from my own life is ready to guide me now?',asset:'week-02-sankofa.svg'},
 {limb:'Asana',symbol:'Aya',meaning:'endurance, resourcefulness and independence',bridge:'Posture is not a performance. It is a place to meet challenge with adaptability, strength and self-respect.',focus:'What does steady strength feel like in my body today?',asset:'week-03-aya.svg'},
 {limb:'Pranayama',symbol:'Nkonsonkonson',meaning:'connection and the chain of relationship',bridge:'Breath reminds us that we do not practice alone. Receive, release and make room for the community around you.',focus:'What changes when I make my exhale a little more spacious?',asset:'week-04-nkonsonkonson.svg'},
 {limb:'Pratyahara',symbol:'Akofena',meaning:'courage and readiness',bridge:'Turning inward is not hiding. It is the courageous choice to protect attention from every demand competing for it.',focus:'What input can I set down so I can hear myself clearly?',asset:'week-05-akofena.svg'},
 {limb:'Dharana',symbol:'Nyame Nti',meaning:'faith, sustenance and a source beyond distraction',bridge:'Focused attention grows through returning, again and again, to what truly nourishes your purpose.',focus:'What single anchor will I return to when my mind wanders?',asset:'week-06-nyame-nti.svg'},
 {limb:'Dhyana',symbol:'Adinkrahene',meaning:'leadership, centrality and influence',bridge:'Meditation asks us to sit at the center of our own awareness—less reactive, more present, more able to lead ourselves.',focus:'What can I notice without needing to fix it?',asset:'week-07-adinkrahene.svg'},
 {limb:'Samadhi',symbol:'Funtunfunefu Denkyemfunefu',meaning:'unity in diversity and shared destiny',bridge:'Integration does not erase difference. It lets us recognize that our paths are connected, even when our expressions differ.',focus:'How can my wholeness make more room for someone else’s?',asset:'week-08-funtunfunefu-denkyemfunefu.svg'}
];
const $=id=>document.getElementById(id),esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const start=new Date(2026,9,4),now=new Date(),days=Math.floor((new Date(now.getFullYear(),now.getMonth(),now.getDate())-start)/86400000),weekIndex=((Math.floor(days/7)%8)+8)%8,dayOfWeek=((days%7)+7)%7+1,current=weeks[weekIndex],asset='/assets/adinkra-symbols/'+current.asset;
const styles=document.createElement('style');styles.textContent='.pac-daily{border-color:#d9bd82;background:linear-gradient(135deg,#262116,#1b241c)}.pac-symbol{width:min(210px,70vw);height:150px;display:grid;place-items:center;margin:12px auto;border:1px dashed #cda95e;border-radius:18px;color:#e5c77d;font:1.45rem Georgia,serif;text-align:center;padding:18px}.pac-symbol img{max-width:100%;max-height:132px;object-fit:contain}.pac-meta{color:#e5c77d;font-size:.86rem;letter-spacing:.1em}.pac-story{border-top:1px solid #605338;margin-top:16px;padding-top:12px}';document.head.append(styles);
const panel=document.createElement('section');panel.id='pac-community-today';panel.className='card pac-daily';document.querySelector('[aria-label="Daily snapshot"]')?.after(panel);
function symbol(target,label){target.replaceChildren();const fallback=document.createElement('span');fallback.innerHTML=esc(current.symbol)+'<br><small>'+label+'</small>';target.append(fallback);const image=new Image();image.alt=current.symbol+' Adinkra symbol';image.src=asset;image.onload=()=>target.replaceChildren(image);}
function render({lesson,story}={}){const date=$('snapshot-date');if(date)date.textContent=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(now);$('snapshot-week').textContent=`PAC COMMUNITY · WEEK ${weekIndex+1} · DAY ${dayOfWeek}`;$('snapshot-chakra').textContent=current.limb+' + '+current.symbol;$('snapshot-theme').textContent=current.meaning;$('snapshot-verse').textContent='“'+current.bridge+'”';$('snapshot-prompt').textContent=lesson?lesson.action+' Reflect: '+lesson.question:current.focus;const snapshotSymbol=$('snapshot-symbol');snapshotSymbol.classList.add('pac-symbol');snapshotSymbol.setAttribute('aria-label',current.symbol+' Adinkra symbol');symbol(snapshotSymbol,'Weekly Adinkra symbol');panel.innerHTML=`<p class="eyebrow">PAC COMMUNITY · TODAY'S PRACTICE</p><p class="pac-meta">WEEK ${weekIndex+1} OF 8 · DAY ${dayOfWeek} OF 7</p><h2>${esc(current.limb)} + ${esc(current.symbol)}</h2><p><strong>${esc(current.symbol)}</strong> · ${esc(current.meaning)}</p><div class="pac-symbol" id="pac-symbol" role="img" aria-label="${esc(current.symbol)} Adinkra symbol"></div><p class="muted small">The daily screenshot uses this week's Adinkra symbol. Add its SVG or PNG at <code>${esc(asset)}</code> to replace the name fallback.</p><h3>This week’s bridge</h3><p>${esc(current.bridge)}</p><p><strong>Weekly reflection:</strong> ${esc(current.focus)}</p><h3>Today’s practice</h3><p><strong>${esc(lesson?.lesson||'Today’s lesson is loading.')}</strong></p><p><strong>Try:</strong> ${esc(lesson?.action||'Return to your breath and practice with care.')}</p><p><strong>Reflect:</strong> ${esc(lesson?.question||current.focus)}</p>${story?`<details class="pac-story"><summary>${esc(story.title)} · this week’s story</summary><p>${esc(story.story)}</p></details>`:''}<p><a href="/eight-limbs-adinkra.html">View the full Eight Limbs + Adinkra path →</a></p>`;symbol($('pac-symbol'),'Adinkra symbol image');}
Promise.all([fetch('/mindfulness-limbs-v1.json').then(r=>r.ok?r.json():Promise.reject()),fetch('/mindfulness-weekly-stories-v1.json').then(r=>r.ok?r.json():Promise.reject())]).then(([curriculum,stories])=>render({lesson:(curriculum.lessons||[]).find(item=>item.week===weekIndex+1&&item.day===dayOfWeek),story:(stories.stories||[]).find(item=>item.week===weekIndex+1)})).catch(()=>render());
})();
