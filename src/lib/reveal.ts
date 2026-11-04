import { gsap } from 'gsap'
import { reduceMotion } from './scroll'
import motion from './motion.json'
import { DOUBLE } from './math'

const { perspective: PERSPECTIVE, scrub: SCRUB, depth: DEPTH, fly: FLY, swing: SWING, stair: STAIR, intro: INTRO } = motion
const { heroOut: HERO_OUT, exit: EXIT } = motion
const alternate = (i: number) => (i % DOUBLE ? 1 : -1)
const all = (root: HTMLElement, selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector))

const scrubbed = (trigger: Element, start: string, end: string) => ({ trigger, start, end, scrub: SCRUB })

/**
 * Reads the current transform of every element before any tween writes one. GSAP caches what it reads, so the tweens
 * created next never make the browser recalculate styles halfway through: one recalculation in total instead of one
 * per element, which on a long page was most of the cost of opening it.
 */
export function primeTransforms(elements: Element[]) {
  elements.forEach((el) => gsap.getProperty(el, 'x'))
  // Reading a transform makes GSAP fold any CSS `rotate` into its own and pin `rotate: none` inline. The cards' hover
  // tilt lives in `rotate` (see .tilt), so hand it back to the stylesheet: from here on GSAP only writes `transform`.
  elements.forEach((el) => {
    if (el instanceof HTMLElement) el.style.removeProperty('rotate')
  })
}

/**
 * Puts freshly made reveals in their starting (hidden) state, all in one go. The reveals are created with
 * `immediateRender: false`, so creating them only reads the page: each one writing its hidden state as it was
 * created made the next one's scroll trigger re-measure the whole page, dozens of times while a page opened.
 */
function startHidden(tweens: gsap.core.Tween[]) {
  tweens.forEach((tween) => tween.render(0, true, true))
}

const flyTweens = (elements: Element[]) =>
  elements.map((el, i) =>
    gsap.fromTo(
      el,
      { opacity: 0, z: FLY.z, rotateX: FLY.rotateX, rotateY: alternate(i) * FLY.rotateY, y: FLY.y, transformPerspective: PERSPECTIVE },
      { opacity: 1, z: 0, rotateX: 0, rotateY: 0, y: 0, ease: 'power2.out', immediateRender: false, scrollTrigger: scrubbed(el, 'top 105%', 'top 70%') },
    ),
  )

/** Cards rise out of the depth of the screen, alternating their swing, scrubbed to scroll. */
export function flyIn(elements: Element[]) {
  if (reduceMotion) return
  primeTransforms(elements)
  startHidden(flyTweens(elements))
}

/** Wires every scroll-driven 3D reveal inside a page. Call inside a gsap context scoped to the page. */
export function setupReveals(root: HTMLElement) {
  if (reduceMotion) return
  primeTransforms(all(root, '[data-reveal], [data-fly], [data-swing], [data-stair], .page-hero, .page-hero .split-line'))

  const reveals = all(root, '[data-reveal]').map((el) =>
    gsap.fromTo(
      el,
      { opacity: 0, rotateX: DEPTH.rotateX, z: DEPTH.z, y: DEPTH.y, transformPerspective: PERSPECTIVE, transformOrigin: '50% 100%' },
      { opacity: 1, rotateX: 0, z: 0, y: 0, ease: 'power2.out', immediateRender: false, scrollTrigger: scrubbed(el, 'top 98%', 'top 72%') },
    ),
  )

  const flies = flyTweens(all(root, '[data-fly]'))

  const swings = all(root, '[data-swing]').map((el, i) => {
    const side = alternate(i)
    return gsap.fromTo(
      el,
      { opacity: 0, rotateY: side * SWING.rotateY, z: SWING.z, x: side * SWING.x, transformPerspective: PERSPECTIVE },
      { opacity: 1, rotateY: 0, z: 0, x: 0, ease: 'power3.out', immediateRender: false, scrollTrigger: scrubbed(el, 'top 100%', 'top 62%') },
    )
  })

  // The page header tilts back and recedes into the scene as you scroll away from it, each title
  // line trailing the one above. Moving away from the viewer keeps text crisp (it only shrinks)
  // and the whole block travels together, so nothing piles up on the paragraph below.
  all(root, '.page-hero').forEach((hero) => {
    const leaving = () => ({ trigger: hero, start: 'top top', end: 'bottom top', scrub: HERO_OUT.scrub })
    // Both ends of the fade are given, so GSAP never has to read the header's current opacity from the browser.
    gsap.fromTo(
      hero,
      { opacity: 1 },
      {
        y: HERO_OUT.y,
        z: HERO_OUT.z,
        rotateX: HERO_OUT.rotateX,
        opacity: 0,
        transformPerspective: PERSPECTIVE,
        transformOrigin: '50% 0%',
        ease: 'power1.in',
        immediateRender: false,
        scrollTrigger: leaving(),
      },
    )
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

  const stairs = all(root, '[data-stair]').map((el, i) =>
    gsap.fromTo(
      el,
      { opacity: 0, rotateX: STAIR.rotateX, z: STAIR.z * (i + 1), y: STAIR.y, transformPerspective: PERSPECTIVE, transformOrigin: '50% 0%' },
      { opacity: 1, rotateX: 0, z: 0, y: 0, ease: 'power3.out', immediateRender: false, scrollTrigger: scrubbed(el, 'top 100%', 'top 60%') },
    ),
  )

  startHidden([...reveals, ...flies, ...swings, ...stairs])
}

/** Letter-by-letter 3D flip for a page title, then a fade-up for its supporting lines. */
export function playIntro(root: HTMLElement) {
  const chars = all(root, '.split-char')
  const rest = all(root, '[data-intro]')
  if (reduceMotion) {
    gsap.set([...chars, ...rest], { opacity: 1 })
    return
  }
  // The letters' leftover 3D transforms are dropped in one pass once everything has landed. GSAP's own clearProps
  // re-reads each element's computed style the moment its tween ends, which forced a full style recalculation per
  // letter in the middle of the page opening.
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => dropTransforms([...chars, ...rest]) })
  all(root, '.split-line').forEach((line, i) => {
    tl.fromTo(
      line.querySelectorAll('.split-char'),
      // yPercent rather than an em offset: GSAP would measure a probe element per letter to convert em to px.
      { opacity: 0, rotateX: INTRO.charRotate, yPercent: INTRO.charLift, transformPerspective: PERSPECTIVE, transformOrigin: '50% 100%' },
      { opacity: 1, rotateX: 0, yPercent: 0, duration: INTRO.duration, stagger: INTRO.charStagger },
      i * INTRO.lineDelay,
    )
  })
  // Pages without fade-in extras (Home runs its own intro) would hand GSAP an empty list and a console warning.
  if (rest.length) tl.fromTo(rest, { opacity: 0, y: INTRO.fadeY }, { opacity: 1, y: 0, duration: INTRO.duration, stagger: INTRO.fadeStagger }, INTRO.lineDelay)
}

/**
 * Removes the inline transforms an intro left behind: writes only, so the browser restyles once. GSAP's cached
 * values for these elements already describe the cleared state (every transform ended at zero), so later tweens on
 * them still start from the right place.
 */
export function dropTransforms(elements: HTMLElement[]) {
  elements.forEach((el) => el.style.removeProperty('transform'))
}
