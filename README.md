# Muhammad Hamza Khan — 3D Portfolio

A multi-page 3D portfolio for a software engineer, in a monochrome theme with a sky-blue accent
(dark and light modes). Each page has its own engineering-themed 3D scene driven by scroll, and
floating code glyphs drift behind every page.

| Page     | 3D scene (scroll-driven)                                         | Page widgets |
| -------- | ---------------------------------------------------------------- | ------------ |
| Home     | Architecture stack explodes into 5 layers; packets flow through; the centred layer card lights its slab | Terminal that types as you scroll, draggable tech sphere, counters |
| About    | Git graph that draws each career branch as you scroll           | profile.ts code window, git-log timeline, skill bars, keycap tools |
| Services | Server rack; each service's unit slides out when it's centred   | Process staircase, engagement cards, FAQ |
| Projects | Live service-mesh network with hopping packets                  | Z-depth featured gallery, FLIP-animated filters, live GitHub ring |
| CV       | Floating editor windows                                          | Printable paper CV that lands in 3D |
| Contact  | Cel-shaded cartoon developer at a desk who follows the cursor, waves, types along with the form and cheers when it's sent | Validated form, copy-email, availability card |

Site-wide: scroll-speed camera warp, code glyphs that fly toward you, page titles that break apart on scroll,
cards that tilt back as they leave, a ⌘K / Ctrl+K command palette, auto-hiding nav and a back-to-top progress ring.

All content is in `src/content/*.json`; see [src/content/README.md](src/content/README.md).

## Stack

- **React 19 + TypeScript**, built with **Vite**, routed with **React Router** and React's `<ViewTransition>`
- **three.js** via **@react-three/fiber** and **@react-three/drei**
- **GSAP ScrollTrigger** for scrubbed 3D reveals, **Lenis** for smooth scrolling
- Tailwind CSS v4 (preflight only) + hand-written CSS

## Performance

- The whole 3D scene is lazy-loaded, so text and layout paint before three.js downloads.
- Adaptive pixel ratio (drops to 1x when frame rate dips), fewer particles and lower geometry detail on phones.
- Only the current page's 3D scene is mounted; packets and nodes use instanced meshes.
- Every route is emitted as its own HTML file at build time, so deep links work on GitHub Pages.
- Photo served as responsive WebP (36KB / 115KB instead of the 778KB JPG).
- Respects `prefers-reduced-motion`; falls back to a static gradient without WebGL2.

## Develop

```bash
npm install
npm run dev
```

`npm run build` outputs to `dist/`. 3D scene placement, sizes and colours live in `src/three/scene.json`; scroll animation tuning lives
in `src/lib/motion.json`; all text content lives in `src/content/`.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`.
In the repo settings, set **Pages → Source** to **GitHub Actions**.

The previous hand-written HTML/CSS/JS version is kept in `legacy/` for reference.
