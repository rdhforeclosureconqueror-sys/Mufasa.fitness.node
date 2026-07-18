"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createApp } = require("../server");
const { normalizeOpenFoodFactsProduct, normalizeUsdaFood, calculateFromBasis } = require("../src/services/nutritionService");

async function withServer(t, fn, fetchImpl) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "phase32-nutrition-"));
  fs.mkdirSync(path.join(tmpRoot, "public", "exercise-db"), { recursive: true });
  fs.writeFileSync(path.join(tmpRoot, "public", "exercise-db", "index.json"), "[]");
  fs.copyFileSync(path.join(__dirname, "..", "public", "nutrition.html"), path.join(tmpRoot, "public", "nutrition.html"));
  const prev = { NODE_ENV: process.env.NODE_ENV, PILOT_LOGIN_PASSWORD: process.env.PILOT_LOGIN_PASSWORD, AUTH_TEST_LOGIN_FIXTURE_ENABLED: process.env.AUTH_TEST_LOGIN_FIXTURE_ENABLED, USDA_FDC_API_KEY: process.env.USDA_FDC_API_KEY };
  process.env.NODE_ENV = "test";
  process.env.PILOT_LOGIN_PASSWORD = "top-secret";
  process.env.AUTH_TEST_LOGIN_FIXTURE_ENABLED = "true";
  process.env.USDA_FDC_API_KEY = "server-only-usda-key";
  const app = createApp({ rootDir: tmpRoot, fetch: fetchImpl });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => { server.close(); for (const [k, v] of Object.entries(prev)) { if (v == null) delete process.env[k]; else process.env[k] = v; } });
  return fn({ baseUrl: `http://127.0.0.1:${server.address().port}`, tmpRoot });
}
async function request(baseUrl, route, { method = "GET", body, token } = {}) {
  const res = await fetch(baseUrl + route, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => null);
  return { res, json };
}
async function login(baseUrl, userId) {
  const { res, json } = await request(baseUrl, "/api/auth/login", { method: "POST", body: { email: `${userId}@example.test`, password: "top-secret", testUserId: userId } });
  assert.equal(res.status, 200);
  return json.token;
}

const offProduct = { product_name: "Test Bar", brands: "Pocket Foods", serving_size: "40 g", serving_quantity: 40, nutriments: { "energy-kcal_100g": 400, "energy-kcal_serving": 160, proteins_100g: 20, proteins_serving: 8, carbohydrates_100g: 50, carbohydrates_serving: 20, fat_100g: 10, fat_serving: 4, fiber_100g: 5, fiber_serving: 2, sodium_100g: 0.3, sodium_serving: 0.12 }, ingredients_text: "oats, nuts", allergens_tags: ["en:nuts"] };
const usdaFood = { fdcId: 123, description: "Bananas, raw", dataType: "Foundation", foodNutrients: [{ nutrientName: "Energy", value: 89 }, { nutrientName: "Protein", value: 1.1 }, { nutrientName: "Carbohydrate, by difference", value: 22.8 }, { nutrientName: "Total lipid (fat)", value: 0.3 }, { nutrientName: "Fiber, total dietary", value: 2.6 }, { nutrientName: "Sodium, Na", value: 1 }] };

function providerFetch(url, options = {}) {
  assert.doesNotMatch(String(url), /undefined/);
  if (String(url).includes("openfoodfacts")) {
    assert.match(options.headers?.["User-Agent"] || "", /PocketPT/);
    if (String(url).includes("000000")) return Promise.resolve(new Response(JSON.stringify({ status: 0 }), { status: 200 }));
    return Promise.resolve(new Response(JSON.stringify({ status: 1, product: offProduct }), { status: 200 }));
  }
  if (String(url).includes("foods/search")) {
    assert.match(String(url), /api_key=server-only-usda-key/);
    return Promise.resolve(new Response(JSON.stringify({ foods: [usdaFood] }), { status: 200 }));
  }
  if (String(url).includes("/food/123")) return Promise.resolve(new Response(JSON.stringify(usdaFood), { status: 200 }));
  return Promise.resolve(new Response("{}", { status: 503 }));
}

