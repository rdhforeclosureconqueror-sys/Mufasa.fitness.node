(() => {
  "use strict";
  const origin = () => window.MaatApiClient?.origin?.() || window.MAAT_BACKEND_ORIGIN || "https://mufasa-fitness-node.onrender.com";
  const request = async (path, options = {}) => {
    await window.AuthStateRuntime?.whenReady?.();
    const token = window.AuthStateRuntime?.getAuthToken?.();
    if (!token) throw Error("Sign in required");
    const response = await fetch(origin() + path, { method: options.method || "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, cache: "no-store", credentials: "omit" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(payload?.error?.message || "Community presence is unavailable.");
    return payload.data || payload;
  };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  function openCard(card) {
    let dialog = document.getElementById("memberIdDialog");
    if (!dialog) { dialog = document.createElement("dialog"); dialog.id = "memberIdDialog"; document.body.append(dialog); }
    const background = card.backgroundImage ? `url("${card.backgroundImage}")` : "linear-gradient(145deg,#1c6048,#0d3028)";
    dialog.innerHTML = `<button class="btn secondary" type="button" id="closeMemberId">Close</button><p class="eyebrow">MILELE FIT · COMMUNITY ID</p><section class="member-id-view" style="background-image:linear-gradient(#061c15b8,#061c15df),${background}"><p class="eyebrow">COMMUNITY MEMBER</p><h2>${esc(card.displayName)}</h2><p>${esc(card.bioShort || "Here for the wellness journey.")}</p><p class="muted">${(card.interests || []).map(esc).join(" · ")}</p></section>`;
    dialog.querySelector("#closeMemberId").addEventListener("click", () => dialog.close());
    dialog.showModal();
  }
  function render(members) {
    const target = document.getElementById("onlineMembers"); if (!target) return;
    if (!members.length) { target.innerHTML = '<p class="muted">No shared Community IDs are active right now. When members arrive, their names will light up here.</p>'; return; }
    target.replaceChildren(...members.map(member => { const button = document.createElement("button"); button.className = "member-online"; button.type = "button"; button.innerHTML = `<span class="online-dot" aria-hidden="true"></span>${esc(member.displayName)}`; button.addEventListener("click", async () => { try { openCard((await request(`/api/community/members/${encodeURIComponent(member.userId)}/card`)).card); } catch (error) { alert(error.message); } }); return button; }));
  }
  async function refresh() {
    try { await request("/api/me/community/presence", { method: "POST" }); const data = await request("/api/me/community/presence"); render(data.members || []); }
    catch (error) { const target = document.getElementById("onlineMembers"); if (target) target.innerHTML = `<p class="muted">${esc(error.message)}</p>`; }
  }
  async function applyPersonalHubLook() {
    try { const data = await request("/api/me/community-card"), card = data.card; if (!card?.useHubBackground) return; const base = card.backgroundImage ? `url("${card.backgroundImage}")` : ({ kente: "linear-gradient(145deg,#1c6048,#0d3028,#8a382b)", indigo: "linear-gradient(145deg,#273b76,#142351,#9e4d36)", sunset: "linear-gradient(145deg,#8e392e,#5d221d,#173d35)", earth: "linear-gradient(145deg,#65432d,#3f281d,#244b40)", royal: "linear-gradient(145deg,#542a68,#331b4b,#124842)" }[card.colorTheme] || "#10100d"); document.body.classList.add("personal-hub-look"); document.body.style.backgroundImage = `linear-gradient(#06130dd9,#06130de8),${base}`; } catch (_) {}
  }
  window.addEventListener("pagehide", () => clearInterval(window.__communityPresenceTimer), { once: true });
  window.addEventListener("DOMContentLoaded", () => { applyPersonalHubLook(); refresh(); window.__communityPresenceTimer = setInterval(refresh, 45_000); });
})();
