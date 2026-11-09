(function () {
  "use strict";
  const button = document.getElementById("nutritionResearchAsk");
  const question = document.getElementById("nutritionResearchQuestion");
  const output = document.getElementById("nutritionResearchAnswer");
  const deepButton = document.getElementById("nutritionResearchDeep");
  if (!button || !question || !output) return;
  let lastQuestion = "";
  // Render a small, safe Markdown subset without injecting untrusted HTML.
  function renderAnswer(value) {
    output.replaceChildren();
    const lines = String(value || "").split(/\r?\n/);
    let list = null;
    const addInline = (element, value) => {
      const parts = value.split(/(\*\*[^*]+\*\*)/g);
      for (const part of parts) {
        if (part.startsWith("**") && part.endsWith("**")) {
          const strong = document.createElement("strong");
          strong.textContent = part.slice(2, -2);
          element.append(strong);
        } else element.append(document.createTextNode(part));
      }
    };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { list = null; continue; }
      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      const item = line.match(/^(?:[-*]|\d+[.)])\s+(.+)$/);
      if (heading) {
        list = null;
        const el = document.createElement(heading[1].length <= 2 ? "h4" : "h5");
        addInline(el, heading[2]);
        output.append(el);
      } else if (item) {
        if (!list) { list = document.createElement("ul"); output.append(list); }
        const li = document.createElement("li");
        addInline(li, item[1]);
        list.append(li);
      } else {
        list = null;
        const p = document.createElement("p");
        addInline(p, line);
        output.append(p);
      }
    }
  }
  async function ask(mode) {
    const text = mode === "DEEP" ? lastQuestion : question.value.trim();
    if (!text) { output.textContent = "Enter a question first."; return; }
    const token = window.AuthStateRuntime?.getAuthToken?.();
    if (!token) { output.textContent = "Sign in to use Nutrition Intelligence."; return; }
    button.disabled = true;
    if (deepButton) { deepButton.disabled = true; deepButton.hidden = true; }
    output.textContent = mode === "DEEP" ? "Digging a little deeper…" : "Looking into that…";
    try {
      const origin = (window.RuntimeState?.getBackendOrigin?.() || window.MAAT_BACKEND_ORIGIN || location.origin).replace(/\\/$/, "");
      const response = await fetch(origin + "/api/me/nutrition/research", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + token },
        body: JSON.stringify({ question: "[RESPONSE_MODE:" + mode + "]\\n" + text })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.ok === false) throw new Error(json.error?.message || "Research unavailable");
      renderAnswer(json.data?.answer || "No answer returned.");
      lastQuestion = text;
      if (deepButton) deepButton.hidden = mode === "DEEP";
    } catch (error) {
      output.textContent = error.message || "Unable to answer right now.";
      if (deepButton && lastQuestion) deepButton.hidden = false;
    } finally { button.disabled = false; if (deepButton) deepButton.disabled = false; }
  }
  button.addEventListener("click", () => ask("QUICK"));
  if (deepButton) deepButton.addEventListener("click", () => ask("DEEP"));
})();
