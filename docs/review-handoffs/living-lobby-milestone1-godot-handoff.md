# Living Lobby Milestone 1 — Godot handoff

Date: 2026-09-12

Goal: `ENTER -> SPAWN -> SEE -> MOVE -> LEAVE` in one room named `lions_den`.

Server branch: `chatgpt/living-lobby-milestone1`

Available server contract:

- WebSocket path: `/api/game/lobby/ws`
- Lobby config: `GET /api/game/lobby/config`
- Remote avatar path is supplied in each player record
- Messages: `ROOM_SNAPSHOT`, `PLAYER_JOINED`, `PLAYER_STATE`, `PLAYER_LEFT`, `SESSION_REPLACED`, `ERROR`
- Client movement message: `{type:"PLAYER_STATE", seq, position:[x,y,z], yaw, locomotion}`
- Allowed locomotion: `IDLE`, `WALK`, `RUN`, `STOP`, `ACTION_OVERRIDE`
- Recommended send frequency: 10–15 Hz; server maximum is 30 Hz
- The server owns player identity. Godot sends movement state only.
- Remote players are non-blocking in Milestone 1. Do not add player-to-player collision yet.

Canonical working Godot source remains local at `C:\Users\pftgu\Documents\avlobytest`.

## Godot work

Create one `LobbyClient` authority. Connect after the existing PocketPT bootstrap succeeds. Keep exactly one live lobby connection. Track `self_presence_id`. Parse room snapshot/join/state/leave messages. Send the final post-collision local transform and current locomotion state with a monotonically increasing sequence number.

Add a `RemotePlayers: Node3D` container and maintain `presence_id -> RemotePlayer`. Never spawn the local player's presence as a remote clone.

Each `RemotePlayer` stores target position, target yaw, locomotion state and last sequence. Ignore stale sequences and interpolate toward the latest target transform. Reuse the existing personalized avatar loader/mapping path; use the remote player's supplied avatar URL.

Keep the existing local `CharacterBody3D` as local movement authority:

`INPUT -> PHYSICS/COLLISION -> FINAL TRANSFORM -> LOCOMOTION -> NETWORK SEND`

Do not send raw keyboard or gesture inputs.

## Consolidated debug panel

Extend the existing panel. Do not create another panel.

Required fields:

```text
MULTIPLAYER TRANSPORT:
WS URL:
CONNECTION STATE:
ROOM ID:
SELF PRESENCE ID:
LOCAL MEMBER ID:
ROOM PLAYER COUNT:
REMOTE PLAYER COUNT:
REMOTE AVATARS LOADED:
LAST STATE SENT SEQ:
LAST STATE RECEIVED SEQ:
LAST STATE AGE MS:
RECONNECT COUNT:
FIRST FAILURE:
```

First-failure pipeline:

`BOOTSTRAP -> LOBBY_CONFIG -> WS_CONNECT -> ROOM_SNAPSHOT -> LOCAL_PLAYER_BIND -> REMOTE_PLAYER_SPAWN -> REMOTE_AVATAR_LOAD -> STATE_SEND -> STATE_RECEIVE -> REMOTE_MOVE -> LEAVE_DESPAWN`

## Acceptance

Milestone 1 requires three separate physical devices and three separate accounts.

All three correct avatars must appear in the same Lion's Den. Each device controls only its own avatar. Movement and facing must be visible on the other two devices. Late join must show existing players. Leave must despawn. Reconnect must not create a duplicate ghost. All three debug panels must end with `FIRST FAILURE: NONE`.

Out of scope: chat, friends, parties, matchmaking, spectators, live challenge synchronization, player-to-player collision, and Mufasa multiplayer behavior.
