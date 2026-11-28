'use strict';
const fs=require('node:fs'),path=require('node:path');
const {getExercise}=require('../src/exercise-intelligence/exerciseCatalog');
const root=path.resolve(__dirname,'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const profiles=read('data/rugby/full-xv-assessments/position-profiles.v1.json');
const candidates=read('data/rugby/full-xv-assessments/assessment-candidates.v1.json');
const development=read('data/rugby/full-xv-assessments/development-links.v1.json');
const roleText=read('data/rugby/learning/position-explainers.v1.json');
const lessons=read('data/rugby/learning/assessment-explainers.v1.json');
const benchmarks=read('data/rugby/learning/benchmarks.v1.json');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const words=value=>String(value).replaceAll('_',' ');
const positionUrl=n=>`/rugby-positions/${n}.html`;
const assessmentUrl=id=>`/rugby-assessment-guides/${id}.html`;
const a=(url,text)=>`<a href="${esc(url)}">${esc(text)}</a>`;
function validate(){
 const ids=new Set(candidates.protocols.map(p=>p.id));
 if(roleText.positions.length!==15||new Set(roleText.positions.map(p=>p.number)).size!==15)throw Error('Position explainers must cover all 15 roles');
 for(const p of profiles.profiles)if(!roleText.positions.some(r=>r.number===p.number))throw Error('Missing position explanation');
 if(Object.keys(lessons.assessments).length!==ids.size)throw Error('Assessment explainer coverage mismatch');
 for(const id of ids){const l=lessons.assessments[id];if(!l||![l.what,l.why,l.limits,l.diagram].every(Boolean)||l.training.length<2)throw Error('Incomplete lesson '+id);}
 for(const b of benchmarks.benchmarks){
  if(b.selectionCutoff!==false||!Number.isFinite(b.mean)||b.mean<=0||!Number.isFinite(b.sd)||b.sd<0||!Number.isInteger(b.n)||b.n<1||!b.method||!b.limits||!b.sex||!b.tier||!b.unit)throw Error('Incomplete benchmark '+b.id);
  if(!b.assessmentIds.length||b.assessmentIds.some(id=>!ids.has(id))||!benchmarks.sources.some(s=>s.id===b.sourceId&&/^https:\/\//.test(s.url)&&s.population&&s.year))throw Error('Unknown benchmark source/assessment '+b.id);
 }
 return true;
}
function shell(title,description,body){return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(description)}"><title>${esc(title)} | Rugby HQ</title><link rel="stylesheet" href="/rugby-learning.css"><script src="/rugby-learning.js" defer></script></head>
<body><a class="skip" href="#guide">Skip to guide</a><header><a class="brand" href="/rugby-learning.html">MILELE FIT <span>RUGBY HQ</span></a><nav aria-label="Main"><a href="/rugby-player.html">My Rugby HQ</a><a href="/rugby-assessments.html">Record assessments</a></nav></header><main id="guide">${body}</main><footer>Learn the role. Understand the test. Develop with purpose.<p>General education · Adult rugby union · Individual coaching and current participation requirements apply.</p></footer></body></html>\n`;}
function lead(kicker,title,description){return `<div class="hero"><p class="eyebrow">${esc(kicker)}</p><h1>${esc(title)}</h1><p class="intro">${esc(description)}</p><button class="listen" type="button" hidden>Listen to this guide</button><p class="speech-status" role="status"></p></div>`;}
const ul=items=>`<ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`;
function scientificContext(){return `<p class="notice">A published average describes that study’s players. It is not a qualifying score, a percentile or a prediction of selection. Match the population, method, surface and trial rule before comparing. Independent studies do not create a precise club-to-international ladder.</p>`;}
function benchmarkCards(id){
 const rows=benchmarks.benchmarks.filter(b=>b.assessmentIds.includes(id));
 if(!rows.length)return `<p>No verified comparable numerical reference has been added for this assessment. ${candidates.protocols.find(p=>p.id===id).mode==='observation'?'Use factual observations and the coach’s evidence progression; this task has no universal timed pass mark.':'Use your baseline and comparable retests while the coach establishes an appropriate local target.'}</p>`;
 return `<div class="benchmark-controls"><label>Published cohort<select data-cohort-filter><option value="all">All cohorts · check population</option>${[...new Set(rows.map(r=>r.sex))].map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select></label></div><div class="grid benchmark-grid">${rows.map(b=>{
  const s=benchmarks.sources.find(s=>s.id===b.sourceId);
  return `<article class="benchmark" data-cohort="${esc(b.sex)}"><p class="eyebrow">${esc(b.tier)} · ${esc(b.sex)}</p><h3>${esc(b.group)}</h3><p class="stat">${b.mean} <span>± ${b.sd} ${esc(b.unit)}</span></p><p>${esc(b.metric)} · mean ± standard deviation</p><p class="meta">n = ${b.n} · ${esc(s.population)}</p><details><summary>Method and comparison limits</summary><p>${esc(b.method)}</p><p>${esc(b.limits)}</p></details><p class="source">${a(s.url,s.title)}</p></article>`;
 }).join('')}</div>`;
}
const transfer={front_row:'For your front-row role',second_row:'For your lock role',back_row:'For your back-row role',halfback:'For your halfback role',centre:'For your midfield role',outside_back:'For your outside-back role'};
const domainTransfer={
 acceleration:'the first steps help you reach the next job. Compare the sprint with how early you recognise the opportunity.',
 speed:'longer running speed supports chase and cover. Practise applying it with the ball, a cue or a defensive responsibility.',
 braking_cod:'controlled braking and redirection help you arrive balanced and reconnect. Add decision pressure as a separate progression.',
 reactive_agility:'reading another player is different from running a known route. Observe the cue, choice and movement separately.',
 power:'explosive output can support rapid actions. The field task shows whether you can express it in your assigned role.',
 strength:'force capacity supports your work, but body position and timing determine whether it becomes effective rugby.',
 repeat_effort:'the next involvement matters as well as the first. Review recovery and execution across the sequence.',
 conditioning:'running recovery supports continued involvement. It does not replace technical skill or contact readiness.',
 movement:'control is assessed in the positions and tasks you actually need. Follow up an observation before choosing its cause.',
 tackle:'you need to read and track before connecting, finish safely and reload into the next defensive job.',
 carry:'judge when to carry or distribute, how the ball is protected and whether the next phase remains usable.',
 breakdown:'assess arrival and the legal compete/support/reload choice rather than rewarding speed into every contest.',
 scrum:'judge competence in your actual scrum role and stage. A gym score cannot replace qualified role assessment.',
 lineout:'assess your assigned jump, lift or delivery within the unit, including the controlled return to the ground.',
 lineout_throw:'accuracy and timing to the assigned target supply usable possession; test each target separately.',
 base_control:'secure base handling and the connection with 9 keep possession usable for the chosen next action.',
 service:'a pass must reach the right player at the right time. Separate technique, movement and choice.',
 attack_iq:'scan and offer depth, width and timing before the ball arrives. Record the decision separately from the outcome.',
 defence_iq:'number threats, communicate and stay connected to your neighbours while following the coach’s objective.',
 aerial:'early positioning, a clear call and secure control connect the kick receipt to the next action.',
 kicking:'the useful kick depends on territory, pressure and support. Measure execution for the assigned kick type.'
};
function positionPage(profile){
 const role=roleText.positions.find(r=>r.number===profile.number);
 const ids=[...new Set([...profile.assessmentIds,...Object.values(profile.alternatives).flat()])];
 const cards=ids.map(id=>{const p=candidates.protocols.find(p=>p.id===id),l=lessons.assessments[id];return `<article class="card" data-search-card><p class="eyebrow">${esc(words(p.domain))} · ${p.mode==='physical'?'Measured output':'Coach observation'}</p><h3>${a(assessmentUrl(id),p.name)}</h3><p>${esc(l.what)}</p><p class="reason"><strong>Why for this role:</strong> ${esc(transfer[profile.roleGroup]+', '+domainTransfer[p.domain])}</p>${a(assessmentUrl(id),'See illustration, development and references →')}</article>`;}).join('');
 return shell(role.title,role.job,`<nav class="crumb" aria-label="Breadcrumb">${a('/rugby-learning.html','Learning library')} / Positions / ${profile.number}</nav>${lead('Position '+profile.number+' · '+profile.unit,role.title,role.job)}<section class="panel"><h2>How we develop this role</h2><p>${esc(role.development)}</p>${ul(profile.demands)}<p class="meta">${esc(profile.roleAssignmentNote)}</p></section><section><div class="section-heading"><p class="eyebrow">The purpose behind each test</p><h2>Your assessment map</h2><p>This is a menu. Your coach chooses the smallest useful battery; you do not need to complete every test in one session.</p></div><label class="search">Find a skill or test<input type="search" data-card-search placeholder="Try 505, tackle or passing"></label><p data-search-status role="status"></p><div class="grid">${cards}</div></section><section class="panel"><h2>What counts as a good result?</h2><p>Start with valid technique and the same procedure each time. Review your trend, role demands and field execution with your coach. Each test guide shows published references when a usable source is available.</p>${scientificContext()}<p>${a('/rugby-learning.html#benchmarks','Explore the benchmark sources')}</p></section><p class="source">Role context: ${a(roleText.sourceUrl,'World Rugby · teams and players')}. Explanations and development links are Milele Fit coaching interpretations.</p><nav class="pager" aria-label="Other positions">${a(positionUrl(profile.number===1?15:profile.number-1),'← Previous position')}${a('/rugby-learning.html','All 15 positions')}${a(positionUrl(profile.number===15?1:profile.number+1),'Next position →')}</nav>`);
}
function assessmentPage(p){
 const l=lessons.assessments[p.id],link=development.links.find(d=>d.domain===p.domain);
 const related=profiles.profiles.filter(role=>role.assessmentIds.includes(p.id)||Object.values(role.alternatives).flat().includes(p.id));
 const examples=link.canonicalExerciseExamples.map(id=>getExercise(id)).filter(Boolean);
 const sourceLinks=p.sourceIds.map(id=>candidates.sources.find(s=>s.id===id)).filter(Boolean);
 return shell(p.name,l.what,`<nav class="crumb" aria-label="Breadcrumb">${a('/rugby-learning.html','Learning library')} / Assessment guide</nav>${lead(words(p.domain)+' · '+(p.mode==='physical'?'Measured output':'Coach observation'),p.name,l.what)}<div class="split"><figure><img src="/rugby-learning-assets/${esc(l.diagram)}.svg" alt="${esc(diagramText(l.diagram))}" width="640" height="340"><figcaption>${esc(diagramText(l.diagram))}</figcaption></figure><section class="panel"><h2>Why it matters in rugby</h2><p>${esc(l.why)}</p><h3>What this cannot tell you</h3><p>${esc(l.limits)}</p></section></div><section class="panel"><h2>How to perform and record it</h2><p>${esc(p.procedure)}</p><details><summary>Setup and valid-result checklist</summary>${ul(p.validityCriteria)}${ul(p.requiredSetup.map(words))}</details><p class="notice">${esc(p.stopRule)}</p>${p.contact?'<p>Contact work requires qualified supervision and demonstrated prerequisites. This illustration is a task map, not a contact-technique tutorial or participation clearance.</p>':''}<p>${a('/rugby-assessments.html?candidateId='+encodeURIComponent(p.id),'Open assessment capture →')}</p></section><section id="benchmarks"><h2>What is a good score?</h2><p>${p.mode==='physical'?'A useful score is a valid measurement that helps answer your development question. Compare your own baseline under the same procedure, then use matched research cohorts as context.':'Judge the demonstrated behavior, independence and pressure level. There is no universal professional number for this observation.'}</p>${scientificContext()}${benchmarkCards(p.id)}<details><summary>USA Eagles, Falcons and other unavailable comparisons</summary>${benchmarks.availability.map(item=>`<h3>${esc(item.target)}</h3><p>${esc(item.status)}. ${esc(item.note)}</p>`).join('')}<p>${a(benchmarks.sources.find(s=>s.id==='usa2019').url,'USA Rugby’s published test-event list')}</p></details></section><section><h2>Ways to develop this quality</h2><p>These are coaching options, not an automatically assigned workout. Your readiness, experience, assessment findings and team workload guide selection.</p><div class="grid">${l.training.map(t=>`<article class="card"><h3>${esc(t.name)}</h3><p>${esc(t.purpose)}</p></article>`).join('')}</div>${examples.length?`<div class="panel"><h3>Examples in your exercise library</h3><p>${examples.map(e=>esc(e.displayName)).join(' · ')}</p><p>These support capacity when appropriate; improving a gym exercise does not automatically prove rugby skill transfer.</p></div>`:''}<p class="notice">Retest question: ${esc(link.retest)}</p></section><section class="panel"><h2>Where this fits</h2><div class="chips">${related.map(r=>a(positionUrl(r.number),r.number+' · '+r.name)).join('')}</div></section><details><summary>Sources and interpretation</summary><p>Procedure definitions remain coaching candidates. Local setup and qualified review determine their use; this guide does not approve scoring or progression.</p><ul>${sourceLinks.map(s=>`<li>${a(s.url,s.id.replaceAll('_',' '))}</li>`).join('')}</ul><p>Training explanations and illustrations are Milele Fit educational interpretations. Numerical cohort sources are linked beside each result. Source review: ${benchmarks.reviewedAt}.</p></details><p>${a('/rugby-learning.html#assessments','← All assessment guides')}</p>`);
}
function diagramText(type){
 const texts={'505':'Traditional 505: 10 m untimed run-in, then 5 m timed out to a 180° turn and 5 m back through the timing gate.',sprint10:'Measured 10 m lane with fixed start, timing gate and clear run-off.',sprint20:'Measured 20 m lane with an optional 10 m split and clear run-off.',sprint40:'Measured 40 m lane with fixed start and clear run-off.',braking:'Approach lane into a coach-defined stopping zone; match approach speed between observations.',tracking:'Attacker chooses a route; defender reads and tracks. Lane size and starting distance are fixed locally.',vertical:'Countermovement down, two-foot take-off and controlled landing; the chosen device records jump height.',broad:'Two-foot take-off behind a line; measure to the nearest heel on a stable landing.',strength:'A familiar lower-body lift under supervision; record exact lift, range, repetitions and load.',push:'Chosen upper-body press with fixed range, repetitions and supervision.',pull:'Chosen upper-body pull with fixed support, range and load.',repeat:'Repeated run and recovery sequence; record every rep and the fixed interval.',shuttle:'Intermittent running: repeat the chosen shuttle and recovery pattern using its published protocol.',squat:'Overhead squat observations: note depth and visible execution without diagnosing a cause.',ankle:'Knee moves towards the wall while the heel stays down; record toe-to-wall distance and side.',single:'Supported single-leg control or a locally defined landing task; observe each side.',tackle:'Read and track, prepare and connect, finish and reload. Contact technique requires qualified coaching.',carry:'Scan and choose, carry or distribute, preserve continuity for the next phase.',breakdown:'Arrive under control, identify the legal role, compete, support or reload.',scrum:'Individual preparation, demonstrated progression, assigned unit role under qualified coaching.',lineout:'Assigned role, coordinated jump or lift, secure delivery and supported return.',throw:'Throw from a fixed start to a predefined lineout target; log attempts and accuracy.',base:'Number 8 controls the base and connects with 9 for the chosen action.',service:'Ground ball to a fixed target both ways; separate accurate delivery from the decision.',attack:'An illustrative 2v1: read the defender and choose the usable carry or pass.',defence:'Connected defenders number threats and adjust together to a changing picture.',aerial:'Position early, communicate and secure the catch, then choose the next action.',kick:'Choose the kick type and target, execute and review the outcome.'};
 return texts[type]||type;
}
function diagram(type){
 const text=(x,y,t,size=22)=>`<text x="${x}" y="${y}" font-size="${size}">${esc(t)}</text>`;
 const line=(x1,y1,x2,y2,color='#e6c783',dash='')=>`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width="4" fill="none" ${dash?'stroke-dasharray="9 7"':''}/>`;
 const arrow=(x1,y1,x2,y2,dash=false)=>`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#e6c783" stroke-width="4" fill="none" marker-end="url(#arrow)" ${dash?'stroke-dasharray="9 7"':''}/>`;
 const dot=(x,y,label,color='#76cfa2')=>`<circle cx="${x}" cy="${y}" r="23" fill="${color}"/><text x="${x-8}" y="${y+8}" font-size="23" fill="#102019">${esc(label)}</text>`;
 let body='';
 if(type==='505'){
  body=text(35,48,'10 m run-in',24)+text(355,48,'5 m out + 5 m back',24);
  for(const [x,t] of [[45,'Start'],[365,'Gate'],[525,'Turn']])body+=line(x,85,x,230,'#90b49e')+text(x-20,270,t);
  body+=arrow(62,125,340,125,true)+arrow(385,125,500,125)+arrow(500,190,385,190)+text(392,315,'180° turn',22);
 }else if(type.startsWith('sprint')){
  const distance=Number(type.slice(6));body=text(40,55,distance+' m sprint',26)+line(60,100,60,235,'#90b49e')+line(470,100,470,235,'#90b49e')+arrow(90,170,445,170)+arrow(490,170,590,170,true)+text(35,275,'Start')+text(430,275,'Finish')+text(495,315,'Run-off',21);
  if(distance===20)body+=line(265,115,265,225,'#90b49e','dash')+text(220,95,'10 m split',20);
 }else if(type==='braking')body=text(35,55,'Controlled approach',26)+arrow(60,165,330,165)+`<rect x="365" y="95" width="225" height="140" rx="15" fill="#2e4c3b" stroke="#e6c783"/>`+text(390,170,'Stopping zone',24)+text(40,290,'Fix approach speed + zone size',24);
 else if(type==='tracking'||type==='attack'||type==='defence'){
  body=dot(140,160,'A')+dot(440,160,'D','#e6c783')+arrow(170,145,340,85)+arrow(170,180,340,245,true)+text(55,55,type==='attack'?'Read → choose → execute':'Read the changing picture',26)+text(75,300,'A: attacker',22)+text(350,300,'D: defender',22);
  if(type==='attack')body+=dot(145,245,'S')+text(260,240,'S: support',20);
  if(type==='defence')body+=dot(440,245,'D','#e6c783')+line(440,185,440,220,'#90b49e');
 }else if(type==='vertical'||type==='broad'){
  body=text(40,55,type==='vertical'?'Down → jump → land':'Two-foot take-off → stable landing',24);
  if(type==='vertical')body+=line(60,270,580,270,'#90b49e')+dot(170,245,'1')+dot(320,110,'2')+dot(480,245,'3')+arrow(215,220,285,130)+arrow(355,130,440,220);
  else body+=line(90,100,90,260,'#90b49e')+`<path d="M120 210 Q300 30 485 210" fill="none" stroke="#e6c783" stroke-width="4" marker-end="url(#arrow)"/>`+line(490,195,490,250,'#90b49e')+line(90,280,490,280)+text(120,315,'Line to nearest heel',24);
 }else if(['squat','strength','single'].includes(type)){
  const person=(cx,low,overhead)=>{
   const hy=low?145:105,hip=low?225:195;
   let shape=`<circle cx="${cx}" cy="${hy}" r="16" fill="#76cfa2"/>`+line(cx,hy+18,cx-10,hip,'#76cfa2');
   shape+=line(cx-10,hip,cx+35,low?240:235,'#76cfa2')+line(cx+35,low?240:235,cx+12,285,'#76cfa2');
   if(type==='single')shape+=line(cx-10,hip,cx-65,hip+10,'#e6c783')+line(cx-65,hip+10,cx-90,hip-5,'#e6c783');
   else shape+=line(cx-10,hip,cx-40,low?245:235,'#76cfa2')+line(cx-40,low?245:235,cx-32,285,'#76cfa2');
   shape+=line(cx,hy+38,cx-45,overhead?hy-28:hy+50,'#76cfa2')+line(cx,hy+38,cx+45,overhead?hy-28:hy+50,'#76cfa2');
   if(type==='strength')shape+=line(cx-58,hy+35,cx+58,hy+35)+`<rect x="${cx-62}" y="${hy+20}" width="10" height="30" fill="#e6c783"/><rect x="${cx+52}" y="${hy+20}" width="10" height="30" fill="#e6c783"/>`;
   return shape;
  };
  body=text(30,40,type==='squat'?'Observe the stated depth':type==='strength'?'Example: a familiar squat':'Observe each side · task defined locally',24)+person(160,false,type==='squat')+person(450,true,type==='squat')+arrow(260,185,340,185)+line(45,290,590,290,'#90b49e')+text(55,325,'Setup',23)+text(365,325,'Controlled execution',23);
  if(type==='single')body+=text(35,75,'Free leg remains off the ground',20);
 }else if(type==='push'){
  body=text(30,45,'Example: horizontal press · choose variant',24);
  for(const [cx,raised] of [[150,false],[450,true]]){
   body+=line(cx-50,235,cx+75,235,'#90b49e')+line(cx-30,235,cx-30,280,'#90b49e')+`<circle cx="${cx-40}" cy="215" r="15" fill="#76cfa2"/>`+line(cx-20,215,cx+55,215,'#76cfa2')+line(cx+55,215,cx+100,265,'#76cfa2')+line(cx,215,cx,raised?120:175,'#76cfa2')+line(cx-45,raised?120:175,cx+45,raised?120:175)+`<rect x="${cx-50}" y="${raised?105:160}" width="10" height="30" fill="#e6c783"/>`;
  }
  body+=arrow(285,180,335,180)+text(35,325,'Fixed range · appropriate supervision',23);
 }else if(type==='pull'){
  body=text(30,45,'Example: band row · choose variant',24)+`<circle cx="180" cy="115" r="18" fill="#76cfa2"/>`+line(180,137,180,215,'#76cfa2')+line(180,215,140,290,'#76cfa2')+line(180,215,220,290,'#76cfa2')+line(180,155,275,160,'#76cfa2')+line(275,160,545,160)+line(545,90,545,280,'#90b49e')+arrow(365,210,285,210)+text(30,325,'Fixed support, range and resistance',23);
 }else if(type==='throw'||type==='service'||type==='kick'||type==='aerial'){
  const heading={throw:'Throw to a predefined target',service:'Deliver a ground ball both ways',kick:'Kick type + target fixed in advance',aerial:'Position → call → secure → choose'}[type];
  body=text(30,45,heading,24)+`<circle cx="130" cy="140" r="18" fill="#76cfa2"/>`+line(130,160,130,230,'#76cfa2')+line(130,230,100,285,'#76cfa2')+line(130,230,170,285,'#76cfa2');
  const by=type==='service'?270:type==='kick'?255:95;
  body+=line(130,180,185,type==='throw'?100:190,'#76cfa2')+`<ellipse cx="205" cy="${by}" rx="18" ry="11" fill="#e6c783"/>`+`<path d="M235 ${by} Q350 65 485 140" fill="none" stroke="#e6c783" stroke-width="4" stroke-dasharray="9 7" marker-end="url(#arrow)"/>`+`<rect x="490" y="95" width="110" height="110" rx="12" fill="none" stroke="#90b49e" stroke-width="4"/>`+text(487,245,type==='aerial'?'Catch area':'Target',23)+text(30,325,'Illustrative layout · fix local conditions',22);
 }else if(type==='shuttle'||type==='repeat')body=text(40,55,type==='repeat'?'Fixed effort + fixed recovery':'Use the chosen published protocol',24)+arrow(80,125,550,125)+arrow(550,205,80,205)+text(50,290,'Record every completed effort',24);
 else if(type==='ankle')body=text(35,55,'Knee towards wall · heel stays down',24)+line(495,90,495,270,'#90b49e')+line(85,270,495,270,'#90b49e')+line(220,265,355,265)+line(245,255,350,185)+arrow(365,180,475,180)+text(140,315,'Measure toe-to-wall distance',22);
 else {
  const labels={strength:['Setup','Lift','Record'],push:['Setup','Press','Record'],pull:['Setup','Pull','Record'],squat:['Set stance','Observe squat','Record depth'],single:['Set task','Observe control','Compare sides'],tackle:['Track / prepare','Connect / drive','Finish / reload'],carry:['Scan','Choose action','Keep continuity'],breakdown:['Arrive','Read legal role','Act / reload'],scrum:['Prepare','Coach progression','Unit role'],lineout:['Assigned role','Coordinate','Return safely'],throw:['Fixed start','Defined target','Log accuracy'],base:['Control base','Connect with 9','Choose action'],service:['Ground ball','Deliver both ways','Review choice'],aerial:['Position / call','Catch / land','Next action'],kick:['Read / choose','Kick to target','Review outcome']}[type];
  body=text(35,55,'Task overview · not to scale',25);
  for(let i=0;i<3;i++){const x=35+i*200;body+=`<rect x="${x}" y="105" width="180" height="115" rx="18" fill="#2e4c3b" stroke="#90b49e"/>`+text(x+15,145,String(i+1),27)+text(x+10,195,labels[i],17);if(i<2)body+=arrow(x+182,162,x+195,162);}
  body+=text(35,285,'See procedure and coaching notes below',23);
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 340" role="img"><title>${esc(diagramText(type))}</title><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#e6c783"/></marker></defs><rect width="640" height="340" rx="22" fill="#152b20"/><g fill="#f6f3e8" font-family="system-ui,sans-serif">${body}</g></svg>\n`;
}
function index(){return shell('Position & assessment library','Understand your position, why each assessment matters and what published reference results can tell you.',`${lead('Your rugby development library','Know your role. Understand your tests.','Explore the job, the qualities behind it and the evidence that can guide your development.')}<nav class="jump"><a href="#positions">15 position guides</a><a href="#assessments">29 assessment guides</a><a href="#benchmarks">Published references</a></nav><section id="positions"><h2>Choose your position</h2><p>Each role connects the rugby job to its assessment menu and development questions.</p><div class="grid positions">${roleText.positions.map(p=>`<a class="position-card" href="${positionUrl(p.number)}"><span class="jersey">${p.number}</span><span><span class="eyebrow">${p.number<=8?'Forwards':'Backs'}</span><strong>${esc(p.title)}</strong></span><span aria-hidden="true">↗</span></a>`).join('')}</div></section><section id="assessments"><h2>Explore an assessment</h2><label class="search">Search the guides<input type="search" data-card-search placeholder="Try 505, speed or lineout"></label><p data-search-status role="status"></p><div class="grid">${candidates.protocols.map(p=>`<article class="card" data-search-card><p class="eyebrow">${esc(words(p.domain))}</p><h3>${a(assessmentUrl(p.id),p.name)}</h3><p>${esc(lessons.assessments[p.id].what)}</p>${a(assessmentUrl(p.id),'Learn the test →')}</article>`).join('')}</div></section><section id="benchmarks" class="panel"><h2>How benchmarks work</h2>${scientificContext()}<p>Mean is the group average. Standard deviation describes spread around that mean; it is not a published minimum–maximum range. A mean ± SD does not supply a pass band or percentile.</p><p>Available references include club, collegiate, elite domestic, professional and international cohorts. They cover different tests, methods and populations. Numerical references live on the relevant assessment pages.</p>${ul(benchmarks.availability.map(x=>x.target+': '+x.status+'. '+x.note))}<details><summary>Research sources</summary><ul>${benchmarks.sources.map(s=>`<li>${a(s.url,s.title)}<p class="meta">${esc(s.population)}</p></li>`).join('')}</ul></details><p>Reviewed ${benchmarks.reviewedAt}. New verified data can be added without inventing missing standards.</p></section>`);}
function outputs(){validate();const out=new Map();out.set('public/rugby-learning.html',index());for(const p of profiles.profiles)out.set('public'+positionUrl(p.number),positionPage(p));for(const p of candidates.protocols)out.set('public'+assessmentUrl(p.id),assessmentPage(p));for(const type of new Set(Object.values(lessons.assessments).map(l=>l.diagram)))out.set('public/rugby-learning-assets/'+type+'.svg',diagram(type));return out;}
function build(check=false){let mismatches=[];const out=outputs();for(const [relative,content] of out){const file=path.join(root,relative);if(check){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==content)mismatches.push(relative);}else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);}}if(mismatches.length)throw Error('Generated guides out of date: '+mismatches.join(', '));return out.size;}
if(require.main===module)try{console.log(`${process.argv.includes('--check')?'Verified':'Built'} ${build(process.argv.includes('--check'))} guide/illustration files`);}catch(error){console.error(error.message);process.exitCode=1;}
module.exports={outputs,validate,build,diagramText,assessmentUrl,positionUrl};
