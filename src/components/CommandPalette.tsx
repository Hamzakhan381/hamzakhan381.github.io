import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import routes from '../lib/routes.json'
import { profile, projects } from '../content'
import { lockScroll } from '../lib/scroll'
import { openProject } from '../lib/projectDialog'
import { toggleTheme } from '../lib/theme'
import { copyText } from '../lib/toast'
import { forgetQuality, liteChosen, setQuality } from '../lib/quality'
import { HALF } from '../lib/math'
import { Icon, type IconName } from './Icon'

export const OPEN_PALETTE = 'palette:open'
export const isMac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')

type Command = { id: string; label: string; hint: string; icon: IconName; keywords: string; run: () => void }

/** ⌘K / Ctrl+K launcher: jump to any page or run a quick action without touching the mouse. */
export function CommandPalette() {
  const navigate = useNavigate()
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)

  const commands = useMemo<Command[]>(
    () => [
      ...routes.map((r) => ({
        id: r.path,
        label: r.label,
        hint: 'Page',
        icon: 'arrow' as const,
        keywords: `${r.label} ${r.path} page go`,
        run: () => navigate(r.path),
      })),
      {
        id: 'theme',
        label: 'Toggle light / dark theme',
        hint: 'Action',
        icon: 'sun',
        keywords: 'theme dark light mode color',
        run: () => toggleTheme(window.innerWidth * HALF, window.innerHeight * HALF),
      },
      liteChosen()
        ? {
            id: 'lite',
            label: 'Turn off lite mode (full 3D)',
            hint: 'Performance',
            icon: 'sun' as const,
            keywords: 'lite performance fast slow lag 3d animation full',
            run: () => {
              forgetQuality()
              window.location.reload()
            },
          }
        : {
            id: 'lite',
            label: 'Turn on lite mode (less 3D, faster)',
            hint: 'Performance',
            icon: 'moon' as const,
            keywords: 'lite performance fast slow lag 3d animation battery',
            run: () => {
              setQuality('low', true)
              window.location.reload()
            },
          },
      {
        id: 'email',
        label: 'Copy email address',
        hint: profile.email,
        icon: 'copy',
        keywords: 'email mail contact copy',
        run: () => void copyText(profile.email, 'Email copied to clipboard'),
      },
      ...profile.socials.map((s) => ({
        id: s.label,
        label: `Open ${s.label}`,
        hint: s.handle,
        icon: s.icon,
        keywords: `${s.label} social profile`,
        run: () => window.open(s.href, '_blank', 'noopener'),
      })),
      ...projects.items.map((p) => ({
        id: `project-${p.slug}`,
        label: p.title,
        hint: `Project · ${p.category}`,
        icon: 'code' as const,
        keywords: `${p.subtitle} ${p.category} ${p.stack.join(' ')} project case study work`,
        run: () => openProject(p.slug),
      })),
    ],
    [navigate],
  )

  const results = commands.filter((c) => `${c.label} ${c.keywords}`.toLowerCase().includes(query.trim().toLowerCase()))

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_PALETTE, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(OPEN_PALETTE, onOpen)
    }
  }, [])

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) {
      setQuery('')
      setIndex(0)
      el.showModal()
      input.current?.focus()
    }
    if (!open && el.open) el.close()
    lockScroll('palette', open)
  }, [open])

  const run = (command: Command | undefined) => {
    if (!command) return
    setOpen(false)
    command.run()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setIndex((i) => (i + step + results.length) % Math.max(results.length, 1))
    }
    if (e.key === 'Enter') run(results[index])
  }

  return (
    <dialog
      ref={dialog}
      className="palette"
      aria-label="Command palette"
      data-lenis-prevent
      onCancel={() => setOpen(false)}
      onClose={() => setOpen(false)}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div className="palette__box">
        <label className="palette__search">
          <Icon name="search" />
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIndex(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Type a command or page…"
            aria-label="Search commands"
            aria-controls="palette-list"
            aria-activedescendant={results[index] ? `cmd-${results[index].id}` : undefined}
            role="combobox"
            aria-expanded="true"
          />
          <kbd>Esc</kbd>
        </label>
        <ul id="palette-list" className="palette__list" role="listbox">
          {results.map((c, i) => (
            <li
              key={c.id}
              id={`cmd-${c.id}`}
              role="option"
              aria-selected={i === index}
              className={i === index ? 'is-active' : ''}
              onMouseMove={() => setIndex(i)}
              onClick={() => run(c)}
            >
              <Icon name={c.icon} />
              <span>{c.label}</span>
              <small>{c.hint}</small>
            </li>
          ))}
          {results.length ? null : <li className="palette__empty">No matches for “{query}”</li>}
        </ul>
        <p className="palette__foot">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>Enter</kbd> run
          </span>
          <span>
            <kbd>{isMac ? '⌘' : 'Ctrl'}</kbd> <kbd>K</kbd> toggle
          </span>
        </p>
      </div>
    </dialog>
  )
}
