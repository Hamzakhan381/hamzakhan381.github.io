import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'theme'
/** Page colours, mirrored into <meta name="theme-color"> so the phone browser bar matches. */
const BROWSER_BAR: Record<Theme, string> = { dark: '#050607', light: '#f4f5f7' }
const listeners = new Set<() => void>()

function readInitial(): Theme {
  const preset = document.documentElement.dataset.theme
  return preset === 'light' ? 'light' : 'dark'
}

function hasSavedChoice() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

const paintBrowserBar = (theme: Theme) =>
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BROWSER_BAR[theme])

let current: Theme = readInitial()
paintBrowserBar(current)

export const getTheme = () => current

/** `remember: false` applies a theme without saving it, e.g. when following the system setting. */
export function setTheme(next: Theme, remember = true) {
  current = next
  document.documentElement.dataset.theme = next
  paintBrowserBar(next)
  if (remember) {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage blocked: the choice simply won't persist */
    }
  }
  listeners.forEach((notify) => notify())
}

// Until the visitor picks a theme themselves, follow the operating system live.
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
  if (!hasSavedChoice()) setTheme(e.matches ? 'light' : 'dark', false)
})

export function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useTheme = () => useSyncExternalStore(subscribeTheme, getTheme)

type ViewTransitionDoc = Document & { startViewTransition?: (update: () => void) => unknown }

/** Swaps the theme with a circular reveal that grows from (x, y) where the browser supports it. */
export function toggleTheme(x: number, y: number) {
  const next: Theme = current === 'dark' ? 'light' : 'dark'
  const doc = document as ViewTransitionDoc
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!doc.startViewTransition || reduced) {
    setTheme(next)
    return
  }
  const root = document.documentElement
  root.style.setProperty('--reveal-x', `${x}px`)
  root.style.setProperty('--reveal-y', `${y}px`)
  root.classList.add('theme-switching')
  const transition = doc.startViewTransition(() => setTheme(next)) as { finished: Promise<void> }
  const cleanup = async () => {
    try {
      await transition.finished
    } finally {
      root.classList.remove('theme-switching')
    }
  }
  void cleanup()
}
