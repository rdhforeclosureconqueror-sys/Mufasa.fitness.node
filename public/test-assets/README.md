# Local Avaturn test asset dropzone

Place the uploaded Avaturn export from this task here as:

- `public/test-assets/avaturn-upload.glb`

The app's **Use Uploaded GLB (Test)** action maps avatarModelUrl to `/test-assets/avaturn-upload.glb` for local/dev validation.

Expected live served URL after placement:

- `http://localhost:3001/test-assets/avaturn-upload.glb`

Quick verification flow after placing the file:

1. Open the app and sign in.
2. Click **🧍 Create Avatar**.
3. Click **Use Uploaded GLB (Test)**.
4. Click **Save Avatar**.
5. Confirm UI status shows:
   - `Avatar metadata saved (...)`
   - `Avatar asset found (...)`
