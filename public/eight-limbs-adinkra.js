(async () => {
  "use strict";
  const weeks = [
    {
      limb: "Yama",
      symbol: "Mpatapo",
      meaning: "reconciliation and peacemaking",
      bridge:
        "How we relate to others becomes practice. Choose non-harm, truth and boundaries that restore relationship.",
      focus: "Where can I respond with both honesty and care?",
    },
    {
      limb: "Niyama",
      symbol: "Sankofa",
      meaning: "return, learn and carry wisdom forward",
      bridge:
        "Personal practice includes remembering what has already taught you. Look back with purpose, then move forward cleaner.",
      focus: "What lesson from my own life is ready to guide me now?",
    },
    {
      limb: "Asana",
      symbol: "Aya",
      meaning: "endurance, resourcefulness and independence",
      bridge:
        "Posture is not a performance. It is a place to meet challenge with adaptability, strength and self-respect.",
      focus: "What does steady strength feel like in my body today?",
    },
    {
      limb: "Pranayama",
      symbol: "Nkonsonkonson",
      meaning: "connection and the chain of relationship",
      bridge:
        "Breath reminds us that we do not practice alone. Receive, release and make room for the community around you.",
      focus: "What changes when I make my exhale a little more spacious?",
    },
    {
      limb: "Pratyahara",
      symbol: "Akofena",
      meaning: "courage and readiness",
      bridge:
        "Turning inward is not hiding. It is the courageous choice to protect attention from every demand competing for it.",
      focus: "What input can I set down so I can hear myself clearly?",
    },
    {
      limb: "Dharana",
      symbol: "Nyame Nti",
      meaning: "faith, sustenance and a source beyond distraction",
      bridge:
        "Focused attention grows through returning, again and again, to what truly nourishes your purpose.",
      focus: "What single anchor will I return to when my mind wanders?",
    },
    {
      limb: "Dhyana",
      symbol: "Adinkrahene",
      meaning: "leadership, centrality and influence",
      bridge:
        "Meditation asks us to sit at the center of our own awareness—less reactive, more present, more able to lead ourselves.",
      focus: "What can I notice without needing to fix it?",
    },
    {
      limb: "Samadhi",
      symbol: "Funtunfunefu Denkyemfunefu",
      meaning: "unity in diversity and shared destiny",
      bridge:
        "Integration does not erase difference. It lets us recognize that our paths are connected, even when our expressions differ.",
      focus: "How can my wholeness make more room for someone else’s?",
    },
  ];
  // The older Eight Limbs course is independent of the Eight Pillars journey.
  // No day advances until the member explicitly starts this course.
  let limbStart=null;
  try{
    const response=await fetch("/api/pan-african/progress",{credentials:"same-origin",cache:"no-store"});
    if(!response.ok)throw new Error("Membership progress unavailable");
    limbStart=(await response.json()).progress?.combinedEightLimbsStart||null;
  }catch(error){document.querySelector("#todayContent").textContent=error.message;return;}
  const today=new Date();
  const localDate=[today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),String(today.getDate()).padStart(2,"0")].join("-");
  const elapsed=limbStart?Math.max(0,Math.floor((Date.parse(localDate+"T12:00:00")-Date.parse(limbStart+"T12:00:00"))/86400000)):0;
  const index=limbStart?Math.min(7,Math.floor(elapsed/7)):0;
  const day=limbStart?Math.min(7,elapsed%7+1):1;
  const current=weeks[index];
  const escapeHtml = (value) =>
    String(value || "").replace(
      /[&<>"']/g,
      (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
          character
        ],
    );
  function renderToday({ lesson, story } = {}) {
    const lessonBlock = lesson
      ? `<div class="practice"><p class="eyebrow">Today’s practice · Day ${day}</p><p><strong>${escapeHtml(lesson.lesson)}</strong></p><p><strong>Try:</strong> ${escapeHtml(lesson.action)}</p><p><strong>Reflect:</strong> ${escapeHtml(lesson.question)}</p></div>`
      : `<p class="muted">The daily practice is loading from the Mindfulness curriculum.</p>`;
    const storyBlock = story
      ? `<milele-narration title="${escapeHtml(story.title)}"><div data-transcript><p>${escapeHtml(story.story)}</p></div></milele-narration>`
      : "";
    document.querySelector("#todayContent").innerHTML =
      `<p class="today-label">WEEK ${index + 1} · ${current.limb.toUpperCase()}</p><h2>${current.limb} + ${current.symbol}</h2><p class="symbol">${current.symbol} · ${current.meaning}</p><p>${current.bridge}</p><p><strong>Weekly reflection:</strong> ${current.focus}</p>${lessonBlock}${storyBlock}<p><a class="button" href="/mindfulness.html?community=pac#pac-community-today">Start today in the Mindfulness Dashboard →</a><a class="button secondary" href="/awareness-journey.html">Take today’s awareness practice →</a></p>`;
  }
  if (!limbStart) {
    document.querySelector("#todayContent").innerHTML = `<h2>Start your Eight Limbs journey when you are ready</h2><p>Membership does not start the lessons automatically. Your first day begins when you choose to start.</p><button class="button" id="startLimbJourney">Start My Journey · Day One</button><p class="muted">Your start date is saved to your verified member account.</p>`;
    document.querySelector("#startLimbJourney").addEventListener("click",async()=>{
      const button=document.querySelector("#startLimbJourney");button.disabled=true;
      try{
        const response=await fetch("/api/pan-african/start",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"combined"})});
        if(!response.ok)throw new Error("Unable to save your start date");
        location.reload();
      }catch(error){button.disabled=false;button.insertAdjacentText("afterend"," "+error.message);}
    });
  } else renderToday();
  document.querySelector("#weeks").innerHTML = weeks
    .map(
      (week, i) =>
        `<article class="week ${i === index ? "today" : ""}"><div class="number">WEEK ${i + 1} · EIGHT LIMBS</div><h3>${week.limb}</h3><p class="symbol">${week.symbol}<br><span class="muted">${week.meaning}</span></p><p class="lesson">${week.bridge}</p><p><strong>Weekly reflection:</strong> ${week.focus}</p></article>`,
    )
    .join("");
  Promise.all([
    fetch("/mindfulness-limbs-v1.json").then((response) => {
      if (!response.ok) throw new Error("Curriculum unavailable");
      return response.json();
    }),
    fetch("/mindfulness-weekly-stories-v1.json").then((response) => {
      if (!response.ok) throw new Error("Stories unavailable");
      return response.json();
    }),
  ])
    .then(([curriculum, stories]) => {
      if (!limbStart) return;
      renderToday({
        lesson: (curriculum.lessons || []).find(
          (item) => item.week === index + 1 && item.day === day,
        ),
        story: (stories.stories || []).find((item) => item.week === index + 1),
      });
    })
    .catch(() => { if(limbStart)renderToday(); });
})();
