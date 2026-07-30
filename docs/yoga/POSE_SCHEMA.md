# Yoga pose schema v1

`data/yoga/poses.v1.json` is the published, versioned source of pose truth. Required fields cover stable identity, member copy, category/difficulty, required MoveNet landmarks and confidence, hold and stable-frame gates, orientation, angle rules, structured faults/cues, safety notes, prerequisite edges, regressions/progressions, scoring weights, evidence requirements, and content version. Rules use undirected 2-D joint relationships (0–180°), not body shape or clinical norms. Changes require fixture tests, content-version increment, movement-professional review, and rollback retention of the prior file.

The canonical packet contains `name`, `index`, normalized `x/y`, optional `z`, `confidence`, optional `visibility`, timestamp, detector identifier, and normalization metadata. Raw frames are never part of the server contract.
