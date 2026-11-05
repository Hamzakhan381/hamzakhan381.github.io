import type { Project } from '../content'
import { openProjectLink, projectHref } from '../lib/projectDialog'
import { AppScreens } from './AppScreens'
import { Icon } from './Icon'

const INDEX_DIGITS = 2
const pad = (n: number) => String(n).padStart(INDEX_DIGITS, '0')

function ProjectLinks({ project }: { project: Project }) {
  const { github, live } = project.links
  return (
    <div className="project-links">
      <a className="btn btn--small" href={projectHref(project.slug)} onClick={openProjectLink(project.slug)}>
        Details <Icon name="plus" />
      </a>
      {live ? (
        <a className="btn btn--small btn--ghost" href={live} target="_blank" rel="noreferrer">
          Live site <Icon name="arrowUpRight" />
        </a>
      ) : null}
      {github ? (
        <a className="btn btn--small btn--ghost" href={github} target="_blank" rel="noreferrer">
          <Icon name="github" /> Code
        </a>
      ) : null}
    </div>
  )
}

/** Faux terminal that "clones" the repo and prints the stack as a file tree. */
export function StackTree({ project }: { project: Project }) {
  const repo = project.links.github?.split('/').slice(-1)[0] ?? project.slug
  return (
    <div className="featured__screen" aria-hidden="true">
      <div className="term__bar">
        <span className="term__dot" />
        <span className="term__dot" />
        <span className="term__dot" />
        <span className="term__title">~/projects/{project.slug}</span>
      </div>
      <pre>
        <span className="tok-com"># {project.subtitle}</span>
        {'\n'}
        <span className="tok-fn">$</span> git clone {repo}
        {'\n'}
        <span className="tok-fn">$</span> cd {project.slug}
        {'\n'}
        <span className="tok-fn">$</span> tree --stack
        {'\n'}
        {project.stack.map((s, i) => (
          <span key={s}>
            {i === project.stack.length - 1 ? '└── ' : '├── '}
            <span className="tok-str">{s}</span>
            {'\n'}
          </span>
        ))}
        <span className="tok-kw">✓</span> ready
      </pre>
    </div>
  )
}

/** Large case-study panel: details on the left; on the right, the app's real screens or a faux terminal "cloning" the repo. */
export function FeaturedProject({ project, index, total }: { project: Project; index: number; total?: number }) {
  return (
    <article className="featured card">
      <div className="featured__info">
        <p className="featured__meta">
          <span>
            {pad(index + 1)}
            {total ? <span className="featured__total"> / {pad(total)}</span> : null}
          </span>
          <span className="chip">{project.category}</span>
        </p>
        <h3>{project.title}</h3>
        <p className="featured__sub">{project.subtitle}</p>
        <p>{project.summary}</p>
        <ul className="checks">
          {project.highlights.map((h) => (
            <li key={h}>
              <Icon name="check" /> {h}
            </li>
          ))}
        </ul>
        <ul className="tags">
          {project.stack.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <ProjectLinks project={project} />
      </div>
      {project.screens ? <AppScreens project={project} /> : <StackTree project={project} />}
    </article>
  )
}
