import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { profile, projects } from '../content'
import { formatDate, formatRepoName, useRepos, type Repo } from '../lib/github'
import { openProjectLink, projectHref } from '../lib/projectDialog'
import { flyIn } from '../lib/reveal'
import { usePageEffects } from '../lib/usePageEffects'
import { useMediaQuery } from '../lib/useMediaQuery'
import { PageHero } from '../components/PageHero'
import { SectionHead } from '../components/Section'
import { Carousel3D } from '../components/Carousel3D'
import { Icon } from '../components/Icon'
import { Tilt } from '../components/Tilt'

const MAX_TAGS = 3
const MIN_FOR_CAROUSEL = 3
const SKELETONS = 3

const languageColors: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572a5',
  'C#': '#178600',
  'C++': '#f34b7d',
  Java: '#b07219',
  HTML: '#e34c26',
  CSS: '#663399',
  Dart: '#00b4ab',
  PHP: '#4f5d95',
  TSQL: '#e38c00',
}

function RepoCard({ repo, active = true }: { repo: Repo; active?: boolean }) {
  const tags = [repo.language, ...(repo.topics ?? [])].filter(Boolean).slice(0, MAX_TAGS)
  return (
    <article className={`card repo ${active ? 'is-active' : ''}`}>
      <div className="repo__top">
        <span className="repo__lang">
          <span className="repo__dot" style={{ background: languageColors[repo.language ?? ''] ?? 'var(--accent)' }} aria-hidden="true" />
          {repo.language ?? 'Code'}
        </span>
        <span className="repo__counts">
          <span title="Stars">
            <Icon name="star" /> {repo.stargazers_count}
          </span>
          <span title="Forks">
            <Icon name="fork" /> {repo.forks_count}
          </span>
        </span>
      </div>
      <h3>{formatRepoName(repo.name)}</h3>
      <p>{repo.description ?? 'A repository from my GitHub. Open it to explore the code.'}</p>
      <ul className="tags">
        {tags.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <div className="repo__foot">
        <span>Updated {formatDate(repo.updated_at)}</span>
        <span className="repo__links">
          {repo.homepage ? (
            <a href={repo.homepage} target="_blank" rel="noreferrer" aria-label={`Live demo of ${repo.name}`}>
              <Icon name="arrowUpRight" />
            </a>
          ) : null}
          <a href={repo.html_url} target="_blank" rel="noreferrer" aria-label={`${repo.name} on GitHub`}>
            <Icon name="github" />
          </a>
        </span>
      </div>
    </article>
  )
}

/**
 * Projects, "straight from my GitHub": the hero over the 3D galaxy, the live repositories on a draggable ring
 * (a grid on narrow screens), then every project as a case-study card. A card's title opens its full case study.
 */
export default function Projects() {
  const ref = usePageEffects<HTMLDivElement>()
  const grid = useRef<HTMLUListElement>(null)
  const state = useRepos(true)
  const wide = useMediaQuery('(min-width: 860px)')
  const repos = state.status === 'ready' ? state.repos : []
  const useCarousel = wide && repos.length >= MIN_FOR_CAROUSEL
  const languages = new Set(repos.map((r) => r.language).filter(Boolean)).size
  const hero = useCarousel ? { ...projects.hero, lead: `${projects.hero.lead} ${projects.ringHint}` } : projects.hero

  useEffect(() => {
    const el = grid.current
    if (!el || state.status === 'loading') return
    const ctx = gsap.context(() => flyIn(Array.from(el.children)), el)
    ScrollTrigger.refresh()
    return () => ctx.revert()
  }, [state.status, useCarousel])

  return (
    <div ref={ref} className="page">
      <PageHero hero={hero} className="page-hero--center">
        <dl className="metrics">
          <div>
            <dt>Repos shown</dt>
            <dd>{repos.length || '—'}</dd>
          </div>
          <div>
            <dt>Languages</dt>
            <dd>{languages || '—'}</dd>
          </div>
          <div>
            <dt>Latest update</dt>
            <dd>{repos[0] ? formatDate(repos[0].updated_at) : '—'}</dd>
          </div>
        </dl>
      </PageHero>

      <section className="section container" aria-live="polite" aria-busy={state.status === 'loading'}>
        {state.status === 'error' && (
          <div className="card empty">
            <h2>GitHub is taking a break</h2>
            <p>The live repo feed couldn't load (GitHub limits anonymous requests). You can still browse everything directly.</p>
          </div>
        )}
        {useCarousel ? (
          <Carousel3D items={repos} label="GitHub repositories" renderItem={(repo, active) => <RepoCard repo={repo} active={active} />} />
        ) : (
          <ul ref={grid} className="repo-grid">
            {state.status === 'loading'
              ? Array.from({ length: SKELETONS }, (_, i) => <li key={i} className="card repo repo--skeleton" />)
              : repos.map((repo) => (
                  <li key={repo.id}>
                    <RepoCard repo={repo} />
                  </li>
                ))}
          </ul>
        )}
        <a className="btn btn--ghost center" href={`https://github.com/${profile.githubUser}?tab=repositories`} target="_blank" rel="noreferrer">
          <Icon name="github" /> View all repositories <Icon name="arrow" />
        </a>
      </section>

      <section className="section container">
        <SectionHead eyebrow={projects.caseStudies.eyebrow} title={projects.caseStudies.title} accent={projects.caseStudies.accent} />
        <div className="cases">
          {projects.items.map((p) => (
            <Tilt key={p.slug} className="card case" data-swing>
              <span className="chip">{p.category}</span>
              <h3>
                <a className="case__link" href={projectHref(p.slug)} onClick={openProjectLink(p.slug)}>
                  {p.title}
                </a>
              </h3>
              <p className="case__sub">{p.subtitle}</p>
              <p>{p.summary}</p>
              <ul className="tags">
                {p.stack.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </Tilt>
          ))}
        </div>
      </section>
    </div>
  )
}
