import { useLayoutEffect, type RefObject } from 'react'
import { Link } from 'react-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { about, education, experience, profile, skills } from '../content'
import { usePageEffects } from '../lib/usePageEffects'
import { useFocusIndex } from '../lib/useFocusIndex'
import { branchSlug, fakeHash } from '../lib/commit'
import { profileCode, profileFile } from '../lib/profileCode'
import { resetStory, story } from '../lib/story'
import { reduceMotion, scrollToId } from '../lib/scroll'
import motion from '../lib/motion.json'
import { SectionHead } from '../components/Section'
import { CodeWindow } from '../components/CodeWindow'
import { SkillBars } from '../components/SkillBars'
import { WordReveal } from '../components/WordReveal'
import { RollText } from '../components/RollText'
import { SplitText } from '../components/SplitText'
import { Icon } from '../components/Icon'
import { Tilt } from '../components/Tilt'
import { Rail } from '../components/Rail'

const S = about.story
const ST = motion.story
const INDEX_DIGITS = 2
const PERCENT = 100
const pad = (n: number) => String(n).padStart(INDEX_DIGITS, '0')
/** "02 / experience": the chapter number and name, as shown above each chapter. */
const chapterLabel = (n: number, name: string) => `${pad(n)} / ${name.toLowerCase()}`
const chapters = [
  { id: 'who', name: S.who.eyebrow },
  { id: 'experience', name: S.experience.eyebrow },
  { id: 'skills', name: S.skills.eyebrow },
  { id: 'principles', name: about.principles.eyebrow },
  { id: 'now', name: about.now.eyebrow },
]
/** Chapter numbers match the 3D scene's chapters: 0 is the intro, then these in order, then the outro. */
const numberOf = (id: string) => chapters.findIndex((c) => c.id === id) + 1
const OUTRO = chapters.length + 1
/** The newest role, shown as "Currently" in the intro. */
const current = experience[0]

/**
 * Publishes which chapter you're in, and how far through it, to the 3D scene (`story`), and lifts the intro away
 * as you scroll past it. Each chapter counts as current while it spans the reading line.
 */
function useStoryMotion(ref: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    resetStory()
    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>('[data-chapter]').forEach((el) => {
        const index = Number(el.dataset.chapter)
        // The intro counts from the very top; chapters from when their top edge reaches the reading line.
        const line = index ? parseFloat(ST.chapterLine.split(' ')[1]) / PERCENT : 0
        const publish = (self: ScrollTrigger) => {
          if (!self.isActive) return
          story.chapter = index
          story.local = self.progress
          story.top = line - (self.scroll() - self.start) / window.innerHeight
        }
        ScrollTrigger.create({ trigger: el, start: index ? ST.chapterLine : 'top top', end: `bottom ${ST.chapterLine.split(' ')[1]}`, onUpdate: publish, onToggle: publish })
      })
      if (!reduceMotion)
        gsap.to('.shero__copy, .shero__index, .shero__hint, .shero__interact', {
          y: ST.heroOut.y,
          opacity: 0,
          ease: 'none',
          scrollTrigger: { trigger: '.shero', start: ST.heroOut.start, end: ST.heroOut.end, scrub: true },
        })
    }, root)
    return () => {
      ctx.revert()
      resetStory()
    }
  }, [ref])
}

