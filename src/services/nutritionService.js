"use strict";

const { ApiError } = require("../lib/apiResponse");

const MEAL_TYPES = new Set(["breakfast", "lunch", "dinner", "snack", "other"]);
const SOURCES = new Set(["open_food_facts", "usda_fdc", "custom", "natural_language", "saved_meal"]);
const DEFAULT_TIMEOUT_MS = 7000;
const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 30;

function nowIso() { return new Date().toISOString(); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function round(value, places = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const factor = 10 ** places;
  return Math.round(n * factor) / factor;
}
function roundInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}
function positiveNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
function safeString(value, max = 240) {
  return String(value ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, max);
}
function parseArray(value, max = 24) {
  if (Array.isArray(value)) return value.map((item) => safeString(item, 120)).filter(Boolean).slice(0, max);
  if (typeof value === "string") return value.split(/[,;]+/).map((item) => safeString(item, 120)).filter(Boolean).slice(0, max);
  return [];
}
function parseLocalDate(raw, fallbackDate = new Date()) {
  const value = safeString(raw, 20);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return fallbackDate.toISOString().slice(0, 10);
}
function parseLoggedAt(raw) {
  const d = raw ? new Date(raw) : new Date();
  return Number.isFinite(d.getTime()) ? d.toISOString() : nowIso();
}
function validateBarcode(raw) {
  const barcode = safeString(raw, 32).replace(/\s+/g, "");
  if (!/^\d{6,14}$/.test(barcode)) throw new ApiError("VALIDATION_ERROR", "Barcode must be 6-14 digits", 400);
  return barcode;
}
function sanitizeQuery(raw) {
  const q = safeString(raw, 120);
  if (q.length < 2) throw new ApiError("VALIDATION_ERROR", "Search query must be at least 2 characters", 400);
  return q;
}
function nutrientObjectFromEntry(entry) {
  return {
    calories: positiveNumber(entry.calories, 0) || 0,
    proteinGrams: positiveNumber(entry.proteinGrams, 0) || 0,
    carbohydrateGrams: positiveNumber(entry.carbohydrateGrams, 0) || 0,
    fatGrams: positiveNumber(entry.fatGrams, 0) || 0,
    fiberGrams: positiveNumber(entry.fiberGrams, 0) || 0,
    sodiumMilligrams: positiveNumber(entry.sodiumMilligrams, 0) || 0
  };
}
function emptyTotals() {
  return { calories: 0, proteinGrams: 0, carbohydrateGrams: 0, fatGrams: 0, fiberGrams: 0, sodiumMilligrams: 0, mealsLogged: 0, estimatedEntryCount: 0 };
}
function addTotals(target, entry) {
  const n = nutrientObjectFromEntry(entry);
  target.calories += n.calories;
  target.proteinGrams += n.proteinGrams;
  target.carbohydrateGrams += n.carbohydrateGrams;
  target.fatGrams += n.fatGrams;
  target.fiberGrams += n.fiberGrams;
  target.sodiumMilligrams += n.sodiumMilligrams;
  target.mealsLogged += 1;
  if (entry.isEstimated) target.estimatedEntryCount += 1;
}
function finalizeTotals(totals) {
  return {
    calories: roundInt(totals.calories) || 0,
    proteinGrams: round(totals.proteinGrams) || 0,
    carbohydrateGrams: round(totals.carbohydrateGrams) || 0,
    fatGrams: round(totals.fatGrams) || 0,
    fiberGrams: round(totals.fiberGrams) || 0,
    sodiumMilligrams: roundInt(totals.sodiumMilligrams) || 0,
    mealsLogged: totals.mealsLogged || 0,
    estimatedEntryCount: totals.estimatedEntryCount || 0
  };
}

