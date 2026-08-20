# Motion Lab multi-avatar Stage 1

Stage 1 is a development-only loading proof. The Phase E profile remains the reference/fallback, while the Avaturn profile is a personalized candidate. Loading either profile replaces and disposes the previous avatar through the one `DisposableMotionSession`; the Avaturn asset's embedded animation is inventoried but never started. Stage 1 does not retarget motion, change M1, expose member selection, add anatomy, or begin Stage 2/Phase F.

## Human visual verification

Status: **PENDING HUMAN VERIFICATION**.

1. Authenticate into Motion Lab.
2. Select **Initialize Runtime**, then **Start Session**.
3. Select **Load Reference Avatar** and confirm the existing avatar renders normally.
4. Select **Unload Avatar**, then **Load Personalized Avaturn Avatar**.
5. Confirm the personalized avatar appears with its complete body visible; face/head, body, hair, clothing, materials, and textures render; the avatar is undistorted and stable; its skeleton is coherent; and no duplicate avatar is visible.
6. Switch back to **Load Reference Avatar**, then back to **Load Personalized Avaturn Avatar**, confirming only one avatar each time.
7. Do not select or play an animation as part of this Stage 1 check.
8. Select **Dispose Runtime** and confirm active sessions, RAF owners, listeners, timers, and canvases all return to zero.

The GLB structurally contains ten materials and 28 embedded JPEG/PNG textures. Successful GLTF loading proves those embedded resources decode without a loader-fatal material error, but only the manual check above can approve their rendered appearance, retained skin tone/color, illumination, and framing.

## Stage 2 boundary

Stage 2 may test `avaturn_animation` only against its native Avaturn rig. It must begin with explicit authorization and must not extract, trim, rename, or retarget the clip as part of this Stage 1 work.
