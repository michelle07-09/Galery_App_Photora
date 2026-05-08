# Galery App Photora

A lightweight React gallery app with image upload, albums, favorites, and browser storage persistence.

## What changed
- Fixed the add button so the visible `+` symbol appears even when icon fonts are not loaded.
- Added a browser storage fallback using `localStorage` so the app runs in a normal web browser.
- Configured a Vite React project scaffold for easy local development.

## Run locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open the URL shown in the terminal, typically `http://localhost:5173`.

## Notes
- The app uses `localStorage` as a fallback if `window.storage` is not available.
- If you want to publish this repository on GitHub, initialize git, add a remote, and push your branch.
