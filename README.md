# Muhammad Hamza Khan — 3D Portfolio

A multi-page 3D portfolio in a monochrome theme with a sky-blue accent (dark and light modes).
One persistent particle sculpture (~18k GPU particles) morphs into a new shape on every page,
scatters when you scroll fast and pushes away from the cursor. Pages swap with 3D view transitions.

| Page     | Particle shape    | Page-specific 3D                         |
| -------- | ----------------- | ---------------------------------------- |
| Home     | Ringed planet     | 3D marquee ribbon, tilt cards            |
| About    | DNA helix         | Alternating 3D timeline, keycap skills   |
| Services | Cube cluster      | Flip cards, 3D process staircase         |
| Projects | Spiral galaxy     | Draggable cylinder carousel of live repos |
| CV       | Stack of papers   | Paper sheet that lands in 3D; prints clean |
| Contact  | The word HELLO    | Tilting form                             |

## Stack

- **React 19 + TypeScript**, built with **Vite**, routed with **React Router** and React's `<ViewTransition>`
- **three.js** via **@react-three/fiber** and **@react-three/drei**, with custom GLSL shaders
- **GSAP ScrollTrigger** for scrubbed 3D reveals, **Lenis** for smooth scrolling
- Tailwind CSS v4 (preflight only) + hand-written CSS

## Performance

- The whole 3D scene is lazy-loaded, so text and layout paint before three.js downloads.
- Adaptive pixel ratio (drops to 1x when frame rate dips), fewer particles and lower geometry detail on phones.
- The whole sculpture is one draw call; morphing runs entirely in the vertex shader.
- Every route is emitted as its own HTML file at build time, so deep links work on GitHub Pages.
- Photo served as responsive WebP (36KB / 115KB instead of the 778KB JPG).
- Respects `prefers-reduced-motion`; falls back to a static gradient without WebGL2.

## Develop

```bash
npm install
npm run dev
```

`npm run build` outputs to `dist/`. Particle shapes, per-page placement and colors live in
`src/three/scene.json`; scroll animation tuning lives in `src/lib/motion.json`; all text content
lives in `src/lib/content.ts`.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`.
In the repo settings, set **Pages → Source** to **GitHub Actions**.

The previous hand-written HTML/CSS/JS version is kept in `legacy/` for reference.
