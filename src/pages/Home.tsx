import { useLayoutEffect, type RefObject } from 'react'
import { Link } from 'react-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { experience, home, profile, projectBySlug, type Project } from '../content'
import { usePageEffects } from '../lib/usePageEffects'
import { journey, resetJourney } from '../lib/journey'
import { reduceMotion } from '../lib/scroll'
import { appLoaded } from '../lib/intro'
import { HALF, hash } from '../lib/math'
import { profileCode, profileFile } from '../lib/profileCode'
import motion from '../lib/motion.json'
import { SectionHead } from '../components/Section'
import { Terminal } from '../components/Terminal'
import { Counter } from '../components/Counter'
import { Icon } from '../components/Icon'
import { DecryptText } from '../components/DecryptText'
import { TypeCycle } from '../components/TypeCycle'
import { Laptop } from '../components/Laptop'
import { WordReveal } from '../components/WordReveal'
import { BeamTimeline } from '../components/BeamTimeline'
import { CardStack } from '../components/CardStack'
import { JourneyHud } from '../components/JourneyHud'
import { RollText } from '../components/RollText'

const J = motion.journey
const DV = J.dive
const STEPS = ['boot', 'about', 'experience', 'projects', 'contact']
/** One random stream per axis, so each letter of the name gets its own stable flight. */
const SCATTER_CHANNELS = ['x', 'y', 'z', 'rotateX', 'rotateY', 'rotateZ']
const featured = home.featured.slugs.map(projectBySlug).filter((p): p is Project => Boolean(p))

/**
 * The scroll choreography of the Home page:
 * 1. intro: the terminal lines and copy fade up once the boot screen lifts (the name decrypts itself);
 * 2. dive: the intro is pinned while the name flies apart, a laptop rises and opens, its code types in and the
 *    camera dives into the screen (the 3D portal follows `journey.dive`);
 * 3. finale: the portal gathers again behind the closing headline (`journey.finale`).
 */
function useJourneyMotion(ref: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    resetJourney()
    if (reduceMotion) {
      root.classList.add('is-still')
      return resetJourney
    }
    const narrow = window.matchMedia('(max-width: 720px)').matches
    const one = (selector: string) => root.querySelector<HTMLElement>(selector)
    const stage = one('.jdive__stage')
    const laptop = one('.laptop')
    // The dive ends with the laptop screen covering the viewport, centred, whatever the screen shape.
    // Capped, because the browser draws the screen's text at its resting size: much past 2x it turns soft.
    const zoomCap = narrow ? DV.zoom.mobileMax : DV.zoom.max
    const coverScale = () => (laptop ? Math.min(Math.max(window.innerWidth / laptop.offsetWidth, window.innerHeight / laptop.offsetHeight) * DV.zoom.cover, zoomCap) : 1)
    const centreShift = () => (stage && laptop ? stage.clientHeight * HALF - (laptop.offsetTop + laptop.offsetHeight * HALF) : 0)
    const ctx = gsap.context(() => {
      const intro = gsap.timeline({ paused: true })
      intro.fromTo(
        root.querySelectorAll('.jhero__hud p, .jhero__eyebrow, .jhero__intro > *'),
        { opacity: 0, y: J.intro.y },
        { opacity: 1, y: 0, duration: J.intro.duration, stagger: J.intro.stagger, ease: 'expo.out', clearProps: 'transform' },
      )
      const playIntro = async () => {
        await appLoaded
        intro.play()
      }
      void playIntro()

      const dive = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: stage,
          start: 'top top',
          end: () => `+=${window.innerHeight * (narrow ? DV.mobileScreens : DV.screens)}`,
          pin: true,
          scrub: DV.scrub,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          // Created before the sections below it, so it must also be measured first.
          refreshPriority: 1,
          onUpdate: (self) => {
            journey.dive = self.progress
          },
        },
      })
      // The name flies apart and recedes (letters move away from the viewer so they stay sharp).
      root.querySelectorAll<HTMLElement>('.jhero__name .dx').forEach((ch, i) => {
        const [hx, hy, hz, rx, ry, rz] = SCATTER_CHANNELS.map((_, channel) => hash(i, channel))
        dive.to(
          ch,
          {
            x: hx * DV.scatter.x,
            y: hy * DV.scatter.y,
            z: -(hz + 1) * HALF * DV.scatter.z,
            rotateX: rx * DV.scatter.rotate,
            rotateY: ry * DV.scatter.rotate,
            rotateZ: rz * DV.scatter.rotate,
            opacity: 0,
            transformPerspective: motion.perspective,
            ease: 'power2.in',
            duration: DV.scatter.end,
          },
          i * DV.scatter.spread,
        )
      })
      dive.to([one('.jhero__hud'), one('.jhero__eyebrow'), one('.jhero__intro'), one('.jhero__hint')], { y: DV.fade.y, opacity: 0, duration: DV.fade.end }, 0)
      dive.fromTo(laptop, { yPercent: DV.rise.from, y: 0, scale: DV.rise.scale }, { yPercent: 0, y: centreShift, scale: 1, duration: DV.rise.duration, ease: 'power2.out' }, DV.rise.at)
      dive.fromTo(one('.laptop__lid'), { rotateX: DV.lid.closed }, { rotateX: DV.lid.open, duration: DV.lid.duration, ease: 'power2.inOut' }, DV.lid.at)
      dive.fromTo(root.querySelectorAll('.laptop__line'), { opacity: 0 }, { opacity: 1, stagger: DV.code.stagger, duration: DV.code.duration }, DV.code.at)
      dive.to(laptop, { scale: coverScale, duration: DV.zoom.duration, ease: 'power2.inOut' }, DV.zoom.at)
      dive.to(laptop, { opacity: 0, duration: DV.out.duration }, DV.out.at)

      ScrollTrigger.create({
        trigger: one('.jfinale'),
        start: J.finale.start,
        end: J.finale.end,
        onUpdate: (self) => {
          journey.finale = self.progress
        },
      })
    }, root)
    return () => {
      ctx.revert()
      resetJourney()
    }
  }, [ref])
}

