import { useSyncExternalStore } from 'react'

export type Toast = { id: number; text: string; tone: 'ok' | 'error' }

const TOAST_MS = 3200
let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((notify) => notify())

/** Shows a short message in the corner; it dismisses itself. */
export function toast(text: string, tone: Toast['tone'] = 'ok') {
  const id = nextId
  nextId += 1
  toasts = [...toasts, { id, text, tone }]
  emit()
  window.setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, TOAST_MS)
}

export function useToasts() {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify)
      return () => {
        listeners.delete(notify)
      }
    },
    () => toasts,
  )
}

export async function copyText(text: string, success: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast(success)
  } catch {
    toast(`Couldn't copy automatically. It's ${text}`, 'error')
  }
}
