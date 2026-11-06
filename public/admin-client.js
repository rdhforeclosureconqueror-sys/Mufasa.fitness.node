(function initAdminClient(global) {
  "use strict";
  const document = global.document, clientId = new URLSearchParams(global.location.search).get("userId"), content = document.querySelector("#content"), errorTarget = document.querySelector("#error");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const routeId = value => encodeURIComponent(String(value));
  const title = value => String(value || "").replace(/(^|_)([a-z])/g, (_match, prefix, character) => `${prefix ? " " : ""}${character.toUpperCase()}`);
  async function api(path, options = {}, operation = "client.request", conversationId = null) {
    const result = await global.MaatApiClient.request(path, options);
    if (!result.ok) { console.error("[CLIENT_MESSAGING]", { operation, route: global.location.pathname, userId: clientId, conversationId, status: result.response?.status || null, code: result.payload?.error?.code || null, failureClass: result.diagnostics?.failureClass || null }); throw new Error(result.response?.status === 401 ? "Your session has expired. Please sign in again." : "Unable to load messages. Please try again."); }
    return result.payload?.data;
  }
  async function tab(name) { errorTarget.textContent = ""; if (name === "messages") return messages(); if (name === "overview") return overview(); const data = await api(`/api/admin/clients/${routeId(clientId)}/${name}`, {}, `client.${name}`); content.innerHTML = `<h2>${esc(name[0].toUpperCase() + name.slice(1))}</h2><pre>${esc(JSON.stringify(data, null, 2))}</pre>`; }
  const visible = value => value === null || value === undefined || value === "" ? "Not provided" : typeof value === "object" ? JSON.stringify(value) : String(value);
  const card = (label,value) => '<div class="card"><small class="muted">'+esc(label)+'</small><div>'+esc(visible(value))+'</div></div>';
  const healthKeys = /injur|medical|condition|limitation|restriction|medication|allerg|surger|pain|healthhistory|health_history|contraindication/i;
  function healthItems(intake) {
    const found = [];
    const visit = (value,path,depth) => {
      if (depth > 5 || found.length >= 25 || !value || typeof value !== "object") return;
      for (const [key,item] of Object.entries(value)) {
        if (found.length >= 25) break;
        if (healthKeys.test(key) && item !== null && item !== "" && item !== false && (typeof item !== "object" || (Array.isArray(item) && item.length))) found.push([path ? path+" / "+key : key,item]);
        else if (item && typeof item === "object") visit(item,path ? path+" / "+key : key,depth+1);
      }
    };
    visit(intake,"",0);
    return found;
  }
  function showOverview(data,intakeData,assessmentData,communityData,timelineData) {
    const s=data.summary||{}, history=healthItems(intakeData?.intake), assessments=assessmentData?.assessments||[], workouts=data.recentWorkouts||[];
    const done=workouts.filter(w=>w.status==="completed"||w.completedAt);
    const recent=done.filter(w=>w.completedAt && Date.now()-Date.parse(w.completedAt)<30*86400000);
    const lastFour=done.slice(-4).reverse();
    const community=communityData||{};
    const health=history.length ? history.map(([key,value])=>card(title(key),value)).join("") : card("Health history","Not provided — no health or injury information found in the current intake record. Ask the member before training.");
    content.innerHTML='<section class="panel"><h2>1. Health & training safety</h2><p class="muted">Member-reported intake only; not a verified medical record.</p><div class="cards">'+health+'</div></section>'+
      '<section class="panel"><h2>2. Community & membership</h2><div class="cards">'+card("Member",s.displayName)+card("Joined",s.joinedAt)+card("Entry source",s.challengeParticipant?.entryContext||s.acquisition?.utm_source)+card("Program",s.activeProgram?.title)+card("Community / challenge",s.challengeParticipant?.challengeTitle||s.activeChallenge?.title)+card("Membership",s.payment?.status)+card("Community enrollment",community.communityProfileStatus||"Not available")+card("Event registrations",communityData?community.registeredEvents:"Not available")+card("Confirmed attendance",communityData?community.attendedEvents:"Not available")+card("Last event attendance",community.lastAttendanceAt)+'</div>'+(community.rsvps?.length?'<h3>Recent community events</h3>'+community.rsvps.slice(-8).reverse().map(r=>card("Event "+(r.eventId||""),(r.checkedInAt?"Checked in "+r.checkedInAt:r.status||"Registered"))).join(""):'<p class="muted">No account-linked community events found.</p>')+'</section>'+
      '<section class="panel"><h2>3. Assessments</h2>'+card("Assessment status",s.assessmentStatus)+card("Assessment records",assessments.length)+ (assessments.length?'<p>Open the Assessments tab for full records.</p>':'<p class="muted">No assessment records found.</p>')+'</section>'+
      '<section class="panel"><h2>4. Consistency & workouts</h2><div class="cards">'+card("Workouts in last 30 days (system total)",s.workoutsLast30Days)+card("Recent completed sessions (up to 20)",done.length)+card("Recent completed sessions in 30 days (up to 20)",recent.length)+card("Last active",s.lastActiveAt)+'</div><h3>Recent completed sessions</h3>'+(lastFour.length?lastFour.map(w=>card("Workout",w.completedAt)).join(""):'<p class="muted">No completed workouts found in recent records.</p>')+'</section>'+
      '<section class="panel"><h2>5. Activity timeline</h2>'+(timelineData?'<div class="cards">'+card("Workouts (30 days)",timelineData.last30Days?.workouts)+card("Assessments (30 days)",timelineData.last30Days?.assessments)+card("Community attendance (30 days)",timelineData.last30Days?.communityAttendance)+'</div>'+(timelineData.events||[]).slice(0,25).map(e=>card(title(e.type)+" • "+e.at,e.label)).join(""):'<p class="muted">Timeline unavailable.</p>')+'</section>'+
      '<section class="panel"><h2>6. Progress & rewards</h2><p>Private XP and points evaluation is not enabled. No score is inferred from missing data.</p></section>';
  }
  async function overview() {
    const id=routeId(clientId);
    const results=await Promise.allSettled([api('/api/admin/clients/'+id+'/overview'),api('/api/admin/clients/'+id+'/intake'),api('/api/admin/clients/'+id+'/assessments'),api('/api/admin/clients/'+id+'/community'),api('/api/admin/clients/'+id+'/timeline')]);
    if(results[0].status!=="fulfilled")throw results[0].reason;
    showOverview(results[0].value,results[1].status==="fulfilled"?results[1].value:null,results[2].status==="fulfilled"?results[2].value:null,results[3].status==="fulfilled"?results[3].value:null,results[4].status==="fulfilled"?results[4].value:null);
    if(results[1].status!=="fulfilled"||results[2].status!=="fulfilled"||results[3].status!=="fulfilled"||results[4].status!=="fulfilled"){const note=document.createElement("p");note.className="muted";note.textContent="Some protected intake, assessment or community records could not be loaded; missing information is not confirmation of no medical history.";content.prepend(note);}
  }
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
    const participant = data.summary.challengeParticipant || data.challengeParticipant || null;
    document.querySelector("#summary").innerHTML = [`Email: ${data.summary.email || "Unavailable"}`, `Role: ${data.summary.role || "Unavailable"}`, `Account ID: ${data.summary.userId}`, `Member since: ${data.summary.joinedAt || "Unknown"}`, `Last active: ${data.summary.lastActiveAt || "No activity"}`, `Membership: ${data.summary.payment.status}`, `Program: ${data.summary.activeProgram?.title || "None"}`, `Challenge: ${participant?.challengeTitle || data.summary.activeChallenge?.title || "None"}`, `Fitness level: ${participant?.fitnessLevel ? title(participant.fitnessLevel) : "Not captured"}`, `Entry source: ${participant?.entryContext ? title(participant.entryContext) : "Not captured"}`, `Challenge joined: ${participant?.joinedAt || "Not captured"}`].map(value => `<div class="card">${esc(value)}</div>`).join(""); await tab(global.location.search.includes("message=1") ? "messages" : "overview");
  }
  document.querySelectorAll("[data-tab]").forEach(button => button.addEventListener("click", () => tab(button.dataset.tab).catch(showError))); global.AdminClientMessaging = Object.freeze({ start, messages }); start().catch(showError);
})(window);
