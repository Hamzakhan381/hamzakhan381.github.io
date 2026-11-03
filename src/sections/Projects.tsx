import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { flyIn } from '../lib/effects'
import { profile } from '../lib/content'
import { formatDate, formatRepoName, useRepos, type Repo } from '../lib/github'
import { Icon } from '../components/Icon'
import { Tilt } from '../components/Tilt'

const PRELOAD_MARGIN = '600px 0px'
const MAX_TOPICS = 3

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
}

function RepoCard({ repo }: { repo: Repo }) {
  const tags = [repo.language, ...(repo.topics ?? [])].filter(Boolean).slice(0, MAX_TOPICS)
  return (
    <Tilt as="article" className="card repo">
      <div className="repo__top">
        <span className="repo__lang">
          <span
            className="repo__dot"
            style={{ background: languageColors[repo.language ?? ''] ?? 'var(--cyan)' }}
            aria-hidden="true"
          />
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
      <div className="repo__tags">
        {tags.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
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
    </Tilt>
  )
}

export function Projects() {
  const ref = useRef<HTMLElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const state = useRepos(near)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: PRELOAD_MARGIN },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const repos = state.status === 'ready' ? state.repos : []

  useEffect(() => {
    const el = grid.current
    if (!el || state.status === 'loading') return
    const ctx = gsap.context(() => flyIn(Array.from(el.querySelectorAll('[data-fly]'))), el)
    ScrollTrigger.refresh()
    return () => ctx.revert()
  }, [state.status])

  const languages = new Set(repos.map((r) => r.language).filter(Boolean)).size
  const latest = repos[0] ? formatDate(repos[0].updated_at) : '—'

  return (
    <section id="projects" ref={ref} data-station className="section projects">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow" data-depth>GitHub projects</p>
          <h2 className="heading" data-depth>
            Straight from <span className="text-gradient">my GitHub</span>
          </h2>
          <p className="section-head__lead" data-depth>
            Pulled live from my repositories: where ideas become interfaces, backend systems and clean experiments.
          </p>
          <dl className="metrics" data-depth>
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
              <dd>{latest}</dd>
            </div>
          </dl>
        </header>

        <div ref={grid} className="projects__grid" aria-live="polite" aria-busy={state.status === 'loading'}>
          {state.status === 'loading' &&
            Array.from({ length: MAX_TOPICS }, (_, i) => <div key={i} className="card repo repo--skeleton" />)}
          {state.status === 'error' && (
            <div className="card projects__empty">
              <h3>GitHub is taking a break</h3>
              <p>The live repo feed couldn't load (GitHub limits anonymous requests). You can still browse everything directly.</p>
            </div>
          )}
          {repos.map((repo) => (
            <div key={repo.id} data-fly>
              <RepoCard repo={repo} />
            </div>
          ))}
        </div>

        <a className="btn btn--ghost projects__all" href={`${profile.links.github}?tab=repositories`} target="_blank" rel="noreferrer">
          <Icon name="github" /> View all repositories <Icon name="arrow" />
        </a>
      </div>
    </section>
  )
}
