import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import routes from './src/lib/routes.json'

const SITE = 'https://hamzakhan381.github.io'
const THREE_CHUNK_KB = 1100
const BACKGROUND_TAB_START_MS = 200
const NODE_MODULES = '/node_modules/'
const PAGES_DIR = '/src/pages/'
const NOT_FOUND_PAGE = 'NotFound'

/**
 * Libraries get chunks of their own: they change far less often than the site, so a redeploy doesn't make
 * returning visitors download them again. three.js and React Three Fiber are only reached through the lazy 3D scene.
 */
const VENDOR_CHUNKS: Record<string, string[]> = {
  'vendor-react': ['react', 'react-dom', 'react-router', 'scheduler', 'cookie', 'set-cookie-parser'],
  'vendor-motion': ['gsap', 'lenis'],
  'vendor-three': ['three', 'three-stdlib', '@react-three/fiber', '@react-three/drei'],
}

/** `.../node_modules/@scope/pkg/x.js` → `@scope/pkg`, `.../node_modules/pkg/x.js` → `pkg`. */
function packageOf(id: string) {
  const path = id.replaceAll('\\', '/')
  const at = path.lastIndexOf(NODE_MODULES)
  if (at < 0) return undefined
  const [first, second] = path.slice(at + NODE_MODULES.length).split('/')
  return first.startsWith('@') ? `${first}/${second}` : first
}

function vendorChunkFor(id: string) {
  // Stylesheets stay in the one CSS bundle; GSAP's Flip is only used by the Projects filter, so it stays with that page.
  if (id.endsWith('.css') || id.includes('/gsap/Flip')) return null
  const pkg = packageOf(id)
  const group = pkg ? Object.entries(VENDOR_CHUNKS).find(([, packages]) => packages.includes(pkg)) : undefined
  return group ? group[0] : null
}

/** `.../src/pages/About.tsx` → `About`. */
function pageNameOf(id: string | null) {
  const path = id?.replaceAll('\\', '/') ?? ''
  if (!path.includes(PAGES_DIR)) return undefined
  return path.slice(path.lastIndexOf('/') + 1).split('.')[0]
}

/**
 * GitHub Pages has no SPA fallback, so emit a copy of index.html at every route
 * (with that route's title, description and canonical URL) plus 404.html for unknown paths.
 * Each copy also preloads its own page's chunk, so splitting pages costs no extra round trip on first load.
 */
function staticRoutes(): Plugin {
  let outDir = 'dist'
  let base = '/'
  /** Files to preload for each page (its chunk and shared chunks the entry doesn't already preload). */
  const pageFiles = new Map<string, string[]>()
  return {
    name: 'static-routes',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
      base = config.base
    },
    generateBundle(_, bundle) {
      const chunks = Object.values(bundle).flatMap((file) => (file.type === 'chunk' ? [file] : []))
      const entry = chunks.find((chunk) => chunk.isEntry)
      const preloaded = new Set([entry?.fileName, ...(entry?.imports ?? [])])
      chunks.forEach((chunk) => {
        const page = pageNameOf(chunk.facadeModuleId)
        if (!page || !chunk.isDynamicEntry) return
        pageFiles.set(
          page,
          [chunk.fileName, ...chunk.imports].filter((file) => !preloaded.has(file)),
        )
      })
    },
    async closeBundle() {
      const shell = await readFile(join(outDir, 'index.html'), 'utf8')
      const home = routes[0]
      const withPreloads = (html: string, page: string) => {
        const links = (pageFiles.get(page) ?? []).map((file) => `<link rel="modulepreload" crossorigin href="${base}${file}" />`)
        return html.replace('</head>', `  ${links.join('\n    ')}\n  </head>`)
      }
      const pageFor = (route: (typeof routes)[number]) => {
        const url = route.path === home.path ? `${SITE}/` : `${SITE}${route.path}/`
        return withPreloads(
          shell
            .replaceAll(home.title, route.title)
            .replaceAll(home.description, route.description)
            .replace(`<link rel="canonical" href="${SITE}/" />`, `<link rel="canonical" href="${url}" />`)
            .replace(`<meta property="og:url" content="${SITE}/" />`, `<meta property="og:url" content="${url}" />`),
          route.label,
        )
      }
      await Promise.all(
        routes.map(async (route) => {
          const dir = join(outDir, route.path)
          await mkdir(dir, { recursive: true })
          await writeFile(join(dir, 'index.html'), pageFor(route))
        }),
      )
      await writeFile(join(outDir, '404.html'), withPreloads(shell, NOT_FOUND_PAGE))
    },
  }
}

/**
 * A `type="module"` script that has already downloaded runs before the browser draws its first frame, so the boot
 * intro in index.html would only appear once the whole bundle had been evaluated (~0.5 s on a laptop, ~2 s on a
 * slow phone). Instead: fetch the bundle right away through modulepreload, and start it one frame after the HTML
 * has been painted.
 */
function paintBeforeApp(): Plugin {
  return {
    name: 'paint-before-app',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // Vite's entry tag looks like <script type="module" crossorigin src="/assets/index-Ab12Cd.js"></script>
        const open = '<script type="module" crossorigin src="'
        const from = html.indexOf(open)
        if (from < 0) return html
        const srcEnd = html.indexOf('"', from + open.length)
        const src = html.slice(from + open.length, srcEnd)
        const tagEnd = html.indexOf('</script>', srcEnd) + '</script>'.length
        const entry = html.slice(from, tagEnd)
        const loader = `<script>
      (function () {
        var started = false;
        function start() {
          if (started) return;
          started = true;
          var script = document.createElement('script');
          script.type = 'module';
          script.crossOrigin = '';
          script.src = '${src}';
          document.body.appendChild(script);
        }
        requestAnimationFrame(function () { setTimeout(start); });
        setTimeout(start, ${BACKGROUND_TAB_START_MS}); // background tabs draw no frames
      })();
    </script>
  </body>`
        return html.replace(entry, `<link rel="modulepreload" crossorigin href="${src}" />`).replace('</body>', loader)
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), staticRoutes(), paintBeforeApp()],
  build: {
    target: 'es2022',
    // three.js lives in the lazily-loaded 3D chunks; it is large by nature.
    chunkSizeWarningLimit: THREE_CHUNK_KB,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: vendorChunkFor }],
        },
      },
    },
  },
})
