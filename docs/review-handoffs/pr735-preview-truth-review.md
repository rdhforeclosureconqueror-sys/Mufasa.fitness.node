# PR #735 review — exact phase authoring + preview truth

PR #735 correctly forces the active action to the selected Motion Spec phase timestamp before Pose Editor capture, but it replaces the Load Phase button to remove older listeners. That also removes the existing capture-phase single-phase preview-truth guard from PR #724.

Corrective requirement: after replacing the button, reinstall `PocketPTMotionLabPoseEditorPreviewGuard` on the replacement button. The guard must continue to run in capture phase before the exact-phase author's bubble listener. This preserves the contract that pending edits from one phase must be previewed/copied or reset before switching to another phase, while still allowing exact phase sampling when no conflicting pending edits exist.
