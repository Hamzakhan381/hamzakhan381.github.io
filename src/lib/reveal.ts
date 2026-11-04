import { gsap } from 'gsap'
import { reduceMotion } from './scroll'
import motion from './motion.json'
import { DOUBLE } from './math'

const { perspective: PERSPECTIVE, scrub: SCRUB, depth: DEPTH, fly: FLY, swing: SWING, stair: STAIR, intro: INTRO } = motion
const { heroOut: HERO_OUT, exit: EXIT } = motion
const alternate = (i: number) => (i % DOUBLE ? 1 : -1)
const all = (root: HTMLElement, selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector))

const scrubbed = (trigger: Element, start: string, end: string) => ({ trigger, start, end, scrub: SCRUB })

/** Cards rise out of the depth of the screen, alternating their swing, scrubbed to scroll. */
export function flyIn(elements: Element[]) {
  if (reduceMotion) return
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
  if (reduceMotion) return

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

  // The page header tilts back and recedes into the scene as you scroll away from it, each title
  // line trailing the one above. Moving away from the viewer keeps text crisp (it only shrinks)
  // and the whole block travels together, so nothing piles up on the paragraph below.
  all(root, '.page-hero').forEach((hero) => {
    const leaving = () => ({ trigger: hero, start: 'top top', end: 'bottom top', scrub: HERO_OUT.scrub })
    gsap.to(hero, {
      y: HERO_OUT.y,
      z: HERO_OUT.z,
      rotateX: HERO_OUT.rotateX,
      opacity: 0,
      transformPerspective: PERSPECTIVE,
      transformOrigin: '50% 0%',
      ease: 'power1.in',
      scrollTrigger: leaving(),
    })
    all(hero, '.split-line').forEach((line, i) => {
      gsap.to(line, {
        z: -HERO_OUT.lineDepth * (i + 1),
        transformPerspective: PERSPECTIVE,
        ease: 'power1.in',
        scrollTrigger: leaving(),
      })
    })
  })

  // Cards tilt back into the screen as they leave the top, so the page scrolls like a turning drum.
  all(root, '[data-fly], [data-swing], [data-stair]').forEach((el) => {
    gsap.fromTo(
      el,
      { rotateX: 0, z: 0, opacity: 1 },
      {
        rotateX: EXIT.rotateX,
        z: EXIT.z,
        opacity: EXIT.opacity,
        transformPerspective: PERSPECTIVE,
        transformOrigin: '50% 100%',
        ease: 'none',
        immediateRender: false,
        scrollTrigger: scrubbed(el, 'bottom 32%', 'bottom -5%'),
      },
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
  if (reduceMotion) {
    gsap.set([...chars, ...rest], { opacity: 1 })
    return
  }
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
  all(root, '.split-line').forEach((line, i) => {
    tl.fromTo(
      line.querySelectorAll('.split-char'),
      // yPercent rather than an em offset: GSAP would measure a probe element per letter to convert em to px.
      { opacity: 0, rotateX: INTRO.charRotate, yPercent: INTRO.charLift, transformPerspective: PERSPECTIVE, transformOrigin: '50% 100%' },
      { opacity: 1, rotateX: 0, yPercent: 0, duration: INTRO.duration, stagger: INTRO.charStagger, clearProps: 'transform' },
      i * INTRO.lineDelay,
    )
  })
  tl.fromTo(
    rest,
    { opacity: 0, y: INTRO.fadeY },
    { opacity: 1, y: 0, duration: INTRO.duration, stagger: INTRO.fadeStagger, clearProps: 'transform' },
    INTRO.lineDelay,
  )
}