/**
 * Home is one scroll journey: the name decrypts beside a portal of code, you dive into a laptop screen, the bio
 * lights up word by word, a beam runs down the git log, the projects stack into a deck, and the portal returns
 * behind the closing call to action. A corner readout shows which step you're on.
 */
export default function Home() {
  const ref = usePageEffects<HTMLDivElement>()
  useJourneyMotion(ref)
  const finaleLabel = `${home.finale.title} ${home.finale.accent}`

  return (
    <div ref={ref} className="page page--home journey">
      <section className="jdive" data-step="0" data-rail-intro aria-labelledby="home-name">
        <div className="jdive__stage">
          <div className="jhero container">
            <div className="jhero__hud" aria-hidden="true">
              {home.hero.hud.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className="jhero__copy">
              <p className="eyebrow jhero__eyebrow">
                {profile.role} · {profile.location}
              </p>
              <h1 id="home-name" className="jhero__name" aria-label={profile.name}>
                <DecryptText text={profile.shortName} />
              </h1>
              <div className="jhero__intro">
                <p className="jhero__role">
                  <span className="jhero__prompt" aria-hidden="true">
                    &gt;
                  </span>{' '}
                  <TypeCycle words={profile.titles} />
                </p>
                <p className="jhero__lead">{home.hero.lead}</p>
                <div className="actions">
                  <Link to="/projects" className="btn">
                    See my work <Icon name="arrow" />
                  </Link>
                  <Link to="/cv" className="btn btn--ghost">
                    <Icon name="file" /> View CV
                  </Link>
                </div>
              </div>
            </div>
            <p className="jhero__hint" aria-hidden="true">
              <span>{home.hero.hint}</span>
              <span className="jhero__mouse" />
            </p>
          </div>
          <Laptop file={profileFile} lines={profileCode} />
        </div>
      </section>

      <section className="section container jabout" data-step="1">
        <SectionHead eyebrow={home.about.eyebrow} title={home.about.title} accent={home.about.accent} />
        <div className="jabout__grid">
          <WordReveal text={home.about.text} />
          <div className="jabout__term">
            <Terminal host={home.terminal.host} session={home.terminal.session} welcome={home.terminal.welcome} />
            <p className="jabout__hint">
              <Icon name="terminal" /> {home.terminal.hint}
            </p>
          </div>
        </div>
        <dl className="stats stats--wide">
          {home.stats.map((s) => (
            <div key={s.label} className="stat" data-fly>
              <dd>
                <Counter value={s.value} suffix={s.suffix} />
              </dd>
              <dt>{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="section container" data-step="2">
        <SectionHead eyebrow={home.log.eyebrow} title={home.log.title} accent={home.log.accent} lead={home.log.lead} />
        <BeamTimeline jobs={experience} />
      </section>

      {featured.length ? (
        <section className="section container" data-step="3">
          <SectionHead eyebrow={home.featured.eyebrow} title={home.featured.title} accent={home.featured.accent} lead={home.featured.lead} />
          <CardStack projects={featured} />
          <Link to="/projects" className="btn btn--ghost center">
            All projects <Icon name="arrow" />
          </Link>
        </section>
      ) : null}

      {home.testimonials.length ? (
        <section className="section container">
          <SectionHead eyebrow="Kind words" title="What people say." />
          <ul className="quotes">
            {home.testimonials.map((t) => (
              <li key={t.name} className="card quote" data-fly>
                <blockquote>“{t.quote}”</blockquote>
                <p>
                  <strong>{t.name}</strong> · {t.role}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="jfinale" data-step="4">
        <div className="container jfinale__inner">
          <header className="section-head section-head--center">
            <p className="eyebrow">{home.finale.eyebrow}</p>
            <h2 className="jfinale__title" aria-label={finaleLabel}>
              <RollText text={home.finale.title} /> <RollText text={home.finale.accent} className="accent" />
            </h2>
          </header>
          <Link to="/contact" className="jfinale__prompt">
            <span className="jfinale__ps1">{home.terminal.host}:~$</span> {home.finale.prompt}
            <span className="caret" aria-hidden="true" />
          </Link>
          <p className="jfinale__status">
            <span className="pulse-dot" aria-hidden="true" /> {profile.availability.label} · {profile.availability.responseTime}
          </p>
          <div className="actions jfinale__actions">
            <Link to="/contact" className="btn">
              {home.finale.cta} <Icon name="arrow" />
            </Link>
            <a className="btn btn--ghost" href={`mailto:${profile.email}`}>
              <Icon name="mail" /> {profile.email}
            </a>
          </div>
        </div>
      </section>

      <JourneyHud labels={STEPS} />
    </div>
  )
}
