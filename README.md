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

Start the app version:

```bash
npm run dev:app
```

Build the web version:

```bash
npm run build:web
```

Build the app version:

```bash
npm run build:app
```

## Notes

Each folder has its own Vite project configuration, so the app and web versions are kept separate while sharing the same gallery code.
