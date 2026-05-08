# Galery App Photora

This repository contains two separate runnable projects:

- `web/` — the browser gallery app built with Vite
- `app/` — the Expo mobile gallery app with a phone-style launcher and camera capture

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

## Deployment

This repository includes a GitHub Actions workflow that builds both `app` and `web` and deploys them to GitHub Pages under the `gh-pages` branch.

After deployment, the web version will be available at:

- `https://michelle07-09.github.io/Galery_App_Photora/web/`

If the workflow is active, pushing changes to `master` will automatically update the deployed page.

## Notes

- The `web/` folder is the browser version and is available on GitHub Pages.
- The `app/` folder is an Expo mobile app designed to run locally via Expo Go on a phone or simulator.

Each folder has its own Vite project configuration, so the app and web versions are kept separate while sharing the same gallery code.
