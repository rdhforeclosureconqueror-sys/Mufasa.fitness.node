(function installGlobalNavigation(global) {
  "use strict";
  const FRONTEND_BUILD="20260824-auth-unified-drawer-v2";
  global.__MAAT_ASSET_VERSIONS__=Object.assign(global.__MAAT_ASSET_VERSIONS__||{}, {"global-nav.js":FRONTEND_BUILD});
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
    {id:"admin",label:"Admin Dashboard",href:"/dashboard.html#admin",section:"Administration",auth:"member",roles:["admin","super_admin"]},
    {id:"crm",label:"Member CRM",href:"/admin/members.html",section:"Administration",auth:"member",roles:["admin","super_admin"]}
  ]);
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
  const roleSet = user => new Set([user?.role,...(user?.roles||[])].filter(Boolean).map(value=>String(value).toLowerCase()));
  const allowed = (item,state) => {
    if(item.auth === "member" && !state.isAuthenticated) return false;
    if(item.roles && !item.roles.some(role=>roleSet(state.user).has(role))) return false;
    return true;
  };
  function render() {
    const runtime=global.AuthStateRuntime,state=runtime?.getCanonicalAuthState?.()||{isAuthenticated:false,user:null};
    let header=document.querySelector(".maat-global-header");
    if(!header){header=document.createElement("header");header.className="maat-global-header";document.body.prepend(header)}
    const current=location.pathname==="/"?"/index.html":location.pathname;
    const grouped=new Map();
    NAV_ITEMS.filter(item=>allowed(item,state)).forEach(item=>{if(!grouped.has(item.section))grouped.set(item.section,[]);grouped.get(item.section).push(item)});
    const links=[...grouped].map(([section,items])=>`<section class="maat-nav-section"><h2>${section}</h2><div class="maat-nav-links">${items.map(item=>`<a class="maat-nav-link" href="${item.href}"${current===item.href.split("#")[0]?" aria-current=\"page\"":""}>${item.label}${item.premium&&state.user?.accessTier==="free"?'<span class="maat-nav-lock">Upgrade</span>':""}</a>`).join("")}</div></section>`).join("");
    const identity=state.isAuthenticated?`<div class="maat-nav-identity"><strong>${escapeHtml(state.user?.name||state.user?.email||"Signed in")}</strong><br><small>${escapeHtml(state.user?.email||"")}${state.user?.role?` · ${escapeHtml(state.user.role)}`:""}</small></div>`:"";
    const account=state.isAuthenticated?'<button class="maat-nav-signout" type="button" data-maat-signout>Sign Out</button>':'<a class="maat-nav-link" href="/login.html">Sign In</a><a class="maat-nav-link" href="/login.html?mode=register">Create Account</a>';
    header.innerHTML=`<div class="maat-nav-bar"><a class="maat-nav-brand" href="/index.html">Pocket PT</a><span class="maat-nav-context">${escapeHtml(document.title.split("·")[0].split("|")[0].trim())}</span><button class="maat-nav-toggle" type="button" aria-expanded="false" aria-controls="maatNavPanel" aria-label="Open navigation menu">Menu</button></div><button class="maat-nav-backdrop" type="button" aria-label="Close navigation menu" hidden></button><nav id="maatNavPanel" class="maat-nav-panel" aria-label="Global navigation" data-frontend-build="${FRONTEND_BUILD}" hidden>${identity}${links}<section class="maat-nav-section"><h2>Account</h2><div class="maat-nav-links">${account}</div></section><p class="maat-nav-status" role="status" aria-live="polite"></p></nav>`;
    const toggle=header.querySelector(".maat-nav-toggle"),panel=header.querySelector(".maat-nav-panel"),backdrop=header.querySelector(".maat-nav-backdrop");
    const setOpen=open=>{panel.hidden=!open;backdrop.hidden=!open;document.body.classList.toggle("maat-nav-open",open);toggle.setAttribute("aria-expanded",String(open));toggle.setAttribute("aria-label",open?"Close navigation menu":"Open navigation menu");if(open)panel.querySelector("a,button")?.focus();else toggle.focus()};
    toggle.onclick=()=>setOpen(panel.hidden);
    backdrop.onclick=()=>setOpen(false);
    header.onkeydown=event=>{if(event.key==="Escape"&&!panel.hidden)setOpen(false)};
    header.querySelector("[data-maat-signout]")?.addEventListener("click",async event=>{event.currentTarget.disabled=true;header.querySelector(".maat-nav-status").textContent="Signing out…";await runtime.logout({redirectTo:"/login.html?signedOut=1"})});
  }
  async function boot(){render();if(global.AuthStateRuntime?.whenReady)await global.AuthStateRuntime.whenReady().catch(()=>{});render()}
  global.MaatNavigation={NAV_ITEMS,render,getVisibleItems:state=>NAV_ITEMS.filter(item=>allowed(item,state))};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  global.addEventListener("auth:changed",render);
})(window);
