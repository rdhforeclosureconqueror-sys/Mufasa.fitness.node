# Ownership map

| Concern | Owner |
|---|---|
| Viewer/runtime lifecycle | `motion-lab-bootstrap.js` |
| Gym feature activation | `motion-lab-gym-compatibility-entry.js` |
| Gym readiness + dependency ordering | `motion-lab-gym-compatibility-integration.js` |
| Skeleton/canonical inventory | `personal-avatar-compatibility.js` |
| Bone correction/profile persistence | `motion-lab-gym-compatibility.js` |
| Mapping owner/test UI | `motion-lab-gym-compatibility-panel.js` |

No owner in this slice controls animation playback or Godot locomotion.
