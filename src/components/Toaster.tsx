import { useToasts } from '../lib/toast'
import { Icon } from './Icon'

export function Toaster() {
  const toasts = useToasts()
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <p key={t.id} className={`toast toast--${t.tone}`}>
          <Icon name={t.tone === 'ok' ? 'check' : 'close'} /> {t.text}
        </p>
      ))}
    </div>
  )
}
