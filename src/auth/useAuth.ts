import { useSyncExternalStore } from 'react'
import { api, getToken, subscribeToken } from '../api/client'

export function useAuth() {
  const token = useSyncExternalStore(subscribeToken, getToken)
  return {
    isAuthenticated: token !== null && !isExpired(token),
    logout: api.logout,
  }
}

// The token's own expiry (24h from login). An unreadable token counts as
// expired; the backend is still the authority and answers 401 if it disagrees.
function isExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(payload)) as { exp?: number }
    return typeof exp === 'number' && exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

// Only same-origin paths, so ?redirect= can't send users to another site.
export function safeRedirect(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  return value
}
