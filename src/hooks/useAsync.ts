import { useCallback, useEffect, useState } from 'react'

export type AsyncState<T> = { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'ready'; data: T }

// Runs `load` on mount and on retry(). Callers key the component by the
// inputs `load` depends on, so a change of inputs remounts with a fresh state.
export function useAsync<T>(load: () => Promise<T>): [AsyncState<T>, () => void] {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [loader] = useState(() => load)

  useEffect(() => {
    let cancelled = false
    loader()
      .then((data) => !cancelled && setState({ status: 'ready', data }))
      .catch((error: unknown) => !cancelled && setState({ status: 'error', error }))
    return () => {
      cancelled = true
    }
  }, [loader, attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return [state, retry]
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}
