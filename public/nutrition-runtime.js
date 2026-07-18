(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const state = { token: null, entries: [], selectedEntryIds: new Set(), stream: null, scanTimer: null, lastBarcode: null, lastScanAt: 0, zxingReader: null };
  function today() { return new Date().toISOString().slice(0, 10); }
  function authToken() { return window.AuthStateRuntime?.getAuthToken?.() || window.APP_AUTH?.token || localStorage.getItem("authToken") || localStorage.getItem("pocket_pt_auth_token") || null; }
  async function api(path, options = {}) {
    const token = state.token || authToken();
    const res = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}), ...(token ? { authorization: `Bearer ${token}` } : {}) } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) { const err = new Error(json.error?.message || json.error || "Request failed"); err.status = res.status; err.payload = json; throw err; }
    return json.data || json;
  }
  function showAuthWall() { $("authWall").hidden = false; $("journalShell").hidden = true; }
  function showJournal() { $("authWall").hidden = true; $("journalShell").hidden = false; }
  async function requireSession() {
    state.token = authToken();
    if (!state.token) return showAuthWall();
    try {
      if (window.AuthStateRuntime?.refreshAuthStatus) {
        const auth = await window.AuthStateRuntime.refreshAuthStatus({ token: state.token, reason: "nutrition:requireSession" });
        if (!auth?.ok) return showAuthWall();
        state.token = auth.token || state.token;
      } else {
        await api("/api/auth/me");
      }
      showJournal(); await refreshAll();
    } catch (_) { showAuthWall(); }
  }
  function setPanel(id) { document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === id)); }
  function mealTypeSelect(value = "snack") { return `<select data-field="mealType"><option ${value === "breakfast" ? "selected" : ""}>breakfast</option><option ${value === "lunch" ? "selected" : ""}>lunch</option><option ${value === "dinner" ? "selected" : ""}>dinner</option><option ${value === "snack" ? "selected" : ""}>snack</option><option ${value === "other" ? "selected" : ""}>other</option></select>`; }
  function reviewHtml(food, source) {
    const calc = food.calculatedServing || {};
    return `<h3>${escapeHtml(food.foodName || "Food")}</h3><p class="muted">${escapeHtml(food.brand || "")} <span class="pill">${source}</span> ${food.isEstimated ? '<span class="pill estimated">Estimated</span>' : ""}</p><p>${escapeHtml(food.notice || food.estimateReason || "Review serving before saving.")}</p><label>Meal</label>${mealTypeSelect()}<label>Amount</label><input data-field="amount" type="number" min="0" step="0.1" value="1"><label>Unit</label><select data-field="unit"><option>serving</option><option>g</option><option>oz</option><option>cup</option><option>piece</option></select><label>Notes</label><input data-field="notes" placeholder="Optional notes"><div class="summary"><div class="metric"><strong>${calc.calories ?? food.nutrients?.per100g?.calories ?? 0}</strong><span>cal</span></div><div class="metric"><strong>${calc.proteinGrams ?? food.nutrients?.per100g?.proteinGrams ?? 0}g</strong><span>protein</span></div><div class="metric"><strong>${calc.carbohydrateGrams ?? food.nutrients?.per100g?.carbohydrateGrams ?? 0}g</strong><span>carbs</span></div><div class="metric"><strong>${calc.fatGrams ?? food.nutrients?.per100g?.fatGrams ?? 0}g</strong><span>fat</span></div></div><button class="btn primary" data-log-review>Confirm and log</button>`;
  }
  function bindReview(container, food) {
    container.hidden = false; container.innerHTML = reviewHtml(food, food.source || "custom");
    container.querySelector("[data-log-review]").onclick = async () => {
      const payload = { foodName: food.foodName, brand: food.brand, source: food.source || "custom", sourceId: food.sourceId, barcode: food.barcode, localDate: $("journalDate").value, mealType: container.querySelector('[data-field="mealType"]').value, amount: Number(container.querySelector('[data-field="amount"]').value || 1), unit: container.querySelector('[data-field="unit"]').value, servingQuantity: food.servingQuantity, servingUnit: food.servingUnit, servingsConsumed: container.querySelector('[data-field="unit"]').value === "serving" ? Number(container.querySelector('[data-field="amount"]').value || 1) : null, nutrients: food.nutrients, ingredients: food.ingredients, allergens: food.allergens, isEstimated: food.isEstimated, estimateReason: food.estimateReason, notes: container.querySelector('[data-field="notes"]').value };
      await api("/api/me/nutrition/entries", { method: "POST", body: JSON.stringify(payload) });
      container.innerHTML = '<p class="notice">Saved to your private food journal.</p>'; await refreshAll();
    };
  }
  async function lookupBarcode(code) { $("barcodeStatus").textContent = "Looking up barcode…"; const product = await api(`/api/nutrition/barcodes/${encodeURIComponent(code)}`); if (!product.found) { $("barcodeStatus").textContent = product.message || "Product not found. Try search or custom entry."; return; } $("barcodeStatus").textContent = `Detected ${product.barcode}`; bindReview($("productReview"), product); }
  async function startScanner() {
    const video = $("scannerVideo"); video.hidden = false; $("barcodeStatus").textContent = "Starting scanner…";
    if (!navigator.mediaDevices?.getUserMedia) { $("barcodeStatus").textContent = "Camera is unavailable. Enter barcode manually."; return; }
    state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    video.srcObject = state.stream; await video.play();
    const formats = ["upc_a", "upc_e", "ean_8", "ean_13"];
    if ("BarcodeDetector" in window) {
      const detector = new BarcodeDetector({ formats });
      const tick = async () => { if (!state.stream) return; try { const codes = await detector.detect(video); if (codes[0]) return handleDetected(codes[0].rawValue); } catch (e) { $("barcodeStatus").textContent = "Native scanner failed. Use manual entry or fallback."; } state.scanTimer = setTimeout(tick, 250); };
      tick();
    } else {
      $("barcodeStatus").textContent = "Native BarcodeDetector unavailable. Loading maintained ZXing browser fallback…";
      try { const mod = await import("https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm"); state.zxingReader = new mod.BrowserMultiFormatReader(); await state.zxingReader.decodeFromVideoDevice(undefined, video, (result) => { if (result?.getText) handleDetected(result.getText()); }); }
      catch (_) { $("barcodeStatus").textContent = "Scanner fallback could not load. Enter barcode manually."; }
    }
  }
  async function handleDetected(raw) { const barcode = String(raw || "").replace(/\D/g, ""); const now = Date.now(); if (!/^\d{6,14}$/.test(barcode)) return; if (state.lastBarcode === barcode && now - state.lastScanAt < 2500) return; state.lastBarcode = barcode; state.lastScanAt = now; stopScanner(); await lookupBarcode(barcode); }
  function stopScanner() { if (state.scanTimer) clearTimeout(state.scanTimer); state.scanTimer = null; if (state.zxingReader?.reset) state.zxingReader.reset(); state.zxingReader = null; if (state.stream) state.stream.getTracks().forEach((track) => track.stop()); state.stream = null; const v = $("scannerVideo"); if (v) { v.pause(); v.srcObject = null; v.hidden = true; } }
  async function searchFoods() { const q = $("foodSearchInput").value; const out = $("foodResults"); out.innerHTML = "Searching…"; try { const data = await api(`/api/nutrition/foods/search?q=${encodeURIComponent(q)}&limit=10`); out.innerHTML = data.results.map((food) => `<div class="row"><div class="row-main"><strong>${escapeHtml(food.foodName)}</strong><div class="muted">${escapeHtml(food.brand || food.dataType || "USDA")} ${food.isEstimated ? '<span class="pill estimated">Estimated</span>' : ""}</div></div><button class="btn" data-fdc="${food.fdcId}">Review</button></div>`).join("") || "No foods found."; out.querySelectorAll("[data-fdc]").forEach((btn) => btn.onclick = async () => bindReview(out, await api(`/api/nutrition/foods/${btn.dataset.fdc}`))); } catch (e) { out.textContent = e.message; } }
  function renderCustomForm() { $("customForm").innerHTML = `<label>Food name</label><input data-c="foodName"><label>Calories</label><input data-c="calories" type="number"><label>Protein g</label><input data-c="proteinGrams" type="number"><label>Carbs g</label><input data-c="carbohydrateGrams" type="number"><label>Fat g</label><input data-c="fatGrams" type="number"><label>Fiber g</label><input data-c="fiberGrams" type="number"><label>Sodium mg</label><input data-c="sodiumMilligrams" type="number"><label>Meal</label>${mealTypeSelect()}<button class="btn primary" id="customSaveBtn">Save custom food</button>`; $("customSaveBtn").onclick = async () => { const payload = { source: "custom", localDate: $("journalDate").value, amount: 1, unit: "serving", isEstimated: false }; document.querySelectorAll("[data-c]").forEach((el) => payload[el.dataset.c] = el.type === "number" ? Number(el.value || 0) : el.value); payload.mealType = $("customForm").querySelector('[data-field="mealType"]').value; await api("/api/me/nutrition/entries", { method: "POST", body: JSON.stringify(payload) }); await refreshAll(); }; }
  async function createDraft() { const out = $("draftReview"); out.innerHTML = "Creating draft…"; const draft = await api("/api/nutrition/drafts/natural-language", { method: "POST", body: JSON.stringify({ text: $("naturalText").value }) }); out.innerHTML = `<p class="notice">${escapeHtml(draft.message)}</p>` + draft.candidates.map((c) => `<div class="row"><div><strong>${escapeHtml(c.phrase)}</strong><div class="muted">Search: ${escapeHtml(c.searchQuery)}</div>${c.possibleClarifications.map((q) => `<span class="pill estimated">${escapeHtml(q)}</span>`).join("")}</div><button class="btn" data-search="${escapeHtml(c.searchQuery)}">Search this</button></div>`).join(""); out.querySelectorAll("[data-search]").forEach((b) => b.onclick = () => { setPanel("searchPanel"); $("foodSearchInput").value = b.dataset.search; searchFoods(); }); }
  async function refreshAll() { await Promise.all([loadEntries(), loadSummary(), loadEducation()]); }
  async function loadEntries() { const data = await api(`/api/me/nutrition/entries?date=${$("journalDate").value}`); state.entries = data.entries; $("entriesList").innerHTML = state.entries.map((e) => `<div class="row"><input type="checkbox" data-select="${e.entryId}"><div class="row-main"><strong>${escapeHtml(e.foodName)}</strong><div class="muted">${e.mealType} · ${e.calories ?? 0} cal · ${e.source} ${e.isEstimated ? '<span class="pill estimated">Estimated</span>' : ""}</div></div><button class="btn" data-edit="${e.entryId}">Edit</button><button class="btn danger" data-delete="${e.entryId}">Delete</button></div>`).join("") || '<p class="muted">No entries logged for this date.</p>'; $("entriesList").querySelectorAll("[data-delete]").forEach((b) => b.onclick = async () => { await api(`/api/me/nutrition/entries/${b.dataset.delete}`, { method: "DELETE" }); await refreshAll(); }); $("entriesList").querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => editEntry(b.dataset.edit)); $("entriesList").querySelectorAll("[data-select]").forEach((box) => box.onchange = () => box.checked ? state.selectedEntryIds.add(box.dataset.select) : state.selectedEntryIds.delete(box.dataset.select)); }
  function editEntry(id) { const e = state.entries.find((x) => x.entryId === id); if (!e) return; const name = prompt("Food name", e.foodName); if (name === null) return; const amount = Number(prompt("Amount consumed", e.amount || 1) || e.amount || 1); api(`/api/me/nutrition/entries/${id}`, { method: "PUT", body: JSON.stringify({ ...e, foodName: name, amount }) }).then(refreshAll); }
  async function loadSummary() { const s = await api(`/api/me/nutrition/summary?date=${$("journalDate").value}`); const f = s.fullDay; $("dailySummary").innerHTML = [["Calories", f.calories], ["Protein", f.proteinGrams + "g"], ["Carbs", f.carbohydrateGrams + "g"], ["Fat", f.fatGrams + "g"], ["Fiber", f.fiberGrams + "g"], ["Sodium", f.sodiumMilligrams + "mg"]].map(([k, v]) => `<div class="metric"><strong>${v}</strong><span>${k}</span></div>`).join("") + `<p class="muted">Meals logged: ${f.mealsLogged}. Estimated entries: ${f.estimatedEntryCount}. Breakfast/lunch/dinner/snacks totals are available from the API.</p>`; }
  async function loadEducation() { const e = await api(`/api/me/nutrition/education?date=${$("journalDate").value}`); $("educationSummary").innerHTML = e.messages.map((m) => `<p>${escapeHtml(m)}</p>`).join(""); }
  async function loadRecent() { const [r, m] = await Promise.all([api("/api/me/nutrition/recent"), api("/api/me/nutrition/meals")]); $("recentList").innerHTML = `<h3>Recent foods</h3>` + r.items.map((e) => `<div class="row"><div><strong>${escapeHtml(e.foodName)}</strong><div class="muted">${e.calories ?? 0} cal</div></div><button class="btn" data-repeat="${e.entryId}">Log again</button></div>`).join(""); $("mealList").innerHTML = `<h3>Saved meals</h3>` + m.meals.map((meal) => `<div class="row"><div><strong>${escapeHtml(meal.name)}</strong><div class="muted">${meal.entries.length} foods</div></div><button class="btn" data-meal="${meal.mealId}">Log meal</button></div>`).join(""); $("recentList").querySelectorAll("[data-repeat]").forEach((b) => b.onclick = async () => { const e = r.items.find((x) => x.entryId === b.dataset.repeat); await api("/api/me/nutrition/entries", { method: "POST", body: JSON.stringify({ ...e, localDate: $("journalDate").value }) }); await refreshAll(); }); $("mealList").querySelectorAll("[data-meal]").forEach((b) => b.onclick = async () => { await api(`/api/me/nutrition/meals/${b.dataset.meal}/log`, { method: "POST", body: JSON.stringify({ localDate: $("journalDate").value, servingsMultiplier: 1 }) }); await refreshAll(); }); }
  async function saveMeal() { const ids = Array.from(state.selectedEntryIds); if (!ids.length) return alert("Select entries to save as a meal."); const name = prompt("Meal name", "Saved meal"); if (!name) return; await api("/api/me/nutrition/meals", { method: "POST", body: JSON.stringify({ name, entryIds: ids }) }); await loadRecent(); }
  function escapeHtml(v) { return String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  document.addEventListener("DOMContentLoaded", () => { $("journalDate").value = today(); document.querySelectorAll("[data-open]").forEach((b) => b.onclick = () => setPanel(b.dataset.open)); $("startScanBtn").onclick = startScanner; $("stopScanBtn").onclick = stopScanner; $("lookupBarcodeBtn").onclick = () => lookupBarcode($("manualBarcode").value); $("foodSearchBtn").onclick = searchFoods; $("draftBtn").onclick = createDraft; $("refreshBtn").onclick = refreshAll; $("loadRecentBtn").onclick = loadRecent; $("saveMealBtn").onclick = saveMeal; $("journalDate").onchange = refreshAll; renderCustomForm(); requireSession(); });
  window.addEventListener("pagehide", stopScanner);
  window.NutritionRuntime = { startScanner, stopScanner, handleDetected, lookupBarcode, requireSession };
})();
