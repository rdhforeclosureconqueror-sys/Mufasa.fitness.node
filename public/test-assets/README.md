# Local Avaturn test asset dropzone

This folder supports **local/dev-only avatar smoke checks**.

## Purpose

- `public/test-assets/avaturn-upload.glb`

The legacy root shell (`/workspace/Mufasa.fitness.node/index.html`) includes a **Use Uploaded GLB (Test)** shortcut that maps `avatarModelUrl` to `/test-assets/avaturn-upload.glb`.

## Active pilot shell note

The server serves `public/index.html` at `/`, and that shell uses the real upload contract:

- **Upload Avatar (.glb)**
- `POST /api/avatar/upload`
- persisted profile avatar metadata

For pilot validation, trust the real upload path above (not the legacy test shortcut).

## Verify file is served

- `http://localhost:3001/test-assets/avaturn-upload.glb`

If the file exists and static hosting is up, it should return `200`.
