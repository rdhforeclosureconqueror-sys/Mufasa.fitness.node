(function (window, document) {
  'use strict';
  var report = null;

  function controller() { return window.PocketPTMotionLabGymCompatibility; }
  function authority() { return window.PocketPTPersonalAvatarCompatibility; }
  function runtimeState() {
    var runtime = window.MotionLabRuntime;
    return runtime?.gymCompatibilityState?.()
      || runtime?.personalizedAvatarState?.()
      || window.PocketPTMotionLabPersonalizedAvatarState
      || { mounted: false };
  }
  function make(tag, text) {
    var node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  }
  function inspectedState() {
    var state = runtimeState();
    return Object.assign({}, state, {
      restPoseValid: Boolean(document.getElementById('gymRestPoseValid')?.checked)
    });
  }
  function render() {
    if (!controller()) return;
    report = controller().inspectRuntime(inspectedState());
    renderRows();
    renderReport();
  }
  function renderRows() {
    var rows = document.getElementById('gymBoneMappingRows');
    if (!rows || !report) return;
    rows.innerHTML = '';
    (authority()?.REQUIRED_CANONICAL_JOINTS || []).forEach(function (joint) {
      var tr = make('tr');
      var jointCell = make('td', joint);
      var boneCell = make('td');
      var statusCell = make('td', report.canonicalMap?.[joint] ? 'MAPPED' : 'UNRESOLVED');
      var select = make('select');
      var blank = make('option', '— unresolved —');
      blank.value = '';
      select.appendChild(blank);
      (report.boneNames || []).forEach(function (name) {
        var option = make('option', name);
        option.value = name;
        option.selected = report.canonicalMap?.[joint] === name;
        select.appendChild(option);
      });
      select.onchange = function () {
        if (!select.value) return;
        try {
          report = controller().applyCorrection(report, joint, select.value);
          renderRows();
          renderReport();
        } catch (error) {
          document.getElementById('gymCompatibilityOutput').value = 'FIRST FAILURE: BONE_MAPPING_CORRECTION\n' + error.message;
        }
      };
      boneCell.appendChild(select);
      tr.append(jointCell, boneCell, statusCell);
      rows.appendChild(tr);
    });
  }
  function renderReport() {
    if (!report) return;
    document.getElementById('gymCompatibilityFirstFailure').textContent = report.firstFailure || 'UNKNOWN';
    document.getElementById('gymCompatibilityCoverage').textContent = report.mappingCoverage || '0/0';
    document.getElementById('gymCompatibilityOutput').value = controller().firstFailureText(report);
    var rest = (report.stages || []).find(function (item) { return item.stage === 'REST_POSE_VALID'; });
    document.getElementById('gymSaveMapping').disabled = Boolean((report.unmapped || []).length) || rest?.status !== 'PASS';
  }
  async function saveMapping() {
    var status = document.getElementById('gymCompatibilitySaveState');
    try {
      var profile = controller().createMappingProfile(report, { restPoseValid: true });
      status.textContent = 'SAVING ' + profile.profileId;
      await controller().saveProfileEverywhere(profile);
      status.textContent = 'SYNCED ' + profile.profileId;
    } catch (error) {
      var local = controller().loadProfile?.();
      status.textContent = local
        ? 'LOCAL ONLY — REMOTE SYNC FAILED: ' + error.message
        : 'BLOCKED: ' + error.message;
    }
  }
  function install() {
    if (document.getElementById('gymCompatibilityPanel')) return;
    var anchor = document.getElementById('avatarDiagnostics')?.closest('section');
    if (!anchor) return;
    var panel = make('section');
    panel.id = 'gymCompatibilityPanel';
    panel.innerHTML = '<h2>Gym Compatibility / Bone Mapping</h2>'
      + '<p class="measurement">Inspect the personalized avatar, correct unresolved bones, validate rest pose, then save the mapping profile for gym locomotion.</p>'
      + '<div class="controls"><button id="gymInspectAvatar">Inspect Personalized Avatar</button>'
      + '<label><input id="gymRestPoseValid" type="checkbox"> Rest pose visually validated</label>'
      + '<button id="gymSaveMapping" disabled>Save + Sync Mapping</button>'
      + '<button id="gymCopyCompatibility">Copy FIRST FAILURE Report</button></div>'
      + '<p class="measurement"><strong>FIRST FAILURE:</strong> <span id="gymCompatibilityFirstFailure">NOT RUN</span> · '
      + '<strong>Mapping:</strong> <span id="gymCompatibilityCoverage">0/0</span> · '
      + '<strong>Profile:</strong> <span id="gymCompatibilitySaveState">NOT SAVED</span></p>'
      + '<table><thead><tr><th>Canonical joint</th><th>Personalized-avatar bone</th><th>Status</th></tr></thead><tbody id="gymBoneMappingRows"></tbody></table>'
      + '<textarea id="gymCompatibilityOutput" rows="12" readonly></textarea>';
    anchor.insertAdjacentElement('afterend', panel);
    document.getElementById('gymInspectAvatar').onclick = render;
    document.getElementById('gymRestPoseValid').onchange = render;
    document.getElementById('gymSaveMapping').onclick = saveMapping;
    document.getElementById('gymCopyCompatibility').onclick = function () {
      navigator.clipboard?.writeText(document.getElementById('gymCompatibilityOutput').value);
    };
    render();
  }

  window.PocketPTMotionLabGymCompatibilityPanel = Object.freeze({ install: install, refresh: render });
})(window, document);
