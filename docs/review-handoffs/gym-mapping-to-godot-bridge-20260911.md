# Motion Lab -> Godot Gym Mapping Bridge

Date: 2026-09-11

## Purpose

Promote the existing Motion Lab Gym Compatibility profile from browser-only localStorage into a member-owned server record that travels with the authenticated Godot bootstrap.

This avoids remapping the same personalized avatar independently in Motion Lab and Godot.

## Source of truth

Motion Lab already proves:

- personalized avatar mounted;
- skeleton inventoried;
- required canonical mapping resolved (20/20);
- rest pose explicitly visually validated by the owner;
- embedded animation inventory recorded.

The GLB remains the source of the actual Skeleton3D rest transforms. The saved mapping profile does not rewrite the GLB and does not fabricate a new rest pose.

## Transport

After the owner presses `Save + Sync Mapping`, Motion Lab:

1. creates the existing schema-v1 profile;
2. saves it to localStorage as a browser fallback;
3. PUTs the same profile to `PUT /api/me/gym-mapping-profile` using the current authenticated PocketPT token;
4. the backend validates that all 20 required canonical joints are mapped exactly once and `restPoseValid === true`;
5. the backend stores the normalized profile on the authenticated member record.

`GET /api/me/gym-mapping-profile` returns the saved member profile.

## Godot bootstrap contract

`GET /api/game/bootstrap` now includes:

```json
{
  "gymMappingState": {
    "status": "AVAILABLE",
    "schemaVersion": 1,
    "profileId": "...",
    "savedAt": "..."
  },
  "gymMappingProfile": {
    "schemaVersion": 1,
    "profileId": "...",
    "avatarId": "...",
    "skeletonProfile": "...",
    "canonicalMap": {
      "Hips": "Hips",
      "Spine": "Spine",
      "Spine1": "Spine1",
      "Spine2": "Spine2",
      "Neck": "Neck",
      "Head": "Head",
      "LeftShoulder": "LeftShoulder",
      "LeftArm": "LeftArm",
      "LeftForeArm": "LeftForeArm",
      "LeftHand": "LeftHand",
      "RightShoulder": "RightShoulder",
      "RightArm": "RightArm",
      "RightForeArm": "RightForeArm",
      "RightHand": "RightHand",
      "LeftUpLeg": "LeftUpLeg",
      "LeftLeg": "LeftLeg",
      "LeftFoot": "LeftFoot",
      "RightUpLeg": "RightUpLeg",
      "RightLeg": "RightLeg",
      "RightFoot": "RightFoot"
    },
    "restPoseValid": true
  }
}
```

Names above are illustrative. Godot must use the actual saved raw bone values from the profile.

## Required local Godot consumer

The canonical Godot project remains:

`C:\Users\pftgu\Documents\avlobytest`

Extend the existing `PocketPTGameClient` / personalized-avatar loader, not a second network client.

After bootstrap and after the personalized GLB is mounted:

1. read `data.gymMappingState` and `data.gymMappingProfile`;
2. require `gymMappingState.status == "AVAILABLE"`;
3. find the mounted personalized avatar `Skeleton3D`;
4. verify every saved raw bone exists in that Skeleton3D;
5. reject duplicate/missing mappings;
6. resolve the local Humanizer/Godot humanoid SkeletonProfile actually used for retargeting;
7. translate PocketPT canonical joint IDs to that profile's bone IDs where their naming differs;
8. construct the Godot `BoneMap` with `BoneMap.set_skeleton_bone_name(profile_bone_name, skeleton_bone_name)`;
9. use that BoneMap for Humanizer donor animation retargeting;
10. keep CharacterBody3D / NavigationAgent3D as world-position authority.

Do not edit the original avatar GLB just to transport the map.

## First-failure chain

```text
BOOTSTRAP_MAPPING_PRESENT
-> PERSONAL_AVATAR_MOUNTED
-> PERSONAL_SKELETON_FOUND
-> SAVED_MAP_SCHEMA_VALID
-> SAVED_BONES_EXIST
-> HUMANOID_PROFILE_RESOLVED
-> PROFILE_NAME_TRANSLATION_RESOLVED
-> GODOT_BONEMAP_CREATED
-> DONOR_CLIP_RESOLVED
-> RETARGET_BOUND
-> CLIP_PLAYING
```

The earliest broken boundary is authoritative.

## Initial acceptance

Before Walk/Run state-machine work:

1. `Save + Sync Mapping` reports `SYNCED` in Motion Lab.
2. A new arena bootstrap reports `gymMappingState.status = AVAILABLE`.
3. Godot reports the same profile ID and 20 saved mappings.
4. Godot verifies all 20 raw bone names against the mounted personalized Skeleton3D.
5. Humanizer Idle retargets to the personalized avatar without rewriting the original GLB.

Only after this passes should Run and a real Walk clip be bound through the same BoneMap.
