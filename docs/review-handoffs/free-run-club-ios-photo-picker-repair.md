# Independent Review Handoff — Free Run Club iOS Photo Picker Repair

## User-observed failure
On iPhone Safari, the Phase 3 Run Club photo input launched the camera directly. The member could take a new photo but could not choose an existing photo from the library. The empty preview alt text was also visible before a photo had actually been selected.

## Root cause
`public/free-run-club.html` used `capture="environment"` on the image file input. On iOS Safari this biases/forces direct camera capture instead of presenting the normal source chooser.

## Repair
- Remove `capture="environment"`.
- Use `accept="image/*"` so iOS can offer Photo Library and camera choices.
- Hide the preview element completely until a real image has loaded.
- Set preview alt text only after successful selection.
- Accept iPhone image MIME types broadly and convert the selected image to bounded JPEG through the existing canvas resize path.
- Add explicit `Photo selected ✓ Ready to post.` status.
- Cache-bust the Run Club JS bundle.

## Required live acceptance on iPhone Safari
1. Open Free Run Club.
2. Tap Add a photo.
3. Confirm the system offers an existing-photo/library path as well as a take-photo path.
4. Select an existing photo. Confirm a visible preview and `Photo selected ✓ Ready to post.`
5. Cancel selection. Confirm no broken preview/alt text appears.
6. Take a new photo and confirm it previews too.
7. Post only after the backend Run Club APIs are available; if posting returns HTTP 404, treat that as the separate server-route hookup failure, not a picker failure.

## Verdict
Return exactly one of:
- APPROVE IOS PHOTO PICKER REPAIR
- CHANGES REQUIRED
