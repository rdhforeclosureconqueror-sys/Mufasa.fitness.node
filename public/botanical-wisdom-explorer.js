"use strict";
(() => {
  const sources = [
    {title:"Dr. Sebi Nutritional Guide",url:"https://drsebis.com/pages/nutritional-guide",kind:"Official-site guide",topics:["food","diet","nutrition","alkaline","electric","mucus","vegetable","fruit","eat"]},
    {title:"African Bio-Mineral Balance",url:"https://drsebis.com/pages/african-bio-mineral-balance",kind:"Official-site philosophy overview",topics:["mineral","balance","africa","african","philosophy","body","nutrition"]},
    {title:"Dr. Sebi Speaks, Vol. 1",url:"https://drsebis.com/products/dr-sebi-speaks-vol-1-dvd",kind:"Lecture listing (not transcript)",topics:["lecture","speech","speak","history","life","sebi","bowman","teaching"]},
    {title:"Cell Food Ingredients compilation",url:"https://advocatesfordrsebi.org/cell-food-ingredients/",kind:"Independent secondary compilation",topics:["herb","ingredient","formula","compound","botanical","iron","bromide","bio ferro","supplement"]}
  ];
  function render(question) {
    const results = document.getElementById("botanicalSearchResults");
    if (!results) return;
    const tokens = String(question || "").toLowerCase().match(/[a-z]{3,}/g) || [];
    if (!tokens.length) { results.textContent = "Enter a topic or question to locate relevant source documents."; return; }
    const stopWords = new Set(["what", "when", "where", "which", "would", "could", "should", "does", "did", "this", "that", "these", "those", "about", "with", "from", "into", "have", "been", "were", "they", "them", "their", "teach", "taught", "cure", "treat", "help"]);
    const keywords = tokens.filter(t => !stopWords.has(t));
    const matches = sources.filter(s => keywords.some(t => s.topics.some(topic => topic === t || (t.length >= 5 && topic.startsWith(t)) || (topic.length >= 5 && t.startsWith(topic)))));
    results.replaceChildren();
    const intro = document.createElement("p");
    intro.textContent = matches.length ? "Related documents to inspect (not generated answers):" : "No source is indexed for that topic yet. Try food, minerals, lectures, or herbs.";
    results.append(intro);
    for (const source of matches) {
      const p = document.createElement("p");
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = source.title;
      p.append(link, document.createTextNode(" — " + source.kind));
      results.append(p);
    }
    const note = document.createElement("p");
    note.textContent = "No verified passage or timestamp is indexed yet. This tool does not claim what Dr. Sebi said or offer treatment instructions.";
    results.append(note);
  }
  document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("botanicalQuestion");
    const button = document.getElementById("botanicalSearchBtn");
    if (!input || !button) return;
    button.addEventListener("click", () => render(input.value));
    input.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); render(input.value); } });
  });
})();
