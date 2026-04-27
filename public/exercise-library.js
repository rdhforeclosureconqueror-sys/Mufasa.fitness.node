(function () {
  "use strict";

  const DEFAULT_ASSET_HOST = "https://mufasa-fitness-node.onrender.com";

  function normalizeBaseUrl(value) {
    return String(value || "").trim().replace(/\/$/, "");
  }

  function resolveAssetHostCandidates() {
    const configuredNodeBase = normalizeBaseUrl(localStorage.getItem("maatNodeBaseUrl"));
    const origin = normalizeBaseUrl(window.location.origin);
    return [configuredNodeBase, DEFAULT_ASSET_HOST, origin, ""]
      .map(normalizeBaseUrl)
      .filter((v, i, arr) => v || i === arr.length - 1)
      .filter((v, i, arr) => arr.indexOf(v) === i);
  }

  function buildExerciseDbUrl(baseUrl, relPath) {
    const base = normalizeBaseUrl(baseUrl);
    const rel = String(relPath || "").replace(/^\/+/, "");
    return base ? `${base}/${rel}` : `/${rel}`;
  }
  const cardsEl = document.getElementById("cards");
  const statsEl = document.getElementById("stats");
  const hiddenNoticeEl = document.getElementById("hiddenNotice");
  const searchInputEl = document.getElementById("searchInput");
  const categorySelectEl = document.getElementById("categorySelect");

  let exercises = [];
  let hiddenDueToBrokenImage = 0;

  function normalize(v) {
    return String(v || "").toLowerCase().trim();
  }

  function firstInstructionLines(ex) {
    const instructions = Array.isArray(ex.instructions) ? ex.instructions : [];
    return instructions.filter(Boolean).slice(0, 3);
  }

  function getImageCandidates(ex) {
    const raw = Array.isArray(ex.images) ? ex.images : [];
    return raw
      .filter(Boolean)
      .map((rel) => buildExerciseDbUrl(window.__EXERCISE_LIBRARY_ASSET_HOST, `exercise-db/${rel}`));
  }

  function getCategories(list) {
    return [...new Set(list.map((ex) => ex.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function passesFilter(ex, query, category) {
    const q = normalize(query);
    const c = normalize(category);
    if (c && normalize(ex.category) !== c) return false;
    if (!q) return true;

    const haystack = [
      ex.name,
      ex.id,
      ex.category,
      ex.equipment,
      ...(Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles : []),
      ...(Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [])
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  }

  function updateStats(list) {
    statsEl.textContent = `Showing ${list.length} exercises with image candidates. Hidden broken-image cards this session: ${hiddenDueToBrokenImage}.`;
    if (hiddenDueToBrokenImage > 0) {
      hiddenNoticeEl.classList.remove("hidden");
      hiddenNoticeEl.textContent = `${hiddenDueToBrokenImage} exercises were hidden because no image URL loaded.`;
    } else {
      hiddenNoticeEl.classList.add("hidden");
      hiddenNoticeEl.textContent = "";
    }
  }

  function render() {
    const query = searchInputEl.value;
    const category = categorySelectEl.value;

    const filtered = exercises.filter((ex) => passesFilter(ex, query, category));
    cardsEl.innerHTML = "";

    for (const ex of filtered) {
      const imageCandidates = getImageCandidates(ex);
      if (!imageCandidates.length) continue;

      const card = document.createElement("article");
      card.className = "card";

      const img = document.createElement("img");
      const title = ex.name || ex.id || "Unnamed exercise";
      img.alt = `${title} exercise image`;
      img.loading = "lazy";
      img.decoding = "async";

      let imageIdx = 0;
      img.src = imageCandidates[imageIdx];
      img.addEventListener("error", () => {
        imageIdx += 1;
        if (imageIdx < imageCandidates.length) {
          img.src = imageCandidates[imageIdx];
          return;
        }
        card.remove();
        hiddenDueToBrokenImage += 1;
        updateStats(filtered);
      });

      const content = document.createElement("div");
      content.className = "content";

      const tags = [ex.category, ex.equipment, (ex.primaryMuscles || [])[0]].filter(Boolean)
        .map((v) => `<span class="tag">${v}</span>`)
        .join("");

      const instructions = firstInstructionLines(ex)
        .map((line) => `<li>${line}</li>`)
        .join("");

      content.innerHTML = `
        <div class="title">${title}</div>
        <div class="tags">${tags}</div>
        ${instructions ? `<ul>${instructions}</ul>` : `<div class="muted">No instructions available.</div>`}
      `;

      card.appendChild(img);
      card.appendChild(content);
      cardsEl.appendChild(card);
    }

    updateStats(filtered);
  }

  async function init() {
    try {
      let data = null;
      let lastErr = null;

      for (const host of resolveAssetHostCandidates()) {
        const indexUrl = buildExerciseDbUrl(host, "exercise-db/index.json");
        try {
          const res = await fetch(indexUrl, { cache: "no-store" });
          if (!res.ok) throw new Error(`Failed to load index (${res.status})`);
          data = await res.json();
          window.__EXERCISE_LIBRARY_ASSET_HOST = normalizeBaseUrl(host);
          window.__EXERCISE_LIBRARY_INDEX_URL = indexUrl;
          break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!data) throw (lastErr || new Error("Failed to load exercise index"));
      const list = Array.isArray(data) ? data : (Array.isArray(data.exercises) ? data.exercises : []);
      exercises = list.filter((ex) => getImageCandidates(ex).length > 0);

      for (const category of getCategories(exercises)) {
        const opt = document.createElement("option");
        opt.value = category;
        opt.textContent = category;
        categorySelectEl.appendChild(opt);
      }

      render();
    } catch (err) {
      cardsEl.innerHTML = `<p class="warn">Could not load exercise index: ${String(err.message || err)}</p>`;
      statsEl.textContent = "";
    }
  }

  searchInputEl.addEventListener("input", render);
  categorySelectEl.addEventListener("change", render);
  init();
})();
