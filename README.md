# Galery App Photora

This repository contains two separate runnable projects:

- `web/` — the web version of the gallery app
- `app/` — a second app folder with the same app structure in a separate directory

## Run locally

Install dependencies from the root of the repository:

```bash
npm install
```

Start the web version:

```bash
npm run dev:web
```

Start the Expo app version:

```bash
npm run start:app
```

Build the web version:

```bash
npm run build:web
```

Build the app version:

```bash
npm run build:app
```

Build both versions:

```bash
npm run build:all
```

## Deployment

This repository includes a GitHub Actions workflow that builds both `app` and `web` and deploys them to GitHub Pages under the `gh-pages` branch.

After deployment, the apps will be available at:

- `https://michelle07-09.github.io/Galery_App_Photora/web/`
- `https://michelle07-09.github.io/Galery_App_Photora/app/`

If the workflow is active, pushing changes to `master` will automatically update the deployed pages.

## Notes

Each folder has its own Vite project configuration, so the app and web versions are kept separate while sharing the same gallery code.
