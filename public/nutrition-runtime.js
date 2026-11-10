(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const state = { weekly: { plan: null, groceryItems: [], pantry: [], missions: [], options: [], categories: [] }, token: null, entries: [], selectedEntryIds: new Set(), stream: null, scanTimer: null, lastBarcode: null, lastScanAt: 0, zxingReader: null, scannerBusy: false, scanGeneration: 0, nativeDetector: null };
  function today() { return new Date().toISOString().slice(0, 10); }
  function authToken() { return window.AuthStateRuntime?.getAuthToken?.() || null; }
  function backendUrl(path) {
    const baseUrl = (window.RuntimeState?.getBackendOrigin?.() || window.MAAT_BACKEND_ORIGIN || window.MAAT_NODE_BASE_URL || window.location.origin).replace(/\/$/, "");
    return `${baseUrl}${path}`;
  }
  async function api(path, options = {}) {
    const token = state.token || authToken();
    const res = await fetch(backendUrl(path), { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}), ...(token ? { authorization: `Bearer ${token}` } : {}) } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) { const err = new Error((typeof json.error?.message === "string" && json.error.message) || (typeof json.error === "string" && json.error) || `HTTP ${res.status}`); err.status = res.status; err.payload = json; throw err; }
    return json.data || json;
  }
  function setVisible(id) { ["authWall", "sessionStatus", "journalShell"].forEach((key) => { const el = $(key); if (el) el.hidden = key !== id; }); }
  function showAuthWall() { setVisible("authWall"); }
  function showSessionStatus(message, retry = true) {
    const msg = $("sessionStatusMessage");
    const retryLink = $("sessionRetryLink");
    if (msg) msg.textContent = message || "Nutrition Journal could not verify your member session yet. Please try again.";
    if (retryLink) retryLink.hidden = retry === false;
    setVisible("sessionStatus");
  }
  function showMembershipGate() {
    const status = $("sessionStatus");
    const message = $("sessionStatusMessage");
    const retry = $("sessionRetryLink");
    if (message) message.textContent = "Nutrition Journal is included with your seven-day free trial or an active fitness membership. Your saved entries are preserved.";
    if (retry) { retry.hidden = false; retry.href = "/trial.html"; retry.textContent = "Start trial or view access"; }
    if (status && !status.querySelector("#nutritionMembershipLink")) {
      const link = document.createElement("a");
      link.id = "nutritionMembershipLink";
      link.href = "/membership.html";
      link.className = "btn";
      link.textContent = "View memberships";
      status.appendChild(link);
    }
    setVisible("sessionStatus");
  }
  function showJournal() { setVisible("journalShell"); }
  async function requireSession() {
    showSessionStatus("Checking your signed-in member session…", false);
    state.token = authToken();
    if (!state.token) return showAuthWall();
    try {
      if (window.AuthStateRuntime?.refreshAuthStatus) {
        const auth = await window.AuthStateRuntime.refreshAuthStatus({ token: state.token, reason: "nutrition:requireSession" });
        if (!auth?.ok) {
          if (auth?.reason === "auth_unavailable") {
            // The shared auth client can fail before reaching the configured nutrition backend.
            // Validate the existing bearer token directly against the configured backend as a
            // recovery path; never treat a failed request as authenticated.
            try {
              await api("/api/auth/me");
            } catch (error) {
              if (error?.status === 401 || error?.status === 403) return showAuthWall();
              return showSessionStatus("Nutrition Journal could not reach the member session service. Your sign-in was not cleared; please retry in a moment.");
            }
          } else {
            return showAuthWall();
          }
        } else {
          state.token = auth.token || state.token;
        }
      } else {
        await api("/api/auth/me");
      }
      showJournal(); await refreshAll(); await loadWeekly();
    } catch (error) {
      if (error?.status === 402) return showMembershipGate();
      if (error?.status === 401 || error?.status === 403 || error?.code === "MISSING_AUTH_TOKEN") return showAuthWall();
      showSessionStatus("Nutrition Journal loaded your session but could not load journal data. Please retry in a moment.");
    }
  }
  function setPanel(id) { document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === id)); if (id === "scanPanel") { void startScanner(); } else { stopScanner(); } }
  function mealTypeSelect(value = "snack") { return `<select data-field="mealType"><option ${value === "breakfast" ? "selected" : ""}>breakfast</option><option ${value === "lunch" ? "selected" : ""}>lunch</option><option ${value === "dinner" ? "selected" : ""}>dinner</option><option ${value === "snack" ? "selected" : ""}>snack</option><option ${value === "other" ? "selected" : ""}>other</option></select>`; }
  function formatReviewNutrient(value, suffix = "") { return value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) ? "—" : `${Number(value)}${suffix}`; }
  // Milele Fit Food Standard v1: transparent, conservative ingredient-screening rubric.
  // Scores reflect Milele Fit preferences, NOT disease risk or medical safety.
  function mileleFoodStandard(food) {
    const raw = typeof food.ingredients === "string" ? food.ingredients : (food.ingredients?.text || food.ingredients?.ingredients_text || "");
    const ingredients = String(raw).toLowerCase().trim();
    const nova = Number(food.novaGroup || food.nova_group || 0);
    const labels = Array.isArray(food.labelsTags) ? food.labelsTags : [];
    const additives = Array.isArray(food.additivesTags) ? food.additivesTags : [];
    const analysis = Array.isArray(food.ingredientsAnalysisTags) ? food.ingredientsAnalysisTags : [];
    const hasIngredients = ingredients.length >= 12;
    const hasNova = [1,2,3,4].includes(nova);
    const labelNames = {"en:organic":"Organic", "en:usda-organic":"USDA Organic", "en:no-gmos":"Non-GMO", "en:non-gmo-project":"Non-GMO Project", "en:vegan":"Vegan", "en:no-gluten":"Gluten-free", "en:no-artificial-flavors":"No artificial flavors"};
    const claimed = [...new Set(labels.filter(x => labelNames[x]).map(x => labelNames[x]))];
    const rules = [
      [/high.fructose corn syrup/i, 1.5, "High-fructose corn syrup"],
      [/\b(?:red 40|red no\.? 40|yellow 5|yellow no\.? 5|yellow 6|yellow no\.? 6|blue 1|blue no\.? 1|blue 2|blue no\.? 2)\b/i, 1, "Specified synthetic food dye"],
      [/\b(?:sodium benzoate|potassium sorbate|bha|bht|tbhq)\b/i, 1, "Specified preservative"],
      [/\b(?:sugar|cane sugar|brown sugar|corn syrup|glucose syrup|dextrose)\b/i, 1, "Added sugar ingredient"]
    ];
    const findings = hasIngredients ? rules.filter(([pattern]) => pattern.test(ingredients)).map(([, points, label]) => ({points, label})) : [];
    // Database NOVA classification is contextual information, not independent evidence for a deduction.
    // A provider classification may be stale or contradict the physical ingredient label.
    const total = findings.reduce((sum,f) => sum + f.points,0);
    const score = Math.max(1,10-total);
    const complete = hasIngredients;
    const deductions = findings.length ? findings.map(f=>"<li>"+escapeHtml(f.label)+" <strong>−"+f.points+"</strong></li>").join("") : "<li>No selected deduction triggers identified in available data.</li>";
    const positive = claimed.length ? claimed.map(x=>"<li>"+escapeHtml(x)+" — database-reported label claim; not independently verified</li>").join("") : "<li>No qualifying label claims supplied.</li>";
    const gaps = ["Dr. Sebi food-guide alignment not evaluated", "GMO status not independently verified", "Full nutrition balance not scored"];
    if(!hasIngredients) gaps.unshift("Ingredient list missing or incomplete");
    if(!hasNova) gaps.unshift("NOVA processing category missing");
    if(nova === 4) gaps.unshift("Database reports NOVA 4; this does not automatically block an ingredient-based score");
    const quickSummary = !hasIngredients ? "Ingredient list unavailable — check package before deciding." : nova === 4 ? "Database reports NOVA 4; classification not independently verified." : nova === 3 ? "Processed (NOVA 3); review the ingredient details." : hasNova ? "Lower NOVA processing category; ingredient review still matters." : "Processing category unknown — check the label.";
    const gmoClaim = labels.some(x => /^(en:usda-organic|en:organic|en:no-gmos|en:non-gmo-project)$/.test(x));
    const nonGmoClaim = labels.some(x => /^(en:no-gmos|en:non-gmo-project)$/.test(x));
    const gmoSummary = nonGmoClaim ? "Non-GMO — reported on the product label/database (claim, not independently verified)." : gmoClaim ? "Organic claim reported on the product label/database; GMO status not independently confirmed." : "No Non-GMO claim found in available product data.";
    const additivesSummary = additives.length ? additives.length + " additive code(s) reported; review details." : "No additive codes supplied; this does not prove additive-free.";
    const status = complete ? "Preliminary ingredient-based score" : "Insufficient ingredient information to calculate a trustworthy score";
    const headline = complete ? score.toFixed(1)+"/10" : "Not rated";
    const pill = '<span style="display:inline-block;padding:5px 11px;border-radius:999px;border:1px solid #579c89;font-size:.78rem;letter-spacing:.02em">' + (complete ? "Provisional · Ingredient-based" : "Needs ingredient label") + '</span>';
    return '<section class="notice" aria-label="Milele Fit Food Standard" style="padding:18px;border-radius:20px">' +
      '<div style="font-size:.78rem;letter-spacing:.08em;opacity:.8;font-weight:700">MILELE FIT FOOD STANDARD · V2</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:12px 0"><strong style="font-size:clamp(1.7rem,7vw,2.3rem);line-height:1.1">'+headline+'</strong>'+pill+'</div>' +
      '<p style="margin:4px 0 12px">'+status+'. Based on Milele Fit preferences, not a medical safety or cancer-risk rating.</p>' +
      '<div style="padding:12px;border-radius:14px;background:rgba(11,36,39,.55);margin:10px 0 14px"><strong>YOUR 10-SECOND FOOD CHECK</strong><p style="margin:8px 0">Processing: '+escapeHtml(quickSummary)+'</p><p style="margin:8px 0">GMO / organic: '+escapeHtml(gmoSummary)+'</p><p style="margin:8px 0">Additives: '+escapeHtml(additivesSummary)+'</p><small>Label claims are shown as reported; tap below for details.</small></div>' +
      '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0">' +
      '<div style="padding:10px;border:1px solid #396b6b;border-radius:12px"><small>PROCESSING</small><div><strong>'+(hasNova?"Reported NOVA "+nova:"Unknown")+'</strong></div></div>' +
      '<div style="padding:10px;border:1px solid #396b6b;border-radius:12px"><small>DEDUCTIONS</small><div><strong>−'+total.toFixed(1)+' points</strong></div></div></div>' +
      '<details><summary>Why this score? · '+findings.length+' findings</summary><ul>'+deductions+'</ul><p>Starts at 10. Scores remain preliminary until the full Milele Fit rubric is complete.</p></details>' +
      '<details><summary>Positive findings · '+claimed.length+' reported claims</summary><ul>'+positive+'</ul></details>' +
      '<details><summary>What still needs review? · '+gaps.length+' items</summary><ul>'+gaps.map(x=>"<li>"+escapeHtml(x)+"</li>").join("")+'</ul></details>' +
      '<details><summary>Additional ingredient data</summary><p>Additive codes: '+(additives.length?additives.map(escapeHtml).join(", "):"Not supplied")+'</p><p>Ingredient analysis: '+(analysis.length?analysis.map(x=>escapeHtml(String(x).replace(/^en:/,"").replace(/-/g," "))).join(", "):"Not supplied")+'</p><p>Claims are sourced from product database entries and are not independently verified.</p></details>' +
      '</section>';
  }
  function reviewHtml(food, source) {
    const calc = food.calculatedServing || {};
    const nutrientKeys = ["calories", "proteinGrams", "carbohydrateGrams", "fatGrams"];
    const per100g = food.nutrients?.per100g || {};
    const missingNutrition = nutrientKeys.every((key) => calc[key] == null && per100g[key] == null);
    const missingNotice = missingNutrition ? '<p class="notice" role="status">Nutrition facts were not supplied for this product. The barcode identifies the food, but calories and macros are unknown—not zero. Check the package label before logging.</p>' : "";
    return `<h3>${escapeHtml(food.foodName || "Food")}</h3><p class="muted">${escapeHtml(food.brand || "")} <span class="pill">${source}</span> ${food.isEstimated ? '<span class="pill estimated">Estimated</span>' : ""}</p><p>${escapeHtml(food.notice || food.estimateReason || "Review serving before saving.")}</p>${missingNotice}${source === "open_food_facts" ? mileleFoodStandard(food) : ""}<label>Meal</label>${mealTypeSelect()}<label>Amount</label><input data-field="amount" type="number" min="0" step="0.1" value="1"><label>Unit</label><select data-field="unit"><option>serving</option><option>g</option><option>oz</option><option>cup</option><option>piece</option></select><label>Notes</label><input data-field="notes" placeholder="Optional notes"><div class="summary"><div class="metric"><strong>${formatReviewNutrient(calc.calories ?? food.nutrients?.per100g?.calories, "")}</strong><span>cal</span></div><div class="metric"><strong>${formatReviewNutrient(calc.proteinGrams ?? food.nutrients?.per100g?.proteinGrams, "g")}</strong><span>protein</span></div><div class="metric"><strong>${formatReviewNutrient(calc.carbohydrateGrams ?? food.nutrients?.per100g?.carbohydrateGrams, "g")}</strong><span>carbs</span></div><div class="metric"><strong>${formatReviewNutrient(calc.fatGrams ?? food.nutrients?.per100g?.fatGrams, "g")}</strong><span>fat</span></div></div><button class="btn primary" data-log-review>Confirm and log</button>`;
  }
  function bindReview(container, food) {
    container.hidden = false; container.innerHTML = reviewHtml(food, food.source || "custom");
    container.querySelector("[data-log-review]").onclick = async () => {
      const saveButton = container.querySelector("[data-log-review]");
      if (saveButton.disabled) return;
      saveButton.disabled = true;
      saveButton.textContent = "Saving food…";
      try {
      const payload = { foodName: food.foodName, brand: food.brand, source: food.source || "custom", sourceId: food.sourceId, barcode: food.barcode, localDate: $("journalDate").value, mealType: container.querySelector('[data-field="mealType"]').value, amount: Number(container.querySelector('[data-field="amount"]').value || 1), unit: container.querySelector('[data-field="unit"]').value, servingQuantity: food.servingQuantity, servingUnit: food.servingUnit, servingsConsumed: container.querySelector('[data-field="unit"]').value === "serving" ? Number(container.querySelector('[data-field="amount"]').value || 1) : null, nutrients: food.nutrients, ingredients: food.ingredients, allergens: food.allergens, isEstimated: food.isEstimated, estimateReason: food.estimateReason, notes: container.querySelector('[data-field="notes"]').value };
      await api("/api/me/nutrition/entries", { method: "POST", body: JSON.stringify(payload) });
      // A successful POST is final. Never re-enable Save if the subsequent refresh fails.
      container.innerHTML = '<p class="notice" role="status">✓ Food saved to your private journal. Updating today’s totals…</p>';
      state.lastSuccessfulBarcode = null;
      $("startScanBtn").textContent = "Scan another barcode";
      try {
        await refreshNutritionAndWeekly();
        container.innerHTML = '<p class="notice" role="status">✓ Food saved! Today’s entries and totals updated.</p>';
      } catch (refreshError) {
        container.innerHTML = '<p class="notice" role="status">✓ Food saved, but today’s totals could not refresh. Tap Refresh Today to reload them. Do not save this food again.</p>';
        recordScanFailure("journal-refresh", refreshError);
      }
      } catch (error) {
        saveButton.disabled = false;
        saveButton.textContent = "Confirm and log";
        const message = document.createElement("p");
        message.className = "notice";
        message.textContent = "Could not save this entry. Please retry. " + (error?.message || "");
        saveButton.after(message);
      }
    };
  }
  async function lookupBarcode(code) {
    const status = $("barcodeStatus");
    state.pendingBarcode = String(code);
    status.textContent = "Looking up barcode…";
    try {
      const product = await api(`/api/nutrition/barcodes/${encodeURIComponent(code)}`);
      if (!product.found) {
        state.pendingBarcode = null;
        status.textContent = product.message || "Product not found. Try search or custom entry.";
        return false;
      }
      bindReview($("productReview"), product);
      state.lastSuccessfulBarcode = String(product.barcode || code);
      state.pendingBarcode = null;
      status.textContent = "✓ Barcode captured — product found! Review the food details below before saving.";
      status.setAttribute("role", "status");
      $("startScanBtn").textContent = "Scan another barcode";
      return true;
    } catch (error) {
      const reason = error?.status === 401 || error?.status === 403 ? "Sign-in expired or access denied" : error?.status === 402 ? "Membership or trial access required" : error?.status === 503 || error?.status === 502 ? "Food database temporarily unavailable" : error?.status ? `Food lookup returned HTTP ${error.status}` : "Network or backend connection failed";
      status.textContent = `${reason}. Tap Capture / Try Again to retry this barcode, or use food search.`;
      recordScanFailure("product-lookup", `${reason}: ${error?.message || "Request failed"}`);
      return false;
    }
  }
  let firstScanFailure = null;
  let lastPhotoScan = "Not tested in this session";
  function recordScanFailure(stage, error, terminal = true) {
    if (!firstScanFailure) firstScanFailure = { stage, detail: String(error?.message || error || "Unknown failure"), at: new Date().toISOString() };
    const panel = $("barcodeDiagnostics");
    if (panel) panel.textContent = "First failure: " + firstScanFailure.stage + " — " + firstScanFailure.detail + (terminal ? "" : " (fallback attempted)");
  }
  async function checkBarcodeRoute() {
    const output = $("barcodeDiagnostics");
    firstScanFailure = null;
    const checks = [];
    const check = (name, pass, detail = "") => { checks.push((pass ? "PASS " : "FAIL ") + name + (detail ? ": " + detail : "")); if (!pass && !firstScanFailure) recordScanFailure(name, detail); };
    check("Secure camera context", window.isSecureContext, window.isSecureContext ? "" : "HTTPS required");
    check("Camera API", Boolean(navigator.mediaDevices?.getUserMedia), "Camera availability on this device");
    check("Scanner video element", Boolean($("scannerVideo")));
    try {
      const mod = await import("https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm");
      check("ZXing decoder module", typeof mod.BrowserMultiFormatReader === "function");
    } catch (error) { check("ZXing decoder module", false, error.message); }
    const origin = backendUrl("/api/auth/me");
    check("Backend URL", /^https:\/\//.test(origin), new URL(origin, window.location.href).origin);
    try {
      const auth = await api("/api/auth/me");
      check("Authenticated backend connection", Boolean(auth));
    } catch (error) {
      check("Authenticated backend connection", false, `${error?.status ? "HTTP " + error.status : "Network failure"}: ${error?.message || "Request failed"}`);
    }
    try {
      const response = await api("/api/nutrition/barcodes/5449000000996");
      check("Food barcode lookup route", Boolean(response && typeof response.found === "boolean"), "Expected barcode lookup response");
    } catch (error) { check("Food barcode lookup route", false, `${error?.status ? `HTTP ${error.status}: ` : "Network error: "}${error?.message || "Request failed"}`); }
    if (output) output.textContent = "SYSTEM READINESS (not an actual barcode scan):\n" + checks.join("\n") + "\n" + (firstScanFailure ? "READINESS FAILURE: " + firstScanFailure.stage : "Readiness checks passed; barcode recognition NOT verified.") + "\n\nLAST PHOTO SCAN: " + lastPhotoScan;
  }
  async function startScanner() {
    if (state.scannerBusy || state.stream || state.zxingControls || state.zxingReader) return;
    stopScanner();
    const generation = state.scanGeneration;
    state.scannerBusy = true;
    const video = $("scannerVideo");
    $("barcodeStatus").textContent = "Starting barcode scanner…";
    if (!navigator.mediaDevices?.getUserMedia) { $("barcodeStatus").textContent = "Camera unavailable. Enter a UPC/EAN manually."; state.scannerBusy = false; return; }
    try {
      const formats = ["upc_a", "upc_e", "ean_8", "ean_13"];
      if (typeof window.BarcodeDetector === "function") {
        try {
          const detector = new window.BarcodeDetector({ formats });
          state.nativeDetector = detector;
          state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
          video.hidden = false; video.srcObject = state.stream; await video.play();
          $("barcodeStatus").textContent = "Camera ready. Hold the barcode steady inside the frame.";
          const tick = async () => { if (!state.stream || generation !== state.scanGeneration) return; try { const codes = await detector.detect(video); if (codes[0]) { await handleDetected(codes[0].rawValue); return; } } catch (_) { $("barcodeStatus").textContent = "Native scan failed. Stop and retry, or enter barcode manually."; } if (state.stream) state.scanTimer = setTimeout(tick, 250); };
          tick(); return;
        } catch (nativeError) {
          // Release the native stream without invalidating this scan generation.
          // stopScanner() increments scanGeneration and used to silently cancel ZXing fallback.
          state.stream?.getTracks().forEach((track) => track.stop());
          state.stream = null;
          state.nativeDetector = null;
          video.srcObject = null;
          recordScanFailure("native-detector", nativeError, false);
          // A denied permission cannot be fixed by switching decoders; show the manual fallback immediately.
          if (nativeError?.name === "NotAllowedError" || nativeError?.name === "PermissionDeniedError") throw nativeError;
        }
      }
      // ZXing owns the camera stream in fallback mode. Do not open a second getUserMedia stream.
      $("barcodeStatus").textContent = "Loading iPhone-compatible barcode scanner…";
      const mod = await import("https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm");
      if (generation !== state.scanGeneration) return;
      const reader = new mod.BrowserMultiFormatReader();
      state.zxingReader = reader;
      video.hidden = false;
      const controls = await reader.decodeFromVideoDevice(undefined, video, (result, error) => {
        if (result?.getText) void handleDetected(result.getText());
      });
      if (state.zxingReader !== reader || generation !== state.scanGeneration) { controls?.stop?.(); return; }
      state.zxingControls = controls;
      $("barcodeStatus").textContent = "Camera ready. Point at a UPC/EAN barcode and hold steady.";
    } catch (error) {
      recordScanFailure("scanner-start", error);
      stopScanner();
      const kind = error?.name || "";
      $("barcodeStatus").textContent = kind === "NotAllowedError" || kind === "PermissionDeniedError"
        ? "Camera access was blocked. In Safari, open website settings and allow Camera, then tap Capture / Try Again."
        : kind === "NotReadableError" || kind === "AbortError"
          ? "Camera is busy or still releasing. Close other camera views, then tap Capture / Try Again."
          : "Scanner could not start. Tap Capture / Try Again, or enter the UPC/EAN manually.";
    } finally { state.scannerBusy = false; }
  }
  async function captureOrRetry() {
    if (state.lastSuccessfulBarcode && !$("productReview").hidden) {
      state.lastSuccessfulBarcode = null;
      $("productReview").hidden = true;
      $("productReview").innerHTML = "";
      $("startScanBtn").textContent = "Capture / Try Again";
      await startScanner();
      return;
    }
    if (state.pendingBarcode) {
      const barcode = state.pendingBarcode;
      state.pendingBarcode = null;
      await lookupBarcode(barcode);
      return;
    }
    if (state.scannerBusy) { $("barcodeStatus").textContent = "Scanner is starting. Hold the barcode inside the guide."; return; }
    if (state.nativeDetector && state.stream) {
      try { const codes = await state.nativeDetector.detect($("scannerVideo")); if (codes[0]) { await handleDetected(codes[0].rawValue); return; } } catch (_) {}
    }
    if (state.zxingControls || state.stream) { $("barcodeStatus").textContent = "Scanning automatically. Adjust distance, lighting, and barcode angle."; return; }
    await startScanner();
  }

  function validUpcEan(code) {
    if (!/^(?:\d{8}|\d{12}|\d{13})$/.test(code)) return false;
    const digits = [...code].map(Number);
    const check = digits.pop();
    const sum = digits.reduce((total, digit, index) => total + digit * ((digits.length - index) % 2 ? 3 : 1), 0);
    if ((10 - sum % 10) % 10 === check) return true;
    if (code.length !== 8 || code[0] !== "0" && code[0] !== "1") return false;
    const ns = code[0], body = code.slice(1, 7), last = body[5];
    let manufacturer, product;
    if ("012".includes(last)) { manufacturer = body.slice(0, 2) + last + "00"; product = "00" + body.slice(2, 5); }
    else if (last === "3") { manufacturer = body.slice(0, 3) + "00"; product = "000" + body.slice(3, 5); }
    else if (last === "4") { manufacturer = body.slice(0, 4) + "0"; product = "0000" + body[4]; }
    else { manufacturer = body.slice(0, 5); product = "0000" + last; }
    const expanded = ns + manufacturer + product + code[7];
    const expandedDigits = [...expanded].map(Number);
    const expandedCheck = expandedDigits.pop();
    const expandedSum = expandedDigits.reduce((total, digit, index) => total + digit * ((expandedDigits.length - index) % 2 ? 3 : 1), 0);
    return (10 - expandedSum % 10) % 10 === expandedCheck;
  }
  let barcodeCropImage = null;
  function barcodeCropRect(width, height) {
    const size = Number($("barcodeCropSize").value) / 100;
    const w = Math.max(1, Math.round(width * size));
    const h = Math.max(1, Math.min(height, Math.round(w * 0.52)));
    const x = Math.round((width - w) * Number($("barcodeCropX").value) / 100);
    const y = Math.round((height - h) * Number($("barcodeCropY").value) / 100);
    return { x, y, w, h };
  }
  function drawBarcodeCrop() {
    if (!barcodeCropImage) return;
    const canvas = $("barcodeCropCanvas");
    const max = 1200, scale = Math.min(1, max / Math.max(barcodeCropImage.width, barcodeCropImage.height));
    canvas.width = Math.round(barcodeCropImage.width * scale);
    canvas.height = Math.round(barcodeCropImage.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(barcodeCropImage, 0, 0, canvas.width, canvas.height);
    const r = barcodeCropRect(canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillRect(0, 0, canvas.width, r.y);
    ctx.fillRect(0, r.y + r.h, canvas.width, canvas.height - r.y - r.h);
    ctx.fillRect(0, r.y, r.x, r.h);
    ctx.fillRect(r.x + r.w, r.y, canvas.width - r.x - r.w, r.h);
    ctx.strokeStyle = "#ffdc70";
    ctx.lineWidth = Math.max(3, canvas.width / 180);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }
  // Touch or click the photo to center the selection on the barcode.
  function positionBarcodeCrop(event) {
    if (!barcodeCropImage) return;
    const canvas = $("barcodeCropCanvas");
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const px = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const py = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    const r = barcodeCropRect(canvas.width, canvas.height);
    const maxX = Math.max(1, canvas.width - r.w);
    const maxY = Math.max(1, canvas.height - r.h);
    $("barcodeCropX").value = String(Math.round(Math.max(0, Math.min(1, (px * canvas.width - r.w / 2) / maxX)) * 100));
    $("barcodeCropY").value = String(Math.round(Math.max(0, Math.min(1, (py * canvas.height - r.h / 2) / maxY)) * 100));
    drawBarcodeCrop();
  }
  async function loadBarcodeCropPhoto() {
    const file = $("barcodePhoto").files?.[0];
    if (!file) return;
    if (barcodeCropImage) barcodeCropImage.close();
    barcodeCropImage = null;
    try {
      barcodeCropImage = await createImageBitmap(file);
      $("barcodeCropPanel").hidden = false;
      $("barcodeCropX").value = "50";
      $("barcodeCropY").value = "50";
      $("barcodeCropSize").value = "65";
      drawBarcodeCrop();
      $("barcodeStatus").textContent = "Move the yellow box over the barcode and all printed digits, then tap Read selected area.";
    } catch (error) {
      recordScanFailure("barcode-photo-load", error);
      $("barcodeStatus").textContent = "Could not open this photo. Try another image.";
    }
  }
  async function readBarcodeNumbers() {
    const video = $("scannerVideo");
    const photo = $("barcodePhoto")?.files?.[0];
    const useCrop = !!(photo && barcodeCropImage);
    if (!photo && (!video || video.readyState < 2 || !video.videoWidth)) {
      $("barcodeStatus").textContent = "Start the camera first, then try reading the printed numbers.";
      await startScanner();
      return;
    }
    const button = $("readNumbersBtn");
    button.disabled = true;
    $("barcodeStatus").textContent = photo ? "Reading printed barcode numbers from your photo…" : "Reading printed barcode numbers from the camera…";
    try {
      const canvas = document.createElement("canvas");
      if (useCrop) {
        const r = barcodeCropRect(barcodeCropImage.width, barcodeCropImage.height);
        const scale = Math.min(1, 2400 / Math.max(r.w, r.h));
        canvas.width = Math.max(1, Math.round(r.w * scale));
        canvas.height = Math.max(1, Math.round(r.h * scale));
        canvas.getContext("2d").drawImage(barcodeCropImage, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
      } else if (photo) {
        const bitmap = await createImageBitmap(photo);
        try {
          const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
          canvas.width = Math.max(1, Math.round(bitmap.width * scale));
          canvas.height = Math.max(1, Math.round(bitmap.height * scale));
          canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        } finally { bitmap.close(); }
      } else {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      // Prefer decoding actual bars over guessing numbers from unrelated package text.
      lastPhotoScan = "IN PROGRESS";
      let detected = "";
      let detectionMethod = "";
      const methods = [];
      const normalize = (value) => String(value || "").replace(/\D/g, "");
      const uniqueValid = (values) => [...new Set(values.map(normalize).filter(validUpcEan))];
      if ("BarcodeDetector" in window) {
        try {
          const detector = new BarcodeDetector({ formats: ["upc_a", "ean_13", "ean_8", "upc_e"] });
          const hits = await detector.detect(canvas);
          const codes = [...new Set(hits.map((hit) => String(hit.rawValue || "").replace(/\D/g, "")).filter((value) => validUpcEan(value)))];
          if (codes.length === 1) { detected = codes[0]; detectionMethod = "native bars"; }
          methods.push("native:" + (codes.length === 1 ? "matched" : codes.length ? "ambiguous" : "none"));
        } catch (error) { methods.push("native:error"); recordScanFailure("barcode-photo-native", error, false); }
      }
      if (!detected) {
        try {
          // Reuse the same ZXing browser package already used for the live camera.
          const mod = await import("https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm");
          const reader = new mod.BrowserMultiFormatReader();
          const result = await reader.decodeFromCanvas(canvas);
          const code = normalize(result?.getText?.());
          if (validUpcEan(code)) { detected = code; detectionMethod = "ZXing bars"; methods.push("zxing:matched"); }
          else methods.push("zxing:invalid");
        } catch (error) {
          methods.push("zxing:no-decode");
          recordScanFailure("barcode-photo-zxing", error, false);
        }
      }
      if (!detected) {
        const { createWorker } = await import("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/+esm");
        const worker = await createWorker("eng");
        const candidates = new Set();
        try {
          await worker.setParameters({ tessedit_char_whitelist: "0123456789", preserve_interword_spaces: "1", tessedit_pageseg_mode: "7" });
          // UPC digits are often printed below the bars with guard digits separated.
          // Read multiple narrow horizontal bands to avoid confusing the bars with digits.
          for (const [top, bottom] of [[0.58, 1], [0.68, 0.94], [0.74, 1], [0, 1]]) {
            const strip = document.createElement("canvas");
            strip.width = Math.min(3000, Math.max(900, canvas.width * 2));
            strip.height = Math.max(80, Math.round(canvas.height * (bottom - top) * strip.width / canvas.width));
            const ctx = strip.getContext("2d");
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, strip.width, strip.height);
            ctx.filter = "grayscale(1) contrast(1.8)";
            ctx.drawImage(canvas, 0, Math.floor(canvas.height * top), canvas.width, Math.max(1, Math.floor(canvas.height * (bottom - top))), 0, 0, strip.width, strip.height);
            const result = await worker.recognize(strip);
            for (const line of (result.data.text || "").split(/\r?\n/)) {
              const raw = line.trim();
              if (!/^[\d\s|.,:'-]+$/.test(raw)) continue;
              const digits = raw.replace(/\D/g, "");
              if (validUpcEan(digits)) candidates.add(digits);
            }
          }
        } finally { await worker.terminate(); }
        if (candidates.size === 1) { detected = [...candidates][0]; detectionMethod = "printed digits OCR"; }
        methods.push("ocr:" + (candidates.size === 1 ? "matched" : candidates.size ? "ambiguous" : "none"));
      }
      if (detected) {
        lastPhotoScan = "PASS: " + detectionMethod + " suggested " + detected + " (awaiting confirmation)";
        $("manualBarcode").value = detected;
        $("barcodeStatus").textContent = "Possible UPC/EAN (" + detectionMethod + "): " + detected + ". Compare every digit with the package, then tap Lookup barcode. No lookup will run until you confirm.";
        // Keep photo available so the member can adjust the crop if the digits are wrong.
      } else {
        lastPhotoScan = "FAIL: " + methods.join(", ");
        recordScanFailure("barcode-photo-selection", lastPhotoScan);
        $("barcodeStatus").textContent = "No reliable barcode number found. Take a close-up showing only the barcode and its printed digits, or enter the number manually. Nothing was looked up.";
      }
    } catch (error) {
      recordScanFailure("photo-number-ocr", error);
      $("barcodeStatus").textContent = "Number recognition unavailable. Please enter the printed barcode digits manually.";
    } finally { button.disabled = false; }
  }
  async function readNutritionFactsPhoto() {
    const file = $("nutritionFactsPhoto")?.files?.[0];
    const output = $("nutritionFactsResult");
    if (!file || !output) return;
    output.textContent = "Reading Nutrition Facts photo…";
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      try {
        const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      } finally { bitmap.close(); }
      const { createWorker } = await import("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/+esm");
      const worker = await createWorker("eng");
      let raw = "";
      try { raw = (await worker.recognize(canvas)).data.text || ""; }
      finally { await worker.terminate(); }
      const patterns = [
        ["Serving size", /serving size\s*[:]?\s*([^\n]+)/i],
        ["Calories", /calories\s*[:]?\s*(\d+)/i],
        ["Total fat", /total fat\s*[:]?\s*(\d+(?:\.\d+)?\s*g)/i],
        ["Sodium", /sodium\s*[:]?\s*(\d+(?:\.\d+)?\s*mg)/i],
        ["Carbohydrates", /total carbohydrate[s]?\s*[:]?\s*(\d+(?:\.\d+)?\s*g)/i],
        ["Fiber", /dietary fiber\s*[:]?\s*(\d+(?:\.\d+)?\s*g)/i],
        ["Sugars", /total sugars\s*[:]?\s*(\d+(?:\.\d+)?\s*g)/i],
        ["Protein", /protein\s*[:]?\s*(\d+(?:\.\d+)?\s*g)/i]
      ];
      const matches = patterns.map(([name, re]) => [name, raw.match(re)?.[1]?.trim()]).filter(([, value]) => value);
      if (!matches.length) recordScanFailure("nutrition-facts-extraction", "OCR completed but no recognizable nutrition fields were found");
      output.replaceChildren();
      const heading = document.createElement("strong");
      heading.textContent = matches.length ? "Recognized values — verify against your label:" : "No reliable nutrition values recognized.";
      output.append(heading);
      for (const [name, value] of matches) {
        const line = document.createElement("p");
        line.textContent = name + ": " + value;
        output.append(line);
      }
      const note = document.createElement("p");
      note.textContent = "These values are OCR estimates, not verified food records. Check serving size, units, and every number before manually adding a custom food. Unreadable values are unknown, not zero.";
      output.append(note);
    } catch (error) {
      recordScanFailure("nutrition-facts-ocr", error);
      output.textContent = "Could not read this photo. Try brighter lighting and a flat, sharp label.";
    }
  }
  async function handleDetected(raw) {
    const barcode = String(raw || "").replace(/\D/g, "");
    const now = Date.now();
    if (!/^\d{6,14}$/.test(barcode) || state.lastSuccessfulBarcode || (state.lastBarcode === barcode && now - state.lastScanAt < 2500)) return;
    state.lastBarcode = barcode;
    state.lastScanAt = now;
    stopScanner();
    $("barcodeStatus").textContent = "✓ Barcode captured! Looking up your food…";
    await lookupBarcode(barcode);
  }
  function stopScanner() { state.scanGeneration += 1; state.nativeDetector = null; state.scannerBusy = false; if (state.scanTimer) clearTimeout(state.scanTimer); state.scanTimer = null; if (state.zxingControls?.stop) state.zxingControls.stop(); state.zxingControls = null; if (state.zxingReader?.reset) state.zxingReader.reset(); state.zxingReader = null; if (state.stream) state.stream.getTracks().forEach((track) => track.stop()); state.stream = null; const v = $("scannerVideo"); if (v) { v.pause(); v.srcObject = null; v.hidden = true; } }
  async function searchFoods() { const q = $("foodSearchInput").value; const out = $("foodResults"); out.innerHTML = "Searching…"; try { const data = await api(`/api/nutrition/foods/search?q=${encodeURIComponent(q)}&limit=10`); out.innerHTML = data.results.map((food) => `<div class="row"><div class="row-main"><strong>${escapeHtml(food.foodName)}</strong><div class="muted">${escapeHtml(food.brand || food.dataType || "USDA")} ${food.isEstimated ? '<span class="pill estimated">Estimated</span>' : ""}</div></div><button class="btn" data-fdc="${food.fdcId}">Review</button></div>`).join("") || "No foods found."; out.querySelectorAll("[data-fdc]").forEach((btn) => btn.onclick = async () => bindReview(out, await api(`/api/nutrition/foods/${btn.dataset.fdc}`))); } catch (e) { out.textContent = e.message; } }
  function renderCustomForm() { $("customForm").innerHTML = `<label>Food name</label><input data-c="foodName"><label>Calories</label><input data-c="calories" type="number"><label>Protein g</label><input data-c="proteinGrams" type="number"><label>Carbs g</label><input data-c="carbohydrateGrams" type="number"><label>Fat g</label><input data-c="fatGrams" type="number"><label>Fiber g</label><input data-c="fiberGrams" type="number"><label>Sodium mg</label><input data-c="sodiumMilligrams" type="number"><label>Meal</label>${mealTypeSelect()}<button class="btn primary" id="customSaveBtn">Save custom food</button>`; $("customSaveBtn").onclick = async () => { const payload = { source: "custom", localDate: $("journalDate").value, amount: 1, unit: "serving", isEstimated: false }; document.querySelectorAll("[data-c]").forEach((el) => payload[el.dataset.c] = el.type === "number" ? Number(el.value || 0) : el.value); payload.mealType = $("customForm").querySelector('[data-field="mealType"]').value; await api("/api/me/nutrition/entries", { method: "POST", body: JSON.stringify(payload) }); await refreshNutritionAndWeekly(); }; }
  async function createDraft() { const out = $("draftReview"); out.innerHTML = "Creating draft…"; const draft = await api("/api/nutrition/drafts/natural-language", { method: "POST", body: JSON.stringify({ text: $("naturalText").value }) }); out.innerHTML = `<p class="notice">${escapeHtml(draft.message)}</p>` + draft.candidates.map((c) => `<div class="row"><div><strong>${escapeHtml(c.phrase)}</strong><div class="muted">Search: ${escapeHtml(c.searchQuery)}</div>${c.possibleClarifications.map((q) => `<span class="pill estimated">${escapeHtml(q)}</span>`).join("")}</div><button class="btn" data-search="${escapeHtml(c.searchQuery)}">Search this</button></div>`).join(""); out.querySelectorAll("[data-search]").forEach((b) => b.onclick = () => { setPanel("searchPanel"); $("foodSearchInput").value = b.dataset.search; searchFoods(); }); }
  async function refreshAll() { await Promise.all([loadEntries(), loadSummary(), loadEducation()]); }
  async function refreshNutritionAndWeekly() { await refreshAll(); await loadWeekly(); }
  async function loadEntries() { const data = await api(`/api/me/nutrition/entries?date=${$("journalDate").value}`); state.entries = data.entries; $("entriesList").innerHTML = state.entries.map((e) => `<div class="row"><input type="checkbox" data-select="${e.entryId}"><div class="row-main"><strong>${escapeHtml(e.foodName)}</strong><div class="muted">${e.mealType} · ${e.calories ?? 0} cal · ${e.source} ${e.isEstimated ? '<span class="pill estimated">Estimated</span>' : ""}</div></div><button class="btn" data-edit="${e.entryId}">Edit</button><button class="btn danger" data-delete="${e.entryId}">Delete</button></div>`).join("") || '<p class="muted">No entries logged for this date.</p>'; $("entriesList").querySelectorAll("[data-delete]").forEach((b) => b.onclick = async () => { await api(`/api/me/nutrition/entries/${b.dataset.delete}`, { method: "DELETE" }); await refreshNutritionAndWeekly(); }); $("entriesList").querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => editEntry(b.dataset.edit)); $("entriesList").querySelectorAll("[data-select]").forEach((box) => box.onchange = () => box.checked ? state.selectedEntryIds.add(box.dataset.select) : state.selectedEntryIds.delete(box.dataset.select)); }
  function editEntry(id) { const e = state.entries.find((x) => x.entryId === id); if (!e) return; const name = prompt("Food name", e.foodName); if (name === null) return; const amount = Number(prompt("Amount consumed", e.amount || 1) || e.amount || 1); api(`/api/me/nutrition/entries/${id}`, { method: "PUT", body: JSON.stringify({ ...e, foodName: name, amount }) }).then(refreshNutritionAndWeekly); }
  function nutritionGoalKey() {
    const token = window.AuthStateRuntime?.getAuthToken?.() || "";
    // A one-way, per-session namespace prevents different sign-ins sharing the same visible goal set on a device.
    const userId = window.AuthStateRuntime?.getUserId?.() || "";
    return "milele-nutrition-goals-v1:" + (userId || token.slice(-24) || "anonymous");
  }
  function readNutritionGoals() {
    try { const data = JSON.parse(localStorage.getItem(nutritionGoalKey()) || "{}"); return data && typeof data === "object" ? data : {}; } catch { return {}; }
  }
  function initializeNutritionCalculator() {
    const button = $("calculateNutritionTargets");
    if (!button || button.dataset.bound) return;
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      const number = id => Number($(id).value);
      const weight = number("calcWeight"), target = number("calcTargetWeight"), weeks = number("calcWeeks");
      const height = number("calcHeight"), age = number("calcAge"), coefficient = $("calcSex").value;
      const activity = number("calcActivity"), mode = $("calcGoal").value, output = $("nutritionCalculationResult");
      if (!(weight >= 70 && weight <= 700 && target >= 70 && target <= 700 && weeks >= 4 && weeks <= 104 && height >= 48 && height <= 90 && age >= 18 && age <= 100 && ["male","female"].includes(coefficient))) {
        output.textContent = "Enter a valid adult age, height, current and target weight, timeframe, and formula coefficient to calculate.";
        return;
      }
      if ((mode === "lose" && target >= weight) || (mode === "gain" && target <= weight)) {
        output.textContent = "Your target weight does not match the selected goal. Adjust one of them."; return;
      }
      const kilograms = weight * 0.45359237, centimeters = height * 2.54;
      const bmr = 10 * kilograms + 6.25 * centimeters - 5 * age + (coefficient === "male" ? 5 : -161);
      const maintenance = bmr * activity;
      const weeklyChange = mode === "maintain" ? 0 : (target - weight) / weeks;
      const requestedAdjustment = weeklyChange * 3500 / 7;
      const adjustment = Math.max(-500, Math.min(350, requestedAdjustment));
      const calories = Math.round((maintenance + adjustment) / 25) * 25;
      if (calories < 1200) { output.textContent = "This estimate is too low for automatic planning. Please review your goals with a qualified professional."; return; }
      const protein = Math.round(kilograms * 1.4);
      const fat = Math.round(calories * 0.28 / 9);
      const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
      for (const [id,value] of [["goalCalories",calories],["goalProtein",protein],["goalCarbs",carbs],["goalFat",fat]]) $(id).value = value;
      $("nutritionGoalEditor").open = true;
      output.textContent = "Estimated maintenance: " + Math.round(maintenance) + " kcal/day. Suggested starting intake: " + calories + " kcal, " + protein + " g protein, " + carbs + " g carbs, " + fat + " g fat. Requested change: " + Math.abs(weeklyChange).toFixed(2) + " lb/week; calorie adjustment capped for a cautious starting estimate. These are not guaranteed results. Review the numbers below, then tap Save my goals. Activity already includes usual workouts.";
    });
  }
  function initializeNutritionGoals() {
    const button = $("saveNutritionGoals");
    if (!button || button.dataset.bound) return;
    button.dataset.bound = "1";
    const goals = readNutritionGoals();
    for (const [key, field] of Object.entries({ calories:"goalCalories", proteinGrams:"goalProtein", carbohydrateGrams:"goalCarbs", fatGrams:"goalFat" })) {
      if (goals[key]) $(field).value = goals[key];
    }
    button.addEventListener("click", async () => {
      const next = {};
      for (const [key, field] of Object.entries({ calories:"goalCalories", proteinGrams:"goalProtein", carbohydrateGrams:"goalCarbs", fatGrams:"goalFat" })) {
        const raw = $(field).value.trim();
        if (!raw) continue;
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0 || value > 15000) { $("nutritionGoalStatus").textContent = "Enter positive, realistic numeric goals."; return; }
        next[key] = value;
      }
      button.disabled = true;
      $("nutritionGoalStatus").textContent = "Saving your goals to your account…";
      try {
        await api("/api/me/nutrition/daily-goals", { method:"PUT", body:JSON.stringify(next) });
        localStorage.setItem(nutritionGoalKey(), JSON.stringify(next));
        $("nutritionGoalStatus").textContent = "Saved to your Milele Fit account. Your goals will be available when you sign back in.";
        await loadSummary();
      } catch (error) {
        $("nutritionGoalStatus").textContent = "Could not save goals to your account. Please try again. " + (error.message || "");
      } finally { button.disabled = false; }
    });
  }
  async function loadSummary() {
    initializeNutritionGoals();
    initializeNutritionCalculator();
    const s = await api(`/api/me/nutrition/summary?date=${$("journalDate").value}`);
    const f = s.fullDay;
    let goals = {};
    try {
      const response = await api("/api/me/nutrition/daily-goals");
      goals = response.goals || {};
      const fields = { calories:"goalCalories", proteinGrams:"goalProtein", carbohydrateGrams:"goalCarbs", fatGrams:"goalFat" };
      for (const [key,field] of Object.entries(fields)) if (document.activeElement !== $(field)) $(field).value = goals[key] ?? "";
    } catch (error) { $("nutritionGoalStatus").textContent = "Could not load account goals. Check your connection."; }
    const metrics = [["Calories","calories","kcal"],["Protein","proteinGrams","g"],["Carbs","carbohydrateGrams","g"],["Fat","fatGrams","g"],["Fiber","fiberGrams","g"],["Sodium","sodiumMilligrams","mg"]];
    $("dailySummary").innerHTML = metrics.map(([label,key,unit]) => {
      const value = Number(f[key] || 0);
      const goal = Number(goals[key] || 0);
      const pct = goal > 0 ? Math.round(value / goal * 100) : 0;
      const ring = goal > 0 ? `<div class="goal-ring" style="--progress:${Math.min(pct,100)}%"><strong>${pct}%</strong></div>` : `<div class="goal-ring" style="--progress:0%"><strong>—</strong></div>`;
      const detail = goal > 0 ? `${Math.round(value)} / ${goal} ${unit}` : `${Math.round(value)} ${unit} · Set goal`;
      const note = goal > 0 && pct > 100 ? '<span class="goal-detail">Above your target</span>' : '';
      return `<div class="metric">${ring}<span>${label}</span><span class="goal-detail">${detail}</span>${note}</div>`;
    }).join("") + `<p class="muted">Meals logged: ${f.mealsLogged}. Estimated entries: ${f.estimatedEntryCount}. Targets are yours, not prescriptions. Over-target rings show actual percentages.</p>`;
  }
  async function loadEducation() { const e = await api(`/api/me/nutrition/education?date=${$("journalDate").value}`); $("educationSummary").innerHTML = e.messages.map((m) => `<p>${escapeHtml(m)}</p>`).join(""); }
  async function loadRecent() { const [r, m] = await Promise.all([api("/api/me/nutrition/recent"), api("/api/me/nutrition/meals")]); $("recentList").innerHTML = `<h3>Recent foods</h3>` + r.items.map((e) => `<div class="row"><div><strong>${escapeHtml(e.foodName)}</strong><div class="muted">${e.calories ?? 0} cal</div></div><button class="btn" data-repeat="${e.entryId}">Log again</button></div>`).join(""); $("mealList").innerHTML = `<h3>Saved meals</h3>` + m.meals.map((meal) => `<div class="row"><div><strong>${escapeHtml(meal.name)}</strong><div class="muted">${meal.entries.length} foods</div></div><button class="btn" data-meal="${meal.mealId}">Log meal</button></div>`).join(""); $("recentList").querySelectorAll("[data-repeat]").forEach((b) => b.onclick = async () => { const e = r.items.find((x) => x.entryId === b.dataset.repeat); await api("/api/me/nutrition/entries", { method: "POST", body: JSON.stringify({ ...e, localDate: $("journalDate").value }) }); await refreshNutritionAndWeekly(); }); $("mealList").querySelectorAll("[data-meal]").forEach((b) => b.onclick = async () => { await api(`/api/me/nutrition/meals/${b.dataset.meal}/log`, { method: "POST", body: JSON.stringify({ localDate: $("journalDate").value, servingsMultiplier: 1 }) }); await refreshNutritionAndWeekly(); }); }
  async function saveMeal() { const ids = Array.from(state.selectedEntryIds); if (!ids.length) return alert("Select entries to save as a meal."); const name = prompt("Meal name", "Saved meal"); if (!name) return; await api("/api/me/nutrition/meals", { method: "POST", body: JSON.stringify({ name, entryIds: ids }) }); await loadRecent(); }

  function currentPlanId() { return state.weekly?.plan?.id || null; }
  function showWeeklyTab(id) { document.querySelectorAll(".weekly-panel").forEach((p) => { p.hidden = p.id !== id; }); }
  async function loadWeekly() { try { const [current, options] = await Promise.all([api("/api/me/nutrition/weekly-plan/current"), api("/api/me/nutrition/grocery-options")]); state.weekly = { ...(state.weekly || {}), ...(current || {}), options: options.options || [], categories: options.categories || [] }; renderWeekly(); } catch (e) { const out = $("weeklyOverview"); if (out) out.textContent = e.message; } }
  function renderWeekly() { renderWeeklyOverview(); renderGroceryOptions(); renderPantry(); renderMissions(); }
  function renderWeeklyOverview() { const out = $("weeklyOverview"); if (!out) return; const w = state.weekly || {}; if (!w.plan) { out.innerHTML = '<p class="muted">No weekly plan has been started for this Monday-based week.</p>'; return; } const p = w.progress || {}; out.innerHTML = `<div class="weekly-grid"><div class="metric"><strong>${escapeHtml(w.plan.weekStartDate)}</strong><span>Week starts Monday</span></div><div class="metric"><strong>${escapeHtml(w.plan.status)}</strong><span>Plan status</span></div><div class="metric"><strong>${p.groceryPrepared || 0}/${p.grocerySelected || 0}</strong><span>Grocery preparation</span></div><div class="metric"><strong>${p.missionsCompleted || 0}/${p.missionCount || 0}</strong><span>Mission progress</span></div></div><p class="muted">Weekly summary preview includes foods added, category variety, journal calories/macros, and hydration when logged.</p>`; }
  function groceryItemForOption(id) { return (state.weekly.groceryItems || []).find((i) => i.groceryOptionId === id); }
  function renderGroceryOptions() { const out = $("weeklyGroceryOptions"); const sel = $("customGroceryCategory"); if (!out) return; if (sel) sel.innerHTML = (state.weekly.categories || []).map((c) => `<option value="${escapeHtml(c.key)}">${escapeHtml(c.label)}</option>`).join(""); const byCat = {}; (state.weekly.options || []).forEach((o) => { (byCat[o.categoryKey] ||= []).push(o); }); out.innerHTML = (state.weekly.groceryItems || []).filter((item) => item.customName).map((item) => `<div class="weekly-card"><strong>${escapeHtml(item.customName)}</strong><div class="muted">Custom grocery item · ${escapeHtml(item.categoryKey || "other").replaceAll("_", " ")}</div></div>`).join("") + (state.weekly.categories || []).map((c) => `<details class="weekly-card"><summary class="category-toggle"><strong>${escapeHtml(c.label)}</strong><span class="muted"> · Choose one or more options</span></summary>${(byCat[c.key] || []).map((o) => { const item = groceryItemForOption(o.id) || {}; return `<div class="row"><div class="row-main"><strong>${escapeHtml(o.canonicalName)}</strong><div class="muted">${escapeHtml(o.defaultServingDescription)} · approximate nutrition when shown · ${(o.tags || []).map(escapeHtml).join(", ")}</div></div><div class="touch-row" data-option="${escapeHtml(o.id)}"><button class="btn" data-grocery-state="selectedForShopping" aria-pressed="${Boolean(item.selectedForShopping)}">Planning to buy</button><button class="btn" data-grocery-state="alreadyAtHome" aria-pressed="${Boolean(item.alreadyAtHome)}">Already have</button><button class="btn" data-grocery-state="acquired" aria-pressed="${Boolean(item.acquired)}">Purchased</button><button class="btn" data-grocery-state="unavailable" aria-pressed="${Boolean(item.unavailable)}">Unavailable</button></div></div>`; }).join("")}</details>`).join(""); out.querySelectorAll("[data-grocery-state]").forEach((b) => b.onclick = () => saveGroceryState(b.closest("[data-option]").dataset.option, b.dataset.groceryState)); }
  async function saveGroceryState(optionId, stateKey) { if (!currentPlanId()) await createWeeklyPlan(); const existing = groceryItemForOption(optionId) || {}; const option = state.weekly.options.find((o) => o.id === optionId); const payload = { groceryOptionId: optionId, categoryKey: option.categoryKey, selectedForShopping: false, acquired: false, alreadyAtHome: false, unavailable: false }; if (!existing[stateKey]) payload[stateKey] = true; const path = existing.id ? `/api/me/nutrition/weekly-plans/${currentPlanId()}/grocery-items/${existing.id}` : `/api/me/nutrition/weekly-plans/${currentPlanId()}/grocery-items`; await api(path, { method: existing.id ? "PATCH" : "POST", body: JSON.stringify(payload) }); await loadWeekly(); }
  async function createWeeklyPlan() { const r = await api("/api/me/nutrition/weekly-plans", { method: "POST", body: JSON.stringify({ sourceType: "member", status: "shopping" }) }); state.weekly.plan = r.plan; await loadWeekly(); }
  async function addCustomGrocery() { if (!currentPlanId()) await createWeeklyPlan(); const name = $("customGroceryName").value; if (!name.trim()) return alert("Enter a custom grocery item."); await api(`/api/me/nutrition/weekly-plans/${currentPlanId()}/grocery-items`, { method: "POST", body: JSON.stringify({ customName: name, categoryKey: $("customGroceryCategory").value, selectedForShopping: true }) }); $("customGroceryName").value = ""; await loadWeekly(); }
  function renderPantry() { const out = $("weeklyPantryList"); if (!out) return; const pantry = state.weekly.pantry || []; out.innerHTML = pantry.length ? pantry.map((i) => `<div class="weekly-card"><strong>${escapeHtml(labelGrocery(i))}</strong><div class="muted">${escapeHtml(i.categoryKey).replaceAll("_", " ")} · available for missions</div></div>`).join("") : '<p class="muted">Mark foods Purchased or Already have to add them to Available This Week.</p>'; }
  function renderMissions() { const out = $("weeklyMissionList"); if (!out) return; const todayDate = today(); const missions = (state.weekly.missions || []).filter((m) => m.missionDate === todayDate || !(state.weekly.missions || []).some((x) => x.missionDate === todayDate)); out.innerHTML = missions.map((m) => `<div class="weekly-card"><strong>${escapeHtml(m.title)}</strong><p>${escapeHtml(m.description)}</p><div class="muted">Available qualifying foods: ${(m.qualifyingFoods || []).map(escapeHtml).join(", ") || "manual confirmation available"}</div><div class="pill">${m.progressValue || 0}/${m.targetQuantity} ${escapeHtml(m.targetUnit)}</div><div class="pill ${m.status === "completed" ? "estimated" : ""}">${escapeHtml(m.status)}</div><button class="btn green" data-manual-mission="${escapeHtml(m.id)}">Manual confirmation</button></div>`).join("") || '<p class="muted">Generate missions after adding available pantry foods.</p>'; out.querySelectorAll("[data-manual-mission]").forEach((b) => b.onclick = async () => { await api(`/api/me/nutrition/missions/${b.dataset.manualMission}/manual-progress`, { method: "POST", body: JSON.stringify({ progressAmount: 1 }) }); await loadWeekly(); }); }
  function labelGrocery(i) { const o = (state.weekly.options || []).find((x) => x.id === i.groceryOptionId); return o?.canonicalName || i.customName || "Food option"; }
  async function generateWeeklyMissions() { if (!currentPlanId()) return alert("Start this week and mark pantry foods first."); await api(`/api/me/nutrition/weekly-plans/${currentPlanId()}/generate-missions`, { method: "POST", body: JSON.stringify({}) }); await loadWeekly(); showWeeklyTab("weeklyMissions"); }
  async function loadWeeklyReview() { if (!currentPlanId()) return; const r = await api(`/api/me/nutrition/weekly-plans/${currentPlanId()}/review`); $("weeklyReviewPanel").innerHTML = `<div class="summary"><div class="metric"><strong>${r.nutritionTotals.calories}</strong><span>logged calories</span></div><div class="metric"><strong>${r.nutritionTotals.proteinGrams}g</strong><span>protein</span></div><div class="metric"><strong>${r.categoriesIncluded.length}</strong><span>categories</span></div><div class="metric"><strong>${r.foodsLogged.length}</strong><span>foods logged</span></div></div><p class="notice">${escapeHtml(r.feedback)}</p>`; }

  function escapeHtml(v) { return String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  document.addEventListener("DOMContentLoaded", () => { $("journalDate").value = today(); document.querySelectorAll("[data-open]").forEach((b) => b.onclick = () => setPanel(b.dataset.open)); $("startScanBtn").onclick = captureOrRetry; $("barcodeCheckBtn").onclick = checkBarcodeRoute; if ("IntersectionObserver" in window) { const scanObserver = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio > 0.1)) { scanObserver.disconnect(); if (!$("scanPanel").hidden && $("scanPanel").classList.contains("active")) void startScanner(); } }, { threshold: 0.1 }); scanObserver.observe($("scanPanel")); } $("stopScanBtn").onclick = stopScanner; $("readNumbersBtn").onclick = readBarcodeNumbers; $("barcodePhoto").addEventListener("change", loadBarcodeCropPhoto); ["barcodeCropX", "barcodeCropY", "barcodeCropSize"].forEach((id) => $(id).addEventListener("input", drawBarcodeCrop)); $("barcodeCropRead").onclick = readBarcodeNumbers; $("barcodeCropCanvas").addEventListener("pointerdown", (event) => { $("barcodeCropCanvas").setPointerCapture?.(event.pointerId); positionBarcodeCrop(event); }); $("barcodeCropCanvas").addEventListener("pointermove", (event) => { if (event.buttons || event.pressure > 0) positionBarcodeCrop(event); }); $("nutritionFactsPhoto").addEventListener("change", readNutritionFactsPhoto); $("lookupBarcodeBtn").onclick = () => lookupBarcode($("manualBarcode").value); $("foodSearchBtn").onclick = searchFoods; $("draftBtn").onclick = createDraft; $("refreshBtn").onclick = refreshAll; $("loadRecentBtn").onclick = loadRecent; $("saveMealBtn").onclick = saveMeal; $("journalDate").onchange = refreshAll; renderCustomForm(); document.querySelectorAll("[data-weekly-tab]").forEach((b) => b.onclick = () => showWeeklyTab(b.dataset.weeklyTab)); if ($("createWeeklyPlanBtn")) $("createWeeklyPlanBtn").onclick = createWeeklyPlan; if ($("generateWeeklyMissionsBtn")) $("generateWeeklyMissionsBtn").onclick = generateWeeklyMissions; if ($("addCustomGroceryBtn")) $("addCustomGroceryBtn").onclick = addCustomGrocery; if ($("loadWeeklyReviewBtn")) $("loadWeeklyReviewBtn").onclick = loadWeeklyReview; requireSession(); });
  // iOS Safari can suspend the page without pagehide; release camera on background.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && (state.stream || state.zxingReader || state.zxingControls)) {
      stopScanner();
      $("barcodeStatus").textContent = "Camera paused when you left the page. Tap Capture / Try Again to restart.";
    }
  });
  window.addEventListener("pagehide", stopScanner);
  window.NutritionRuntime = { checkBarcodeRoute, startScanner, captureOrRetry, stopScanner, handleDetected, lookupBarcode, requireSession, authToken, backendUrl };
})();
