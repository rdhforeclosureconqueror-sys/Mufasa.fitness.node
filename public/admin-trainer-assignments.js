"use strict";

(() => {
  const token = localStorage.getItem("mufasa_auth_token") || sessionStorage.getItem("mufasa_auth_token") || localStorage.getItem("authToken");
  const authHeaders = { authorization: `Bearer ${token || ""}` };
  const list = document.getElementById("assignments");
  const status = document.getElementById("status");
  const submit = document.getElementById("assign");
  const form = document.getElementById("create");
  const selections = { trainer: null, member: null };
  let submitting = false;

  async function api(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { ...authHeaders, ...(options.body ? { "content-type": "application/json" } : {}) } });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(value.error?.message || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return value.data;
  }

  function announce(message, focus = false) { status.textContent = message; if (focus) status.focus(); }
  function updateSubmit() { submit.disabled = submitting || !selections.trainer || !selections.member || selections.trainer.userId === selections.member.userId; }

  function createAutocomplete(type) {
    const input = document.getElementById(`${type}-search`);
    const results = document.getElementById(`${type}-results`);
    const feedback = document.getElementById(`${type}-feedback`);
    const selectedText = document.getElementById(`selected-${type}`);
    let timer = null, controller = null, requestNumber = 0, activeIndex = -1;

    function close() { results.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); activeIndex = -1; }
    function clearSelection() { selections[type] = null; selectedText.textContent = "None selected"; updateSubmit(); }
    function choose(item) {
      selections[type] = item; input.value = item.displayName; selectedText.textContent = item.displayName;
      feedback.textContent = `${item.displayName} selected.`; close(); updateSubmit(); input.focus();
    }
    function move(direction) {
      const options = [...results.querySelectorAll('[role="option"]')];
      if (!options.length) return;
      activeIndex = (activeIndex + direction + options.length) % options.length;
      options.forEach((option, index) => option.setAttribute("aria-selected", String(index === activeIndex)));
      input.setAttribute("aria-activedescendant", options[activeIndex].id);
      options[activeIndex].scrollIntoView({ block: "nearest" });
    }
    async function search() {
      const query = input.value.replace(/\s+/g, " ").trim();
      if (query.length < 2) { controller?.abort(); results.replaceChildren(); close(); feedback.textContent = query ? "Enter at least two characters." : ""; return; }
      controller?.abort(); controller = new AbortController(); const current = ++requestNumber;
      feedback.textContent = `Searching for ${type}s…`;
      try {
        const data = await api(`/api/admin/trainer-directory?type=${encodeURIComponent(type)}&q=${encodeURIComponent(query)}&limit=10`, { signal: controller.signal });
        if (current !== requestNumber || input.value.replace(/\s+/g, " ").trim() !== query) return;
        results.replaceChildren();
        for (const [index, item] of data.results.entries()) {
          const option = document.createElement("li"); option.id = `${type}-option-${index}`; option.role = "option"; option.tabIndex = -1; option.setAttribute("aria-selected", "false");
          const button = document.createElement("button"); button.type = "button"; button.textContent = `${item.displayName} · ${item.assignmentStatus.replace("_", " ")}`;
          button.addEventListener("click", () => choose(item)); option.appendChild(button); results.appendChild(option);
        }
        results.hidden = !data.results.length; input.setAttribute("aria-expanded", String(Boolean(data.results.length)));
        feedback.textContent = data.results.length ? `${data.results.length} ${type} result${data.results.length === 1 ? "" : "s"} available. Use arrow keys to review.` : `No ${type}s found. Change the search and retry.`;
      } catch (error) {
        if (error.name === "AbortError") return;
        close(); feedback.textContent = `${error.message}. Change the search to retry.`;
      }
    }
    input.addEventListener("input", () => { clearSelection(); clearTimeout(timer); timer = setTimeout(search, 300); });
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); move(event.key === "ArrowDown" ? 1 : -1); }
      else if (event.key === "Enter" && activeIndex >= 0) { event.preventDefault(); const button = results.querySelectorAll('[role="option"] button')[activeIndex]; button?.click(); }
      else if (event.key === "Escape") { close(); input.focus(); }
    });
    input.addEventListener("blur", () => setTimeout(() => { if (!results.contains(document.activeElement)) close(); }, 100));
  }

  async function load() {
    try {
      const data = await api("/api/admin/trainer-assignments"); list.replaceChildren();
      for (const item of data.assignments) {
        const article = document.createElement("article"); article.className = "assignment-card";
        const heading = document.createElement("h3"); heading.textContent = `${item.trainerUserId} → ${item.clientUserId}`; article.appendChild(heading);
        const details = document.createElement("p"); details.textContent = `${item.status} · assigned ${new Date(item.assignedAt).toLocaleString()}${item.deactivatedAt ? ` · deactivated ${new Date(item.deactivatedAt).toLocaleString()}` : ""}`; article.appendChild(details);
        if (item.status === "active") {
          const button = document.createElement("button"); button.textContent = "Deactivate assignment";
          button.addEventListener("click", async () => { button.disabled = true; try { await api(`/api/admin/trainer-assignments/${encodeURIComponent(item.id)}`, { method: "DELETE" }); await load(); announce("Assignment deactivated.", true); } catch (error) { button.disabled = false; announce(`${error.message}. Retry deactivation.`, true); } });
          article.appendChild(button);
        }
        list.appendChild(article);
      }
      if (!data.assignments.length) list.textContent = "No assignment history yet.";
    } catch (error) { list.textContent = "Assignment history could not be loaded."; announce(`${error.message}. Reload the page to retry.`, true); }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault(); if (submit.disabled || submitting) return;
    submitting = true; updateSubmit();
    try {
      await api("/api/admin/trainer-assignments", { method: "POST", body: JSON.stringify({ trainerUserId: selections.trainer.userId, clientUserId: selections.member.userId }) });
      announce("Assignment saved.", true); await load();
    } catch (error) { announce(`${error.message}${error.status === 409 ? " The pair may already be assigned." : ""}`, true); }
    finally { submitting = false; updateSubmit(); }
  });

  createAutocomplete("trainer"); createAutocomplete("member"); updateSubmit(); load();
})();
