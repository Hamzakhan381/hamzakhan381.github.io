import { MS_PER_SECOND } from './math'

/**
 * What the visitor is doing on the contact form, read every frame by the 3D developer
 * so he can glance at the form, type faster while they type, and celebrate when they send.
 * Times are in seconds from `now()`.
 */
export const deskMood = {
  typedAt: Number.NEGATIVE_INFINITY,
  sentAt: Number.NEGATIVE_INFINITY,
  focused: false,
}

export const now = () => performance.now() / MS_PER_SECOND
