# Gym Compatibility v2

Canonical runtime stays canonical. Personalized-avatar compatibility is an additive feature module.

**Runtime:** existing `motion-lab-bootstrap.js`

**Feature entry:** `motion-lab-gym-compatibility-entry.js`

**Feature orchestrator:** `motion-lab-gym-compatibility-integration.js`

**Compatibility authority:** `/motion/personal-avatar-compatibility.js`

**Mapping/profile controller:** `/motion/motion-lab-gym-compatibility.js`

**Owner/test UI:** `/dev/motion-lab-gym-compatibility-panel.js`

This separation prevents future Motion Lab additions (Thriller, exercise specs, authoring tools) from being lost when gym compatibility evolves.
