import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { profile, projects } from '../content'
import { formatDate, formatRepoName, useRepos, type Repo } from '../lib/github'
import { flyIn } from '../lib/reveal'
import { usePageEffects } from '../lib/usePageEffects'
import { useMediaQuery } from '../lib/useMediaQuery'
import { PageHero } from '../components/PageHero'
import { SectionHead } from '../components/Section'
import { DepthGallery } from '../components/DepthGallery'
import { FilterGrid } from '../components/FilterGrid'
import { Carousel3D } from '../components/Carousel3D'
import { Icon } from '../components/Icon'

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

function LiveRepos() {
  const grid = useRef<HTMLUListElement>(null)
  const state = useRepos(true)
  const wide = useMediaQuery('(min-width: 860px)')
  const repos = state.status === 'ready' ? state.repos : []
  const useCarousel = wide && repos.length >= MIN_FOR_CAROUSEL

  useEffect(() => {
    const el = grid.current
    if (!el || state.status === 'loading') return
    const ctx = gsap.context(() => flyIn(Array.from(el.children)), el)
    ScrollTrigger.refresh()
    return () => ctx.revert()
  }, [state.status, useCarousel])

  return (
    <section className="section container" aria-busy={state.status === 'loading'}>
      <SectionHead
        eyebrow="Live from GitHub"
        title="Latest pushes."
        lead={useCarousel ? 'Pulled live from my repositories. Drag the ring or use the arrows.' : 'Pulled live from my repositories.'}
        center
      />
      {state.status === 'error' && (
        <div className="card empty">
          <h3>GitHub is taking a break</h3>
          <p>The live feed couldn't load (GitHub limits anonymous requests). You can still browse everything directly.</p>
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
  )
}

export default function Projects() {
  const ref = usePageEffects<HTMLDivElement>()
  const featured = projects.items.filter((p) => p.featured)
  const categories = new Set(projects.items.map((p) => p.category)).size

  return (
    <div ref={ref} className="page">
      <PageHero hero={projects.hero}>
        <dl className="metrics">
          <div>
            <dt>Projects</dt>
            <dd>{projects.items.length}</dd>
          </div>
          <div>
            <dt>Featured</dt>
            <dd>{featured.length}</dd>
          </div>
          <div>
            <dt>Categories</dt>
            <dd>{categories}</dd>
          </div>
        </dl>
      </PageHero>

      {featured.length ? (
        <section className="section section--flush">
          <div className="container">
            <SectionHead eyebrow="Featured" title="Fly through" accent="the highlights." lead="Keep scrolling: each project comes at you out of the depth." />
          </div>
          <DepthGallery projects={featured} />
        </section>
      ) : null}

      <section className="section container">
        <SectionHead eyebrow="Archive" title="Everything," accent="filterable." />
        <FilterGrid projects={projects.items} categories={projects.categories} />
      </section>

      <LiveRepos />
    </div>
  )
}