function Experience() {
  const { ref, active } = useFocusIndex<HTMLOListElement>()
  return (
    <section id="experience" className="section container schapter" data-chapter={numberOf('experience')}>
      <SectionHead eyebrow={chapterLabel(numberOf('experience'), S.experience.eyebrow)} title={S.experience.title} accent={S.experience.accent} lead={S.experience.lead} />
      <ol ref={ref} className="gitlog">
        {experience.map((job, i) => (
          <li key={job.org} id={`job-${i}`} data-focus-item className={`gitlog__item ${active === i ? 'is-active' : ''}`}>
            <Tilt className="card gitlog__card" data-swing>
              <p className="gitlog__meta">
                <span className="gitlog__hash">commit {fakeHash(job.org + job.role)}</span>
                <span className="gitlog__branch">feat/{branchSlug(job.org)}</span>
              </p>
              <p className="gitlog__date">
                {job.period} · {job.type}
              </p>
              <h3>
                {job.role} <span className="accent">@ {job.org}</span>
              </h3>
              <p>{job.summary}</p>
              <ul className="checks">
                {job.highlights.map((h) => (
                  <li key={h}>
                    <Icon name="check" /> {h}
                  </li>
                ))}
              </ul>
              {job.stack.length ? (
                <ul className="tags">
                  {job.stack.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              ) : null}
            </Tilt>
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * About, as a scroll story. A reel-style intro (a big line in the corner, chapter index, current role) gives way to
 * five chapters beside Hamza's 3D dev pass, which swings as you scroll and flips to a new face for each one: who I
 * am, experience (a pass per job), education and skills, principles, right now, and a closing call to action.
 */
export default function About() {
  const ref = usePageEffects<HTMLDivElement>()
  useStoryMotion(ref)
  const outroLabel = `${S.outro.title} ${S.outro.accent}`

  return (
    <div ref={ref} className="page story">
      <section className="shero" data-chapter="0" data-rail-intro aria-labelledby="about-title">
        <div className="container shero__inner">
          <nav className="shero__index" aria-label="Chapters">
            <ol>
              {chapters.map((c, i) => (
                <li key={c.id}>
                  <button type="button" onClick={() => scrollToId(c.id)}>
                    <span>{pad(i + 1)}</span> {c.name}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <div className="shero__copy">
            <p className="shero__welcome" data-intro>
              {S.welcome}
            </p>
            <h1 id="about-title" className="shero__title">
              <SplitText text={`${S.name},`} className="accent" /> <SplitText text={S.tagline} />
            </h1>
            <p className="shero__status" data-intro>
              <span className="pulse-dot" aria-hidden="true" /> {S.status}: {current.role} @ {current.org}
            </p>
            <p className="shero__interact" data-intro aria-hidden="true">
              <Icon name="command" /> {S.interact}
            </p>
          </div>
          <p className="shero__hint" data-intro aria-hidden="true">
            <span>{S.hint}</span>
            <span className="jhero__mouse" />
          </p>
        </div>
      </section>

      <section id="who" className="section container schapter" data-chapter={numberOf('who')}>
        <SectionHead eyebrow={chapterLabel(numberOf('who'), S.who.eyebrow)} title={S.who.title} accent={S.who.accent} lead={S.who.lead} />
        <WordReveal text={about.bio[0]} className="words--story" />
        {about.bio.slice(1).map((p) => (
          <p key={p} className="schapter__text" data-reveal>
            {p}
          </p>
        ))}
        <dl className="stats">
          {about.highlights.map((s) => (
            <div key={s.label} className="stat" data-fly>
              <dd>{s.value}</dd>
              <dt>{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <Experience />

      <section id="skills" className="section container schapter" data-chapter={numberOf('skills')}>
        <SectionHead eyebrow={chapterLabel(numberOf('skills'), S.skills.eyebrow)} title={S.skills.title} accent={S.skills.accent} />
        <div className="edu">
          {education.map((e) => (
            <Tilt key={e.school} className="card edu__card" data-fly>
              <p className="chip">{e.period}</p>
              <h3>{e.degree}</h3>
              <p className="edu__school">
                {e.school} · {e.location}
              </p>
              <p className="edu__detail">{e.detail}</p>
              <ul className="tags">
                {e.focus.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </Tilt>
          ))}
        </div>
        <SkillBars groups={skills.groups} />
        <ul className="keys" aria-label="Tools">
          {skills.tools.map((tool) => (
            <li key={tool} className="key" data-fly>
              <span>{tool}</span>
            </li>
          ))}
        </ul>
        <CodeWindow filename={profileFile} lines={profileCode} />
      </section>

      <section id="principles" className="section section--flush" data-chapter={numberOf('principles')}>
        <div className="container schapter schapter--head">
          <SectionHead eyebrow={chapterLabel(numberOf('principles'), about.principles.eyebrow)} title={about.principles.title} lead="Keep scrolling: the track moves sideways." />
        </div>
        <Rail label={about.principles.title}>
          {about.principles.items.map((p, i) => (
            <li key={p.title} className="card principle">
              <span className="principle__num">{pad(i + 1)}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </li>
          ))}
        </Rail>
      </section>

      <section id="now" className="section container schapter" data-chapter={numberOf('now')}>
        <SectionHead eyebrow={chapterLabel(numberOf('now'), about.now.eyebrow)} title={about.now.title} />
        <ul className="now">
          {about.now.items.map((n) => (
            <li key={n.label} className="now__item" data-reveal>
              <span className="now__label">{n.label}</span>
              <span>{n.text}</span>
            </li>
          ))}
        </ul>
        {about.certifications.length ? (
          <ul className="certs">
            {about.certifications.map((c) => (
              <li key={c.name} className="card cert" data-fly>
                <h3>{c.name}</h3>
                <p>
                  {c.issuer} · {c.date}
                </p>
                {c.href ? (
                  <a href={c.href} target="_blank" rel="noreferrer">
                    View credential <Icon name="arrowUpRight" />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section id="outro" className="soutro" data-chapter={OUTRO}>
        <div className="container schapter">
          <header className="section-head">
            <p className="eyebrow">{chapterLabel(OUTRO, S.outro.eyebrow)}</p>
            <h2 className="soutro__title" aria-label={outroLabel}>
              <RollText text={S.outro.title} /> <RollText text={S.outro.accent} className="accent" />
            </h2>
          </header>
          <p className="soutro__lead" data-reveal>
            {S.outro.lead}
          </p>
          <div className="actions">
            <Link to="/contact" className="btn">
              {S.outro.cta} <Icon name="arrow" />
            </Link>
            <a className="btn btn--ghost" href={`mailto:${profile.email}`}>
              <Icon name="mail" /> {profile.email}
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
