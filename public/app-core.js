(function(){
  function onReady(fn){ if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn,{once:true});} else {fn();}}
  function setStatus(key,value){
    var row = document.querySelector('[data-app-core-status="'+key+'"]');
    if(row){ row.textContent = value; }
  }
  function safeCall(label, fns){
    for (var i=0;i<fns.length;i++){
      var name=fns[i];
      var fn=window[name];
      if(typeof fn==='function'){
        fn();
        return {ok:true,msg:'called '+name};
      }
    }
    return {ok:false,msg:'Missing function: '+fns.join(' | ')};
  }
  onReady(function(){
    window.APP_AUTH = {
      isAuthenticated: true,
      token: null,
      user: {
        name: 'Rashad Harbour',
        email: 'RDHForeclosureConquer@gmail.com',
        role: 'super_admin',
        roles: ['super_admin','admin','operator','trainer','client']
      }
    };
    window.builderModeFullAccess = true;
    window.pilotSuperAdminActive = true;

    ['#authOverlay','.auth-screen','.modal-backdrop','#loadingOverlay'].forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){ el.style.display='none'; el.style.pointerEvents='none'; el.setAttribute('aria-hidden','true');});
    });
    document.body.style.pointerEvents='auto';
    document.documentElement.style.pointerEvents='auto';

    var panel=document.createElement('div');
    panel.id='appCoreStatusPanel';
    panel.style.cssText='position:fixed;right:12px;bottom:12px;z-index:999999;background:#111;color:#7fffd4;border:1px solid #2f9;padding:10px;font:12px/1.35 monospace;max-width:360px;border-radius:8px';
    panel.innerHTML=''
      +'<div><strong>App Core active</strong></div>'
      +'<div>Dashboard wired: <span data-app-core-status="dashboard">pending</span></div>'
      +'<div>Library wired: <span data-app-core-status="library">pending</span></div>'
      +'<div>Camera wired: <span data-app-core-status="camera">pending</span></div>'
      +'<div>Profile wired: <span data-app-core-status="profile">pending</span></div>'
      +'<div>Calendar wired: <span data-app-core-status="calendar">pending</span></div>'
      +'<div>Diagnostics wired: <span data-app-core-status="diagnostics">pending</span></div>'
      +'<div>Last clicked button: <span data-app-core-status="last_clicked">none</span></div>'
      +'<div>Last error: <span data-app-core-status="last_error">none</span></div>';
    document.body.appendChild(panel);

    function wire(id, key, handler){
      var el=document.getElementById(id);
      if(!el){ setStatus(key,'missing button #'+id); return; }
      el.disabled=false;
      el.style.pointerEvents='auto';
      el.onclick=null;
      el.addEventListener('click', function(ev){
        ev.preventDefault();
        setStatus('last_clicked', id);
        try{ handler(el); setStatus('last_error','none'); }
        catch(err){ setStatus('last_error', String(err&&err.message||err)); }
      }, true);
      setStatus(key,'yes (#'+id+')');
    }

    wire('dashboardBtn','dashboard', function(){
      var r=safeCall('dashboard',['openDashboard','showDashboard','renderDashboard']);
      if(!r.ok){ alert('Dashboard fallback: '+r.msg); }
      else { alert('Dashboard action: '+r.msg); }
    });
    wire('exerciseLibraryBtn','library', function(){
      var r=safeCall('library',['openExerciseLibrary','showExerciseLibrary','renderExerciseLibrary']);
      if(!r.ok){ alert('Workout Library fallback: '+r.msg); }
      else { alert('Workout Library action: '+r.msg); }
    });
    wire('connectBtn','camera', function(el){
      var r=safeCall('camera',['connectCamera','startCamera','initializeCamera']);
      if(!r.ok && typeof el.click==='function'){ alert('Camera fallback: '+r.msg); }
      else if(r.ok){ alert('Camera action: '+r.msg); }
    });
    wire('runSystemDiagnosticBtn','diagnostics', function(){
      var r=safeCall('diagnostics',['runSystemDiagnostics','runDiagnostics','collectDiagnosticReport','__collectDiagnosticReport']);
      if(!r.ok){ alert('Diagnostics fallback: '+r.msg); }
      else { alert('Diagnostics action: '+r.msg); }
    });
    wire('profileSummary','profile', function(){
      var target=document.getElementById('profileSummary');
      if(target){ target.scrollIntoView({behavior:'smooth',block:'center'}); target.style.outline='2px solid #2f9'; setTimeout(function(){target.style.outline='';},1200); }
      else { alert('Profile fallback: Missing #profileSummary'); }
    });
    wire('calendarView','calendar', function(){
      var cal=document.getElementById('calendarView');
      if(cal){ cal.scrollIntoView({behavior:'smooth',block:'center'}); cal.style.outline='2px solid #2f9'; setTimeout(function(){cal.style.outline='';},1200); }
      else { alert('Calendar fallback: Missing #calendarView'); }
    });
  });
})();