test("Phase 32 nutrition API requires auth and normalizes providers without exposing USDA key", async (t) => {
  await withServer(t, async ({ baseUrl }) => {
    for (const route of ["/api/me/nutrition/entries", "/api/me/nutrition/summary", "/api/me/nutrition/recent", "/api/me/nutrition/meals", "/api/nutrition/barcodes/123456789012", "/api/nutrition/foods/search?q=banana"]) {
      const unauth = await request(baseUrl, route);
      assert.equal(unauth.res.status, 401, route);
    }
    const token = await login(baseUrl, "nutrition_user");
    const barcode = await request(baseUrl, "/api/nutrition/barcodes/123456789012", { token });
    assert.equal(barcode.res.status, 200);
    assert.equal(barcode.json.data.foodName, "Test Bar");
    assert.equal(barcode.json.data.source, "open_food_facts");
    assert.match(barcode.json.data.notice, /incomplete/i);
    const missing = await request(baseUrl, "/api/nutrition/barcodes/000000", { token });
    assert.equal(missing.json.data.found, false);
    const invalid = await request(baseUrl, "/api/nutrition/barcodes/not-a-code", { token });
    assert.equal(invalid.res.status, 400);
    const search = await request(baseUrl, "/api/nutrition/foods/search?q=banana", { token });
    assert.equal(search.res.status, 200);
    assert.equal(search.json.data.results[0].foodName, "Bananas, raw");
    assert.doesNotMatch(JSON.stringify(search.json), /server-only-usda-key/);
    const detail = await request(baseUrl, "/api/nutrition/foods/123", { token });
    assert.equal(detail.json.data.source, "usda_fdc");
  }, providerFetch);
});

test("Phase 32 nutrition entries are user scoped and support CRUD, summaries, recent foods, and saved meals", async (t) => {
  await withServer(t, async ({ baseUrl, tmpRoot }) => {
    const tokenA = await login(baseUrl, "nutrition_a");
    const tokenB = await login(baseUrl, "nutrition_b");
    const create = await request(baseUrl, "/api/me/nutrition/entries", { method: "POST", token: tokenA, body: { localDate: "2026-06-07", mealType: "breakfast", foodName: "Oat bar", source: "custom", amount: 1, unit: "serving", calories: 160, proteinGrams: 8, carbohydrateGrams: 20, fatGrams: 4, fiberGrams: 2, sodiumMilligrams: 120, isEstimated: true, estimateReason: "Manual label copy" } });
    assert.equal(create.res.status, 201);
    const id = create.json.data.entry.entryId;
    const userBEntries = await request(baseUrl, "/api/me/nutrition/entries?date=2026-06-07", { token: tokenB });
    assert.equal(userBEntries.json.data.count, 0);
    const update = await request(baseUrl, `/api/me/nutrition/entries/${id}`, { method: "PUT", token: tokenA, body: { amount: 2, calories: 320, proteinGrams: 16, carbohydrateGrams: 40, fatGrams: 8, fiberGrams: 4, sodiumMilligrams: 240 } });
    assert.equal(update.json.data.entry.calories, 320);
    const summary = await request(baseUrl, "/api/me/nutrition/summary?date=2026-06-07", { token: tokenA });
    assert.equal(summary.json.data.fullDay.calories, 320);
    assert.equal(summary.json.data.fullDay.estimatedEntryCount, 1);
    const recent = await request(baseUrl, "/api/me/nutrition/recent", { token: tokenA });
    assert.equal(recent.json.data.count, 1);
    const meal = await request(baseUrl, "/api/me/nutrition/meals", { method: "POST", token: tokenA, body: { name: "Yesterday breakfast", entryIds: [id] } });
    assert.equal(meal.res.status, 201);
    const logged = await request(baseUrl, `/api/me/nutrition/meals/${meal.json.data.meal.mealId}/log`, { method: "POST", token: tokenA, body: { localDate: "2026-06-08" } });
    assert.equal(logged.json.data.count, 1);
    const del = await request(baseUrl, `/api/me/nutrition/entries/${id}`, { method: "DELETE", token: tokenA });
    assert.equal(del.json.data.deleted, true);
    const userFile = JSON.parse(fs.readFileSync(path.join(tmpRoot, "data", "users", "nutrition_a.json"), "utf8"));
    assert.equal(userFile.nutrition.entries.every((entry) => entry.userId === "nutrition_a"), true);
  }, providerFetch);
});

