## Motion Lab Gym Compatibility v2

Replaces superseded #776 with a current-main, additive architecture. The canonical Motion Lab bootstrap remains untouched. A feature entry module and integration orchestrator wait for runtime readiness, load personalized-avatar compatibility -> mapping controller -> panel in strict order, verify each authority, verify rendered UI, and publish FIRST FAILURE diagnostics.

This architecture slice preserves #779 Thriller work and all current Motion Lab lifecycle owners. It does not autoplay animations or touch Godot/GO_TO_MAT/MoveNet/reps/timer/leaderboard.

Live page activation is intentionally a separate one-line checkpoint after architecture review; do not claim the panel is live from this PR alone.
