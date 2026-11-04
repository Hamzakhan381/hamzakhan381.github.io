import type { Ref } from 'react'
import type { CodeLine } from './CodeWindow'

/**
 * A laptop built from CSS 3D planes: a keyboard deck and a hinged lid whose front is a code editor and whose back
 * carries a glowing logo. It is purely decorative (the same code is on the About page), and the Home page's
 * scroll timeline opens the lid, types the code and flies the camera into the screen.
 */
export function Laptop({ ref, file, lines }: { ref?: Ref<HTMLDivElement>; file: string; lines: CodeLine[] }) {
  return (
    <div ref={ref} className="laptop" aria-hidden="true">
      <div className="laptop__body">
        <div className="laptop__lid">
          <div className="laptop__cover">
            <span className="laptop__logo">&lt;/&gt;</span>
          </div>
          <div className="laptop__screen">
            <div className="laptop__bar">
              <span className="term__dot" />
              <span className="term__dot" />
              <span className="term__dot" />
              <span className="laptop__tab">{file}</span>
            </div>
            <pre className="laptop__code">
              {lines.map((line, i) => (
                <span key={i} className="laptop__line">
                  <span className="laptop__num">{i + 1}</span>
                  {line.map((token, k) => (
                    <span key={k} className={token.kind ? `tok-${token.kind}` : undefined}>
                      {token.text}
                    </span>
                  ))}
                  {'\n'}
                </span>
              ))}
            </pre>
            <div className="laptop__status">
              <span>● main</span>
              <span>TypeScript</span>
              <span>UTF-8</span>
            </div>
          </div>
        </div>
        <div className="laptop__base">
          <span className="laptop__keys" />
          <span className="laptop__pad" />
        </div>
      </div>
    </div>
  )
}
