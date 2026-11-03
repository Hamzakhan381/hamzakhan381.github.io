import { useSyncExternalStore, type MouseEvent } from 'react'

/** Query parameter that deep-links to an open project, e.g. /projects?project=cashup */
export const PROJECT_PARAM = 'project'

/** Shareable address of a project's details; also what "open in new tab" uses. */
export const projectHref = (slug: string) => `/projects?${PROJECT_PARAM}=${encodeURIComponent(slug)}`

/** Click handler for a project link: a plain click opens the dialog in place, modified clicks keep link behaviour. */
export const openProjectLink = (slug: string) => (e: MouseEvent<HTMLElement>) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
  e.preventDefault()
  openProject(slug)
}

let current: string | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((notify) => notify())

/** Mirrors the open project into the address bar without a router navigation (so no page transition plays). */
function syncUrl() {
  const url = new URL(window.location.href)
  if (current) url.searchParams.set(PROJECT_PARAM, current)
  else url.searchParams.delete(PROJECT_PARAM)
  window.history.replaceState(window.history.state, '', url)
}

export function openProject(slug: string) {
  current = slug
  syncUrl()
  emit()
}

export function closeProject() {
  current = null
  syncUrl()
  emit()
}

/** Follows the address bar after a load or navigation: opens the project it names, or closes the dialog. */
export function openProjectFromUrl() {
  current = new URL(window.location.href).searchParams.get(PROJECT_PARAM)
  emit()
}

export const useOpenProjectSlug = () =>
  useSyncExternalStore(
    (notify) => {
      listeners.add(notify)
      return () => {
        listeners.delete(notify)
      }
    },
    () => current,
  )
