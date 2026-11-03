import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useGSAP } from '@gsap/react'
import { initScroll } from './lib/scroll'
import { playIntro, setupScrollEffects } from './lib/effects'
import { Nav } from './components/Nav'
import { Loader } from './components/Loader'
import { Cursor } from './components/Cursor'
import { Hero } from './sections/Hero'
import { About } from './sections/About'
import { Services } from './sections/Services'
import { Projects } from './sections/Projects'
import { Contact } from './sections/Contact'

const Scene = lazy(() => import('./three/Scene'))

const READY_TIMEOUT_MS = 4000

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
    return this.state.failed ? null : this.props.children
  }
}

export default function App() {
  const root = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(!hasWebGL)
  const markReady = useCallback(() => setReady(true), [])

  useEffect(() => initScroll(), [])

  useEffect(() => {
    const timer = window.setTimeout(markReady, READY_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [markReady])

  useGSAP(() => setupScrollEffects(), { scope: root })

  const onLoaderDone = useCallback(() => {
    document.documentElement.classList.add('is-loaded')
    playIntro()
  }, [])

  return (
    <div ref={root}>
      {hasWebGL ? (
        <SceneBoundary onError={markReady}>
          <Suspense fallback={null}>
            <Scene onReady={markReady} />
          </Suspense>
        </SceneBoundary>
      ) : (
        <div className="scene-fallback" aria-hidden="true" />
      )}
      <div className="vignette" aria-hidden="true" />
      <Loader ready={ready} onDone={onLoaderDone} />
      <Cursor />
      <Nav />
      <main id="main">
        <Hero />
        <div className="flight-gap" aria-hidden="true" />
        <About />
        <div className="flight-gap" aria-hidden="true" />
        <Services />
        <div className="flight-gap" aria-hidden="true" />
        <Projects />
        <div className="flight-gap" aria-hidden="true" />
        <Contact />
      </main>
    </div>
  )
}

