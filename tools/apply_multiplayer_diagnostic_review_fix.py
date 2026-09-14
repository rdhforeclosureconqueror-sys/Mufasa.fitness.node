from pathlib import Path

root = Path(__file__).resolve().parents[1]
diag_path = root / "public/arena-diagnostics.js"
test_path = root / "test/arena-diagnostics.test.js"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"PATCH_BOUNDARY_{label}:{count}")
    return text.replace(old, new, 1)


diag = diag_path.read_text(encoding="utf-8")
diag = replace_once(
    diag,
    "const MULTIPLAYER_DEFAULT = Object.freeze({connectionState: 'NOT_REPORTED', roomId: 'NOT_REPORTED', selfPresenceId: 'NOT_REPORTED', localMemberId: 'NOT_REPORTED', roomPlayerCount: 0, remotePlayerCount: 0, remoteAvatarsLoaded: 0, stateSendAttempts: 0, stateSendSuccesses: 0, lastSentSeq: 0, statePacketsReceived: 0, lastReceivedSeq: 0, lastStateAgeMs: null, remoteMovementApplies: 0, reconnectCount: 0, connectionGeneration: 0, snapshotReceived: false, localPhysicallyMoving: false, oppositePlayerMoving: false, remoteTargetsApplied: 0, remotePuppetMoves: 0, lastError: 'NONE', firstFailure: 'NOT_REPORTED'});",
    "const MULTIPLAYER_DEFAULT = Object.freeze({connectionState: 'NOT_REPORTED', roomId: 'NOT_REPORTED', selfPresenceId: 'NOT_REPORTED', localMemberId: 'NOT_REPORTED', roomPlayerCount: 0, remotePlayerCount: 0, remoteAvatarsLoaded: 0, stateSendAttempts: 0, stateSendSuccesses: 0, lastSentSeq: 0, statePacketsReceived: 0, lastReceivedSeq: 0, lastStateAgeMs: null, roomReadyAgeMs: null, remoteMovementApplies: 0, reconnectCount: 0, connectionGeneration: 0, snapshotReceived: false, localPhysicallyMoving: false, remoteMovementExpected: false, remoteTargetsApplied: 0, remotePuppetMoves: 0, lastError: 'NONE', firstFailure: 'NOT_REPORTED'});",
    "DEFAULT",
)
diag = replace_once(
    diag,
    """    if (value.localPhysicallyMoving && value.stateSendAttempts === 0) return 'LOCAL_STATE_NOT_PUBLISHING';\n    if (value.stateSendAttempts > value.stateSendSuccesses) return 'STATE_TRANSPORT_SEND_FAILED';\n    if (value.oppositePlayerMoving && value.stateSendSuccesses > 0 && value.statePacketsReceived === 0) return 'REMOTE_STATE_NOT_RECEIVED';\n    if (value.oppositePlayerMoving && value.statePacketsReceived > 0 && Number.isFinite(value.lastStateAgeMs) && value.lastStateAgeMs > 1000) return 'REMOTE_STATE_STALE';\n    if (value.statePacketsReceived > value.remoteTargetsApplied) return 'REMOTE_STATE_NOT_APPLIED';\n    if (value.remoteTargetsApplied > 0 && value.remotePuppetMoves === 0) return 'REMOTE_PUPPET_NOT_MOVING';\n""",
    """    if (value.localPhysicallyMoving && value.stateSendAttempts === 0) return 'LOCAL_STATE_NOT_PUBLISHING';\n    if (value.stateSendAttempts > value.stateSendSuccesses) return 'STATE_TRANSPORT_SEND_FAILED';\n    // PR #12 publishes a heartbeat every 500 ms. Once a two-player room has\n    // been READY for a grace window, zero inbound packets is itself proof of\n    // a receive/relay stall; we do not require unknowable "other player moving" evidence.\n    if (value.remotePlayerCount > 0 && value.stateSendSuccesses > 0 && value.statePacketsReceived === 0 && Number.isFinite(value.roomReadyAgeMs) && value.roomReadyAgeMs > 1500) return 'REMOTE_STATE_NOT_RECEIVED';\n    if (value.remotePlayerCount > 0 && value.statePacketsReceived > 0 && Number.isFinite(value.lastStateAgeMs) && value.lastStateAgeMs > 1500) return 'REMOTE_STATE_STALE';\n    if (value.statePacketsReceived > value.remoteTargetsApplied) return 'REMOTE_STATE_NOT_APPLIED';\n    // Accepted idle heartbeat targets must not falsely accuse interpolation.\n    if (value.remoteMovementExpected && value.remoteTargetsApplied > 0 && value.remotePuppetMoves === 0) return 'REMOTE_PUPPET_NOT_MOVING';\n""",
    "CLASSIFIER",
)
diag = replace_once(
    diag,
    "return ['MULTIPLAYER', `Connection: ${m.connectionState}`, `Room: ${m.roomId}`, `Self presence: ${m.selfPresenceId}`, `Local member: ${m.localMemberId}`, `Room players: ${m.roomPlayerCount}`, `Remote players: ${m.remotePlayerCount}`, `Remote avatars loaded: ${m.remoteAvatarsLoaded}`, `State send attempts: ${m.stateSendAttempts}`, `State send successes: ${m.stateSendSuccesses}`, `Last sent seq: ${m.lastSentSeq}`, `State packets received: ${m.statePacketsReceived}`, `Last received seq: ${m.lastReceivedSeq}`, `Last state age: ${m.lastStateAgeMs === null ? 'N/A' : `${m.lastStateAgeMs} ms`}`, `Remote movement applies: ${m.remoteMovementApplies}`, `Reconnects: ${m.reconnectCount}`, `Connection generation: ${m.connectionGeneration}`, `Last error: ${m.lastError}`, `MULTIPLAYER FIRST FAILURE: ${m.firstFailure}`].join('\\n');",
    "return ['MULTIPLAYER', `Connection: ${m.connectionState}`, `Room: ${m.roomId}`, `Self presence: ${m.selfPresenceId}`, `Local member: ${m.localMemberId}`, `Room players: ${m.roomPlayerCount}`, `Remote players: ${m.remotePlayerCount}`, `Remote avatars loaded: ${m.remoteAvatarsLoaded}`, `Room ready age: ${m.roomReadyAgeMs === null ? 'N/A' : `${m.roomReadyAgeMs} ms`}`, `State send attempts: ${m.stateSendAttempts}`, `State send successes: ${m.stateSendSuccesses}`, `Last sent seq: ${m.lastSentSeq}`, `State packets received: ${m.statePacketsReceived}`, `Last received seq: ${m.lastReceivedSeq}`, `Last state age: ${m.lastStateAgeMs === null ? 'N/A' : `${m.lastStateAgeMs} ms`}`, `Remote targets applied: ${m.remoteTargetsApplied}`, `Remote movement expected: ${m.remoteMovementExpected ? 'YES' : 'NO'}`, `Remote puppet moves: ${m.remotePuppetMoves}`, `Reconnects: ${m.reconnectCount}`, `Connection generation: ${m.connectionGeneration}`, `Last error: ${m.lastError}`, `MULTIPLAYER FIRST FAILURE: ${m.firstFailure}`].join('\\n');",
    "REPORT",
)
diag = replace_once(
    diag,
    "if (!['CONNECTING', 'READY', 'CLOSED', 'ERROR'].includes(source.connectionState) || counts.some(key => !Number.isSafeInteger(source[key]) || source[key] < 0) || (source.lastStateAgeMs !== null && (!Number.isFinite(source.lastStateAgeMs) || source.lastStateAgeMs < 0))) return false;",
    "if (!['CONNECTING', 'READY', 'CLOSED', 'ERROR'].includes(source.connectionState) || counts.some(key => !Number.isSafeInteger(source[key]) || source[key] < 0) || (source.lastStateAgeMs !== null && (!Number.isFinite(source.lastStateAgeMs) || source.lastStateAgeMs < 0)) || (source.roomReadyAgeMs !== null && (!Number.isFinite(source.roomReadyAgeMs) || source.roomReadyAgeMs < 0))) return false;",
    "VALIDATION",
)
diag = replace_once(
    diag,
    """      multiplayer = {connectionState: source.connectionState, roomId: identifier(source.roomId), selfPresenceId: identifier(source.selfPresenceId), localMemberId: identifier(source.localMemberId), lastStateAgeMs: source.lastStateAgeMs,\n        snapshotReceived: source.snapshotReceived === true, localPhysicallyMoving: source.localPhysicallyMoving === true, oppositePlayerMoving: source.oppositePlayerMoving === true, lastError: identifier(source.lastError), ...Object.fromEntries(counts.map(key => [key, source[key]]))};\n""",
    """      multiplayer = {connectionState: source.connectionState, roomId: identifier(source.roomId), selfPresenceId: identifier(source.selfPresenceId), localMemberId: identifier(source.localMemberId), lastStateAgeMs: source.lastStateAgeMs, roomReadyAgeMs: source.roomReadyAgeMs,\n        snapshotReceived: source.snapshotReceived === true, localPhysicallyMoving: source.localPhysicallyMoving === true, remoteMovementExpected: source.remoteMovementExpected === true, lastError: identifier(source.lastError), ...Object.fromEntries(counts.map(key => [key, source[key]]))};\n""",
    "ASSIGN",
)
diag_path.write_text(diag, encoding="utf-8")

