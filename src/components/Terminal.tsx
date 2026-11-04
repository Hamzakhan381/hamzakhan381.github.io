import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type SubmitEvent } from 'react'
import { useNavigate } from 'react-router'
import { gsap } from 'gsap'
import { reduceMotion } from '../lib/scroll'
import { clamp } from '../lib/math'
import { openProject } from '../lib/projectDialog'
import { complete, runCommand, type OutLine, type ShellContext } from '../lib/shell'
import type { TerminalStep } from '../content'
import { Icon } from './Icon'

type Line = { kind: 'cmd' | 'out'; text: string }
/** One prompt and what it printed; `cmd: null` is a message with no prompt (the welcome line). */
type Entry = { id: number; cmd: string | null; out: OutLine[] }

/** Older entries scroll away so a long session can't grow the page forever. */
const MAX_ENTRIES = 60

/**
 * A shell session that types itself out as you scroll through it (scrubbed, so scrolling back un-types it).
 * Click it, or tab to it, and it becomes a real prompt that runs commands from src/lib/shell.ts.
 */
export function Terminal({ host, session, welcome }: { host: string; session: TerminalStep[]; welcome: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const navigate = useNavigate()
  const [live, setLive] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [entries, setEntries] = useState<Entry[]>([])
  const [value, setValue] = useState('')
  const past = useRef<string[]>([])
  /** Position in `past` while browsing it with the arrow keys; -1 while typing a fresh line. */
  const recall = useRef(-1)
  const nextId = useRef(0)

  const lines = useMemo<Line[]>(
    () => session.flatMap((step) => [{ kind: 'cmd' as const, text: step.cmd }, ...step.out.map((text) => ({ kind: 'out' as const, text }))]),
    [session],
  )
  /** Character offset at which each line starts; the last entry is the total length. */
  const starts = useMemo(
    () => lines.reduce<number[]>((acc, line) => [...acc, acc[acc.length - 1] + line.text.length], [0]),
    [lines],
  )
  const total = starts[starts.length - 1]

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || cleared) return
    const rows = Array.from(el.querySelectorAll<HTMLElement>('[data-row]'))
    const render = (progress: number, caret: boolean) => {
      const typed = Math.round(progress * total)
      const typingRow = starts.findIndex((start, i) => i > 0 && typed < start) - 1
      const caretRow = typingRow < 0 ? lines.length - 1 : typingRow
      lines.forEach((line, i) => {
        const shown = clamp(typed - starts[i], 0, line.text.length)
        const row = rows[i]
        const text = row.querySelector<HTMLElement>('[data-text]')
        if (text) text.textContent = line.text.slice(0, shown)
        // A prompt appears as soon as the previous line finishes; output lines appear with their first character.
        const reached = typed >= starts[i] && (shown > 0 || line.kind === 'cmd')
        row.dataset.state = reached ? 'shown' : 'hidden'
        row.classList.toggle('has-caret', caret && i === caretRow)
      })
      el.dataset.done = String(typed >= total)
    }
    if (live || reduceMotion) {
      render(1, !live)
      return
    }
    const ctx = gsap.context(() => {
      gsap.to(
        {},
        {
          scrollTrigger: {
            trigger: el,
            start: 'top 80%',
            end: 'bottom 30%',
            scrub: true,
            onUpdate: (self) => render(self.progress, true),
          },
        },
      )
    }, el)
    render(0, true)
    return () => ctx.revert()
  }, [lines, starts, total, live, cleared])

  // Keep the newest output in view; the body only captures the wheel once it actually scrolls.
  useEffect(() => {
    const el = body.current
    if (!el || !live) return
    el.scrollTop = el.scrollHeight
    el.toggleAttribute('data-lenis-prevent', el.scrollHeight > el.clientHeight)
  }, [entries, live])

  const print = (cmd: string | null, out: OutLine[]) => {
    const id = nextId.current
    nextId.current += 1
    setEntries((list) => [...list, { id, cmd, out }].slice(-MAX_ENTRIES))
  }

  const goLive = () => {
    if (live) return
    setLive(true)
    print(null, [{ text: welcome, tone: 'muted' }])
  }

  // The prompt can still be hidden when live mode starts, so focus it once it has rendered.
  useEffect(() => {
    if (live) input.current?.focus({ preventScroll: true })
  }, [live])

  const focusPrompt = () => {
    if (live) input.current?.focus({ preventScroll: true })
    else goLive()
  }

  const shell: ShellContext = {
    navigate: (path) => void navigate(path),
    openProject,
    history: () => past.current,
  }

  const wipe = () => {
    setEntries([])
    setCleared(true)
  }

  const submit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const cmd = value.trim()
    setValue('')
    recall.current = -1
    if (!cmd) {
      print('', [])
      return
    }
    past.current = [...past.current, cmd]
    const result = runCommand(cmd, shell)
    if (result === 'clear') wipe()
    else print(cmd, result)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Tab only completes when there's something to complete, so keyboard users can still tab past.
    if (e.key === 'Tab' && value.trim()) {
      e.preventDefault()
      const { value: completed, options } = complete(value)
      setValue(completed)
      if (options.length) print(value, [{ text: options.join('   '), tone: 'muted' }])
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const list = past.current
      if (!list.length) return
      const from = recall.current < 0 ? list.length : recall.current
      const to = clamp(from + (e.key === 'ArrowUp' ? -1 : 1), 0, list.length)
      recall.current = to === list.length ? -1 : to
      setValue(list[to] ?? '')
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault()
      wipe()
    }
    if (e.key === 'Escape') input.current?.blur()
  }

  return (
    <div
      ref={ref}
      className={`term card ${live ? 'is-live' : ''}`}
      onClick={() => {
        // Don't steal focus from someone selecting output to copy it.
        if (window.getSelection()?.isCollapsed ?? true) focusPrompt()
      }}
    >
      <div className="term__bar">
        <span className="term__dot" aria-hidden="true" />
        <span className="term__dot" aria-hidden="true" />
        <span className="term__dot" aria-hidden="true" />
        <span className="term__title">{host}: ~</span>
        <button type="button" className="term__mode" onClick={focusPrompt} aria-controls={inputId}>
          <Icon name="terminal" /> {live ? 'interactive' : 'type a command'}
        </button>
      </div>
      <div ref={body} className="term__body">
        {cleared ? null : (
          <>
            <p className="sr-only">Terminal session: {lines.map((l) => l.text).join('. ')}</p>
            <div aria-hidden="true">
              {lines.map((line, i) => (
                <div key={i} data-row className={`term__line term__line--${line.kind}`} data-state="hidden">
                  {line.kind === 'cmd' ? <span className="term__prompt">{host}:~$ </span> : null}
                  <span data-text />
                </div>
              ))}
            </div>
          </>
        )}
        <div role="log" aria-live="polite" aria-label="Command output">
          {entries.map((entry) => (
            <div key={entry.id}>
              {entry.cmd === null ? null : (
                <div className="term__line term__line--cmd">
                  <span className="term__prompt">{host}:~$ </span>
                  {entry.cmd}
                </div>
              )}
              {entry.out.map((out, i) => (
                <div key={i} className={`term__line term__line--out ${out.tone ? `is-${out.tone}` : ''}`}>
                  {out.href ? (
                    <a href={out.href} target={out.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                      {out.text}
                    </a>
                  ) : (
                    out.text
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <form className="term__input" onSubmit={submit}>
          <label htmlFor={inputId} className="term__prompt">
            {host}:~$&nbsp;
          </label>
          <input
            id={inputId}
            ref={input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={goLive}
            placeholder={live ? '' : 'type help and press Enter'}
            aria-label="Terminal command"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
          />
        </form>
      </div>
    </div>
  )
}
