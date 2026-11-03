import { Link } from 'react-router'
import { usePageEffects } from '../lib/usePageEffects'
import { PageHero } from '../components/PageHero'
import { Icon } from '../components/Icon'

export default function NotFound() {
  const ref = usePageEffects<HTMLDivElement>()
  return (
    <div ref={ref} className="page page--404">
      <PageHero eyebrow="404" lines={['Lost in', 'deep space.']} accent={1} lead="This page drifted off. The particles are still looking for it.">
        <div className="actions">
          <Link to="/" className="btn">
            <Icon name="arrowLeft" /> Back home
          </Link>
        </div>
      </PageHero>
    </div>
  )
}
