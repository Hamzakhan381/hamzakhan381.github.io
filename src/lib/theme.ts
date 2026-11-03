import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'theme'
const listeners = new Set<() => void>()

function readInitial(): Theme {
  const preset = document.documentElement.dataset.theme
  return preset === 'light' ? 'light' : 'dark'
}

let current: Theme = readInitial()

export const getTheme = () => current

export function setTheme(next: Theme) {
  current = next
  document.documentElement.dataset.theme = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* storage blocked: the choice simply won't persist */
  }
  listeners.forEach((notify) => notify())
}

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
