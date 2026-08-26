(function initAdminClient(global) {
  "use strict";
  const document = global.document, clientId = new URLSearchParams(global.location.search).get("userId"), content = document.querySelector("#content"), errorTarget = document.querySelector("#error");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const routeId = value => encodeURIComponent(String(value));
  async function api(path, options = {}, operation = "client.request", conversationId = null) {
    const result = await global.MaatApiClient.request(path, options);
    if (!result.ok) { console.error("[CLIENT_MESSAGING]", { operation, route: global.location.pathname, userId: clientId, conversationId, status: result.response?.status || null, code: result.payload?.error?.code || null, failureClass: result.diagnostics?.failureClass || null }); throw new Error(result.response?.status === 401 ? "Your session has expired. Please sign in again." : "Unable to load messages. Please try again."); }
    return result.payload?.data;
  }
  async function tab(name) { errorTarget.textContent = ""; if (name === "messages") return messages(); const data = await api(`/api/admin/clients/${routeId(clientId)}/${name}`, {}, `client.${name}`); content.innerHTML = `<h2>${esc(name[0].toUpperCase() + name.slice(1))}</h2><pre>${esc(JSON.stringify(data, null, 2))}</pre>`; }
  async function messages() {
    const conversation = await api(`/api/admin/clients/${routeId(clientId)}/conversation`, { method: "POST", body: {} }, "conversation.find_or_create"), conversationId = String(conversation.id);
    const data = await api(`/api/me/conversations/${routeId(conversationId)}/messages`, {}, "messages.load", conversationId), currentUserId = global.AuthStateRuntime.getCanonicalAuthState().user.id;
    content.innerHTML = `<h2>Secure messages</h2><div class="messages">${data.messages.map(message => `<div class="message ${message.senderUserId === currentUserId ? "mine" : ""}">${esc(message.body)}<br><small>${esc(message.createdAt)}</small></div>`).join("") || "No messages yet."}</div><form class="composer"><label class="muted" for="body">Message</label><textarea id="body" maxlength="4000" required></textarea><button>Send</button></form>`;
    content.querySelector("form").addEventListener("submit", async event => { event.preventDefault(); await api(`/api/me/conversations/${routeId(conversationId)}/messages`, { method: "POST", body: { body: content.querySelector("textarea").value } }, "messages.send", conversationId); await messages(); });
  }
  function showError(error) { errorTarget.textContent = error?.message || "Unable to load this client. Please try again."; }
  async function start() {
    if (!clientId) throw new Error("No client was selected.");
    const readiness = await global.AuthStateRuntime.whenReady(); if (!readiness.ok || !global.AuthStateRuntime.getCanonicalAuthState().isAuthenticated) throw new Error("Please sign in to manage client messages.");
    const data = await api(`/api/admin/clients/${routeId(clientId)}/overview`, {}, "client.overview"); document.querySelector("#name").textContent = data.summary.displayName;
    document.querySelector("#summary").innerHTML = [`Email: ${data.summary.email || "Unavailable"}`, `Role: ${data.summary.role || "Unavailable"}`, `Account ID: ${data.summary.userId}`, `Member since: ${data.summary.joinedAt || "Unknown"}`, `Last active: ${data.summary.lastActiveAt || "No activity"}`, `Membership: ${data.summary.payment.status}`, `Program: ${data.summary.activeProgram?.title || "None"}`, `Challenge: ${data.summary.activeChallenge?.title || "None"}`].map(value => `<div class="card">${esc(value)}</div>`).join(""); await tab(global.location.search.includes("message=1") ? "messages" : "overview");
  }
  document.querySelectorAll("[data-tab]").forEach(button => button.addEventListener("click", () => tab(button.dataset.tab).catch(showError))); global.AdminClientMessaging = Object.freeze({ start, messages }); start().catch(showError);
})(window);
