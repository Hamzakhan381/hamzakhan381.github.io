let loaded = false
let resolveLoaded: () => void = () => undefined

/** Resolves once the loading veil has lifted, so first-page intros don't play hidden behind it. */
export const appLoaded = new Promise<void>((resolve) => {
  resolveLoaded = resolve
})

export const isAppLoaded = () => loaded

export function markAppLoaded() {
  loaded = true
  document.documentElement.classList.add('is-loaded')
  resolveLoaded()
}
