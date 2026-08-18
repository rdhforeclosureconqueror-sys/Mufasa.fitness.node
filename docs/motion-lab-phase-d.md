# Phase D Motion Lab

PocketPT uses the existing `OPS_READ_OBSERVABILITY` administrative permission because it is the established authorization boundary for internal diagnostic operations. The `/dev/motion-lab` shell and every lab-only script/style are intercepted before static hosting and require both `ENABLE_MOTION_LAB=true` and that permission. A disabled flag deliberately returns 404. Production therefore defaults closed, while an explicitly configured development pilot bypass or an authorized request can enter the lab.

The flag is independent of the avatar/member-facing feature. There is no navigation link. The dependency direction is Motion Lab bootstrap → `MotionViewerBoundary` → lab adapter → `DisposableMotionSession` → local Three.js. Core shells and boot modules do not import the lab.

The page is a static status shell: opening it creates no renderer. Initialization lazy-loads the boundary and lab runtime; a separate Start Session action creates the primitive Phase C scene. Owned-resource counts come from `DisposableMotionSession` instrumentation. Future asset stages remain `NOT RUN`; Phase D loads no assets.
