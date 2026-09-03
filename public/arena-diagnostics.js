(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTArenaDiagnostics = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';

  const VERSION = 'arena-diagnostics-v1';
  const STATES = new Set(['WAITING', 'RUNNING', 'PASS', 'FAIL', 'SKIP', 'NOT_CONNECTED']);
  const rows = [
    ['ARENA_SHELL', 'Arena page', 'Connection', [], 'PocketPT', 'Reload the arena page.'],
    ['CONFIG', 'World configuration', 'Connection', ['ARENA_SHELL'], 'PocketPT', 'Check GET /api/game/config.'],
    ['TICKET_PRESENT', 'Launch ticket', 'Connection', ['CONFIG'], 'PocketPT', 'Enter from the signed-in Push-Up Challenge page.'],
    ['SESSION_EXCHANGE', 'Arena sign-in', 'Connection', ['TICKET_PRESENT'], 'PocketPT', 'Check the one-time ticket exchange; return to PocketPT to sign in again.'],
    ['FRAGMENT_SCRUB', 'Launch ticket cleared', 'Connection', ['TICKET_PRESENT'], 'PocketPT', 'Check removal of the launch fragment from browser history.'],
    ['BOOTSTRAP', 'Authenticated bootstrap', 'Connection', ['SESSION_EXCHANGE', 'FRAGMENT_SCRUB'], 'PocketPT', 'Check GET /api/game/bootstrap using the existing arena session.'],
    ['IDENTITY', 'Authenticated member', 'Connection', ['BOOTSTRAP', 'SESSION_LIFETIME'], 'PocketPT', 'Check that bootstrap resolves the signed-in member and the arena session is current.'],
    ['CHALLENGE_CONTEXT', 'Push-Up Arena context', 'Connection', ['BOOTSTRAP'], 'PocketPT', 'Check PUSH_UP_ARENA / push_up in bootstrap.'],
    ['SESSION_LIFETIME', 'Arena session expiry', 'Connection', ['BOOTSTRAP'], 'PocketPT', 'Return to PocketPT and enter the arena again.'],
    ['BUILD_PROBE', 'Game export available', 'Connection', ['IDENTITY', 'CHALLENGE_CONTEXT'], 'PocketPT', 'Check the deployed /game/push-up-arena export.'],
    ['IFRAME_LOAD', 'Game frame loaded', 'Connection', ['BUILD_PROBE'], 'PocketPT', 'Check the game entry and its browser network errors, then reload.'],
    ['GODOT_HANDSHAKE', 'Game connection / ready handshake', 'Connection', ['IFRAME_LOAD', 'SESSION_LIFETIME'], 'Godot', 'Check the existing v1 READY message and the in-game bridge error panel.'],
    ['AVATAR_DESCRIPTOR', 'Personal avatar descriptor', 'Avatar', ['IDENTITY', 'CHALLENGE_CONTEXT'], 'PocketPT', 'Check the saved avatar selection and versioned descriptor in bootstrap.'],
    ['GODOT_REPORTER', 'Game diagnostic reporting', 'Avatar', ['GODOT_HANDSHAKE'], 'Godot', 'Connect the diagnostic sender in the existing Godot source, then export it. The in-game Phase 2 panel remains the current avatar evidence.'],
    ['AVATAR_DOWNLOAD', 'Personal avatar download', 'Avatar', ['GODOT_REPORTER', 'AVATAR_DESCRIPTOR'], 'Godot', 'Have the existing avatar loader report its actual download result.'],
    ['AVATAR_IMPORT', 'Personal avatar import', 'Avatar', ['AVATAR_DOWNLOAD'], 'Godot', 'Have the existing GLB importer report its actual result.'],
    ['AVATAR_MOUNT', 'Personal avatar mounted', 'Avatar', ['AVATAR_IMPORT'], 'Godot', 'Report attachment of the imported personal visual to the existing avatar anchor.'],
    ['AVATAR_FALLBACK', 'Default avatar fallback', 'Avatar', ['GODOT_REPORTER'], 'Godot', 'Report whether the labelled default avatar is actually displayed.'],
    ['ANIMATION_IDLE', 'Idle animation', 'Controls', ['AVATAR_MOUNT'], 'Godot', 'Connect a compatible idle animation to the mounted personal avatar.'],
    ['PHONE_FLOW', 'Phone entry and setup', 'Controls', ['GODOT_HANDSHAKE'], 'PocketPT', 'Check the touch/setup coordinator. This does not prove a completed challenge.'],
    ['CONTROL_CHANNEL', 'Touch / world control channel', 'Controls', ['GODOT_HANDSHAKE'], 'Bridge', 'Negotiate the phone-flow contract with the existing Godot controller. Legacy READY and arrow keys alone do not prove this channel.'],
    ['MAT_APPROACH', 'Mat approach / avatar setup', 'Controls', ['CONTROL_CHANNEL'], 'Bridge', 'Check matching arrival and animation acknowledgements from the actual Godot controller.'],
    ['LOCOMOTION', 'Walking animation', 'Controls', ['AVATAR_MOUNT'], 'Godot', 'Connect walking to actual character movement; check feet and floor contact visually.'],
    ['CAMERA_PERMISSION', 'Camera permission', 'Body tracking', ['IDENTITY', 'CHALLENGE_CONTEXT'], 'PocketPT', 'Enable the camera explicitly and check browser permission.'],
    ['CAMERA_STREAM', 'Camera video stream', 'Body tracking', ['CAMERA_PERMISSION'], 'PocketPT', 'Check playable video; cancellation must stop current and late-granted streams.'],
    ['BODY_DETECTOR', 'Body detector', 'Body tracking', ['IDENTITY', 'CHALLENGE_CONTEXT', 'CAMERA_STREAM'], 'PocketPT', 'Connect the existing camera/MoveNet runtime to this arena with an explicit camera start.'],
    ['BODY_VISIBILITY', 'Required joints visible', 'Body tracking', ['BODY_DETECTOR'], 'PocketPT', 'Report current usable joints and confidence through the existing detector; do not transmit landmarks.'],
    ['POSE_TOP_CALIBRATION', 'Personal TOP pose captured', 'Body tracking', ['BODY_VISIBILITY'], 'PocketPT', 'Hold a stable top pose and capture attempt-scoped geometry; do not save a camera image.'],
    ['POSE_BOTTOM_CALIBRATION', 'Personal BOTTOM pose captured', 'Body tracking', ['POSE_TOP_CALIBRATION'], 'PocketPT', 'Hold a stable, distinct bottom pose and capture attempt-scoped geometry.'],
    ['POSE_CYCLE_CALIBRATION', 'Personal TOP return confirmed', 'Body tracking', ['POSE_TOP_CALIBRATION', 'POSE_BOTTOM_CALIBRATION'], 'PocketPT', 'Return to the captured TOP reference. If capture stalls, use Restart pose capture. This is not exercise-form approval.'],
    ['START_POSITION', 'Valid push-up start position', 'Body tracking', ['BODY_VISIBILITY', 'POSE_CYCLE_CALIBRATION'], 'PocketPT', 'Connect reviewed orientation, top posture and alignment rules. Personal calibration alone cannot validate form or arm a countdown.'],
    ['READY_GESTURE', 'Body ready signal', 'Body tracking', ['START_POSITION', 'CONTROL_CHANNEL'], 'PocketPT', 'Use the held valid start posture for phone push-ups; overhead hands are not required on the floor.'],
    ['CHALLENGE_STATE', 'Challenge transitions', 'Challenge', ['GODOT_HANDSHAKE', 'CHALLENGE_CONTEXT'], 'Godot', 'Report the current challenge state-machine transition result.'],
    ['REP_DETECTOR', 'TOP → BOTTOM → TOP reps', 'Challenge', ['BODY_VISIBILITY'], 'PocketPT', 'Connect the reviewed full-cycle rep rules; a moving avatar is not counting evidence.'],
    ['TIMER', 'Authoritative 60-second timer', 'Challenge', ['REP_DETECTOR', 'CHALLENGE_STATE'], 'PocketPT', 'Connect the single authoritative challenge timer.'],
    ['SCORE_PERSISTENCE', 'Result saved', 'Results and replay', ['TIMER'], 'PocketPT', 'Report a successful canonical challenge-result write, not a local counter.'],
    ['LEADERBOARD_READ', 'Leaderboard loaded', 'Results and replay', ['IDENTITY', 'CHALLENGE_CONTEXT'], 'PocketPT', 'Connect the existing push-up leaderboard to this arena.'],
    ['GHOST_RECORD_LOAD', 'Recorded ghost cadence', 'Results and replay', ['LEADERBOARD_READ'], 'PocketPT', 'Load an approved performance with recorded rep timestamps.'],
    ['GHOST_PLAYBACK', 'Ghost replay', 'Results and replay', ['GODOT_REPORTER', 'GHOST_RECORD_LOAD'], 'Godot', 'Report playback against recorded rep timing; do not infer cadence from a score.'],
    ['COACH_VOICE', 'Coach voice', 'Coach and exit', ['CHALLENGE_CONTEXT'], 'PocketPT', 'Connect semantic cues to the existing backend voice service.'],
    ['EXIT_REVOKE', 'Session cleanup on exit', 'Coach and exit', [], 'PocketPT', 'Check DELETE /api/game/session when Exit Arena is selected.']
  ].map(([id, label, group, requires, owner, next]) => Object.freeze({id, label, group, requires, owner, next}));

  // Only fixed messages are retained. Never collect arbitrary errors, URLs, names,
  // member/session IDs, tokens, cookies, camera frames, or body landmarks.
  const DETAILS = Object.freeze({
    PHONE_FLOW_READY: 'The PocketPT phone entry/setup coordinator is connected.',
    TOUCH_NOT_CONNECTED: 'This game build has not negotiated touch controls. Camera setup remains available.',
    TOUCH_CONNECTED: 'The game negotiated touch capabilities and context locking. This is not walking-animation proof.',
    MAT_REQUESTED: 'The mat approach was requested; waiting for actual arrival.',
    MAT_REACHED: 'The game acknowledged arrival for the current mat command.',
    MAT_CANCELLED: 'The mat approach was cancelled.',
    AVATAR_POSITIONED: 'The game acknowledged the requested push-up transition.',
    FLOW_ACK_TIMEOUT: 'The game did not acknowledge the current movement or animation command within 20 seconds.',
    CAMERA_REQUESTED: 'Camera access was explicitly requested.', CAMERA_GRANTED: 'The browser granted a camera stream.',
    CAMERA_DENIED: 'Camera permission was denied. Enable permission and retry.', CAMERA_UNAVAILABLE: 'Camera access requires a supported browser and secure context.',
    CAMERA_START_TIMEOUT: 'Camera or detector startup exceeded 30 seconds; retry explicitly.',
    CAMERA_START_FAILED: 'Camera or detector startup failed. Check the camera and canonical pose runtime.',
    CAMERA_STREAM_READY: 'The camera stream is attached to playable video.', CAMERA_ENDED: 'The camera stream ended.',
    CAMERA_OFF: 'The camera is off; no pose readiness is retained.',
    DETECTOR_STARTING: 'Initializing the existing MoveNet runtime.', DETECTOR_READY: 'MoveNet is initialized and its capture loop is connected.',
    BODY_VISIBLE_NOW: 'Current required joints have sufficient confidence and are inside the frame. This does not establish push-up posture.',
    BODY_NOT_VISIBLE: 'Waiting for fresh, stable required joints inside the camera frame.',
    POSE_TOP_WAITING: 'Waiting to begin the personal TOP-pose capture.', POSE_TOP_CAPTURING: 'Hold the TOP pose still while attempt-scoped geometry is sampled.',
    POSE_TOP_CAPTURED: 'A stable personal TOP geometry template was captured for this attempt. No camera image was saved.',
    POSE_BOTTOM_WAITING: 'BOTTOM capture waits for a stable TOP capture first.', POSE_BOTTOM_CAPTURING: 'Hold a clearly different BOTTOM pose still while attempt-scoped geometry is sampled.',
    POSE_BOTTOM_CAPTURED: 'A stable personal BOTTOM geometry template was captured for this attempt. No camera image was saved.',
    POSE_CYCLE_WAITING: 'Waiting for both references and a stable return to the personal TOP pose.',
    POSE_CYCLE_CAPTURED: 'The personal reference sequence TOP to BOTTOM to TOP was observed. This is not approved-form or scoring evidence.',
    CALIBRATION_TIMEOUT: 'This capture phase exceeded 30 seconds. References were cleared; check framing and explicitly restart pose capture.',
    CALIBRATION_RESET: 'References were cleared. Camera, tracking or setup changed; capture again before continuing.',
    CALIBRATION_PREVIEW_ONLY: 'Camera preview does not collect personal rep gates outside an arena challenge setup.',
    PERSONAL_GATES_READY: 'Personal TOP and BOTTOM gates and a TOP return were observed. Reviewed form/depth rules are still required before official scoring.',
    START_RULES_PENDING: 'Full start-position and competition rules remain draft/unconnected. Countdown and scoring are disabled.',
    PAGE_LOADED: 'Arena page code is running.', PAGE_ERROR: 'Arena page code stopped unexpectedly. Check the browser console and script loading.', REQUEST_STARTED: 'Check in progress.',
    CONFIG_VALID: 'World configuration uses protocol v1.', TICKET_FOUND: 'One-time launch ticket present.',
    EXISTING_SESSION: 'No launch ticket; using the existing arena session.', EXCHANGE_OK: 'Arena session established.',
    FRAGMENT_CLEARED: 'Launch fragment removed from browser history.', NO_FRAGMENT: 'No launch fragment present.',
    BOOTSTRAP_VALID: 'Authenticated bootstrap returned protocol v1.', MEMBER_VALID: 'Signed-in member resolved. Identity values are omitted.',
    CONTEXT_VALID: 'PUSH_UP_ARENA / push_up.', SESSION_CURRENT: 'Bootstrap expiry is in the future; this is a local expiry check, not continuous server verification.',
    SESSION_EXPIRED: 'The arena session has expired. Enter again from PocketPT.', INVALID_PAYLOAD: 'The response did not match the expected contract.',
    BUILD_AVAILABLE: 'The server reports a game entry. This does not prove that every game asset loaded.',
    FRAME_LOADED: 'The game frame load event fired.', HANDSHAKE_READY: 'The expected game frame reported v1 READY.',
    DESCRIPTOR_VALID: 'A versioned personal GLB descriptor is available. Download, import and mount need separate evidence.',
    FALLBACK_EXPECTED: 'Bootstrap selected the default-avatar fallback. A personal avatar is not available for this launch.',
    FALLBACK_NOT_NEEDED: 'Bootstrap selected a personal avatar; no fallback has been requested.',
    NOT_REPORTED: 'No live evidence received for this check.', NOT_WIRED: 'This feature has not been connected to the arena diagnostic panel.',
    REPORTER_CONNECTED: 'The game returned an accepted diagnostic report for this launch.',
    RUNTIME_PASS: 'The game reported success for this check. Visual acceptance remains separate.',
    RUNTIME_FAIL: 'The game reported a failure at this boundary.', RUNTIME_RUNNING: 'The game reports this check is running.',
    RUNTIME_WAITING: 'The game is waiting for this check.', RUNTIME_SKIPPED: 'The game explicitly skipped this optional check.',
    REQUEST_TIMEOUT: 'The request exceeded its time limit.', FRAME_TIMEOUT: 'The game frame has not loaded within 120 seconds.',
    HANDSHAKE_TIMEOUT: 'No valid READY message arrived within 120 seconds.', NETWORK_ERROR: 'The request could not be completed.',
    HTTP_401: 'The arena session was rejected or expired (HTTP 401).', HTTP_403: 'The request was not allowed (HTTP 403).',
    HTTP_404: 'The required resource was not found (HTTP 404).', HTTP_409: 'The saved selection changed (HTTP 409).',
    HTTP_ERROR: 'The server returned an unsuccessful response.', GAME_ERROR: 'The game reported a bridge error. Check its in-game panel.',
    FRAME_RELOADED: 'The game frame reloaded. Earlier game evidence was cleared.', EXIT_NOT_REQUESTED: 'No exit request has been made.',
    EXIT_OK: 'The server confirmed the arena session was revoked.', EXIT_STARTED: 'Revoking the arena session.',
    SESSION_CLOSED: 'This arena session is closing or has ended.', PAGE_RESTORED: 'The browser restored an old page. Reload to obtain fresh connection evidence.'
  });
  const RUNTIME_STAGES = new Set(rows.filter(row => row.owner === 'Godot' && !['GODOT_HANDSHAKE', 'GODOT_REPORTER'].includes(row.id)).map(row => row.id));
  const RUNTIME_CODES = Object.freeze({PASS: 'RUNTIME_PASS', FAIL: 'RUNTIME_FAIL', RUNNING: 'RUNTIME_RUNNING', WAITING: 'RUNTIME_WAITING', SKIP: 'RUNTIME_SKIPPED', NOT_CONNECTED: 'NOT_REPORTED'});
  const CONNECTED_STAGES = new Set(['ARENA_SHELL', 'CONFIG', 'TICKET_PRESENT', 'SESSION_EXCHANGE', 'FRAGMENT_SCRUB', 'BOOTSTRAP', 'IDENTITY', 'CHALLENGE_CONTEXT', 'SESSION_LIFETIME', 'BUILD_PROBE', 'IFRAME_LOAD', 'GODOT_HANDSHAKE', 'AVATAR_DESCRIPTOR', 'EXIT_REVOKE']);

  function create({now = () => Date.now(), onChange = () => {}} = {}) {
    const state = new Map(rows.map(row => [row.id, {status: CONNECTED_STAGES.has(row.id) ? 'WAITING' : 'NOT_CONNECTED', code: CONNECTED_STAGES.has(row.id) ? 'NOT_REPORTED' : 'NOT_WIRED', at: null}]));
    state.set('EXIT_REVOKE', {status: 'SKIP', code: 'EXIT_NOT_REQUESTED', at: null});
    let requestId = null;
    let lastSequence = 0;
    let fallbackExpected = false;
    let closed = false;
    function mark(id, status, code) {
      if (!state.has(id) || !STATES.has(status) || !Object.hasOwn(DETAILS, code)) return false;
      if (!['PASS', 'SKIP'].includes(status)) {
        const invalidated = new Set([id]);
        for (const row of rows) {
          if (!row.requires.some(dependency => invalidated.has(dependency))) continue;
          invalidated.add(row.id);
          if (state.get(row.id).status === 'PASS') {
            state.set(row.id, {status: CONNECTED_STAGES.has(row.id) ? 'WAITING' : 'NOT_CONNECTED', code: 'NOT_REPORTED', at: null});
          }
        }
      }
      state.set(id, {status, code, at: new Date(now()).toISOString()});
      onChange();
      return true;
    }
    function snapshot() {
      const resolved = new Map();
      function resolve(row) {
        if (resolved.has(row.id)) return resolved.get(row.id);
        const own = state.get(row.id);
        const dependencies = row.requires.map(id => resolve(rows.find(item => item.id === id)));
        const failed = dependencies.find(item => item.status === 'FAIL' || item.failedDependency);
        const pending = dependencies.find(item => !['PASS', 'SKIP'].includes(item.status));
        // A real reported error remains visible when prerequisites are only
        // unobserved. An actual upstream failure takes priority over its fallout.
        const block = own.status !== 'SKIP' && (failed || (pending && own.status !== 'FAIL'));
        const result = {...row, ...own, detail: DETAILS[own.code], status: block ? 'BLOCKED' : own.status,
          blockedBy: block ? (failed || pending).id : null, failedDependency: Boolean(failed)};
        resolved.set(row.id, result);
        return result;
      }
      return rows.map(resolve);
    }
    function summary() {
      const current = snapshot();
      const firstFailure = current.find(row => row.status === 'FAIL') || null;
      const next = current.find(row => ['NOT_CONNECTED', 'RUNNING', 'WAITING'].includes(row.status)) || null;
      return {firstFailure, next, passed: current.filter(row => row.status === 'PASS').length, total: current.length};
    }
    function report() {
      const info = summary();
      return ['PocketPT Push-Up Arena Diagnostics', `Panel: ${VERSION}`, 'Page: /arena/push-up',
        `FIRST FAILURE: ${info.firstFailure ? info.firstFailure.id : 'none observed'}`,
        `NEXT UNVERIFIED: ${info.next ? info.next.id : 'none'}`,
        'PASS means observed technical evidence for this launch, not visual or exercise-quality approval.', '',
        ...snapshot().map(row => `${row.status} | ${row.id} | ${row.label} | ${row.owner}\n${row.blockedBy ? `Waiting on ${row.blockedBy}. ` : ''}${row.detail}\nNext: ${row.next}${row.at ? `\nObserved: ${row.at}` : ''}`)].join('\n');
    }
    function resetGame(nextRequestId) {
      requestId = nextRequestId;
      lastSequence = 0;
      for (const row of rows.filter(row => !CONNECTED_STAGES.has(row.id))) {
        state.set(row.id, {status: 'NOT_CONNECTED', code: 'NOT_WIRED', at: null});
      }
      if (fallbackExpected) {
        for (const id of ['AVATAR_DOWNLOAD', 'AVATAR_IMPORT', 'AVATAR_MOUNT']) state.set(id, {status: 'SKIP', code: 'FALLBACK_EXPECTED', at: null});
      } else state.set('AVATAR_FALLBACK', {status: 'SKIP', code: 'FALLBACK_NOT_NEEDED', at: null});
      onChange();
    }
    function setFallback(expected) {
      fallbackExpected = Boolean(expected);
      // Personal-avatar success must never be inferred from the default visual.
      for (const id of ['AVATAR_DOWNLOAD', 'AVATAR_IMPORT', 'AVATAR_MOUNT']) {
        state.set(id, {status: expected ? 'SKIP' : 'NOT_CONNECTED', code: expected ? 'FALLBACK_EXPECTED' : 'NOT_WIRED', at: null});
      }
      state.set('AVATAR_FALLBACK', {status: expected ? 'NOT_CONNECTED' : 'SKIP', code: expected ? 'NOT_REPORTED' : 'FALLBACK_NOT_NEEDED', at: null});
      onChange();
    }
    function acceptRuntime(data) {
      if (closed || !requestId || data?.type !== 'POCKETPT_GODOT_BRIDGE' || data.event !== 'DIAGNOSTIC' || data.protocolVersion !== 1 || data.diagnosticVersion !== 1 || data.requestId !== requestId) return false;
      if (!Number.isSafeInteger(data.sequence) || data.sequence <= lastSequence || !RUNTIME_STAGES.has(data.stage) || !Object.hasOwn(RUNTIME_CODES, data.status)) return false;
      if (state.get('GODOT_HANDSHAKE').status !== 'PASS' || state.get('SESSION_LIFETIME').status !== 'PASS') return false;
      if (fallbackExpected && ['AVATAR_DOWNLOAD', 'AVATAR_IMPORT', 'AVATAR_MOUNT'].includes(data.stage) && data.status === 'PASS') return false;
      // Only fallback/ghost checks are optional. Skipping import or mount cannot
      // turn dependent animation checks green.
      if (data.status === 'SKIP' && !['AVATAR_FALLBACK', 'GHOST_PLAYBACK'].includes(data.stage)) return false;
      lastSequence = data.sequence;
      mark('GODOT_REPORTER', 'PASS', 'REPORTER_CONNECTED');
      return mark(data.stage, data.status, RUNTIME_CODES[data.status]);
    }
    function close() { closed = true; requestId = null; }
    return {mark, snapshot, summary, report, resetGame, setFallback, acceptRuntime, close};
  }

  function isGameMessage(event, frame, origin) {
    return Boolean(frame?.contentWindow && event.origin === origin && event.source === frame.contentWindow && event.data && typeof event.data === 'object' && event.data.type === 'POCKETPT_GODOT_BRIDGE' && event.data.protocolVersion === 1);
  }

  function inspectBootstrap(data, now = Date.now()) {
    if (!data || data.protocolVersion !== 1) return {failure: 'BOOTSTRAP'};
    if (typeof data.member?.id !== 'string' || !data.member.id.trim()) return {failure: 'IDENTITY'};
    if (data.experience?.type !== 'PUSH_UP_ARENA' || data.experience?.challengeId !== 'push_up') return {failure: 'CHALLENGE_CONTEXT'};
    const expiresAt = Date.parse(data.session?.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= now) return {failure: 'SESSION_LIFETIME', expired: Number.isFinite(expiresAt)};
    if (data.avatar === null && data.avatarState?.status === 'FALLBACK' && data.avatarState.fallback === 'DEFAULT_AVATAR') return {expiresAt, fallback: true};
    const avatar = data.avatar;
    if (data.avatarState?.status !== 'AVAILABLE' || avatar?.format !== 'glb' || typeof avatar.avatarId !== 'string' || !/^[a-f0-9-]{16,64}$/i.test(avatar.avatarId) || !/^[a-f0-9]{32}$/.test(avatar.profileVersion) || avatar.assetUrl !== `/api/game/avatar/asset?version=${avatar.profileVersion}`) return {expiresAt, failure: 'AVATAR_DESCRIPTOR'};
    return {expiresAt, fallback: false};
  }

  function mount({model, board, toggle, document, navigator, reload}) {
    board.replaceChildren();
    function element(tag, text, className) {
      const node = document.createElement(tag);
      if (text) node.textContent = text;
      if (className) node.className = className;
      return node;
    }
    const title = element('h2', 'Arena Diagnostics');
    title.id = 'arenaDiagnosticsTitle';
    board.setAttribute('aria-labelledby', title.id);
    board.append(title, element('p', 'Live checks for this launch. Missing evidence is never a pass.', 'dbg-sub'));
    const first = element('div', '', 'dbg-first');
    first.setAttribute('role', 'status');
    first.setAttribute('aria-live', 'polite');
    const counts = element('p', '', 'dbg-sub');
    board.append(first, counts);
    const actions = element('div', '', 'dbg-actions');
    const copy = element('button', 'Copy Debug Report');
    const refresh = element('button', 'Reload Arena');
    const close = element('button', 'Close');
    for (const button of [copy, refresh, close]) button.type = 'button';
    actions.append(copy, refresh, close);
    board.append(actions);
    const items = new Map();
    for (const group of [...new Set(rows.map(row => row.group))]) {
      board.append(element('h3', group));
      const list = element('ol');
      for (const row of rows.filter(item => item.group === group)) {
        const li = element('li');
        li.dataset.stage = row.id;
        const badge = element('span', '', 'dbg-state');
        const content = element('div');
        const detail = element('small');
        const action = element('small', `Next: ${row.next}`, 'dbg-next');
        const owner = element('small', `${row.owner} · ${row.id}`);
        content.append(element('strong', row.label), detail, action, owner);
        li.append(badge, content);
        list.append(li);
        items.set(row.id, {badge, detail, action});
      }
      board.append(list);
    }
    board.append(element('p', 'PASS confirms a reported technical check. Visual quality, valid exercise form and device acceptance still need their own checks.', 'dbg-sub dbg-note'));
    const copyStatus = element('p', '', 'dbg-sub');
    copyStatus.setAttribute('role', 'status');
    const fallback = element('textarea');
    fallback.hidden = true;
    fallback.readOnly = true;
    fallback.setAttribute('aria-label', 'Diagnostic report for manual copying');
    board.append(copyStatus, fallback);
    function setOpen(open) {
      const opening = open && board.hidden;
      board.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (opening) close.focus();
      if (!open) toggle.focus();
    }
    toggle.addEventListener('click', () => setOpen(board.hidden));
    close.addEventListener('click', () => setOpen(false));
    board.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); } });
    refresh.addEventListener('click', reload);
    copy.addEventListener('click', async () => {
      const text = model.report();
      try {
        if (!navigator.clipboard?.writeText) throw new Error('clipboard_unavailable');
        await navigator.clipboard.writeText(text);
        copyStatus.textContent = 'Report copied.';
        fallback.hidden = true;
      } catch (_) {
        fallback.value = text;
        fallback.hidden = false;
        fallback.focus();
        fallback.select();
        copyStatus.textContent = 'Automatic copy is unavailable. Select and copy the report below.';
      }
    });
    function render() {
      const {firstFailure, next, passed, total} = model.summary();
      first.className = `dbg-first${firstFailure ? ' fail' : ''}`;
      first.textContent = firstFailure ? `FIRST FAILURE: ${firstFailure.label}. ${firstFailure.detail} Next: ${firstFailure.next}` : `FIRST FAILURE: none observed. ${next ? `NEXT UNVERIFIED: ${next.label}. ${next.next}` : 'All checks have evidence or are explicitly skipped.'}`;
      counts.textContent = `${passed} of ${total} checks passed · ${VERSION}`;
      toggle.textContent = firstFailure ? 'Arena Diagnostics · Failure' : 'Arena Diagnostics';
      for (const row of model.snapshot()) {
        const item = items.get(row.id);
        item.badge.textContent = row.status.replaceAll('_', ' ');
        item.badge.className = `dbg-state dbg-${row.status}`;
        item.detail.textContent = `${row.blockedBy ? `Waiting on ${row.blockedBy}. ` : ''}${row.detail}${row.at ? ` Checked ${row.at.slice(11, 19)} UTC.` : ''}`;
        item.action.hidden = ['PASS', 'SKIP'].includes(row.status);
      }
    }
    render();
    return {render, setOpen};
  }
  return {VERSION, rows, DETAILS, create, isGameMessage, inspectBootstrap, mount};
});