function parseServingGrams(servingText) {
  const text = String(servingText || "").toLowerCase();
  const gram = text.match(/([0-9]+(?:\.[0-9]+)?)\s*g\b/);
  if (gram) return Number(gram[1]);
  const oz = text.match(/([0-9]+(?:\.[0-9]+)?)\s*oz\b/);
  if (oz) return Number(oz[1]) * 28.3495;
  return null;
}
function normalizeNutriments(nutriments = {}) {
  return {
    per100g: {
      calories: round(nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal"] ?? nutriments["energy_100g"] / 4.184),
      proteinGrams: round(nutriments.proteins_100g),
      carbohydrateGrams: round(nutriments.carbohydrates_100g),
      fatGrams: round(nutriments.fat_100g),
      fiberGrams: round(nutriments.fiber_100g),
      sodiumMilligrams: round((Number(nutriments.sodium_100g) || 0) * 1000, 0)
    },
    perServing: {
      calories: round(nutriments["energy-kcal_serving"]),
      proteinGrams: round(nutriments.proteins_serving),
      carbohydrateGrams: round(nutriments.carbohydrates_serving),
      fatGrams: round(nutriments.fat_serving),
      fiberGrams: round(nutriments.fiber_serving),
      sodiumMilligrams: round((Number(nutriments.sodium_serving) || 0) * 1000, 0)
    }
  };
}
function calculateFromBasis({ nutrients = {}, amount, unit, servingsConsumed, servingQuantity }) {
  const consumedServings = positiveNumber(servingsConsumed, null);
  const amountNumber = positiveNumber(amount, null);
  const normalizedUnit = safeString(unit, 32).toLowerCase() || "serving";
  let factor = null;
  let isEstimated = false;
  let estimateReason = "";
  const perServing = nutrients.perServing || {};
  const per100g = nutrients.per100g || {};

  if (consumedServings !== null && Object.values(perServing).some((v) => Number.isFinite(Number(v)))) {
    factor = consumedServings;
    return scaleNutrients(perServing, factor, false, "");
  }
  if (normalizedUnit === "servings" || normalizedUnit === "serving") {
    const s = amountNumber ?? 1;
    if (Object.values(perServing).some((v) => Number.isFinite(Number(v)))) return scaleNutrients(perServing, s, false, "");
    const grams = positiveNumber(servingQuantity, null);
    if (grams && Object.values(per100g).some((v) => Number.isFinite(Number(v)))) return scaleNutrients(per100g, (grams * s) / 100, true, "Serving nutrients were missing; converted from per-100g label data.");
  }
  if (["g", "gram", "grams"].includes(normalizedUnit) && amountNumber !== null) return scaleNutrients(per100g, amountNumber / 100, false, "");
  if (["oz", "ounce", "ounces"].includes(normalizedUnit) && amountNumber !== null) return scaleNutrients(per100g, (amountNumber * 28.3495) / 100, true, "Ounces converted to grams for nutrient calculation.");

  isEstimated = true;
  estimateReason = "Quantity conversion is incomplete; nutrients are based on the closest available serving data.";
  if (Object.values(perServing).some((v) => Number.isFinite(Number(v)))) return scaleNutrients(perServing, amountNumber || consumedServings || 1, isEstimated, estimateReason);
  if (Object.values(per100g).some((v) => Number.isFinite(Number(v)))) return scaleNutrients(per100g, 1, isEstimated, estimateReason);
  return { calories: null, proteinGrams: null, carbohydrateGrams: null, fatGrams: null, fiberGrams: null, sodiumMilligrams: null, isEstimated: true, estimateReason: "Nutrient data is incomplete." };
}
function scaleNutrients(basis, factor, isEstimated, estimateReason) {
  return {
    calories: round((Number(basis.calories) || 0) * factor),
    proteinGrams: round((Number(basis.proteinGrams) || 0) * factor),
    carbohydrateGrams: round((Number(basis.carbohydrateGrams) || 0) * factor),
    fatGrams: round((Number(basis.fatGrams) || 0) * factor),
    fiberGrams: round((Number(basis.fiberGrams) || 0) * factor),
    sodiumMilligrams: roundInt((Number(basis.sodiumMilligrams) || 0) * factor),
    isEstimated: Boolean(isEstimated),
    estimateReason: estimateReason || null
  };
}

function normalizeOpenFoodFactsProduct(product, barcode) {
  const nutr = normalizeNutriments(product?.nutriments || {});
  const servingText = safeString(product?.serving_size || product?.serving_quantity || "", 120);
  const servingQuantity = positiveNumber(product?.serving_quantity, null) || parseServingGrams(servingText);
  const calc = calculateFromBasis({ nutrients: nutr, amount: 1, unit: "serving", servingsConsumed: 1, servingQuantity });
  const incomplete = !product?.product_name || !Object.values(nutr.perServing).some((v) => Number.isFinite(Number(v))) || calc.isEstimated;
  return {
    found: true,
    foodName: safeString(product?.product_name || product?.generic_name || "Packaged food", 180),
    brand: safeString(product?.brands || "", 180) || null,
    barcode,
    servingQuantity,
    servingUnit: servingQuantity ? "g" : safeString(product?.serving_size || "serving", 64) || "serving",
    servingText: servingText || null,
    nutrients: nutr,
    calculatedServing: calc,
    ingredients: safeString(product?.ingredients_text || "", 2000) || null,
    allergens: parseArray(product?.allergens_tags || product?.allergens || [], 30),
    source: "open_food_facts",
    sourceId: barcode,
    isEstimated: Boolean(incomplete || calc.isEstimated),
    estimateReason: incomplete ? "Product information may be incomplete. Review before saving." : calc.estimateReason,
    notice: "Product information may be incomplete. Review before saving."
  };
}
function normalizeUsdaFood(food) {
  const nutrients = Array.isArray(food?.foodNutrients) ? food.foodNutrients : [];
  const byName = (patterns) => {
    const item = nutrients.find((n) => patterns.some((p) => String(n.nutrientName || n.nutrient?.name || "").toLowerCase().includes(p)));
    return positiveNumber(item?.value ?? item?.amount, null);
  };
  const sodium = byName(["sodium"]);
  const per100g = {
    calories: round(byName(["energy"])),
    proteinGrams: round(byName(["protein"])),
    carbohydrateGrams: round(byName(["carbohydrate"])),
    fatGrams: round(byName(["total lipid", "total fat"])),
    fiberGrams: round(byName(["fiber"])),
    sodiumMilligrams: sodium === null ? null : roundInt(sodium)
  };
  return {
    fdcId: String(food?.fdcId || ""),
    foodName: safeString(food?.description || food?.lowercaseDescription || "USDA food", 180),
    brand: safeString(food?.brandOwner || food?.brandName || "", 180) || null,
    dataType: safeString(food?.dataType || "", 80) || null,
    servingQuantity: 100,
    servingUnit: "g",
    portions: Array.isArray(food?.foodPortions) ? food.foodPortions.slice(0, 8).map((p) => ({
      amount: positiveNumber(p.amount, null),
      gramWeight: positiveNumber(p.gramWeight, null),
      modifier: safeString(p.modifier || p.portionDescription || p.measureUnit?.name || "", 120) || null
    })) : [],
    nutrients: { per100g, perServing: per100g },
    source: "usda_fdc",
    sourceId: String(food?.fdcId || ""),
    isEstimated: Object.values(per100g).some((v) => v === null),
    estimateReason: Object.values(per100g).some((v) => v === null) ? "USDA nutrient data is incomplete for one or more macros." : null
  };
}

function createProviderClient({ fetchImpl = global.fetch, env = process.env } = {}) {
  const cache = new Map();
  const timeoutMs = Math.max(1000, Number(env.NUTRITION_PROVIDER_TIMEOUT_MS || DEFAULT_TIMEOUT_MS));
  const cacheTtlMs = Math.max(0, Number(env.NUTRITION_CACHE_TTL_MS || DEFAULT_CACHE_TTL_MS));
  const offBaseUrl = String(env.OPEN_FOOD_FACTS_BASE_URL || "https://world.openfoodfacts.org").replace(/\/+$/g, "");
  const offUserAgent = String(env.OPEN_FOOD_FACTS_USER_AGENT || "PocketPT/phase32 nutrition journal (contact: support@example.com)");
  async function cachedJson(key, url, options = {}) {
    if (cacheTtlMs > 0) {
      const hit = cache.get(key);
      if (hit && Date.now() - hit.ts < cacheTtlMs) return clone(hit.value);
    }
    if (typeof fetchImpl !== "function") throw new ApiError("PROVIDER_UNAVAILABLE", "Provider fetch is unavailable", 503);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { ...options, signal: controller.signal });
      if (!response.ok) throw new ApiError("PROVIDER_UNAVAILABLE", "Nutrition provider is unavailable", 503);
      const value = await response.json();
      if (cacheTtlMs > 0) cache.set(key, { ts: Date.now(), value: clone(value) });
      return value;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("PROVIDER_UNAVAILABLE", "Nutrition provider is unavailable", 503);
    } finally {
      clearTimeout(timeout);
    }
  }
  async function lookupBarcode(rawBarcode) {
    const barcode = validateBarcode(rawBarcode);
    const fields = ["code", "product_name", "generic_name", "brands", "serving_size", "serving_quantity", "nutriments", "ingredients_text", "allergens", "allergens_tags"].join(",");
    const url = `${offBaseUrl}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${encodeURIComponent(fields)}`;
    const json = await cachedJson(`off:${barcode}`, url, { headers: { "User-Agent": offUserAgent } });
    if (!json || json.status === 0 || !json.product) return { found: false, barcode, source: "open_food_facts", message: "Product not found. Try search or manual entry." };
    return normalizeOpenFoodFactsProduct(json.product, barcode);
  }
  async function searchUsda(rawQuery, limit = 10) {
    const q = sanitizeQuery(rawQuery);
    const apiKey = safeString(env.USDA_FDC_API_KEY || "", 200);
    if (!apiKey) throw new ApiError("PROVIDER_CONFIG_MISSING", "USDA FoodData Central API key is not configured", 503);
    const pageSize = Math.max(1, Math.min(25, Number(limit) || 10));
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&pageSize=${pageSize}&api_key=${encodeURIComponent(apiKey)}`;
    const json = await cachedJson(`usda-search:${q}:${pageSize}`, url);
    const foods = Array.isArray(json?.foods) ? json.foods.map(normalizeUsdaFood).filter((f) => f.fdcId).slice(0, pageSize) : [];
    return { query: q, results: foods, count: foods.length, source: "usda_fdc" };
  }
  async function getUsdaFood(fdcId) {
    const id = safeString(fdcId, 32);
    if (!/^\d{1,12}$/.test(id)) throw new ApiError("VALIDATION_ERROR", "FDC ID must be numeric", 400);
    const apiKey = safeString(env.USDA_FDC_API_KEY || "", 200);
    if (!apiKey) throw new ApiError("PROVIDER_CONFIG_MISSING", "USDA FoodData Central API key is not configured", 503);
    const url = `https://api.nal.usda.gov/fdc/v1/food/${encodeURIComponent(id)}?api_key=${encodeURIComponent(apiKey)}`;
    const json = await cachedJson(`usda-detail:${id}`, url);
    return normalizeUsdaFood(json);
  }
  return { lookupBarcode, searchUsda, getUsdaFood, validateBarcode, sanitizeQuery };
}

