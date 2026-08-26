(function initCoachInbox(global) {
  "use strict";
  const document = global.document, root = document.querySelector("#inbox"), errorTarget = document.querySelector("#error");
  let conversations = [], activeConversationId = null;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const routeId = value => encodeURIComponent(String(value));
  function diagnostic(operation, context, result) { return { operation, route: global.location?.pathname || "/inbox.html", conversationId: context?.conversationId || null, userId: global.AuthStateRuntime?.getCanonicalAuthState?.().user?.id || null, status: result?.response?.status || result?.diagnostics?.status || null, code: result?.payload?.error?.code || result?.error?.code || null, failureClass: result?.diagnostics?.failureClass || null }; }
  async function api(path, options = {}, operation = "messages.request", context = {}) {
    const result = await global.MaatApiClient.request(path, options);
    if (!result.ok) { console.error("[COACH_MESSAGES]", diagnostic(operation, context, result)); throw new Error(result.response?.status === 401 ? "Your session has expired. Please sign in again." : "Unable to load messages. Please try again."); }
    return result.payload?.data;
  }
  const conversationLabel = (conversation, index) => conversation.title || conversation.staffDisplayName || `Coach conversation ${index + 1}`;
  function renderConversationList() { return conversations.length < 2 ? "" : `<nav class="conversation-list" aria-label="Coach conversations">${conversations.map((conversation, index) => `<button type="button" data-conversation="${esc(conversation.id)}" aria-pressed="${conversation.id === activeConversationId}">${esc(conversationLabel(conversation, index))}</button>`).join("")}</nav>`; }
  async function openConversation(id) {
    activeConversationId = String(id); errorTarget.textContent = ""; root.setAttribute("aria-busy", "true");
    const encodedId = routeId(activeConversationId), data = await api(`/api/me/conversations/${encodedId}/messages`, {}, "messages.load", { conversationId: activeConversationId });
    const currentUserId = global.AuthStateRuntime.getCanonicalAuthState().user.id;
    root.innerHTML = `${renderConversationList()}<div class="messages" role="log" aria-live="polite">${data.messages.map(message => `<div class="message ${message.senderUserId === currentUserId ? "mine" : ""}">${esc(message.body)}<br><small>${esc(message.createdAt)}</small></div>`).join("") || "No messages."}</div><form class="composer"><label class="muted" for="replyBody">Reply</label><textarea id="replyBody" aria-label="Reply" maxlength="4000" required></textarea><button>Reply</button></form>`;
    root.removeAttribute("aria-busy");
    root.querySelectorAll("[data-conversation]").forEach(button => button.addEventListener("click", () => openConversation(button.dataset.conversation).catch(showError)));
    root.querySelector("form").addEventListener("submit", async event => { event.preventDefault(); const body = root.querySelector("textarea").value; await api(`/api/me/conversations/${encodedId}/messages`, { method: "POST", body: { body } }, "messages.reply", { conversationId: activeConversationId }); await openConversation(activeConversationId); });
  }
  function showError(error) { root.removeAttribute("aria-busy"); root.textContent = "Unable to load messages. Please try again."; errorTarget.textContent = error?.message || "Unable to load messages. Please try again."; }
  async function start() {
    const readiness = await global.AuthStateRuntime.whenReady();
    if (!readiness.ok || !global.AuthStateRuntime.getCanonicalAuthState().isAuthenticated) throw new Error(readiness.reason === "auth_unavailable" ? "Unable to verify your session. Please try again." : "Please sign in to view coach messages.");
    const data = await api("/api/me/conversations", {}, "conversations.load"); conversations = Array.isArray(data?.conversations) ? data.conversations : [];
    if (!conversations.length) { root.textContent = "No coach conversations yet."; return; }
    await openConversation(conversations[0].id);
  }
  global.CoachInbox = Object.freeze({ start, openConversation }); start().catch(showError);
})(window);
