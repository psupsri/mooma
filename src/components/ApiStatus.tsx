import { useEffect, useState } from 'react'
import { api } from '../api/client'

type State = 'checking' | 'ok' | 'down'

const LABELS: Record<State, string> = {
  checking: 'Checking API…',
  ok: 'API connected',
  down: 'API unreachable',
}

export function ApiStatus() {
  const [state, setState] = useState<State>('checking')

  useEffect(() => {
    let cancelled = false
    api
      .health()
      .then(() => !cancelled && setState('ok'))
      .catch(() => !cancelled && setState('down'))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <span className="api-status" data-state={state}>
      {LABELS[state]}
    </span>
  )
}
