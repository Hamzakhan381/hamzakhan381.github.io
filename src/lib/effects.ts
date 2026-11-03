import { gsap } from 'gsap'
import { prefersReducedMotion } from './scroll'

import motion from './motion.json'
import { DOUBLE } from './math'

const { perspective: PERSPECTIVE, scrub: SCRUB, depth: DEPTH, fly: FLY, timeline: TIMELINE, intro: INTRO } = motion
const { heroOut: HERO_OUT, sectionOut: SECTION_OUT, sectionOutOpacity: SECTION_OUT_OPACITY } = motion
const alternate = (i: number) => (i % DOUBLE ? 1 : -1)

/** Cards rise out of the depth of the screen, alternating their swing, scrubbed to scroll. */
export function flyIn(elements: Element[]) {
  if (prefersReducedMotion) return
  elements.forEach((el, i) => {
    gsap.fromTo(
      el,
      {
        opacity: 0,
        z: FLY.z,
        rotateX: FLY.rotateX,
        rotateY: alternate(i) * FLY.rotateY,
        y: FLY.y,
        transformPerspective: PERSPECTIVE,
      },
      {
        opacity: 1,
        z: 0,
        rotateX: 0,
        rotateY: 0,
        y: 0,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 105%', end: 'top 68%', scrub: SCRUB },
      },
    )
  })
}

export function setupScrollEffects() {
  gsap.to('.scroll-progress', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: true },
  })
  if (prefersReducedMotion) return

  gsap.utils.toArray<HTMLElement>('[data-depth]').forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, rotateX: DEPTH.rotateX, z: DEPTH.z, y: DEPTH.y, transformPerspective: PERSPECTIVE, transformOrigin: '50% 100%' },
      {
        opacity: 1,
        rotateX: 0,
        z: 0,
        y: 0,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 70%', scrub: SCRUB },
      },
    )
  })

  flyIn(gsap.utils.toArray<HTMLElement>('[data-fly]').filter((el) => !el.closest('.projects__grid')))

  gsap.utils.toArray<HTMLElement>('[data-timeline-item]').forEach((el, i) => {
    const side = alternate(i)
    gsap.fromTo(
      el,
      { opacity: 0, rotateY: side * TIMELINE.rotateY, z: TIMELINE.z, x: side * TIMELINE.x, transformPerspective: PERSPECTIVE },
      {
        opacity: 1,
        rotateY: 0,
        z: 0,
        x: 0,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 100%', end: 'top 60%', scrub: SCRUB },
      },
    )
  })

  gsap.to('[data-hero-content]', {
    ...HERO_OUT,
    opacity: 0,
    transformPerspective: PERSPECTIVE,
    ease: 'none',
    scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom top', scrub: true },
  })

  gsap.utils.toArray<HTMLElement>('.section:not(.hero):not(.contact) > .container').forEach((el) => {
    gsap.to(el, {
      ...SECTION_OUT,
      opacity: SECTION_OUT_OPACITY,
      transformPerspective: PERSPECTIVE,
      transformOrigin: '50% 0%',
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'bottom 55%', end: 'bottom top', scrub: true },
    })
  })
}

export function playIntro() {
  if (prefersReducedMotion) {
    gsap.set('.split-char, [data-intro]', { opacity: 1 })
    return
  }
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
  gsap.utils.toArray<HTMLElement>('.hero__line').forEach((line, i) => {
    tl.fromTo(
      line.querySelectorAll('.split-char'),
      { opacity: 0, rotateX: INTRO.charRotate, y: '0.5em', transformPerspective: PERSPECTIVE, transformOrigin: '50% 100%' },
      { opacity: 1, rotateX: 0, y: 0, duration: INTRO.duration, stagger: INTRO.charStagger },
      i * INTRO.lineDelay,
    )
  })
  tl.fromTo(
    '[data-intro]',
    { opacity: 0, y: INTRO.fadeY },
    { opacity: 1, y: 0, duration: INTRO.duration, stagger: INTRO.fadeStagger },
    INTRO.lineDelay,
  )
}
