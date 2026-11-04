import { useSyncExternalStore } from 'react'

let loaded = false
let resolveLoaded: () => void = () => undefined
const listeners = new Set<() => void>()

/** Resolves once the boot intro has lifted, so first-page intros don't play hidden behind it. */
export const appLoaded = new Promise<void>((resolve) => {
  resolveLoaded = resolve
})

export const isAppLoaded = () => loaded

export function markAppLoaded() {
  if (loaded) return
  loaded = true
  document.documentElement.classList.add('is-loaded')
  resolveLoaded()
  listeners.forEach((notify) => notify())
}

/** False while the boot intro still covers the page; components use it to hold back work nobody can see yet. */
export const useAppLoaded = () =>
  useSyncExternalStore(
    (notify) => {
      listeners.add(notify)
      return () => {
        listeners.delete(notify)
      }
    },
    isAppLoaded,
  )
