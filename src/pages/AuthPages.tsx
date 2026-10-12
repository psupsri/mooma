import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { api, ApiError } from '../api/client'
import { safeRedirect, useAuth } from '../auth/useAuth'
import { errorMessage } from '../hooks/useAsync'
import './AuthPages.css'

function useRedirect() {
  const [params] = useSearchParams()
  const redirect = safeRedirect(params.get('redirect'))
  const query = redirect === '/' ? '' : `?${new URLSearchParams({ redirect })}`
  return { redirect, query }
}

export function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { redirect, query } = useRedirect()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated && !submitting) return <Navigate to={redirect} replace />

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      await api.login({ email: String(form.get('email')), password: String(form.get('password')) })
      navigate(redirect, { replace: true })
    } catch (err) {
      setSubmitting(false)
      // The backend answers both an unknown email and a wrong password with a
      // 400 carrying the raw lookup/bcrypt error, which isn't user-facing.
      setError(err instanceof ApiError && err.status === 400 ? 'Incorrect email or password.' : errorMessage(err))
    }
  }

  return (
    <section className="auth">
      <div className="auth-card">
        <h1>Sign in</h1>
        <p className="auth-card__lead">Welcome back. Sign in to book your seats.</p>
        <form className="auth-form" onSubmit={submit}>
          {error && (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          )}
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required autoFocus />
          </label>
          <label className="field">
            <span>Password</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit" className="button button--block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-card__switch">
          New to Mooma? <Link to={`/register${query}`}>Create an account</Link>
        </p>
      </div>
    </section>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { redirect, query } = useRedirect()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated && !submitting) return <Navigate to={redirect} replace />

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const value = (name: string) => String(form.get(name) ?? '').trim()
    const email = value('email')
    const password = String(form.get('password') ?? '')
    setSubmitting(true)
    setError(null)
    try {
      await api.register({
        first_name: value('first_name'),
        last_name: value('last_name'),
        tel: value('tel'),
        email,
        password,
      })
    } catch (err) {
      setSubmitting(false)
      if (err instanceof ApiError && err.status === 400) {
        setError('Please check your details. A valid email address is required.')
      } else if (err instanceof ApiError && err.status === 500) {
        // The backend reports any failure, including a taken email, as a
        // generic "registration failed".
        setError("We couldn't create your account. This email may already be registered.")
      } else {
        setError(errorMessage(err))
      }
      return
    }

    try {
      await api.login({ email, password })
      navigate(redirect, { replace: true })
    } catch {
      // Account exists; let them sign in manually.
      navigate(`/login${query}`, { replace: true })
    }
  }

  return (
    <section className="auth">
      <div className="auth-card">
        <h1>Create an account</h1>
        <p className="auth-card__lead">It only takes a minute.</p>
        <form className="auth-form" onSubmit={submit}>
          {error && (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          )}
          <div className="field-row">
            <label className="field">
              <span>First name</span>
              <input name="first_name" autoComplete="given-name" required autoFocus />
            </label>
            <label className="field">
              <span>Last name</span>
              <input name="last_name" autoComplete="family-name" required />
            </label>
          </div>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            <span>
              Phone <em>(optional)</em>
            </span>
            <input name="tel" type="tel" autoComplete="tel" />
          </label>
          <label className="field">
            <span>Password</span>
            <input name="password" type="password" autoComplete="new-password" required />
          </label>
          <button type="submit" className="button button--block" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="auth-card__switch">
          Already have an account? <Link to={`/login${query}`}>Sign in</Link>
        </p>
      </div>
    </section>
  )
}
