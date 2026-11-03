import { Fragment } from 'react'

/** Renders text as per-character spans (grouped by word so lines wrap cleanly) for 3D letter animation. */
export function SplitText({ text, className = '' }: { text: string; className?: string }) {
  const words = text.split(' ')
  return (
    <span className={`split-line ${className}`} aria-label={text} role="text">
      {words.map((word, w) => (
        <Fragment key={`${word}-${w}`}>
          <span className="split-word" aria-hidden="true">
            {Array.from(word).map((ch, c) => (
              <span key={`${ch}-${c}`} className="split-char">
                {ch}
              </span>
            ))}
          </span>
          {w < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </span>
  )
}
