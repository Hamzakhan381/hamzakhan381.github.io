import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import routes from './src/lib/routes.json'

const SITE = 'https://hamzakhan381.github.io'
const THREE_CHUNK_KB = 1100
const BACKGROUND_TAB_START_MS = 200

/**
 * GitHub Pages has no SPA fallback, so emit a copy of index.html at every route
 * (with that route's title, description and canonical URL) plus 404.html for unknown paths.
 */
function staticRoutes(): Plugin {
  let outDir = 'dist'
  return {
    name: 'static-routes',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    async closeBundle() {
      const shell = await readFile(join(outDir, 'index.html'), 'utf8')
      const home = routes[0]
      const pageFor = (route: (typeof routes)[number]) =>
        shell
          .replaceAll(home.title, route.title)
          .replaceAll(home.description, route.description)
          .replace(`<link rel="canonical" href="${SITE}/" />`, `<link rel="canonical" href="${SITE}${route.path}/" />`)
          .replace(`<meta property="og:url" content="${SITE}/" />`, `<meta property="og:url" content="${SITE}${route.path}/" />`)
      await Promise.all(
        routes
          .filter((route) => route.path !== '/')
          .map(async (route) => {
            const dir = join(outDir, route.path)
            await mkdir(dir, { recursive: true })
            await writeFile(join(dir, 'index.html'), pageFor(route))
          }),
      )
      await writeFile(join(outDir, '404.html'), shell)
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
    // three.js lives in the lazily-loaded Scene chunk; it is large by nature.
    chunkSizeWarningLimit: THREE_CHUNK_KB,
  },
})
