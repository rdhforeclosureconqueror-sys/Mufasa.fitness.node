(function installGlobalNavigation(global) {
  "use strict";
  const FRONTEND_BUILD = "20260831-admin-diagnostics-access-v1";
  if (global.MaatNavigation?.bundle === FRONTEND_BUILD) return;
  global.__MAAT_ASSET_VERSIONS__ = Object.assign(global.__MAAT_ASSET_VERSIONS__ || {}, { "global-nav.js": FRONTEND_BUILD });
  const NAV_ITEMS = Object.freeze([
    {id:"home",label:"Home",href:"/index.html",section:"Main",auth:"public"},
    {id:"dashboard",label:"Dashboard",href:"/dashboard.html",section:"Main",auth:"member"},
    {id:"profile",label:"My Page / Profile",href:"/dashboard.html#profile",section:"Main",auth:"member"},
    {id:"workout",label:"Pocket PT Workout",href:"/workout.html",section:"Training",auth:"member"},
    {id:"exercises",label:"Exercise Library",href:"/exercise-library.html",section:"Training",auth:"public"},
    {id:"challenges",label:"Challenges",href:"/challenges.html",section:"Training",auth:"member"},
    {id:"coach",label:"Trainer / Coach",href:"/trainer.html",section:"Training",auth:"member",roles:["trainer","admin","super_admin"]},
    {id:"yoga",label:"Yoga",href:"/yoga.html",section:"Training",auth:"member",premium:true},
    {id:"nutrition",label:"Nutrition Journal",href:"/nutrition.html",section:"Wellness",auth:"member"},
    {id:"runclub",label:"Run Club",href:"/stepping-into-greatness.html",section:"Wellness",auth:"public"},
    {id:"greatness",label:"Stepping Into Greatness",href:"/greatness.html",section:"Wellness",auth:"member"},
    {id:"inbox",label:"Messages / Inbox",href:"/inbox.html",section:"Communication",auth:"member"},
    {id:"membership",label:"Membership / Access",href:"/membership.html",section:"Account",auth:"member"},
    {id:"guided-tours",label:"Help / Guided Tours",href:"#guided-tours",section:"Account",auth:"member"},
    {id:"admin",label:"Admin Dashboard",href:"/dashboard.html#admin",section:"Administration",auth:"member",roles:["admin","super_admin"]},
    {id:"launch-readiness",label:"Launch Readiness",href:"/admin-launch-readiness.html",section:"Administration",auth:"member",roles:["admin","super_admin"]},
    {id:"avatar-development",label:"Avatar Development Board",href:"/admin-avatar-development.html",section:"Administration",auth:"member",roles:["admin","super_admin"]},
    {id:"crm",label:"Client Management",href:"/admin-members.html",section:"Administration",auth:"member",roles:["admin","super_admin"]}
  ]);
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
  const roleSet = user => new Set([user?.role,...(user?.roles||[])].filter(Boolean).map(value=>String(value).toLowerCase()));
  const allowed = (item,state) => item.auth !== "member" || (state.isAuthenticated && (!item.roles || item.roles.some(role=>roleSet(state.user).has(role))));
  const DIAGNOSTIC_ROLES = new Set(["admin","super_admin"]);
  const hasDiagnosticRole = user => [...roleSet(user)].some(role => DIAGNOSTIC_ROLES.has(role));
  const diagnostics = global.__MAAT_GLOBAL_NAV_DIAGNOSTICS__ = {
    bundle: FRONTEND_BUILD, initializationCount: 0, menuButtonFound: "NO", clickListenerAttached: "NO",
    drawerFound: "NO", backdropFound: "NO", state: "closed", authRole: "restoring", currentPage: global.location?.pathname || "unknown",
    diagnosticAccess: "DENIED"
  };
  const DEFINITIVE_SIGNED_OUT_REASONS = new Set(["missing_token", "invalid_token", "expired_token", "invalid_session"]);
  let authPresentation = { phase: "restoring", state: null };
  let initialized = false;
  function syncDiagnosticAccess(state) {
    const permitted = state?.isAuthenticated === true && hasDiagnosticRole(state.user);
    document.documentElement?.classList.toggle("maat-admin-diagnostics", permitted);
    document.body?.classList.toggle("maat-admin-diagnostics", permitted);
    if (!permitted) {
      document.body?.classList.remove("developer-diagnostics");
      try { global.localStorage?.removeItem("maatDeveloperDiagnostics"); } catch (_) {}
    }
    diagnostics.diagnosticAccess = permitted ? "ALLOWED" : "DENIED";
    global.__MAAT_DIAGNOSTIC_ACCESS__ = Object.freeze({ allowed: permitted, roleRequired: ["admin","super_admin"] });
    return permitted;
  }
  function presentationFromReadiness(result, state) {
    if (result?.ok === true && state?.isAuthenticated === true && state?.token && state?.user) return { phase: "authenticated", state };
    if (DEFINITIVE_SIGNED_OUT_REASONS.has(result?.reason)) return { phase: "unauthenticated", state: { isAuthenticated: false, user: null } };
    return result?.reason === "auth_unavailable" ? { phase: "error", state: { isAuthenticated:false,user:null } } : { phase: "restoring", state: null };
  }
  function applyReadiness(result) {
    const state=global.AuthStateRuntime?.getCanonicalAuthState?.();
    authPresentation=presentationFromReadiness(result,state);
    syncDiagnosticAccess(authPresentation.state);
    render();
    if(authPresentation.phase==="authenticated")setTimeout(()=>global.PocketPTGuide?.initialize(),250);
    return authPresentation;
  }
  function applyAuthEvent(event) {
    const state=event?.detail;
    authPresentation=state?.isAuthenticated === true && state?.token && state?.user
      ? { phase:"authenticated",state }
      : { phase:"unauthenticated",state:{isAuthenticated:false,user:null} };
    syncDiagnosticAccess(authPresentation.state);
    render();
  }
  function inspect() {
    const state=global.AuthStateRuntime?.getCanonicalAuthState?.()||{isAuthenticated:false,user:null};
    diagnostics.menuButtonFound=document.querySelector(".maat-nav-toggle")?"YES":"NO";
    diagnostics.drawerFound=document.querySelector(".maat-nav-panel")?"YES":"NO";
    diagnostics.backdropFound=document.querySelector(".maat-nav-backdrop")?"YES":"NO";
    diagnostics.authRole=authPresentation.phase==="restoring"?"restoring":state.user?.role||"signed_out";
    diagnostics.currentPage=location.pathname;
    console.info("[GLOBAL_NAV_DIAGNOSTICS]", {...diagnostics});
  }
  function setOpen(open,{restoreFocus=true}={}) {
    const panel=document.querySelector(".maat-nav-panel"),backdrop=document.querySelector(".maat-nav-backdrop"),toggle=document.querySelector(".maat-nav-toggle");
    if(!panel||!backdrop||!toggle){inspect();return}
    panel.hidden=!open;backdrop.hidden=!open;document.body.classList.toggle("maat-nav-open",open);
    toggle.setAttribute("aria-expanded",String(open));toggle.setAttribute("aria-label",open?"Close navigation menu":"Open navigation menu");
    diagnostics.state=open?"open":"closed";inspect();
    if(open) panel.querySelector("a,button")?.focus(); else if(restoreFocus) toggle.focus();
  }
  function render() {
    const wasOpen=diagnostics.state==="open",state=authPresentation.state||{isAuthenticated:false,user:null},restoring=authPresentation.phase==="restoring";
    syncDiagnosticAccess(state);
    let header=document.querySelector(".maat-global-header");if(!header){header=document.createElement("header");header.className="maat-global-header";document.body.prepend(header)}
    const current=location.pathname==="/"?"/index.html":location.pathname,grouped=new Map();
    NAV_ITEMS.filter(item=>allowed(item,state)).forEach(item=>{if(!grouped.has(item.section))grouped.set(item.section,[]);grouped.get(item.section).push(item)});
    const links=[...grouped].map(([section,items])=>`<section class="maat-nav-section"><h2>${section}</h2><div class="maat-nav-links">${items.map(item=>`<a class="maat-nav-link" href="${item.href}"${current===item.href.split("#")[0]?" aria-current=\"page\"":""}>${item.label}${item.premium&&state.user?.accessTier==="free"?'<span class="maat-nav-lock">Upgrade</span>':""}</a>`).join("")}</div></section>`).join("");
    const identity=state.isAuthenticated?`<div class="maat-nav-identity"><strong>${escapeHtml(state.user?.name||state.user?.email||"Signed in")}</strong><br><small>${escapeHtml(state.user?.email||"")}${state.user?.role?` · ${escapeHtml(state.user.role)}`:""}</small></div>`:"";
    const account=restoring?'<p class="maat-nav-auth-restoring" role="status">Restoring session…</p>':authPresentation.phase==="error"?'<p class="maat-nav-auth-error" role="alert">Session verification failed. Check your connection and retry.</p><button type="button" data-maat-auth-retry>Retry</button>':state.isAuthenticated?'<button class="maat-nav-signout" type="button" data-maat-signout>Sign Out</button>':'<a class="maat-nav-link" href="/login.html">Sign In</a><a class="maat-nav-link" href="/login.html?mode=register">Create Account</a>';
    header.innerHTML=`<div class="maat-nav-bar"><a class="maat-nav-brand" href="/index.html">Pocket PT</a><span class="maat-nav-context">${escapeHtml(document.title.split("·")[0].split("|")[0].trim())}</span><button class="maat-nav-toggle" type="button" aria-expanded="false" aria-controls="maatNavPanel" aria-label="Open navigation menu">Menu</button></div><button class="maat-nav-backdrop" type="button" aria-label="Close navigation menu" hidden></button><nav id="maatNavPanel" class="maat-nav-panel" aria-label="Global navigation" data-frontend-build="${FRONTEND_BUILD}" hidden>${identity}${links}<section class="maat-nav-section"><h2>Account</h2><div class="maat-nav-links">${account}</div></section><p class="maat-nav-status" role="status" aria-live="polite"></p></nav>`;
    if(wasOpen)setOpen(true,{restoreFocus:false});else inspect();
  }
  async function onClick(event) {
    const guides=event.target.closest?.('a[href="#guided-tours"]');
    if(guides){event.preventDefault();setOpen(false);global.PocketPTGuide?.openHelp();return}
    const toggle=event.target.closest?.(".maat-nav-toggle"),backdrop=event.target.closest?.(".maat-nav-backdrop"),signout=event.target.closest?.("[data-maat-signout]"),retry=event.target.closest?.("[data-maat-auth-retry]");
    if(toggle){event.preventDefault();setOpen(toggle.getAttribute("aria-expanded")!=="true");return}
    if(backdrop){event.preventDefault();setOpen(false);return}
    if(retry){event.preventDefault();authPresentation={phase:"restoring",state:null};syncDiagnosticAccess(null);render();applyReadiness(await global.AuthStateRuntime?.restoreCanonicalAuthState?.({force:true,reason:"navigation-retry"}));return}
    if(signout){signout.disabled=true;syncDiagnosticAccess(null);document.querySelector(".maat-nav-status").textContent="Signing out…";await global.AuthStateRuntime?.logout({redirectTo:"/login.html?signedOut=1"})}
  }
  function initialize() {
    if(initialized)return;initialized=true;diagnostics.initializationCount++;
    syncDiagnosticAccess(null);
    document.addEventListener("click",onClick);diagnostics.clickListenerAttached="YES";
    document.addEventListener("keydown",event=>{if(event.key==="Escape"&&diagnostics.state==="open")setOpen(false)});
    global.addEventListener("auth:changed",applyAuthEvent);render();inspect();
    if(!document.querySelector('link[href^="/guided-experience.css"]')){const style=document.createElement("link");style.rel="stylesheet";style.href="/guided-experience.css?v=1";document.head.append(style)}
    if(!document.querySelector('script[src^="/guided-experience.js"]')){const script=document.createElement("script");script.src="/guided-experience.js?v=1";script.defer=true;document.head.append(script)}
    const readiness=global.AuthStateRuntime?.whenReady?.();
    if(readiness?.then)readiness.then(applyReadiness).catch(()=>applyReadiness({reason:"auth_unavailable"}));
  }
  global.MaatNavigation={bundle:FRONTEND_BUILD,NAV_ITEMS,render,setOpen,getVisibleItems:state=>NAV_ITEMS.filter(item=>allowed(item,state)),getAuthPresentation:()=>authPresentation,presentationFromReadiness,diagnostics,hasDiagnosticRole,syncDiagnosticAccess};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})(window);
