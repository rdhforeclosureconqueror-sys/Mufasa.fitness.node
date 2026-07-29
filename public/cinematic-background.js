export const GREATNESS_SLIDES = Object.freeze([
  { src: "new/stepintograteness1.jpg", position: "center center", mobilePosition: "58% center", motion: "motion-in", accent: "accent-gold" },
  { src: "new/stepintograteness2.jpg", position: "center 38%", mobilePosition: "52% 38%", motion: "motion-right", accent: "accent-red" },
  { src: "new/stepintograteness3.jpg", position: "center center", mobilePosition: "48% center", motion: "motion-up", accent: "accent-green" }
]);

export function createCinematicBackground({ root, slides = GREATNESS_SLIDES, documentRef = document, windowRef = window, displayMs = 12000, transitionMs = 2500, ImageCtor = Image } = {}) {
  if (!root || root.dataset.cinematicInitialized === "true") return root?.cinematicController;
  const layers = [...root.querySelectorAll(".cinematic-layer")];
  if (layers.length !== 2 || !slides.length) return null;
  const media = windowRef.matchMedia?.("(prefers-reduced-motion: reduce)");
  const connection = windowRef.navigator?.connection;
  const reduced = Boolean(media?.matches);
  const saveData = Boolean(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || ""));
  const diagnostics = new URLSearchParams(windowRef.location?.search || "").get("greatnessDiagnostics") === "1";
  let index = 0, active = 0, timer = 0, transitioning = false, destroyed = false;
  const loaded = new Set([slides[0].src]);
  root.dataset.cinematicInitialized = "true";
  root.style.setProperty("--cinematic-transition", `${transitionMs}ms`);
  function paint(layer, slide) {
    layer.style.backgroundImage = `url("${slide.src}")`;
    layer.style.setProperty("--desktop-position", slide.position);
    layer.style.setProperty("--mobile-position", slide.mobilePosition);
    layer.className = `cinematic-layer ${slide.motion} ${slide.accent}`;
  }
  paint(layers[0], slides[0]);
  layers[0].classList.add("is-visible");
  function preload(nextIndex) {
    if (saveData || reduced || loaded.has(slides[nextIndex].src)) return;
    const image = new ImageCtor(); image.decoding = "async";
    image.onload = () => loaded.add(slides[nextIndex].src);
    image.src = slides[nextIndex].src;
  }
  function report() {
    if (!diagnostics) return;
    root.dataset.currentSlide = String(index);
    root.dataset.transitionState = transitioning ? "crossfading" : documentRef.hidden ? "paused" : "running";
    root.dataset.reducedMotion = String(reduced); root.dataset.saveData = String(saveData);
    root.dataset.imageLoadStatus = loaded.has(slides[index].src) ? "loaded" : "fallback-requested";
  }
  function schedule() {
    windowRef.clearTimeout(timer);
    if (destroyed || documentRef.hidden || reduced || saveData) return report();
    preload((index + 1) % slides.length);
    timer = windowRef.setTimeout(advance, displayMs); report();
  }
  function advance() {
    if (transitioning || destroyed) return;
    transitioning = true;
    const next = (index + 1) % slides.length, incoming = active ^ 1;
    paint(layers[incoming], slides[next]);
    windowRef.requestAnimationFrame(() => {
      layers[incoming].classList.add("is-visible"); layers[active].classList.remove("is-visible");
      index = next; active = incoming; report();
      timer = windowRef.setTimeout(() => { transitioning = false; schedule(); }, transitionMs);
    });
  }
  function visibility() { if (documentRef.hidden) windowRef.clearTimeout(timer); else schedule(); report(); }
  function destroy() { destroyed = true; windowRef.clearTimeout(timer); documentRef.removeEventListener("visibilitychange", visibility); root.dataset.cinematicInitialized = "false"; }
  documentRef.addEventListener("visibilitychange", visibility);
  const controller = { advance, destroy, getState: () => ({ index, transitioning, reducedMotion: reduced, saveData }) };
  root.cinematicController = controller; schedule(); return controller;
}
const backgroundRoot = document.getElementById("greatnessBackground");
if (backgroundRoot) createCinematicBackground({ root: backgroundRoot });
