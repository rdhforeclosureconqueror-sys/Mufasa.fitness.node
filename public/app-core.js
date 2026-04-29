(function initAppCore(globalScope){
  function wirePrimaryButton(id, handler, options){
    var el = document.getElementById(id);
    if (!el || typeof handler !== 'function') return false;
    if (!options || options.enable !== false) {
      el.disabled = false;
    }
    el.onclick = handler;
    return true;
  }

  function bindPrimaryNavHandlers(deps){
    deps = deps || {};
    wirePrimaryButton('dashboardBtn', function(){
      globalScope.location.href = '/dashboard.html';
    });

    wirePrimaryButton('exerciseLibraryBtn', function(){
      globalScope.location.href = '/exercise-library.html';
    });

    wirePrimaryButton('connectBtn', deps.connectCamera, { enable: false });

    wirePrimaryButton('runSystemDiagnosticBtn', async function(){
      try {
        var report = await (globalScope.__collectDiagnosticReport?.() || Promise.resolve(null));
        if (typeof deps.addLog === 'function') {
          deps.addLog('system', 'Diagnostics complete' + (report ? '' : ' (no report payload)') + '.');
        }
      } catch (error) {
        if (typeof deps.addLog === 'function') {
          deps.addLog('system', 'Diagnostics failed: ' + (error?.message || error));
        }
      }
    }, { enable: false });
  }

  globalScope.bindPrimaryNavHandlers = bindPrimaryNavHandlers;
})(window);
