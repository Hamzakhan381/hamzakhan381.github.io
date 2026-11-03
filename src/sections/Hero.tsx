import { profile, stack } from '../lib/content'
import { scrollToId } from '../lib/scroll'
import { Icon } from '../components/Icon'
import { SplitText } from '../components/SplitText'

export function Hero() {
  return (
    <section id="home" data-station className="section hero">
      <div className="hero__inner" data-hero-content>
        <p className="eyebrow hero__badge" data-intro>
          <span className="pulse-dot" aria-hidden="true" /> Available for new projects
        </p>
        <h1 className="hero__title">
          <SplitText text="Engineering scalable" className="hero__line" />
          <SplitText text="systems for the future." className="hero__line text-gradient" />
        </h1>
        <p className="hero__lead" data-intro>
          I'm <strong>{profile.name}</strong>, a full-stack engineer who designs backend architecture, data systems
          and fast, modern interfaces.
        </p>
        <div className="hero__actions" data-intro>
          <a
            href="#projects"
            className="btn"
            onClick={(e) => {
              e.preventDefault()
              scrollToId('projects')
            }}
          >
            See my work <Icon name="arrow" />
          </a>
          <a href={profile.links.github} className="btn btn--ghost" target="_blank" rel="noreferrer">
            <Icon name="github" /> GitHub
          </a>
          <a href={profile.links.resume} className="btn btn--ghost">
            <Icon name="file" /> Resume
          </a>
        </div>
      </div>

      <div className="marquee" aria-label={`Tech stack: ${stack.join(', ')}`} data-intro>
        <div className="marquee__track" aria-hidden="true">
          {[...stack, ...stack].map((item, i) => (
            <span key={`${item}-${i}`}>{item}</span>
          ))}
        </div>
      </div>

      <button type="button" className="scroll-cue" onClick={() => scrollToId('about')} aria-label="Scroll to About">
        <span className="scroll-cue__wheel" />
        Scroll to fly
      </button>
    </section>
  )
}
