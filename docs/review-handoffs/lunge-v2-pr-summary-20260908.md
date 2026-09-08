# Lunge v2 PR summary

Owner request: replace frame-by-frame corrective sculpting with a movement definition that starts from neutral standing, steps into a proper left-forward lunge stance, drives the rear knee primarily straight down while the front knee approaches 90 degrees, repeats the planted down/up motion three times, and steps back to standing.

Implementation uses existing Motion Spec, phase contacts, generated two-bone IK, rest-relative transforms, and Motion Lab runtime. No duplicate solver or playback path is introduced.
