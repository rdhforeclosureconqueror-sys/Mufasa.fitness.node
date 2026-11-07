"use strict";
(() => {
  let history = [];
  const $ = id => document.getElementById(id);
  function add(role, message) {
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = role === "user" ? "You: " : "Botanical Wisdom: ";
    p.append(strong, document.createTextNode(message));
    $("botanicalConversation").append(p);
  }
  document.addEventListener("DOMContentLoaded", () => {
    const ask = $("botanicalAskBtn"), input = $("botanicalQuestion"), clear = $("botanicalClearBtn");
    if (!ask || !input || !clear) return;
    clear.addEventListener("click", () => { history = []; $("botanicalConversation").replaceChildren(); input.value = ""; });
    ask.addEventListener("click", async () => {
      const question = input.value.trim();
      if (!question || question.length > 500 || ask.disabled) return;
      const token = window.AuthStateRuntime?.getAuthToken?.();
      if (!token) { add("assistant", "Please sign in to ask Botanical Wisdom."); return; }
      ask.disabled = true;
      add("user", question);
      input.value = "";
      const base = (window.RuntimeState?.getBackendOrigin?.() || window.MAAT_BACKEND_ORIGIN || window.location.origin).replace(/\/$/, "");
      try {
        const response = await fetch(base + "/api/nutrition/botanical-wisdom/chat", {
          method:"POST", headers:{"content-type":"application/json",authorization:"Bearer " + token},
          body:JSON.stringify({question,history})
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok || json.ok === false) throw new Error(json.error?.message || json.error || "The assistant is unavailable.");
        const answer = json.data?.answer || json.answer;
        if (!answer) throw new Error("No answer returned.");
        add("assistant", answer);
        history.push({role:"user",content:question},{role:"assistant",content:answer});
        history = history.slice(-8);
      } catch (error) {
        add("assistant", "I couldn't answer that right now. " + String(error.message || "Please try again."));
      } finally { ask.disabled = false; }
    });
  });
})();