test = test_path.read_text(encoding="utf-8")
test = replace_once(
    test,
    """    stateSendAttempts: 12, stateSendSuccesses: 12, lastSentSeq: 12, statePacketsReceived: 11, lastReceivedSeq: 11, lastStateAgeMs: 43, remoteMovementApplies: 11,\n    reconnectCount: 0, connectionGeneration: 1, snapshotReceived: true, localPhysicallyMoving: true, oppositePlayerMoving: true, remoteTargetsApplied: 11, remotePuppetMoves: 10, lastError: 'NONE', firstFailure: 'NONE', ...extra\n""",
    """    stateSendAttempts: 12, stateSendSuccesses: 12, lastSentSeq: 12, statePacketsReceived: 11, lastReceivedSeq: 11, lastStateAgeMs: 43, roomReadyAgeMs: 2000, remoteMovementApplies: 11,\n    reconnectCount: 0, connectionGeneration: 1, snapshotReceived: true, localPhysicallyMoving: true, remoteMovementExpected: true, remoteTargetsApplied: 11, remotePuppetMoves: 10, lastError: 'NONE', firstFailure: 'NONE', ...extra\n""",
    "TEST_HELPER",
)
test = replace_once(
    test,
    "'Remote avatars loaded: 1', 'State send attempts: 12'",
    "'Remote avatars loaded: 1', 'Room ready age: 2000 ms', 'State send attempts: 12'",
    "TEST_REPORT_1",
)
test = replace_once(
    test,
    "'Last state age: 43 ms', 'Remote movement applies: 11', 'Reconnects: 0'",
    "'Last state age: 43 ms', 'Remote targets applied: 11', 'Remote movement expected: YES', 'Remote puppet moves: 10', 'Reconnects: 0'",
    "TEST_REPORT_2",
)
test = replace_once(
    test,
    """    [{statePacketsReceived: 0, lastReceivedSeq: 0, remoteTargetsApplied: 0, remotePuppetMoves: 0}, 'REMOTE_STATE_NOT_RECEIVED'],\n    [{lastStateAgeMs: 1001}, 'REMOTE_STATE_STALE'],\n    [{remoteTargetsApplied: 10}, 'REMOTE_STATE_NOT_APPLIED'],\n    [{remotePuppetMoves: 0}, 'REMOTE_PUPPET_NOT_MOVING']\n""",
    """    [{statePacketsReceived: 0, lastReceivedSeq: 0, lastStateAgeMs: null, roomReadyAgeMs: 1501, remoteTargetsApplied: 0, remotePuppetMoves: 0}, 'REMOTE_STATE_NOT_RECEIVED'],\n    [{lastStateAgeMs: 1501}, 'REMOTE_STATE_STALE'],\n    [{remoteTargetsApplied: 10}, 'REMOTE_STATE_NOT_APPLIED'],\n    [{remoteMovementExpected: true, remotePuppetMoves: 0}, 'REMOTE_PUPPET_NOT_MOVING']\n""",
    "TEST_CASES",
)
marker = "test('multiplayer telemetry is launch-correlated, generation-reset and monotonic', () => {"
extra_test = """test('idle heartbeat traffic does not falsely report a frozen remote puppet', () => {\n  const model = connected();\n  assert.equal(model.acceptMultiplayer(multiplayer({localPhysicallyMoving: false, remoteMovementExpected: false, remotePuppetMoves: 0})), true);\n  assert.equal(model.multiplayerSnapshot().firstFailure, 'NONE');\n});\n\n"""
test = replace_once(test, marker, extra_test + marker, "IDLE_TEST")
test_path.write_text(test, encoding="utf-8")

print("MULTIPLAYER_DIAGNOSTIC_REVIEW_PATCH: PASS")
