# Phase 5 hardening PR summary

Independent review found four IK safety gaps: provisional Phase 3 segment lengths were treated as calibrated, coasted endpoints could drive IK, bend history survived contact release, and a low-confidence middle joint could seed a new bend direction when no trustworthy history existed.

The corrective branch requires calibrated structural samples, rejects coasted/dropped points, clears per-chain history when required contact disappears, and skips solving when no trustworthy bend hint exists. Regression coverage was added for all four cases.
