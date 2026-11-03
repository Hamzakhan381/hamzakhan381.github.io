import { gsap } from 'gsap'
import { prefersReducedMotion } from './scroll'
import motion from './motion.json'
import { DOUBLE } from './math'

const { perspective: PERSPECTIVE, scrub: SCRUB, depth: DEPTH, fly: FLY, swing: SWING, stair: STAIR, intro: INTRO } = motion
const alternate = (i: number) => (i % DOUBLE ? 1 : -1)
const all = (root: HTMLElement, selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector))

const scrubbed = (trigger: Element, start: string, end: string) => ({ trigger, start, end, scrub: SCRUB })

/** Cards rise out of the depth of the screen, alternating their swing, scrubbed to scroll. */
export function flyIn(elements: Element[]) {
  if (prefersReducedMotion) return
  elements.forEach((el, i) => {
    gsap.fromTo(
      el,
      { opacity: 0, z: FLY.z, rotateX: FLY.rotateX, rotateY: alternate(i) * FLY.rotateY, y: FLY.y, transformPerspective: PERSPECTIVE },
      { opacity: 1, z: 0, rotateX: 0, rotateY: 0, y: 0, ease: 'power2.out', scrollTrigger: scrubbed(el, 'top 105%', 'top 70%') },
    )
  })
}

/** Wires every scroll-driven 3D reveal inside a page. Call inside a gsap context scoped to the page. */
export function setupReveals(root: HTMLElement) {
  if (prefersReducedMotion) return

  all(root, '[data-reveal]').forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, rotateX: DEPTH.rotateX, z: DEPTH.z, y: DEPTH.y, transformPerspective: PERSPECTIVE, transformOrigin: '50% 100%' },
      { opacity: 1, rotateX: 0, z: 0, y: 0, ease: 'power2.out', scrollTrigger: scrubbed(el, 'top 98%', 'top 72%') },
    )
  })

  flyIn(all(root, '[data-fly]'))

  all(root, '[data-swing]').forEach((el, i) => {
    const side = alternate(i)
    gsap.fromTo(
      el,
      { opacity: 0, rotateY: side * SWING.rotateY, z: SWING.z, x: side * SWING.x, transformPerspective: PERSPECTIVE },
      { opacity: 1, rotateY: 0, z: 0, x: 0, ease: 'power3.out', scrollTrigger: scrubbed(el, 'top 100%', 'top 62%') },
    )
  })

  all(root, '[data-stair]').forEach((el, i) => {
    gsap.fromTo(
      el,
      { opacity: 0, rotateX: STAIR.rotateX, z: STAIR.z * (i + 1), y: STAIR.y, transformPerspective: PERSPECTIVE, transformOrigin: '50% 0%' },
      { opacity: 1, rotateX: 0, z: 0, y: 0, ease: 'power3.out', scrollTrigger: scrubbed(el, 'top 100%', 'top 60%') },
    )
  })
}

/** Letter-by-letter 3D flip for a page title, then a fade-up for its supporting lines. */
export function playIntro(root: HTMLElement) {
  const chars = all(root, '.split-char')
  const rest = all(root, '[data-intro]')
  if (prefersReducedMotion) {
    gsap.set([...chars, ...rest], { opacity: 1 })
    return
  }
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
  all(root, '.split-line').forEach((line, i) => {
    tl.fromTo(
      line.querySelectorAll('.split-char'),
      { opacity: 0, rotateX: INTRO.charRotate, y: '0.5em', transformPerspective: PERSPECTIVE, transformOrigin: '50% 100%' },
      { opacity: 1, rotateX: 0, y: 0, duration: INTRO.duration, stagger: INTRO.charStagger },
      i * INTRO.lineDelay,
    )
  })
  tl.fromTo(rest, { opacity: 0, y: INTRO.fadeY }, { opacity: 1, y: 0, duration: INTRO.duration, stagger: INTRO.fadeStagger }, INTRO.lineDelay)
}
