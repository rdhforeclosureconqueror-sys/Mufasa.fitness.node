# Shared movement intelligence architecture

## Existing architecture map

* **Detection:** `public/pose-runtime.js` owns one browser inference loop using TensorFlow.js and MoveNet SinglePose Lightning. It emits provider packets and already falls back from WebGL to CPU. Face Mesh and Hands are optional trackers, not body-pose providers.
* **Fitness analysis:** `public/form-engine.js` maps exercises to movement families, derives joint/body metrics, detects phases, and returns region corrections. `public/rep-analysis-runtime.js`, `public/qualified-rep-runtime.js`, and `public/kettlebell-checkpoints.js` own dynamic rep/checkpoint policy.
* **Yoga foundation:** `src/yoga/camera-coach` supplied normalization, mirrored-side handling, geometry, and proof-of-concept rules. Its geometry and landmark normalization now delegate to the shared runtime; the old API remains as a compatibility boundary.
* **Avatar/motion:** `public/avatar-runtime.js` and the Avaturn solver can write a GLTF skeleton from live keypoints. The product demonstration path uses Three.js, GLTFLoader, animation mixers, an Avaturn avatar, and the motion registry. Only an approved push-up GLB clip currently exists; there is no approved Warrior II clip or general IK system.

## Canonical flow

`public/body-intelligence.js` is the provider-neutral runtime shared by Node tests and the browser. A `BodyFrame` contains a timestamp, provider, coordinate space, mirror state, aggregate confidence, and a name-keyed landmark map. MoveNet is an adapter rather than an application data format. Future MediaPipe support belongs beside that adapter.

A movement definition supports a domain, static hold or dynamic rep type, orientation, confidence/visibility contract, phases, phase target frames, shared typed rules, hold policy, feedback limit, and avatar strategy. `data/movements/warrior-ii.v1.json` is the single production source for both expected camera geometry and demonstration geometry; raw imported OpenPose research files are never loaded at runtime.

Shared rule primitives are angle range, alignment, distance ratio, orientation, confidence gating, deterministic fault ordering, and a maximum correction count. Yoga retains hold timing and pose content; fitness retains rep qualification and phase/checkpoint transition policy.

## Avatar decision

The MVP uses target-landmark-to-rig data rather than inventing an animation clip. `avatarPose()` turns the same `TargetBodyFrame` into named bone vectors. The Yoga player renders its accessible skeleton fallback from those vectors. A later GLTF adapter can translate these vectors to the existing Avaturn bone aliases. When an approved Warrior II clip exists, the movement definition can select a hybrid/clip strategy while retaining its target frames as the validation invariant.

## Warrior II slice and limitations

The guided player renders the canonical demonstration, lazily initializes the existing MoveNet runtime only after camera opt-in, overlays accessible pass/warning skeleton guidance, evaluates the canonical rules locally, prioritizes at most two corrections, and advances the configurable stability timer. Denial, unsupported APIs, model/CDN failure, and camera-disabled completion preserve guided practice.

Mobile browsers require HTTPS (except localhost) and a user gesture for camera permission. iOS may suspend video/inference in the background; low-power devices can fall back to CPU and reduce frame rate, thermal load can throttle inference, and camera framing/occlusion remain two-dimensional. The implementation does not record or upload frames.

Chair, Downward Dog, Tree, Triangle, Plank, and other poses still require reviewed Pocket PT-native target frames, orientation variants, safety-ranked rules, fixtures, and trainer calibration. Dynamic fitness definitions should next migrate family/checkpoint thresholds into the same phase schema without replacing the functioning rep runtimes.
