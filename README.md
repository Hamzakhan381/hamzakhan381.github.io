# Muhammad Hamza Khan — 3D Portfolio

A multi-page 3D portfolio for a software engineer, in a monochrome theme with a sky-blue accent
(dark and light modes). Each page has its own engineering-themed 3D scene driven by scroll, and
floating code glyphs drift behind every page.

| Page     | 3D scene (scroll-driven)                                         | Page widgets |
| -------- | ---------------------------------------------------------------- | ------------ |
| Home     | Architecture stack explodes into 5 layers; packets flow through; click a slab to jump to its card | Terminal that types as you scroll, then takes real commands (`help`, `projects`, `open cashup`, `sudo hire hamza`…); draggable tech sphere, counters |
| About    | Git graph that draws each career branch as you scroll; click a branch label to jump to that job | profile.ts code window, git-log timeline, skill bars, keycap tools |
| Services | Server rack; each service's unit slides out when it's centred or hovered; click to jump to it | Process staircase, engagement cards, FAQ |
| Projects | Live service-mesh network with hopping packets                  | Z-depth featured gallery, FLIP-animated filters, live GitHub ring, case-study dialog |
| CV       | Floating editor windows                                          | Printable paper CV that lands in 3D |
| Contact  | Cel-shaded cartoon developer at a desk who follows the cursor, waves, types along with the form and cheers when it's sent; poke him or the rubber duck | Validated form, copy-email, availability card |

Site-wide: scroll-speed camera warp, code glyphs that fly toward you, page headers that recede into depth on scroll,
cards that tilt back as they leave, a ⌘K / Ctrl+K command palette (pages, projects, theme, lite mode), auto-hiding nav,
a back-to-top progress ring, an "on this page" section rail on wide screens, pointer parallax on page titles, a cursor
spotlight on the dot grid, and a 3D contact cube in the footer.

Every project has a case-study dialog with a shareable link (`/projects?project=cashup`); ← → step through them.
The terminal's commands live in `src/lib/shell.ts` and read from the same JSON content as the pages.

All content is in `src/content/*.json`; see [src/content/README.md](src/content/README.md).

## Stack

- **React 19 + TypeScript**, built with **Vite**, routed with **React Router** and React's `<ViewTransition>`
- **three.js** via **@react-three/fiber** and **@react-three/drei**
- **GSAP ScrollTrigger** for scrubbed 3D reveals, **Lenis** for smooth scrolling
- Tailwind CSS v4 (preflight only) + hand-written CSS

## Performance

- The whole 3D scene is lazy-loaded, so text and layout paint before three.js downloads.
- Device tiers (`src/lib/quality.ts`): high, medium and low, picked from CPU cores, memory, pointer type and the GPU
  renderer. Low-tier devices skip WebGL and smooth scrolling entirely; the tier also steps down at runtime when the
  frame rate stays low. Visitors can force it with "lite mode" in the command palette or `?quality=low`.
- Adaptive pixel ratio (drops to 1x when frame rate dips), fewer glyphs and no antialiasing on the medium tier.
- Only the current page's 3D scene is mounted; packets, nodes and code glyphs use instanced meshes (one draw call each).
- The 3D scene stops rendering while an overlay (menu, command palette, project dialog) covers it.
- No per-frame layout reads in scroll handlers, and no backdrop blur over the live canvas on phones and modest GPUs.
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
