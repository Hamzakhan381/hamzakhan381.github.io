import { Link } from 'react-router'
import { usePageEffects } from '../lib/usePageEffects'
import { PageHero } from '../components/PageHero'
import { Icon } from '../components/Icon'

const hero = {
  eyebrow: 'Error 404',
  lines: ['Route not', 'found.'],
  accentLine: 1,
  lead: 'GET returned 404. The page you asked for isn’t deployed here, but the rest of the site is.',
}

export default function NotFound() {
  const ref = usePageEffects<HTMLDivElement>()
  return (
    <div ref={ref} className="page page--404">
      <PageHero hero={hero}>
        <div className="actions">
          <Link to="/" className="btn">
            <Icon name="arrowLeft" /> Back home
          </Link>
          <Link to="/projects" className="btn btn--ghost">
            See projects
          </Link>
        </div>
      </PageHero>
    </div>
  )
}
