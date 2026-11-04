import {
  Component,
  Suspense,
  ViewTransition,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react'
import { Outlet, useLocation } from 'react-router'
import { gsap } from 'gsap'
import routes from '../lib/routes.json'
import { initScroll, scrollToTop } from '../lib/scroll'
import { appLoaded, markAppLoaded, useAppLoaded } from '../lib/intro'
import { openProjectFromUrl } from '../lib/projectDialog'
import { useQuality } from '../lib/quality'
import { normalizePath } from '../lib/paths'
import { Nav } from '../components/Nav'
import { Footer } from '../components/Footer'
import { BootScreen } from '../components/BootScreen'
import { Cursor } from '../components/Cursor'
import { CommandPalette } from '../components/CommandPalette'
import { ProjectDialog } from '../components/ProjectDialog'
import { SectionRail } from '../components/SectionRail'
import { ToTop } from '../components/ToTop'
import { Toaster } from '../components/Toaster'

const Scene = lazy(() => import('../three/Scene'))

/** Read by the inline script in index.html, which decides whether the boot intro plays (first visit of a session). */
const SEEN_KEY = 'hk-visited'

function rememberVisit() {
  try {
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* storage blocked: the intro simply plays again next time */
  }
}

/** True when index.html is showing the boot intro, i.e. it decided this is the first visit of the session. */
const bootShowing = () => document.documentElement.classList.contains('boot')

const NOT_FOUND = { title: 'Page not found — Muhammad Hamza Khan', description: routes[0].description }

const hasWebGL = (() => {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
})()

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('3D scene disabled:', error)
  }
  render() {
    return this.state.failed ? <div className="scene-fallback" aria-hidden="true" /> : this.props.children
  }
}

function usePageMeta(pathname: string) {
  useEffect(() => {
    const meta = routes.find((r) => r.path === normalizePath(pathname)) ?? NOT_FOUND
    document.title = meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description)
  }, [pathname])
}

/**
 * Page transitions switch on once the app has loaded. Before that they would only snapshot a page nobody sees yet
 * (costly while booting), and the snapshots are drawn above everything, including the boot intro. Its own component
 * so the switch re-renders just this boundary, not the page inside it.
 */
function PageTransitions({ children }: { children: ReactNode }) {
  const loaded = useAppLoaded()
  return <ViewTransition default={loaded ? 'page-swap' : 'none'}>{children}</ViewTransition>
}

/** Opens the project named in `?project=` once the intro has lifted, and again after every navigation. */
function useProjectDeepLink(pathname: string, search: string) {
  useEffect(() => {
    let cancelled = false
    const sync = async () => {
      await appLoaded
      if (!cancelled) openProjectFromUrl()
    }
    void sync()
    return () => {
      cancelled = true
    }
  }, [pathname, search])
}

export function RootLayout() {
  const { pathname, search } = useLocation()
  const quality = useQuality()
  // Low-tier devices skip the WebGL scene entirely; the CSS backdrop stands in for it.
  const show3D = hasWebGL && quality !== 'low'
  const [showBoot] = useState(bootShowing)
  const onBootDone = useCallback(() => {
    rememberVisit()
    markAppLoaded()
  }, [])


  // No intro this time (repeat visit or reduced motion): drop its markup and play the page intro straight away.
  useLayoutEffect(() => {
    if (showBoot) return
    document.getElementById('boot')?.remove()
    markAppLoaded()
  }, [showBoot])

  useEffect(() => initScroll(), [])
  useLayoutEffect(() => scrollToTop(), [pathname])
  usePageMeta(pathname)
  useProjectDeepLink(pathname, search)

  useEffect(() => {
    const bar = gsap.to('.scroll-progress', {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: true },
    })
    return () => {
      bar.scrollTrigger?.kill()
      bar.kill()
    }
  }, [pathname])

  return (
    <>
      <div className="backdrop" aria-hidden="true" />
      {show3D ? (
        <SceneBoundary>
          <Suspense fallback={null}>
            <Scene pathname={pathname} />
          </Suspense>
        </SceneBoundary>
      ) : null}
      <div className="vignette" aria-hidden="true" />
      {showBoot ? <BootScreen onDone={onBootDone} /> : null}
      <Cursor />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav />
      <SectionRail />
      <PageTransitions>
        <main id="main">
          <Outlet />
          <Footer />
        </main>
      </PageTransitions>
      <ToTop />
      <CommandPalette />
      <ProjectDialog />
      <Toaster />
    </>
  )
}
