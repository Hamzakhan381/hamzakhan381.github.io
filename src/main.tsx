import { StrictMode, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import 'lenis/dist/lenis.css'
import './styles.css'
import { RootLayout } from './layout/RootLayout'
import { appLoaded } from './lib/intro'

/** Without requestIdleCallback (older Safari), wait this long after the intro before fetching other pages. */
const PREFETCH_FALLBACK_MS = 1500

/**
 * Every page is its own chunk, so a visitor downloads and runs only the page they open. Each route's HTML
 * preloads its page chunk (see staticRoutes in vite.config.ts), so the first page arrives with the app.
 */
const pages = {
  home: () => import('./pages/Home'),
  about: () => import('./pages/About'),
  services: () => import('./pages/Services'),
  projects: () => import('./pages/Projects'),
  cv: () => import('./pages/CV'),
  contact: () => import('./pages/Contact'),
  notFound: () => import('./pages/NotFound'),
}

const lazyPage = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default })

// The boot intro in index.html covers the page while the first page chunk loads, so there is nothing to show here.
const NoFallback = () => null

const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    HydrateFallback: NoFallback,
    children: [
      { index: true, lazy: lazyPage(pages.home) },
      { path: 'about', lazy: lazyPage(pages.about) },
      { path: 'services', lazy: lazyPage(pages.services) },
      { path: 'projects', lazy: lazyPage(pages.projects) },
      { path: 'cv', lazy: lazyPage(pages.cv) },
      { path: 'contact', lazy: lazyPage(pages.contact) },
      { path: '*', lazy: lazyPage(pages.notFound) },
    ],
  },
])

// In production this bundle starts one frame after the HTML has painted (see paintBeforeApp in vite.config.ts),
// so the boot intro is already on screen when React's first render takes the main thread.
createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

/** Once the first page is up, fetch the rest in idle time so moving between pages never waits on the network. */
async function prefetchPages() {
  await appLoaded
  const fetchAll = () => Object.values(pages).forEach((load) => void load())
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fetchAll)
  else setTimeout(fetchAll, PREFETCH_FALLBACK_MS)
}
void prefetchPages()