test("Phase 32 serving calculations and natural-language drafts require confirmation", async (t) => {
  const calc = calculateFromBasis({ nutrients: { per100g: { calories: 100, proteinGrams: 10, carbohydrateGrams: 5, fatGrams: 2, fiberGrams: 1, sodiumMilligrams: 50 } }, amount: 2, unit: "oz" });
  assert.equal(calc.isEstimated, true);
  assert.equal(calc.calories, 56.7);
  assert.match(calc.estimateReason, /Ounces converted/);
  assert.equal(normalizeOpenFoodFactsProduct(offProduct, "123456789012").calculatedServing.calories, 160);
  assert.equal(normalizeUsdaFood(usdaFood).nutrients.per100g.calories, 89);
  await withServer(t, async ({ baseUrl }) => {
    const token = await login(baseUrl, "nutrition_draft");
    const draft = await request(baseUrl, "/api/nutrition/drafts/natural-language", { method: "POST", token, body: { text: "I ate two scrambled eggs, toast, and a banana" } });
    assert.equal(draft.res.status, 201);
    assert.equal(draft.json.data.requiresConfirmation, true);
    assert.ok(draft.json.data.candidates.some((item) => item.possibleClarifications.length));
  }, providerFetch);
});



test("Phase 32 nutrition runtime restores canonical maatAuthToken and preserves auth-wall behavior", async () => {
  const authStateJs = fs.readFileSync(path.join(__dirname, "..", "public", "auth-state-runtime.js"), "utf8");
  const nutritionJs = fs.readFileSync(path.join(__dirname, "..", "public", "nutrition-runtime.js"), "utf8");

  async function runNutritionRuntime({ stored = {}, appAuth = null, authMeOk = true } = {}) {
    const listeners = {};
    const elements = new Map();
    function makeElement(id) {
      return elements.get(id) || elements.set(id, {
        id,
        hidden: true,
        value: "",
        textContent: "",
        innerHTML: "",
        dataset: {},
        style: {},
        classList: { toggle() {}, add() {}, remove() {} },
        querySelector: () => ({ value: "snack" }),
        querySelectorAll: () => [],
        pause() {}
      }).get(id);
    }
    [
      "authWall", "journalShell", "journalDate", "startScanBtn", "stopScanBtn", "lookupBarcodeBtn", "manualBarcode",
      "foodSearchBtn", "draftBtn", "refreshBtn", "loadRecentBtn", "saveMealBtn", "customForm", "customSaveBtn",
      "entriesList", "dailySummary", "educationSummary", "scannerVideo", "barcodeStatus", "productReview",
      "foodSearchInput", "foodResults", "draftReview", "naturalText", "recentList", "mealList"
    ].forEach(makeElement);

    const requests = [];
    const context = {
      console,
      setTimeout,
      clearTimeout,
      Date,
      Promise,
      CustomEvent: function CustomEvent(type, init) { return { type, detail: init?.detail }; },
      localStorage: {
        getItem: (key) => Object.prototype.hasOwnProperty.call(stored, key) ? stored[key] : null,
        setItem: (key, value) => { stored[key] = String(value); },
        removeItem: (key) => { delete stored[key]; }
      },
      navigator: { mediaDevices: null },
      location: { origin: "" },
      document: {
        readyState: "loading",
        addEventListener: (name, fn) => { listeners[name] = fn; },
        getElementById: makeElement,
        querySelectorAll: () => [],
        createEvent: () => ({ initCustomEvent(type, _bubbles, _cancelable, detail) { this.type = type; this.detail = detail; } })
      },
      addEventListener: (name, fn) => { listeners[`window:${name}`] = fn; },
      dispatchEvent: () => {},
      fetch: async (path, options = {}) => {
        requests.push({ path, options });
        if (path === "/api/auth/me") {
          return new Response(JSON.stringify(authMeOk ? { ok: true, data: { user: { userId: "nutrition_user" } } } : { ok: false, error: "invalid" }), { status: authMeOk ? 200 : 401, headers: { "content-type": "application/json" } });
        }
        if (String(path).startsWith("/api/me/nutrition/entries")) return new Response(JSON.stringify({ ok: true, data: { entries: [] } }), { status: 200, headers: { "content-type": "application/json" } });
        if (String(path).startsWith("/api/me/nutrition/summary")) return new Response(JSON.stringify({ ok: true, data: { fullDay: { calories: 0, proteinGrams: 0, carbohydrateGrams: 0, fatGrams: 0, fiberGrams: 0, sodiumMilligrams: 0, mealsLogged: 0, estimatedEntryCount: 0 } } }), { status: 200, headers: { "content-type": "application/json" } });
        if (String(path).startsWith("/api/me/nutrition/education")) return new Response(JSON.stringify({ ok: true, data: { messages: [] } }), { status: 200, headers: { "content-type": "application/json" } });
        throw new Error(`unexpected fetch ${path}`);
      }
    };
    context.window = context;
    if (appAuth) context.APP_AUTH = appAuth;
    require("node:vm").runInNewContext(authStateJs, context);
    require("node:vm").runInNewContext(nutritionJs, context);
    await listeners.DOMContentLoaded();
    await new Promise((resolve) => setImmediate(resolve));
    return { requests, elements, stored, context };
  }

  const canonical = await runNutritionRuntime({ stored: { maatAuthToken: "canonical-token" } });
  assert.equal(canonical.requests[0].path, "/api/auth/me");
  assert.equal(canonical.requests[0].options.headers.authorization, "Bearer canonical-token");
  assert.equal(canonical.elements.get("journalShell").hidden, false);
  assert.equal(canonical.elements.get("authWall").hidden, true);

  const legacyAuthToken = await runNutritionRuntime({ stored: { authToken: "legacy-auth-token" } });
  assert.equal(legacyAuthToken.requests[0].options.headers.authorization, "Bearer legacy-auth-token");
  assert.equal(legacyAuthToken.elements.get("journalShell").hidden, false);

  const legacyPocketToken = await runNutritionRuntime({ stored: { pocket_pt_auth_token: "legacy-pocket-token" } });
  assert.equal(legacyPocketToken.requests[0].options.headers.authorization, "Bearer legacy-pocket-token");
  assert.equal(legacyPocketToken.elements.get("journalShell").hidden, false);

  const missing = await runNutritionRuntime();
  assert.equal(missing.requests.length, 0);
  assert.equal(missing.elements.get("authWall").hidden, false);
  assert.equal(missing.elements.get("journalShell").hidden, true);

  const invalid = await runNutritionRuntime({ stored: { maatAuthToken: "invalid-token" }, authMeOk: false });
  assert.equal(invalid.requests[0].options.headers.authorization, "Bearer invalid-token");
  assert.equal(invalid.elements.get("authWall").hidden, false);
  assert.equal(invalid.elements.get("journalShell").hidden, true);
  assert.equal(invalid.stored.maatAuthToken, undefined);

  const logout = await runNutritionRuntime({ stored: { maatAuthToken: "logout-token" }, appAuth: { token: "logout-token", user: { userId: "nutrition_user" }, isAuthenticated: true } });
  logout.context.AuthStateRuntime.clearCanonicalAuthState("test_logout", { clearLastUser: true });
  assert.equal(logout.stored.maatAuthToken, undefined);
  assert.equal(logout.context.APP_AUTH.token, null);
});

test("Phase 32 frontend exposes authenticated nutrition flow and scanner compatibility", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "nutrition.html"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "..", "public", "nutrition-runtime.js"), "utf8");
  assert.match(html, /nutrition journal/i);
  assert.match(html, /A\. Scan Barcode/);
  assert.match(html, /B\. Search Foods/);
  assert.match(html, /C\. Tell Pocket PT What I Ate/);
  assert.match(html, /D\. Repeat Recent Meal/);
  assert.match(html, /Add Custom Food/);
  assert.match(html, /Save as Meal/);
  assert.match(js, /BarcodeDetector/);
  assert.match(js, /@zxing\/browser/);
  assert.match(js, /getUserMedia/);
  assert.match(js, /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.match(js, /lastScanAt/);
  assert.match(js, /manualBarcode/);
  assert.match(js, /api\/auth\/me/);
});
