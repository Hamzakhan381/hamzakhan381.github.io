import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { projects } from '../content'
import { closeProject, openProject, useOpenProjectSlug } from '../lib/projectDialog'
import { lockScroll } from '../lib/scroll'
import { copyText } from '../lib/toast'
import { normalizePath } from '../lib/paths'
import { StackTree } from './ProjectCards'
import { Icon } from './Icon'

const INDEX_DIGITS = 2
const RELATED_MAX = 3
const pad = (n: number) => String(n).padStart(INDEX_DIGITS, '0')

type Direction = 'next' | 'prev'

/** Full case-study view for one project, opened from any project card; arrow keys step through them. */
export function ProjectDialog() {
  const slug = useOpenProjectSlug()
  const { pathname } = useLocation()
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const [dir, setDir] = useState<Direction>()
  const index = projects.items.findIndex((p) => p.slug === slug)
  const project = index >= 0 ? projects.items[index] : undefined
  const total = projects.items.length

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    // An unknown slug in a shared link: drop it from the address bar instead of showing nothing.
    if (slug && !project) closeProject()
    if (project && !el.open) {
      el.showModal()
      // Start on the title (screen readers announce it) rather than the first button, which the Enter press
      // that opened the dialog (from the palette or terminal) could otherwise go on to activate.
      title.current?.focus({ preventScroll: true })
    }
    if (!project && el.open) el.close()
    lockScroll('project', Boolean(project))
  }, [slug, project])

  useEffect(() => () => lockScroll('project', false), [])

  // After stepping, start the new project from the top and move focus to its title so it is announced.
  useEffect(() => {
    if (!dir) return
    dialog.current?.scrollTo({ top: 0 })
    title.current?.focus({ preventScroll: true })
  }, [slug, dir])

  const go = (target: string, direction: Direction) => {
    setDir(direction)
    openProject(target)
  }
  const step = (by: number) => go(projects.items[(index + by + total) % total].slug, by > 0 ? 'next' : 'prev')
  const close = () => {
    setDir(undefined)
    closeProject()
  }

  // Listen on the window: the focused button is replaced when the project changes, which drops focus to <body>.
  useEffect(() => {
    if (!project) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof Node ? e.target : null
      const fromDialog = target === document.body || Boolean(target && dialog.current?.contains(target))
      if (!fromDialog || e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const related = project
    ? projects.items.filter((p) => p.category === project.category && p.slug !== project.slug).slice(0, RELATED_MAX)
    : []
  const prev = projects.items[(index - 1 + total) % total]
  const next = projects.items[(index + 1) % total]

  return (
    <dialog
      ref={dialog}
      className="project-dialog"
      aria-labelledby="project-dialog-title"
      // Escape fires `cancel` right away; `close` waits for the next frame, so sync state on both.
      onCancel={close}
      onClose={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
      data-lenis-prevent
    >
      {project ? (
        <article key={project.slug} className="project-dialog__body" data-dir={dir}>
          <header className="project-dialog__top">
            <span className="chip">{project.category}</span>
            <span className="project-dialog__count">
              {pad(index + 1)} / {pad(total)}
            </span>
            <button
              type="button"
              className="icon-btn icon-btn--small"
              aria-label="Copy link to this project"
              title="Copy link"
              onClick={() => void copyText(window.location.href, 'Link to this project copied')}
            >
              <Icon name="copy" />
            </button>
            <button type="button" className="icon-btn icon-btn--small" onClick={close} aria-label="Close" title="Close (Esc)">
              <Icon name="close" />
            </button>
          </header>

          <h2 id="project-dialog-title" ref={title} tabIndex={-1}>
            {project.title}
          </h2>
          <p className="project-dialog__sub">{project.subtitle}</p>
          <p className="project-dialog__summary">{project.summary}</p>

          <div className="project-dialog__grid">
            <section>
              <h3>Highlights</h3>
              <ul className="checks">
                {project.highlights.map((h) => (
                  <li key={h}>
                    <Icon name="check" /> {h}
                  </li>
                ))}
              </ul>
            </section>
            <StackTree project={project} />
          </div>

          <div className="project-dialog__meta">
            <ul className="tags" aria-label="Tech stack">
              {project.stack.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <div className="project-links">
              {project.links.live ? (
                <a className="btn btn--small" href={project.links.live} target="_blank" rel="noreferrer">
                  Live site <Icon name="arrowUpRight" />
                </a>
              ) : null}
              {project.links.github ? (
                <a className="btn btn--small btn--ghost" href={project.links.github} target="_blank" rel="noreferrer">
                  <Icon name="github" /> View code
                </a>
              ) : null}
              {normalizePath(pathname) === '/projects' ? null : (
                <Link className="btn btn--small btn--ghost" to="/projects">
                  All projects <Icon name="arrow" />
                </Link>
              )}
            </div>
          </div>

          {related.length ? (
            <div className="project-dialog__related">
              <h3>More {project.category.toLowerCase()} work</h3>
              <div>
                {related.map((r) => (
                  <button key={r.slug} type="button" className="filter__chip" onClick={() => go(r.slug, 'next')}>
                    {r.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <footer className="project-dialog__nav">
            <button type="button" onClick={() => step(-1)}>
              <Icon name="chevronLeft" />
              <span>
                <small>Previous</small>
                {prev.title}
              </span>
            </button>
            <button type="button" onClick={() => step(1)}>
              <span>
                <small>Next</small>
                {next.title}
              </span>
              <Icon name="chevronRight" />
            </button>
          </footer>
          <p className="project-dialog__hint" aria-hidden="true">
            <kbd>←</kbd> <kbd>→</kbd> browse · <kbd>Esc</kbd> close
          </p>
        </article>
      ) : null}
    </dialog>
  )
}
