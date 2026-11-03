import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import routes from './src/lib/routes.json'

const SITE = 'https://hamzakhan381.github.io'
const THREE_CHUNK_KB = 1100

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

export default defineConfig({
  plugins: [react(), tailwindcss(), staticRoutes()],
  build: {
    target: 'es2022',
    // three.js lives in the lazily-loaded Scene chunk; it is large by nature.
    chunkSizeWarningLimit: THREE_CHUNK_KB,
  },
})
