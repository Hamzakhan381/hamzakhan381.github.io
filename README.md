# Muhammad Hamza Khan — 3D Portfolio

A scroll-driven 3D portfolio. The page is one continuous camera flight: each section is a
"station" in a WebGL world, and scrolling flies the camera between them while the HTML content
animates in with CSS 3D transforms.

| Section  | 3D station                                   |
| -------- | -------------------------------------------- |
| Hero     | Noise-displaced holographic core + orbit rings |
| About    | Chrome torus knot with orbiting cubes         |
| Services | Portal of six iridescent shapes               |
| Projects | Hexagonal ring tunnel (live GitHub repos)     |
| Contact  | Point-cloud globe over a breathing wave grid  |

## Stack

- **React 19 + TypeScript**, built with **Vite**
- **three.js** via **@react-three/fiber** and **@react-three/drei**, with custom GLSL shaders
- **GSAP ScrollTrigger** for scrubbed 3D reveals, **Lenis** for smooth scrolling
- Tailwind CSS v4 (preflight only) + hand-written CSS

## Performance

- The whole 3D scene is lazy-loaded, so text and layout paint before three.js downloads.
- Adaptive pixel ratio (drops to 1x when frame rate dips), fewer particles and lower geometry detail on phones.
- Stations far from the camera are hidden; the tunnel is a single instanced draw call.
- Photo served as responsive WebP (36KB / 115KB instead of the 778KB JPG).
- Respects `prefers-reduced-motion`; falls back to a static gradient without WebGL2.

## Develop

```bash
npm install
npm run dev
```

`npm run build` outputs to `dist/`. Scene layout (positions, colors, counts) lives in
`src/three/layout.json`; scroll animation tuning lives in `src/lib/motion.json`; all text content
lives in `src/lib/content.ts`.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`.
In the repo settings, set **Pages → Source** to **GitHub Actions**.

The previous hand-written HTML/CSS/JS version is kept in `legacy/` for reference.
