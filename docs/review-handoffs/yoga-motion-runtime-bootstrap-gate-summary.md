# Review Summary

Observed first failure: Coach Avatar unavailable after Mountain Motion Spec generation.

Root cause: Yoga draft creation could run before Motion Lab bootstrap had loaded `MotionLabRuntime` and `PocketPTAvatarProfiles`.

Fix: capture Create Motion Draft, initialize the existing Motion Lab runtime if needed, wait for runtime + personalized Coach profile readiness, then replay the original draft action. Bootstrap failures surface their own stage/code.
