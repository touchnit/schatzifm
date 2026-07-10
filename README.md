# schatzi.fm

Interactive 3D showcase built with Three.js, deployable to GitHub Pages.

## Features

- GLB model in the center of the page with subtle mouse-follow
- Click the model to spawn hearts, play a random sound, and show a random YouTube embed
- GitHub Actions workflow for automatic deployment

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Customize

1. Replace `public/model.glb` with your own model
2. Add sound files to `public/sounds/` and update `src/config.js`
3. Add your YouTube playlist video IDs to `src/config.js`

## Deploy to GitHub Pages

1. Create a GitHub repo named `schatzifm`
2. Push this project to `main`
3. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**
4. The site will be live at `https://<username>.github.io/schatzifm/`

If your repo name differs, update `base` in `vite.config.js` to match.

## Build

```bash
npm run build
npm run preview
```