function createNutritionService({ userStore }) {
  function nutritionStore(user) {
    user.nutrition = user.nutrition && typeof user.nutrition === "object" ? user.nutrition : {};
    user.nutrition.entries = Array.isArray(user.nutrition.entries) ? user.nutrition.entries : [];
    user.nutrition.savedMeals = Array.isArray(user.nutrition.savedMeals) ? user.nutrition.savedMeals : [];
    user.nutrition.savedFoods = Array.isArray(user.nutrition.savedFoods) ? user.nutrition.savedFoods : [];
    return user.nutrition;
  }
  function normalizeEntry(input, userId, existing = null) {
    const loggedAt = parseLoggedAt(input.loggedAt || existing?.loggedAt);
    const nutrients = input.nutrients || { perServing: input.perServing || null, per100g: input.per100g || null };
    const calc = input.recalculate === false ? {} : calculateFromBasis({
      nutrients,
      amount: input.amount ?? existing?.amount ?? 1,
      unit: input.unit ?? existing?.unit ?? "serving",
      servingsConsumed: input.servingsConsumed ?? existing?.servingsConsumed ?? null,
      servingQuantity: input.servingQuantity ?? existing?.servingQuantity ?? null
    });
    const isEstimated = Boolean(input.isEstimated ?? existing?.isEstimated ?? calc.isEstimated ?? false);
    const estimateReason = safeString(input.estimateReason || existing?.estimateReason || calc.estimateReason || (isEstimated ? "Nutrition values are estimated." : ""), 300) || null;
    return {
      entryId: existing?.entryId || `nut_${Date.now()}_${cryptoRandom()}`,
      userId,
      loggedAt,
      localDate: parseLocalDate(input.localDate || existing?.localDate, new Date(loggedAt)),
      mealType: MEAL_TYPES.has(input.mealType) ? input.mealType : (existing?.mealType || "other"),
      foodName: safeString(input.foodName || existing?.foodName || "Food", 180) || "Food",
      brand: safeString(input.brand ?? existing?.brand ?? "", 180) || null,
      source: SOURCES.has(input.source) ? input.source : (existing?.source || "custom"),
      sourceId: safeString(input.sourceId ?? existing?.sourceId ?? "", 120) || null,
      barcode: input.barcode ? validateBarcode(input.barcode) : (existing?.barcode || null),
      amount: positiveNumber(input.amount ?? existing?.amount, 1),
      unit: safeString(input.unit ?? existing?.unit ?? "serving", 48) || "serving",
      servingQuantity: positiveNumber(input.servingQuantity ?? existing?.servingQuantity, null),
      servingUnit: safeString(input.servingUnit ?? existing?.servingUnit ?? "", 48) || null,
      servingsConsumed: positiveNumber(input.servingsConsumed ?? existing?.servingsConsumed, null),
      calories: positiveNumber(input.calories, calc.calories ?? existing?.calories ?? null),
      proteinGrams: positiveNumber(input.proteinGrams, calc.proteinGrams ?? existing?.proteinGrams ?? null),
      carbohydrateGrams: positiveNumber(input.carbohydrateGrams, calc.carbohydrateGrams ?? existing?.carbohydrateGrams ?? null),
      fatGrams: positiveNumber(input.fatGrams, calc.fatGrams ?? existing?.fatGrams ?? null),
      fiberGrams: positiveNumber(input.fiberGrams, calc.fiberGrams ?? existing?.fiberGrams ?? null),
      sodiumMilligrams: positiveNumber(input.sodiumMilligrams, calc.sodiumMilligrams ?? existing?.sodiumMilligrams ?? null),
      nutrients: nutrients?.perServing || nutrients?.per100g ? clone(nutrients) : (existing?.nutrients || null),
      ingredients: safeString(input.ingredients ?? existing?.ingredients ?? "", 2000) || null,
      allergens: parseArray(input.allergens ?? existing?.allergens ?? [], 30),
      isEstimated,
      estimateReason,
      notes: safeString(input.notes ?? existing?.notes ?? "", 1000) || null,
      createdAt: existing?.createdAt || nowIso(),
      updatedAt: nowIso()
    };
  }
  function cryptoRandom() { return Math.random().toString(36).slice(2, 10); }
  function listEntries(userId, date) {
    const localDate = parseLocalDate(date);
    const user = userStore.loadUser(userId);
    const entries = nutritionStore(user).entries.filter((entry) => entry.localDate === localDate).sort((a, b) => String(a.loggedAt).localeCompare(String(b.loggedAt)));
    return { userId, localDate, entries: clone(entries), count: entries.length };
  }
  function createEntry(userId, input) {
    let entry;
    userStore.updateUser(userId, (user) => {
      const store = nutritionStore(user);
      entry = normalizeEntry(input || {}, userId);
      store.entries.push(entry);
      if (["open_food_facts", "usda_fdc", "custom"].includes(entry.source)) upsertSavedFood(store, entry);
      user.events = user.events || [];
      user.events.push({ command: "nutrition.entryCreated", ts: Date.now(), payload: { entryId: entry.entryId, source: entry.source } });
      return user;
    });
    return { userId, entry: clone(entry) };
  }
  function updateEntry(userId, entryId, input) {
    let updated = null;
    userStore.updateUser(userId, (user) => {
      const store = nutritionStore(user);
      const index = store.entries.findIndex((entry) => entry.entryId === entryId && entry.userId === userId);
      if (index === -1) throw new ApiError("NOT_FOUND", "Nutrition entry not found", 404);
      updated = normalizeEntry(input || {}, userId, store.entries[index]);
      store.entries[index] = updated;
      user.events = user.events || [];
      user.events.push({ command: "nutrition.entryUpdated", ts: Date.now(), payload: { entryId } });
      return user;
    });
    return { userId, entry: clone(updated) };
  }
  function deleteEntry(userId, entryId) {
    let deleted = null;
    userStore.updateUser(userId, (user) => {
      const store = nutritionStore(user);
      const before = store.entries.length;
      store.entries = store.entries.filter((entry) => {
        const match = entry.entryId === entryId && entry.userId === userId;
        if (match) deleted = entry;
        return !match;
      });
      if (store.entries.length === before) throw new ApiError("NOT_FOUND", "Nutrition entry not found", 404);
      user.events = user.events || [];
      user.events.push({ command: "nutrition.entryDeleted", ts: Date.now(), payload: { entryId } });
      return user;
    });
    return { userId, deleted: Boolean(deleted), entryId };
  }
  function summarize(userId, date) {
    const { localDate, entries } = listEntries(userId, date);
    const byMeal = { breakfast: emptyTotals(), lunch: emptyTotals(), dinner: emptyTotals(), snack: emptyTotals(), other: emptyTotals() };
    const fullDay = emptyTotals();
    for (const entry of entries) {
      addTotals(byMeal[entry.mealType] || byMeal.other, entry);
      addTotals(fullDay, entry);
    }
    return { userId, localDate, fullDay: finalizeTotals(fullDay), byMeal: Object.fromEntries(Object.entries(byMeal).map(([k, v]) => [k, finalizeTotals(v)])) };
  }
  function recent(userId, limit = 12) {
    const user = userStore.loadUser(userId);
    const entries = nutritionStore(user).entries.slice().reverse();
    const seen = new Set();
    const items = [];
    for (const entry of entries) {
      const key = `${entry.source}:${entry.sourceId || entry.barcode || entry.foodName}:${entry.unit}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(clone(entry));
      if (items.length >= Math.max(1, Math.min(50, Number(limit) || 12))) break;
    }
    return { userId, items, count: items.length };
  }
  function upsertSavedFood(store, entry) {
    const key = `${entry.source}:${entry.sourceId || entry.barcode || entry.foodName}`;
    store.savedFoods = store.savedFoods.filter((food) => food.key !== key);
    store.savedFoods.unshift({ key, foodName: entry.foodName, brand: entry.brand, source: entry.source, sourceId: entry.sourceId, barcode: entry.barcode, nutrients: entry.nutrients, savedAt: nowIso() });
    store.savedFoods = store.savedFoods.slice(0, 100);
  }
  function createMeal(userId, input) {
    let meal;
    userStore.updateUser(userId, (user) => {
      const store = nutritionStore(user);
      const entryIds = Array.isArray(input?.entryIds) ? input.entryIds.map(String) : [];
      const entries = entryIds.length ? store.entries.filter((entry) => entryIds.includes(entry.entryId) && entry.userId === userId) : (Array.isArray(input?.entries) ? input.entries.map((entry) => normalizeEntry({ ...entry, source: entry.source || "saved_meal" }, userId)) : []);
      if (!entries.length) throw new ApiError("VALIDATION_ERROR", "Saved meal requires at least one entry", 400);
      meal = { mealId: `meal_${Date.now()}_${cryptoRandom()}`, userId, name: safeString(input?.name || "Saved meal", 120) || "Saved meal", entries: clone(entries), createdAt: nowIso(), updatedAt: nowIso() };
      store.savedMeals.push(meal);
      return user;
    });
    return { userId, meal: clone(meal) };
  }
  function listMeals(userId) {
    const user = userStore.loadUser(userId);
    return { userId, meals: clone(nutritionStore(user).savedMeals), count: nutritionStore(user).savedMeals.length };
  }
  function logMeal(userId, mealId, input = {}) {
    const created = [];
    userStore.updateUser(userId, (user) => {
      const store = nutritionStore(user);
      const meal = store.savedMeals.find((item) => item.mealId === mealId && item.userId === userId);
      if (!meal) throw new ApiError("NOT_FOUND", "Saved meal not found", 404);
      const scale = positiveNumber(input.servingsMultiplier, 1) || 1;
      const localDate = parseLocalDate(input.localDate);
      for (const original of meal.entries) {
        const entry = normalizeEntry({ ...original, source: "saved_meal", sourceId: mealId, localDate, loggedAt: nowIso(), amount: (positiveNumber(original.amount, 1) || 1) * scale, servingsConsumed: original.servingsConsumed ? original.servingsConsumed * scale : null }, userId);
        store.entries.push(entry);
        created.push(entry);
      }
      return user;
    });
    return { userId, mealId, entries: clone(created), count: created.length };
  }
  function naturalLanguageDraft(userId, text) {
    const raw = safeString(text, 1000);
    if (raw.length < 3) throw new ApiError("VALIDATION_ERROR", "Tell Pocket PT what you ate before creating a draft", 400);
    const candidates = raw.split(/,|\band\b|\+|;/i).map((part) => safeString(part, 120)).filter(Boolean).map((phrase) => {
      const qty = phrase.match(/\b(\d+(?:\.\d+)?|one|two|three|four|five)\b/i)?.[0] || null;
      return { phrase, quantityText: qty, searchQuery: phrase.replace(/\b(i ate|ate|had|for breakfast|for lunch|for dinner)\b/ig, "").trim(), requiresConfirmation: true, possibleClarifications: clarificationQuestions(phrase) };
    });
    return { userId, draftId: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, originalText: raw, candidates, requiresConfirmation: true, message: "Review each food and confirm quantities before saving. Pocket PT will not invent nutrient numbers." };
  }
  function clarificationQuestions(phrase) {
    const q = [];
    if (!/\d|one|two|three|four|five/i.test(phrase)) q.push("How much did you eat?");
    if (/egg/i.test(phrase)) q.push("Was oil or butter used?");
    if (/banana/i.test(phrase)) q.push("What size was the banana?");
    if (/toast|bread|cereal|yogurt/i.test(phrase)) q.push("Which brand or serving size?");
    return q.slice(0, 3);
  }
  function educationSummary(userId, date) {
    const summary = summarize(userId, date);
    const entries = listEntries(userId, date).entries;
    const highSodium = entries.filter((entry) => Number(entry.sodiumMilligrams) >= 700).map((entry) => entry.foodName);
    const fiberSources = entries.filter((entry) => Number(entry.fiberGrams) > 0).map((entry) => entry.foodName);
    const estimated = entries.filter((entry) => entry.isEstimated).length;
    return { userId, localDate: summary.localDate, summary: summary.fullDay, messages: [
      `Today has ${summary.fullDay.proteinGrams}g protein logged from saved journal entries.`,
      fiberSources.length ? `Fiber sources logged: ${fiberSources.slice(0, 5).join(", ")}.` : "No fiber sources have been logged yet today.",
      highSodium.length ? `Higher-sodium entries to review: ${highSodium.slice(0, 5).join(", ")}.` : "No high-sodium entries were flagged from today's journal.",
      estimated ? `${estimated} entries include estimated nutrition because quantities or source data were incomplete.` : "Logged entries with complete quantities are shown without an estimated label.",
      "This is general education, not a medical diagnosis or therapeutic diet prescription."
    ] };
  }
  return { listEntries, createEntry, updateEntry, deleteEntry, summarize, recent, createMeal, listMeals, logMeal, naturalLanguageDraft, educationSummary };
}

module.exports = {
  createNutritionService,
  createProviderClient,
  validateBarcode,
  normalizeOpenFoodFactsProduct,
  normalizeUsdaFood,
  calculateFromBasis
};
