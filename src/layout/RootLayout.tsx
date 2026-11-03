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
import { markAppLoaded } from '../lib/intro'
import { Nav } from '../components/Nav'
import { Footer } from '../components/Footer'
import { Loader } from '../components/Loader'
import { Cursor } from '../components/Cursor'

const Scene = lazy(() => import('../three/Scene'))

const READY_TIMEOUT_MS = 4000
const NOT_FOUND = { title: 'Page not found — Muhammad Hamza Khan', description: routes[0].description }

const hasWebGL = (() => {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
})()

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('3D scene disabled:', error)
    this.props.onError()
  }
  render() {
    return this.state.failed ? <div className="scene-fallback" aria-hidden="true" /> : this.props.children
  }
}

function usePageMeta(pathname: string) {
  useEffect(() => {
    const meta = routes.find((r) => r.path === pathname) ?? NOT_FOUND
    document.title = meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description)
  }, [pathname])
}

export function RootLayout() {
  const { pathname } = useLocation()
  const [ready, setReady] = useState(!hasWebGL)
  const markReady = useCallback(() => setReady(true), [])

  useEffect(() => initScroll(), [])
  useLayoutEffect(() => scrollToTop(), [pathname])
  usePageMeta(pathname)

  useEffect(() => {
    const timer = window.setTimeout(markReady, READY_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [markReady])

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
      {hasWebGL ? (
        <SceneBoundary onError={markReady}>
          <Suspense fallback={null}>
            <Scene pathname={pathname} onReady={markReady} />
          </Suspense>
        </SceneBoundary>
      ) : (
        <div className="scene-fallback" aria-hidden="true" />
      )}
      <div className="vignette" aria-hidden="true" />
      <Loader ready={ready} onDone={markAppLoaded} />
      <Cursor />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav />
      <ViewTransition default="page-swap">
        <main id="main">
          <Outlet />
          <Footer />
        </main>
      </ViewTransition>
    </>
  )
}
