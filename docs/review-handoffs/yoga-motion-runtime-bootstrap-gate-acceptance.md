# Yoga Runtime Gate Acceptance Checklist

- Launch Beginner Full-Body Flow -> Mountain Pose -> Motion Animation with Motion Lab not manually initialized.
- Press Create Motion Draft once.
- Confirm the gate initializes the existing Motion Lab bootstrap path automatically.
- Confirm `PocketPTAvatarProfiles.profiles.personalized` resolves to `avaturn-personalized-candidate`.
- Confirm Coach Avatar changes from PENDING to PASS.
- Confirm Compile / bind runs only after runtime/profile readiness.
- Confirm Playable demo reaches PASS when compilation succeeds.
- Confirm no second renderer/session/bootstrap implementation is created.
- Inject/bootstrap a dependency failure and confirm the Yoga status reports bootstrap stage + code instead of `Coach profile unavailable`.
